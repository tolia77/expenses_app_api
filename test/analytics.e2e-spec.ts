import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { createTestApp } from './helpers/create-test-app';
import { resetDb } from './helpers/reset-db';
import { signUp, AuthedUser } from './helpers/auth';
import { Merchant } from '../src/merchants/entities/merchant.entity';
import { Receipt } from '../src/receipts/entities/receipt.entity';
import { Expense } from '../src/expenses/expenses.entity';

interface Fixture {
  merchantA: string;
  merchantB: string;
  categoryGroceries: string;
  categoryDining: string;
}

async function seedAnalyticsFixture(
  dataSource: DataSource,
  user: AuthedUser,
  categories: Record<string, string>,
): Promise<Fixture> {
  const merchantRepo = dataSource.getRepository(Merchant);
  const receiptRepo = dataSource.getRepository(Receipt);
  const expenseRepo = dataSource.getRepository(Expense);

  const [merchantA, merchantB] = await merchantRepo.save([
    { name: 'Market A', user_id: user.userId },
    { name: 'Diner B', user_id: user.userId },
  ]);

  const [r1, r2, r3] = await receiptRepo.save([
    {
      user_id: user.userId,
      merchant: merchantA,
      payment_method: 'card',
      purchased_at: new Date('2026-04-01T10:00:00Z'),
    },
    {
      user_id: user.userId,
      merchant: merchantA,
      payment_method: 'cash',
      purchased_at: new Date('2026-04-10T10:00:00Z'),
    },
    {
      user_id: user.userId,
      merchant: merchantB,
      payment_method: 'card',
      purchased_at: new Date('2026-04-20T10:00:00Z'),
    },
  ]);

  await expenseRepo.save([
    {
      receipt_id: r1.id,
      category_id: categories['Groceries'],
      name: 'Apples',
      price: 5 as any,
    },
    {
      receipt_id: r1.id,
      category_id: categories['Groceries'],
      name: 'Milk',
      price: 3 as any,
    },
    {
      receipt_id: r2.id,
      category_id: categories['Groceries'],
      name: 'Bread',
      price: 2 as any,
    },
    {
      receipt_id: r3.id,
      category_id: categories['Dining'],
      name: 'Burger',
      price: 10 as any,
    },
    {
      receipt_id: r3.id,
      category_id: categories['Dining'],
      name: 'Fries',
      price: 4 as any,
    },
  ]);

  return {
    merchantA: merchantA.id,
    merchantB: merchantB.id,
    categoryGroceries: categories['Groceries'],
    categoryDining: categories['Dining'],
  };
}

describe('Analytics (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let me: AuthedUser;
  let fx: Fixture;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });

  beforeEach(async () => {
    const categories = await resetDb(dataSource);
    me = await signUp(app);
    fx = await seedAnalyticsFixture(dataSource, me, categories);
  });

  afterAll(async () => {
    await app.close();
  });

  // AnalyticsQueryDto requires `period`. With `period=custom` the `from`/`to`
  // become required and used as the bounds.
  const range = '?period=custom&from=2026-04-01&to=2026-04-30';

  it('GET /analytics/total sums all expenses in range', async () => {
    const res = await request(app.getHttpServer())
      .get(`/analytics/total${range}`)
      .set(me.authHeader)
      .expect(200);
    // 5 + 3 + 2 + 10 + 4 = 24
    expect(Number(res.body.total)).toBe(24);
  });

  it('GET /analytics/by-category returns per-category totals', async () => {
    const res = await request(app.getHttpServer())
      .get(`/analytics/by-category${range}`)
      .set(me.authHeader)
      .expect(200);
    const groceries = res.body.find(
      (r: { category_id: string }) => r.category_id === fx.categoryGroceries,
    );
    const dining = res.body.find(
      (r: { category_id: string }) => r.category_id === fx.categoryDining,
    );
    expect(Number(groceries.total)).toBe(10); // 5 + 3 + 2
    expect(Number(dining.total)).toBe(14); // 10 + 4
  });

  it('GET /analytics/by-merchant returns per-merchant totals', async () => {
    const res = await request(app.getHttpServer())
      .get(`/analytics/by-merchant${range}`)
      .set(me.authHeader)
      .expect(200);
    const marketA = res.body.find(
      (r: { merchant_id: string }) => r.merchant_id === fx.merchantA,
    );
    const dinerB = res.body.find(
      (r: { merchant_id: string }) => r.merchant_id === fx.merchantB,
    );
    expect(Number(marketA.total)).toBe(10);
    expect(Number(dinerB.total)).toBe(14);
  });

  it('GET /analytics/by-payment-method returns per-method totals', async () => {
    const res = await request(app.getHttpServer())
      .get(`/analytics/by-payment-method${range}`)
      .set(me.authHeader)
      .expect(200);
    const card = res.body.find(
      (r: { payment_method: string }) => r.payment_method === 'card',
    );
    const cash = res.body.find(
      (r: { payment_method: string }) => r.payment_method === 'cash',
    );
    expect(Number(card.total)).toBe(22); // r1 (5+3) + r3 (10+4)
    expect(Number(cash.total)).toBe(2); // r2 (2)
  });

  it('GET /analytics/top-expenses returns the biggest items first', async () => {
    const res = await request(app.getHttpServer())
      .get(`/analytics/top-expenses${range}&limit=2`)
      .set(me.authHeader)
      .expect(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe('Burger');
    // Field is `amount` (price * COALESCE(amount, 1)), not `price`.
    expect(Number(res.body[0].amount)).toBe(10);
  });

  it('GET /analytics/timeseries returns the bucket shape over the window', async () => {
    const res = await request(app.getHttpServer())
      .get(`/analytics/timeseries${range}&granularity=day`)
      .set(me.authHeader)
      .expect(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        period: 'custom',
        granularity: 'day',
        buckets: expect.any(Array),
      }),
    );
    // April has 30 days; the helper fills empty buckets with total: 0.
    expect(res.body.buckets.length).toBe(30);
    expect(res.body.buckets[0]).toEqual(
      expect.objectContaining({
        bucket: expect.any(String),
        total: expect.any(Number),
      }),
    );
  });

  it('GET /analytics/summary returns the aggregate shape', async () => {
    const res = await request(app.getHttpServer())
      .get(`/analytics/summary${range}`)
      .set(me.authHeader)
      .expect(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        total: 24,
        receipt_count: 3,
        expense_count: 5,
        top_categories: expect.any(Array),
        top_merchants: expect.any(Array),
      }),
    );
  });

  it('does not leak another user’s data', async () => {
    const other = await signUp(app, { email: 'other@x.test' });
    const res = await request(app.getHttpServer())
      .get(`/analytics/total${range}`)
      .set(other.authHeader)
      .expect(200);
    expect(Number(res.body.total)).toBe(0);
  });
});
