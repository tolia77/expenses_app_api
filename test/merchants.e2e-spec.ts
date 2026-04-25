import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { createTestApp } from './helpers/create-test-app';
import { resetDb } from './helpers/reset-db';
import { signUp, AuthedUser } from './helpers/auth';

describe('Merchants (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let me: AuthedUser;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDb(dataSource);
    me = await signUp(app);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createMerchant(
    user: AuthedUser,
    body: Record<string, unknown> = { name: 'Acme' },
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/merchants')
      .set(user.authHeader)
      .send(body)
      .expect(201);
    return res.body.id;
  }

  describe('POST /merchants', () => {
    it('creates a merchant owned by the caller', async () => {
      const res = await request(app.getHttpServer())
        .post('/merchants')
        .set(me.authHeader)
        .send({ name: 'Acme', address: '1 Main St' })
        .expect(201);

      expect(res.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: 'Acme',
          address: '1 Main St',
          user_id: me.userId,
        }),
      );
    });

    it('returns 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/merchants')
        .set(me.authHeader)
        .send({ address: '1 Main St' })
        .expect(400);
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer())
        .post('/merchants')
        .send({ name: 'Acme' })
        .expect(401);
    });
  });

  describe('GET /merchants', () => {
    it('returns only the caller’s merchants', async () => {
      await createMerchant(me, { name: 'Mine-1' });
      await createMerchant(me, { name: 'Mine-2' });

      const other = await signUp(app, { email: 'other@x.test' });
      await createMerchant(other, { name: 'Theirs' });

      const res = await request(app.getHttpServer())
        .get('/merchants')
        .set(me.authHeader)
        .expect(200);

      const names = res.body.data.map((m: { name: string }) => m.name).sort();
      expect(names).toEqual(['Mine-1', 'Mine-2']);
    });
  });

  describe('GET /merchants/:id', () => {
    it('returns the merchant', async () => {
      const id = await createMerchant(me);
      const res = await request(app.getHttpServer())
        .get(`/merchants/${id}`)
        .set(me.authHeader)
        .expect(200);
      expect(res.body.id).toBe(id);
    });

    it('returns 404 for another user’s merchant', async () => {
      const other = await signUp(app, { email: 'other@x.test' });
      const theirId = await createMerchant(other);

      await request(app.getHttpServer())
        .get(`/merchants/${theirId}`)
        .set(me.authHeader)
        .expect(404);
    });
  });

  describe('PATCH /merchants/:id', () => {
    it('updates the merchant', async () => {
      const id = await createMerchant(me);
      const res = await request(app.getHttpServer())
        .patch(`/merchants/${id}`)
        .set(me.authHeader)
        .send({ name: 'Renamed' })
        .expect(200);
      expect(res.body.name).toBe('Renamed');
    });

    it('returns 404 for another user’s merchant', async () => {
      const other = await signUp(app, { email: 'other2@x.test' });
      const theirId = await createMerchant(other);

      await request(app.getHttpServer())
        .patch(`/merchants/${theirId}`)
        .set(me.authHeader)
        .send({ name: 'Hack' })
        .expect(404);
    });
  });

  describe('DELETE /merchants/:id', () => {
    it('deletes the merchant', async () => {
      const id = await createMerchant(me);
      await request(app.getHttpServer())
        .delete(`/merchants/${id}`)
        .set(me.authHeader)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/merchants/${id}`)
        .set(me.authHeader)
        .expect(404);
    });

    it('returns 404 for another user’s merchant', async () => {
      const other = await signUp(app, { email: 'other3@x.test' });
      const theirId = await createMerchant(other);

      await request(app.getHttpServer())
        .delete(`/merchants/${theirId}`)
        .set(me.authHeader)
        .expect(404);
    });
  });
});
