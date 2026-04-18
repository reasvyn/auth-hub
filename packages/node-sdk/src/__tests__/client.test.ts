import { AuthClient, HttpError } from '../index';

// ─── Fetch mock setup ─────────────────────────────────────────────────────────

function mockFetch(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as jest.Mock;
}

function mockFetchError(message: string) {
  global.fetch = jest.fn().mockRejectedValue(new Error(message)) as jest.Mock;
}

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── AuthClient construction ───────────────────────────────────────────────

describe('AuthClient', () => {
  it('creates sub-modules on construction', () => {
    const client = new AuthClient({ baseUrl: 'https://auth.example.com' });
    expect(client.auth).toBeDefined();
    expect(client.users).toBeDefined();
    expect(client.sessions).toBeDefined();
    expect(client.mfa).toBeDefined();
  });

  it('setAccessToken() returns this for chaining', () => {
    const client = new AuthClient({ baseUrl: 'https://auth.example.com' });
    const result = client.setAccessToken('my-token');
    expect(result).toBe(client);
  });

  it('sends Authorization header after setAccessToken()', async () => {
    const client = new AuthClient({ baseUrl: 'https://auth.example.com' });
    client.setAccessToken('test-token');

    mockFetch(200, { success: true, data: { id: 'u1', email: 'a@b.com' } });

    await client.users.me();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://auth.example.com/users/me',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('clears token when setAccessToken(null) is called', async () => {
    const client = new AuthClient({ baseUrl: 'https://auth.example.com' });
    client.setAccessToken('token');
    client.setAccessToken(null);

    mockFetch(200, { success: true, data: { id: 'u1' } });
    await client.users.me();

    const calledHeaders = (global.fetch as jest.Mock).mock.calls[0][1].headers as Record<
      string,
      string
    >;
    expect(calledHeaders['Authorization']).toBeUndefined();
  });
});

// ─── HttpError ────────────────────────────────────────────────────────────────

