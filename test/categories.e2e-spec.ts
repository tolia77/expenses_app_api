import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { createTestApp } from './helpers/create-test-app';
import { resetDb } from './helpers/reset-db';
import { signUp } from './helpers/auth';

describe('Categories (e2e)', () => {
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

  describe('GET /categories', () => {
    it('returns the seeded reference categories', async () => {
      const me = await signUp(app);

      const res = await request(app.getHttpServer())
        .get('/categories')
        .set(me.authHeader)
        .expect(200);

      expect(res.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Groceries' }),
          expect.objectContaining({ name: 'Dining' }),
          expect.objectContaining({ name: 'Transport' }),
          expect.objectContaining({ name: 'Other' }),
        ]),
      );
      expect(res.body.meta.total).toBe(4);
    });

    it('respects pagination query params', async () => {
      const me = await signUp(app);

      const res = await request(app.getHttpServer())
        .get('/categories?page=1&limit=2')
        .set(me.authHeader)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toEqual({ total: 4, page: 1, limit: 2 });
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer()).get('/categories').expect(401);
    });
  });
});
