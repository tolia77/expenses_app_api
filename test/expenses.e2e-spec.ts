import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { createTestApp } from './helpers/create-test-app';
import { resetDb } from './helpers/reset-db';
import { signUp, AuthedUser } from './helpers/auth';

describe('Expenses (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let me: AuthedUser;
  let categories: Record<string, string>;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });

  beforeEach(async () => {
    categories = await resetDb(dataSource);
    me = await signUp(app);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createReceipt(user: AuthedUser): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/receipts')
      .set(user.authHeader)
      .send({ payment_method: 'cash' })
      .expect(201);
    return res.body.id;
  }

  async function createExpense(
    user: AuthedUser,
    receiptId: string,
    body: Record<string, unknown>,
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post(`/receipts/${receiptId}/expenses`)
      .set(user.authHeader)
      .send({
        name: 'Milk',
        price: 3.5,
        category_id: categories['Groceries'],
        ...body,
      })
      .expect(201);
    return res.body.id;
  }

  describe('POST /receipts/:receiptId/expenses', () => {
    it('creates an expense under the receipt', async () => {
      const receiptId = await createReceipt(me);
      const res = await request(app.getHttpServer())
        .post(`/receipts/${receiptId}/expenses`)
        .set(me.authHeader)
        .send({
          name: 'Milk',
          price: 3.5,
          category_id: categories['Groceries'],
        })
        .expect(201);
      expect(res.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: 'Milk',
          receipt_id: receiptId,
          category_id: categories['Groceries'],
        }),
      );
    });

    it('returns 404 when the receipt belongs to another user', async () => {
      const other = await signUp(app, { email: 'o@x.test' });
      const theirReceipt = await createReceipt(other);
      await request(app.getHttpServer())
        .post(`/receipts/${theirReceipt}/expenses`)
        .set(me.authHeader)
        .send({ name: 'X', price: 1, category_id: categories['Groceries'] })
        .expect(404);
    });
  });

  describe('GET /expenses', () => {
    it('returns only the caller’s expenses', async () => {
      const mineReceipt = await createReceipt(me);
      await createExpense(me, mineReceipt, { name: 'Mine' });

      const other = await signUp(app, { email: 'o2@x.test' });
      const theirReceipt = await createReceipt(other);
      await createExpense(other, theirReceipt, { name: 'Theirs' });

      const res = await request(app.getHttpServer())
        .get('/expenses')
        .set(me.authHeader)
        .expect(200);

      const names = res.body.data.map((e: { name: string }) => e.name);
      expect(names).toContain('Mine');
      expect(names).not.toContain('Theirs');
    });

    it('filters by search term against expense + category name', async () => {
      const receiptId = await createReceipt(me);
      await createExpense(me, receiptId, {
        name: 'Apples',
        category_id: categories['Groceries'],
      });
      await createExpense(me, receiptId, {
        name: 'Burger',
        category_id: categories['Dining'],
      });

      // 'Groceries' matches the category name on the first expense only.
      const res = await request(app.getHttpServer())
        .get('/expenses?search=Groceries')
        .set(me.authHeader)
        .expect(200);

      const names = res.body.data.map((e: { name: string }) => e.name);
      expect(names).toContain('Apples');
      expect(names).not.toContain('Burger');
    });
  });

  describe('GET /expenses/:id', () => {
    it('returns the expense', async () => {
      const receiptId = await createReceipt(me);
      const expenseId = await createExpense(me, receiptId, {});
      const res = await request(app.getHttpServer())
        .get(`/expenses/${expenseId}`)
        .set(me.authHeader)
        .expect(200);
      expect(res.body.id).toBe(expenseId);
    });

    it('returns 404 for another user’s expense', async () => {
      const other = await signUp(app, { email: 'o3@x.test' });
      const theirReceipt = await createReceipt(other);
      const theirExpense = await createExpense(other, theirReceipt, {});
      await request(app.getHttpServer())
        .get(`/expenses/${theirExpense}`)
        .set(me.authHeader)
        .expect(404);
    });
  });

  describe('PUT /expenses/:id', () => {
    it('updates the expense name', async () => {
      const receiptId = await createReceipt(me);
      const expenseId = await createExpense(me, receiptId, { name: 'Old' });
      const res = await request(app.getHttpServer())
        .put(`/expenses/${expenseId}`)
        .set(me.authHeader)
        .send({ name: 'New' })
        .expect(200);
      expect(res.body.name).toBe('New');
    });
  });

  describe('DELETE /expenses/:id', () => {
    it('deletes the expense', async () => {
      const receiptId = await createReceipt(me);
      const expenseId = await createExpense(me, receiptId, {});
      await request(app.getHttpServer())
        .delete(`/expenses/${expenseId}`)
        .set(me.authHeader)
        .expect(200);
      await request(app.getHttpServer())
        .get(`/expenses/${expenseId}`)
        .set(me.authHeader)
        .expect(404);
    });
  });
});