describe('HttpError', () => {
  it('has correct name and properties', () => {
    const err = new HttpError(404, 'NOT_FOUND', 'Resource not found', { id: 'xyz' });
    expect(err.name).toBe('HttpError');
    expect(err.status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Resource not found');
    expect(err.details).toEqual({ id: 'xyz' });
  });

  it('is instanceof Error', () => {
    const err = new HttpError(500, 'SERVER_ERROR', 'Oops');
    expect(err instanceof Error).toBe(true);
    expect(err instanceof HttpError).toBe(true);
  });
});

// ─── auth.login() ─────────────────────────────────────────────────────────────

describe('auth.login()', () => {
  let client: AuthClient;
  beforeEach(() => {
    client = new AuthClient({ baseUrl: 'https://auth.example.com' });
  });

  it('calls POST /auth/login with credentials', async () => {
    const authData = {
      success: true,
      data: { user: { id: 'u1', email: 'a@b.com' }, accessToken: 'tok', refreshToken: 'ref' },
    };
    mockFetch(200, authData);

    const result = await client.auth.login({ email: 'a@b.com', password: 'pass' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://auth.example.com/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result).toEqual(authData.data);
  });

  it('throws HttpError on 401', async () => {
    mockFetch(401, {
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' },
    });

    await expect(client.auth.login({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow(
      HttpError,
    );
    await expect(client.auth.login({ email: 'a@b.com', password: 'wrong' })).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });
});

// ─── auth.register() ──────────────────────────────────────────────────────────

describe('auth.register()', () => {
  let client: AuthClient;
  beforeEach(() => {
    client = new AuthClient({ baseUrl: 'https://auth.example.com' });
  });

  it('calls POST /auth/register', async () => {
    mockFetch(200, { success: true, data: { user: { id: 'u2' }, accessToken: 'tok' } });
    await client.auth.register({
      email: 'new@example.com',
      password: 'pass',
      displayName: 'New User',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://auth.example.com/auth/register',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

// ─── auth.refreshToken() ─────────────────────────────────────────────────────

describe('auth.refreshToken()', () => {
  it('calls POST /auth/refresh', async () => {
    const client = new AuthClient({ baseUrl: 'https://auth.example.com' });
    mockFetch(200, { success: true, data: { accessToken: 'new-tok' } });

    await client.auth.refreshToken('refresh-tok');

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.refreshToken).toBe('refresh-tok');
  });
});

// ─── users module ─────────────────────────────────────────────────────────────

describe('users.me()', () => {
  it('calls GET /users/me', async () => {
    const client = new AuthClient({ baseUrl: 'https://auth.example.com' });
    const userData = { id: 'u1', email: 'a@b.com', role: 'user', status: 'active' };
    mockFetch(200, { success: true, data: userData });

    const result = await client.users.me();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://auth.example.com/users/me',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result).toEqual(userData);
  });
});

describe('users.updateProfile()', () => {
  it('calls PATCH /users/me/profile', async () => {
    const client = new AuthClient({ baseUrl: 'https://auth.example.com' });
    mockFetch(200, { success: true, data: { id: 'u1', displayName: 'Updated' } });

    await client.users.updateProfile({ displayName: 'Updated' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://auth.example.com/users/me/profile',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});

describe('users.getSecurityOverview()', () => {
  it('calls GET /users/me/security', async () => {
    const client = new AuthClient({ baseUrl: 'https://auth.example.com' });
    mockFetch(200, {
      success: true,
      data: {
        userId: 'u1',
        userStatus: 'active',
        emailVerified: true,
        passwordConfigured: true,
        failedLoginAttempts: 0,
        methods: [],
        recoveryCodesRemaining: 8,
        recommendations: [],
      },
    });

    await client.users.getSecurityOverview();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://auth.example.com/users/me/security',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});

describe('users.requestOneTimeCode()', () => {
  it('calls POST /users/me/security/challenges', async () => {
    const client = new AuthClient({ baseUrl: 'https://auth.example.com' });
    mockFetch(200, {
      success: true,
      data: {
        id: 'challenge_1',
        purpose: 'mfa_challenge',
        method: 'email',
        expiresAt: new Date().toISOString(),
        attemptsRemaining: 5,
        createdAt: new Date().toISOString(),
      },
    });

    await client.users.requestOneTimeCode({
      purpose: 'mfa_challenge',
      method: 'email',
      destination: 'user@example.com',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://auth.example.com/users/me/security/challenges',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('users.regenerateRecoveryCodes()', () => {
  it('calls POST /users/me/security/recovery-codes', async () => {
    const client = new AuthClient({ baseUrl: 'https://auth.example.com' });
    mockFetch(200, {
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        codes: ['ABCDE-FGHIJ'],
      },
    });

    await client.users.regenerateRecoveryCodes({ password: 'Password123!' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://auth.example.com/users/me/security/recovery-codes',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

// ─── sessions module ──────────────────────────────────────────────────────────

describe('sessions.list()', () => {
  it('calls GET /sessions', async () => {
    const client = new AuthClient({ baseUrl: 'https://auth.example.com' });
    mockFetch(200, { success: true, data: [] });

    await client.sessions.list();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://auth.example.com/sessions',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});

describe('sessions.revoke()', () => {
  it('calls DELETE /sessions/:id', async () => {
    const client = new AuthClient({ baseUrl: 'https://auth.example.com' });
    mockFetch(200, { success: true, data: undefined });

    await client.sessions.revoke('sess_123');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://auth.example.com/sessions/sess_123',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

// ─── Network and timeout errors ───────────────────────────────────────────────

describe('network errors', () => {
  it('throws HttpError with NETWORK_ERROR code on fetch failure', async () => {
    const client = new AuthClient({ baseUrl: 'https://auth.example.com' });
    mockFetchError('fetch failed');

    await expect(client.users.me()).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });

  it('strips trailing slash from baseUrl', async () => {
    const client = new AuthClient({ baseUrl: 'https://auth.example.com/' });
    mockFetch(200, { success: true, data: { id: 'u1' } });

    await client.users.me();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://auth.example.com/users/me',
      expect.anything(),
    );
  });
});

// ─── custom headers ───────────────────────────────────────────────────────────

describe('custom default headers', () => {
  it('sends custom headers on every request', async () => {
    const client = new AuthClient({
      baseUrl: 'https://auth.example.com',
      headers: { 'x-client-id': 'my-app' },
    });
    mockFetch(200, { success: true, data: { id: 'u1' } });

    await client.users.me();

    const calledHeaders = (global.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(calledHeaders['x-client-id']).toBe('my-app');
  });
});
