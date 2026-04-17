import type { AddressInfo } from 'net';

import { hashPassword } from '@reasvyn/auth-core';
import type { User } from '@reasvyn/auth-types';
import express, { json } from 'express';

import { createAuthRouter } from '../router';

const ACCESS_SECRET = 'test-access-secret';
const REFRESH_SECRET = 'test-refresh-secret';
const HMAC_SECRET = 'test-hmac-secret';

type StoredUser = User & { passwordHash: string };

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

  app.use(
    '/auth',
    createAuthRouter({
      jwtAccessSecret: ACCESS_SECRET,
      jwtRefreshSecret: REFRESH_SECRET,
      hmacSecret: HMAC_SECRET,
      services: {
        findUserByEmail: async (email) => (email === user.email ? user : null),
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
        updateUser: async () => user,
        storeRefreshToken: async () => undefined,
        validateRefreshToken: async () => user.id,
        revokeRefreshToken: async () => undefined,
      },
    }),
  );

  const server = await new Promise<import('http').Server>((resolve) => {
    const listeningServer = app.listen(0, () => resolve(listeningServer));
  });

  const { port } = server.address() as AddressInfo;
  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: 'secret' }),
      });

      const body = (await response.json()) as {
        data: { user: Record<string, unknown> };
      };

      expect(response.status).toBe(200);
      expect(body.data.user.passwordHash).toBeUndefined();
      expect(body.data.user.email).toBe(user.email);
    } finally {
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
  });

  it('does not expose passwordHash in register responses', async () => {
    const user = createStoredUser();
    const { server, baseUrl } = await createTestServer(user);

    try {
      const response = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
  });
});
