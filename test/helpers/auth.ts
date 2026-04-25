import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import request from 'supertest';

export interface AuthedUser {
  userId: string;
  email: string;
  token: string;
  authHeader: { Authorization: string };
}

/**
 * Create a user via POST /auth/signup and return a ready-to-use auth header.
 * Email is randomized so parallel tests within a suite don't collide even
 * before the next beforeEach truncate.
 */
export async function signUp(
  app: INestApplication,
  overrides: { email?: string; password?: string } = {},
): Promise<AuthedUser> {
  const email = overrides.email ?? `test-${randomUUID()}@x.test`;
  const password = overrides.password ?? 'password123';

  const res = await request(app.getHttpServer())
    .post('/auth/signup')
    .send({ email, password })
    .expect(201);

  const token = res.body.access_token as string;
  const decoded = app.get(JwtService).decode(token) as { sub: string };
  return {
    userId: decoded.sub,
    email,
    token,
    authHeader: { Authorization: `Bearer ${token}` },
  };
}

/**
 * Mint a token for an already-seeded user without going through HTTP.
 * Useful for analytics fixtures where you insert rows directly via DataSource
 * and then need a token whose `sub` matches those rows' user_id.
 */
export function authAsRaw(
  app: INestApplication,
  userId: string,
  email: string,
): AuthedUser {
  const jwt = app.get(JwtService);
  const token = jwt.sign({ sub: userId, email });
  return {
    userId,
    email,
    token,
    authHeader: { Authorization: `Bearer ${token}` },
  };
}
