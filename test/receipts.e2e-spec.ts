import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { createTestApp, TestFakes } from './helpers/create-test-app';
import { resetDb } from './helpers/reset-db';
import { signUp, AuthedUser } from './helpers/auth';

// Minimum-size PNG. file-type only inspects magic bytes (89 50 4E 47 0D 0A 1A 0A),
// so a stub buffer with the correct signature plus enough trailing bytes for the
// detector is enough — no need for a structurally valid PNG.
const PNG_1x1 = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c62000000000005000175bbbabe0000000049454e44ae426082',
  'hex',
);

describe('Receipts (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let fakes: TestFakes;
  let me: AuthedUser;

  beforeAll(async () => {
    ({ app, dataSource, fakes } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDb(dataSource);
    fakes.storage.reset();
    fakes.queue.reset();
    fakes.parser.reset();
    me = await signUp(app);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createReceipt(
    user: AuthedUser,
    body: Record<string, unknown> = {},
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/receipts')
      .set(user.authHeader)
      .send({ payment_method: 'cash', ...body })
      .expect(201);
    return res.body.id;
  }

  describe('POST /receipts', () => {
    it('creates a receipt', async () => {
      const res = await request(app.getHttpServer())
        .post('/receipts')
        .set(me.authHeader)
        .send({ payment_method: 'card', purchased_at: '2026-04-01T10:00:00.000Z' })
        .expect(201);
      expect(res.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          user_id: me.userId,
          payment_method: 'card',
        }),
      );
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer()).post('/receipts').send({}).expect(401);
    });
  });

  describe('GET /receipts', () => {
    it('returns only the caller’s receipts', async () => {
      await createReceipt(me);
      const other = await signUp(app, { email: 'other@x.test' });
      await createReceipt(other);

      const res = await request(app.getHttpServer())
        .get('/receipts')
        .set(me.authHeader)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].user_id).toBe(me.userId);
    });
  });

  describe('GET /receipts/:id', () => {
    it('returns the receipt', async () => {
      const id = await createReceipt(me);
      await request(app.getHttpServer())
        .get(`/receipts/${id}`)
        .set(me.authHeader)
        .expect(200);
    });

    it('returns 404 for another user’s receipt', async () => {
      const other = await signUp(app, { email: 'other2@x.test' });
      const theirId = await createReceipt(other);
      await request(app.getHttpServer())
        .get(`/receipts/${theirId}`)
        .set(me.authHeader)
        .expect(404);
    });
  });

  describe('PUT /receipts/:id', () => {
    it('updates payment_method', async () => {
      const id = await createReceipt(me, { payment_method: 'cash' });
      const res = await request(app.getHttpServer())
        .put(`/receipts/${id}`)
        .set(me.authHeader)
        .send({ payment_method: 'card' })
        .expect(200);
      expect(res.body.payment_method).toBe('card');
    });
  });

  describe('POST /receipts/:id/photo', () => {
    it('uploads, returns a signed url, records storage and queue calls', async () => {
      const id = await createReceipt(me);

      const res = await request(app.getHttpServer())
        .post(`/receipts/${id}/photo`)
        .set(me.authHeader)
        .attach('photo', PNG_1x1, { filename: 'r.png', contentType: 'image/png' })
        .expect(201);

      expect(res.body.photo_url).toMatch(/^http:\/\/fake-storage\//);
      expect(fakes.storage.uploads).toHaveLength(1);
      expect(fakes.storage.uploads[0].key).toContain(`receipts/${me.userId}/${id}/`);
      expect(fakes.queue.jobs).toHaveLength(1);
      expect(fakes.queue.jobs[0].name).toBe('parse');
      expect(fakes.queue.jobs[0].data).toMatchObject({
        receipt_id: id,
        user_id: me.userId,
      });
    });

    it('returns 400 on an empty upload', async () => {
      const id = await createReceipt(me);
      await request(app.getHttpServer())
        .post(`/receipts/${id}/photo`)
        .set(me.authHeader)
        .expect(400);
    });

    it('returns 400 on non-image upload', async () => {
      const id = await createReceipt(me);
      await request(app.getHttpServer())
        .post(`/receipts/${id}/photo`)
        .set(me.authHeader)
        .attach('photo', Buffer.from('hello'), {
          filename: 'r.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });

    it('returns 404 for another user’s receipt', async () => {
      const other = await signUp(app, { email: 'other3@x.test' });
      const theirId = await createReceipt(other);
      await request(app.getHttpServer())
        .post(`/receipts/${theirId}/photo`)
        .set(me.authHeader)
        .attach('photo', PNG_1x1, { filename: 'r.png', contentType: 'image/png' })
        .expect(404);
    });
  });

  describe('DELETE /receipts/:id/photo', () => {
    it('deletes the stored photo', async () => {
      const id = await createReceipt(me);
      await request(app.getHttpServer())
        .post(`/receipts/${id}/photo`)
        .set(me.authHeader)
        .attach('photo', PNG_1x1, { filename: 'r.png', contentType: 'image/png' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/receipts/${id}/photo`)
        .set(me.authHeader)
        .expect(204);

      expect(fakes.storage.deletes).toHaveLength(1);
    });

    it('returns 404 when receipt has no photo', async () => {
      const id = await createReceipt(me);
      await request(app.getHttpServer())
        .delete(`/receipts/${id}/photo`)
        .set(me.authHeader)
        .expect(404);
    });
  });

  describe('DELETE /receipts/:id', () => {
    it('deletes the receipt', async () => {
      const id = await createReceipt(me);
      await request(app.getHttpServer())
        .delete(`/receipts/${id}`)
        .set(me.authHeader)
        .expect(200);
      await request(app.getHttpServer())
        .get(`/receipts/${id}`)
        .set(me.authHeader)
        .expect(404);
    });
  });
});
