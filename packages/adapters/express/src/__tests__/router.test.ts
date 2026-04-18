import type { AddressInfo } from 'net';

import { createJWT, hashPassword, verifyOneTimeCodeHash } from '@reasvyn/auth-core';
import type {
  OneTimeCodeChallenge,
  SecurityEvent,
  StoredOneTimeCodeChallenge,
  User,
} from '@reasvyn/auth-types';
import express, { json } from 'express';

import { createAuthRouter } from '../router';

const ACCESS_SECRET = 'test-access-secret';
const REFRESH_SECRET = 'test-refresh-secret';
const HMAC_SECRET = 'test-hmac-secret';

jest.setTimeout(15_000);

type StoredUser = User & { passwordHash: string };

interface DeliveredOneTimeCode {
  code: string;
  destination: string;
  challenge: OneTimeCodeChallenge;
}

function createStoredUser(overrides: Partial<StoredUser> = {}): StoredUser {
  const now = new Date();
  return {
    id: 'user_1',
    email: 'user@example.com',
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
    role: 'user',
    status: 'active',
    passwordHash: '$2a$12$abcdefghijklmnopqrstuv',
    ...overrides,
  };
}

async function createTestServer(user: StoredUser) {
  const app = express();
  app.use(json());

  const oneTimeCodeChallenges = new Map<string, StoredOneTimeCodeChallenge>();
  const securityEvents: SecurityEvent[] = [];
  const deliveries: DeliveredOneTimeCode[] = [];
  let currentUser = user;

  app.use(
    createAuthRouter({
      jwtAccessSecret: ACCESS_SECRET,
      jwtRefreshSecret: REFRESH_SECRET,
      hmacSecret: HMAC_SECRET,
      services: {
        findUserById: async (userId) => (userId === currentUser.id ? currentUser : null),
        findUserByEmail: async (email) => (email === currentUser.email ? currentUser : null),
        createUser: async ({ email, passwordHash, name }) => {
          const createdUser = createStoredUser({
            id: 'user_2',
            email,
            passwordHash,
          });

          return name
            ? {
                ...createdUser,
                profile: { userId: 'user_2', displayName: name },
              }
            : createdUser;
        },
        updateUser: async (_userId, data) => {
          currentUser = { ...currentUser, ...data, updatedAt: new Date() };
          return currentUser;
        },
        storeRefreshToken: async () => undefined,
        validateRefreshToken: async () => currentUser.id,
        revokeRefreshToken: async () => undefined,
        storeOneTimeCodeChallenge: async (challenge) => {
          oneTimeCodeChallenges.set(challenge.id, challenge);
        },
        findOneTimeCodeChallenge: async (challengeId) => {
          return oneTimeCodeChallenges.get(challengeId) ?? null;
        },
        updateOneTimeCodeChallenge: async (challengeId, data) => {
          const currentChallenge = oneTimeCodeChallenges.get(challengeId);
          if (!currentChallenge) {
            throw new Error(`Challenge ${challengeId} not found`);
          }

          const nextChallenge: StoredOneTimeCodeChallenge = {
            ...currentChallenge,
            ...data,
          };
          oneTimeCodeChallenges.set(challengeId, nextChallenge);
          return nextChallenge;
        },
        createSecurityEvent: async (event) => {
          securityEvents.push(event);
        },
        sendOneTimeCode: async ({ code, destination, challenge }) => {
          deliveries.push({ code, destination, challenge });
        },
      },
    }),
  );

  const server = await new Promise<import('http').Server>((resolve) => {
    const listeningServer = app.listen(0, () => resolve(listeningServer));
  });

  const { port } = server.address() as AddressInfo;
  const accessToken = createJWT(
    { sub: currentUser.id, email: currentUser.email, role: currentUser.role },
    ACCESS_SECRET,
  );

  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
    accessToken,
    deliveries,
    oneTimeCodeChallenges,
    securityEvents,
  };
}

