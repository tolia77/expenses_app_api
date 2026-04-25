import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { createTestApp } from './helpers/create-test-app';
import { resetDb } from './helpers/reset-db';
import { signUp } from './helpers/auth';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDb(dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/signup', () => {
    it('creates a user and returns an access token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'new@x.test', password: 'password123' })
        .expect(201);

      expect(res.body.access_token).toEqual(expect.any(String));
    });

    it('returns 409 on duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'dup@x.test', password: 'password123' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'dup@x.test', password: 'password123' })
        .expect(409);

      expect(res.body.error.code).toBe('USER_ALREADY_EXISTS');
    });

    it('returns 400 on invalid email', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'not-an-email', password: 'password123' })
        .expect(400);
    });

    it('returns 400 on short password', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'ok@x.test', password: 'short' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('returns a token on correct credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'login@x.test', password: 'password123' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'login@x.test', password: 'password123' })
        .expect(200);

      expect(res.body.access_token).toEqual(expect.any(String));
    });

    it('returns 401 on wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'wp@x.test', password: 'password123' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'wp@x.test', password: 'wrong-password' })
        .expect(401);
    });

    it('returns 401 on unknown email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@x.test', password: 'password123' })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('returns the current user when authenticated', async () => {
      const me = await signUp(app, { email: 'me@x.test' });

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set(me.authHeader)
        .expect(200);

      expect(res.body).toEqual({ id: me.userId, email: me.email });
    });

    it('returns 401 with no token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('returns 401 with an invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set({ Authorization: 'Bearer not-a-real-token' })
        .expect(401);
    });
  });
});