async function closeServer(server: import('http').Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function createAuthHeaders(accessToken?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

describe('createAuthRouter()', () => {
  it('does not expose passwordHash in login responses', async () => {
    const user = createStoredUser({
      passwordHash: await hashPassword('secret'),
    });
    const { server, baseUrl } = await createTestServer(user);

    try {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({ email: user.email, password: 'secret' }),
      });

      const body = (await response.json()) as {
        data: { user: Record<string, unknown> };
      };

      expect(response.status).toBe(200);
      expect(body.data.user.passwordHash).toBeUndefined();
      expect(body.data.user.email).toBe(user.email);
    } finally {
      await closeServer(server);
    }
  });

  it('does not expose passwordHash in register responses', async () => {
    const user = createStoredUser();
    const { server, baseUrl } = await createTestServer(user);

    try {
      const response = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          email: 'new@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          displayName: 'New User',
        }),
      });

      const body = (await response.json()) as {
        data: { user: Record<string, unknown> };
      };

      expect(response.status).toBe(201);
      expect(body.data.user.passwordHash).toBeUndefined();
      expect(body.data.user.email).toBe('new@example.com');
    } finally {
      await closeServer(server);
    }
  });

  it('creates an authenticated OTP challenge with hashed storage and audit events', async () => {
    const user = createStoredUser();
    const { accessToken, baseUrl, deliveries, oneTimeCodeChallenges, securityEvents, server } =
      await createTestServer(user);

    try {
      const response = await fetch(`${baseUrl}/users/me/security/challenges`, {
        method: 'POST',
        headers: createAuthHeaders(accessToken),
        body: JSON.stringify({ purpose: 'password_reset', method: 'email' }),
      });

      const body = (await response.json()) as {
        data: OneTimeCodeChallenge;
      };

      expect(response.status).toBe(201);
      expect(body.data.destination).toBe('us**@example.com');
      expect(deliveries).toHaveLength(1);
      expect(deliveries[0].destination).toBe(user.email);
      expect(deliveries[0].code).toMatch(/^\d{6}$/);

      const storedChallenge = Array.from(oneTimeCodeChallenges.values())[0];
      expect(storedChallenge.codeHash).not.toBe(deliveries[0].code);
      expect(
        verifyOneTimeCodeHash(deliveries[0].code, storedChallenge.codeHash, {
          secret: HMAC_SECRET,
        }),
      ).toBe(true);
      expect(securityEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'otp_challenge_requested',
            userId: user.id,
            metadata: expect.objectContaining({
              challengeId: storedChallenge.id,
              purpose: 'password_reset',
              method: 'email',
            }),
          }),
        ]),
      );
    } finally {
      await closeServer(server);
    }
  });

  it('verifies a valid OTP challenge once and marks it consumed', async () => {
    const user = createStoredUser();
    const { accessToken, baseUrl, deliveries, oneTimeCodeChallenges, securityEvents, server } =
      await createTestServer(user);

    try {
      const challengeResponse = await fetch(`${baseUrl}/users/me/security/challenges`, {
        method: 'POST',
        headers: createAuthHeaders(accessToken),
        body: JSON.stringify({ purpose: 'signin_challenge', method: 'email' }),
      });
      const challengeBody = (await challengeResponse.json()) as { data: OneTimeCodeChallenge };

      const verifyResponse = await fetch(`${baseUrl}/users/me/security/challenges/verify`, {
        method: 'POST',
        headers: createAuthHeaders(accessToken),
        body: JSON.stringify({
          challengeId: challengeBody.data.id,
          code: deliveries[0].code,
        }),
      });

      const verifyBody = (await verifyResponse.json()) as {
        data: { verified: boolean; challenge: OneTimeCodeChallenge };
      };

      expect(verifyResponse.status).toBe(200);
      expect(verifyBody.data.verified).toBe(true);
      expect(verifyBody.data.challenge.verifiedAt).toBeDefined();
      expect(verifyBody.data.challenge.consumedAt).toBeDefined();

      const storedChallenge = oneTimeCodeChallenges.get(challengeBody.data.id);
      expect(storedChallenge?.verifiedAt).toBeInstanceOf(Date);
      expect(storedChallenge?.consumedAt).toBeInstanceOf(Date);
      expect(securityEvents.map((event) => event.type)).toEqual([
        'otp_challenge_requested',
        'otp_challenge_verified',
      ]);
    } finally {
      await closeServer(server);
    }
  });

  it('decrements attempts and emits a failure event when the OTP code is wrong', async () => {
    const user = createStoredUser();
    const { accessToken, baseUrl, oneTimeCodeChallenges, securityEvents, server } =
      await createTestServer(user);

    try {
      const challengeResponse = await fetch(`${baseUrl}/users/me/security/challenges`, {
        method: 'POST',
        headers: createAuthHeaders(accessToken),
        body: JSON.stringify({ purpose: 'signin_challenge', method: 'email' }),
      });
      const challengeBody = (await challengeResponse.json()) as { data: OneTimeCodeChallenge };

      const verifyResponse = await fetch(`${baseUrl}/users/me/security/challenges/verify`, {
        method: 'POST',
        headers: createAuthHeaders(accessToken),
        body: JSON.stringify({
          challengeId: challengeBody.data.id,
          code: '999999',
        }),
      });

      const verifyBody = (await verifyResponse.json()) as {
        data: { verified: boolean; challenge: OneTimeCodeChallenge };
      };

      expect(verifyResponse.status).toBe(200);
      expect(verifyBody.data.verified).toBe(false);
      expect(verifyBody.data.challenge.attemptsRemaining).toBe(4);
      expect(oneTimeCodeChallenges.get(challengeBody.data.id)?.attemptsRemaining).toBe(4);
      expect(securityEvents.at(-1)).toEqual(
        expect.objectContaining({
          type: 'otp_challenge_failed',
          metadata: expect.objectContaining({
            reason: 'invalid_code',
            attemptsRemaining: 4,
          }),
        }),
      );
    } finally {
      await closeServer(server);
    }
  });

  it('marks expired OTP challenges as consumed and emits an expiry event', async () => {
    const user = createStoredUser();
    const { accessToken, baseUrl, deliveries, oneTimeCodeChallenges, securityEvents, server } =
      await createTestServer(user);

    try {
      const challengeResponse = await fetch(`${baseUrl}/users/me/security/challenges`, {
        method: 'POST',
        headers: createAuthHeaders(accessToken),
        body: JSON.stringify({ purpose: 'password_reset', method: 'email' }),
      });
      const challengeBody = (await challengeResponse.json()) as { data: OneTimeCodeChallenge };

      const existingChallenge = oneTimeCodeChallenges.get(challengeBody.data.id);
      if (!existingChallenge) {
        throw new Error('Expected stored challenge to exist');
      }

      oneTimeCodeChallenges.set(challengeBody.data.id, {
        ...existingChallenge,
        expiresAt: new Date(Date.now() - 1_000),
      });

      const verifyResponse = await fetch(`${baseUrl}/users/me/security/challenges/verify`, {
        method: 'POST',
        headers: createAuthHeaders(accessToken),
        body: JSON.stringify({
          challengeId: challengeBody.data.id,
          code: deliveries[0].code,
        }),
      });

      const verifyBody = (await verifyResponse.json()) as {
        data: { verified: boolean; challenge: OneTimeCodeChallenge };
      };

      expect(verifyResponse.status).toBe(200);
      expect(verifyBody.data.verified).toBe(false);
      expect(verifyBody.data.challenge.consumedAt).toBeDefined();
      expect(securityEvents.at(-1)?.type).toBe('otp_challenge_expired');
      expect(oneTimeCodeChallenges.get(challengeBody.data.id)?.consumedAt).toBeInstanceOf(Date);
    } finally {
      await closeServer(server);
    }
  });

  it('prevents reusing an OTP challenge after a successful verification', async () => {
    const user = createStoredUser();
    const { accessToken, baseUrl, deliveries, securityEvents, server } =
      await createTestServer(user);

    try {
      const challengeResponse = await fetch(`${baseUrl}/users/me/security/challenges`, {
        method: 'POST',
        headers: createAuthHeaders(accessToken),
        body: JSON.stringify({ purpose: 'signin_challenge', method: 'email' }),
      });
      const challengeBody = (await challengeResponse.json()) as { data: OneTimeCodeChallenge };

      await fetch(`${baseUrl}/users/me/security/challenges/verify`, {
        method: 'POST',
        headers: createAuthHeaders(accessToken),
        body: JSON.stringify({
          challengeId: challengeBody.data.id,
          code: deliveries[0].code,
        }),
      });

      const reuseResponse = await fetch(`${baseUrl}/users/me/security/challenges/verify`, {
        method: 'POST',
        headers: createAuthHeaders(accessToken),
        body: JSON.stringify({
          challengeId: challengeBody.data.id,
          code: deliveries[0].code,
        }),
      });

      const reuseBody = (await reuseResponse.json()) as {
        data: { verified: boolean; challenge: OneTimeCodeChallenge };
      };

      expect(reuseResponse.status).toBe(200);
      expect(reuseBody.data.verified).toBe(false);
      expect(reuseBody.data.challenge.consumedAt).toBeDefined();
      expect(securityEvents.map((event) => event.type)).toEqual([
        'otp_challenge_requested',
        'otp_challenge_verified',
        'otp_challenge_failed',
      ]);
      expect(securityEvents.at(-1)).toEqual(
        expect.objectContaining({
          metadata: expect.objectContaining({ reason: 'already_used' }),
        }),
      );
    } finally {
      await closeServer(server);
    }
  });
});
