# Analytics Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand `GET /analytics/by-category` with receipt_count / expense_count / avg_expense / share_pct / last_purchased_at, and add five new endpoints: `by-merchant`, `by-payment-method`, `timeseries`, `top-expenses`, `summary`.

**Architecture:** Extend `AnalyticsService` with new methods (all `Expense`-repo driven, starting from `expense INNER JOIN receipt`). Extract `getPeriodBounds` into `util/period-bounds.ts` and add a new `util/timeseries-buckets.ts` helper — both pure modules with thorough unit tests. Controller adds five thin handlers that delegate to the service.

**Tech Stack:** NestJS 11, TypeORM 0.3 (Postgres), class-validator / class-transformer, Jest 30.

**Spec:** `docs/superpowers/specs/2026-04-22-analytics-expansion-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/analytics/util/period-bounds.ts` | create | Pure: `getPeriodBounds(dto)` (extracted from service) + `resolveGranularity(period, granularity?, bounds)` |
| `src/analytics/util/period-bounds.spec.ts` | create | Unit tests for both pure functions |
| `src/analytics/util/timeseries-buckets.ts` | create | Pure: `generateBuckets(start, end, granularity)` + `fillBuckets(rows, buckets)` |
| `src/analytics/util/timeseries-buckets.spec.ts` | create | Unit tests for both pure functions |
| `src/analytics/dto/timeseries-query.dto.ts` | create | `TimeseriesQueryDto extends AnalyticsQueryDto` with optional `granularity` |
| `src/analytics/dto/top-expenses-query.dto.ts` | create | `TopExpensesQueryDto extends AnalyticsQueryDto` with optional `limit` |
| `src/analytics/analytics.service.spec.ts` | create | `toBeDefined` scaffold (matches existing repo convention) |
| `src/analytics/analytics.controller.spec.ts` | create | Thin delegation tests with a mocked service |
| `src/analytics/analytics.service.ts` | modify | Use period-bounds helper; expand `byCategory`; add 5 new methods; add `round2` + `receiptAndExpenseCounts` helpers |
| `src/analytics/analytics.controller.ts` | modify | Add 5 `@Get` handlers, all thin |

`src/analytics/analytics.module.ts` is **not modified**. `src/analytics/dto/analytics-query.dto.ts` is **not modified** (reused as a base class).

---

## Task 1: Extract `getPeriodBounds` into a pure helper

**Files:**
- Create: `src/analytics/util/period-bounds.ts`
- Create: `src/analytics/util/period-bounds.spec.ts`
- Modify: `src/analytics/analytics.service.ts`

Extract the existing `getPeriodBounds` method out of `AnalyticsService` so it can be unit-tested in isolation and reused by the new endpoints without duplication.

- [ ] **Step 1: Write the failing test**

Create `src/analytics/util/period-bounds.spec.ts` with:

```ts
import { getPeriodBounds } from './period-bounds';

describe('getPeriodBounds', () => {
  const FIXED_NOW = new Date(Date.UTC(2026, 3, 15, 10, 30, 0)); // 2026-04-15T10:30:00Z, Wed

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('period=day returns today 00:00:00 to 23:59:59 UTC', () => {
    const { start, end } = getPeriodBounds({ period: 'day' });
    expect(start.toISOString()).toBe('2026-04-15T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-04-15T23:59:59.999Z');
  });

  it('period=week returns Sunday 00:00:00 to Saturday 23:59:59 UTC', () => {
    // 2026-04-15 is a Wednesday → week = 2026-04-12 (Sun) .. 2026-04-18 (Sat)
    const { start, end } = getPeriodBounds({ period: 'week' });
    expect(start.toISOString()).toBe('2026-04-12T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-04-18T23:59:59.999Z');
  });

  it('period=month returns first day 00:00:00 to last day 23:59:59 UTC', () => {
    const { start, end } = getPeriodBounds({ period: 'month' });
    expect(start.toISOString()).toBe('2026-04-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-04-30T23:59:59.999Z');
  });

  it('period=year returns Jan 1 00:00:00 to Dec 31 23:59:59 UTC', () => {
    const { start, end } = getPeriodBounds({ period: 'year' });
    expect(start.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-12-31T23:59:59.999Z');
  });

  it('period=custom parses from/to as UTC boundaries', () => {
    const { start, end } = getPeriodBounds({
      period: 'custom',
      from: '2026-03-01',
      to: '2026-03-31',
    });
    expect(start.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-31T23:59:59.999Z');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- period-bounds`
Expected: FAIL — `Cannot find module './period-bounds'`.

- [ ] **Step 3: Create the helper**

Create `src/analytics/util/period-bounds.ts` with:

```ts
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';

export interface PeriodBounds {
  start: Date;
  end: Date;
}

export function getPeriodBounds(dto: AnalyticsQueryDto): PeriodBounds {
  const now = new Date();
  switch (dto.period) {
    case 'day': {
      const start = new Date(now);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setUTCHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'week': {
      const day = now.getUTCDay(); // 0=Sunday
      const start = new Date(now);
      start.setUTCDate(now.getUTCDate() - day);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 6);
      end.setUTCHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'month': {
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
      );
      const end = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        ),
      );
      return { start, end };
    }
    case 'year': {
      const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
      const end = new Date(
        Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999),
      );
      return { start, end };
    }
    case 'custom': {
      return {
        start: new Date(dto.from + 'T00:00:00.000Z'),
        end: new Date(dto.to + 'T23:59:59.999Z'),
      };
    }
  }
}
```

- [ ] **Step 4: Delete the private method from the service**

Edit `src/analytics/analytics.service.ts`:

1. Add `import { getPeriodBounds } from './util/period-bounds';` near the top.
2. Delete the entire `private getPeriodBounds(dto: AnalyticsQueryDto): { start: Date; end: Date } { ... }` method.
3. Change the two call sites from `this.getPeriodBounds(dto)` to `getPeriodBounds(dto)`.

- [ ] **Step 5: Run helper tests + existing tests to verify nothing broke**

Run: `npm test -- analytics period-bounds`
Expected: all PASS. Helper tests pass; no regressions on any existing analytics test (there are none beyond module-level — nothing should break).

Run: `npm run build`
Expected: clean build.

- [ ] **Step 6: Commit**

```bash
git add src/analytics/util/period-bounds.ts src/analytics/util/period-bounds.spec.ts src/analytics/analytics.service.ts
git commit -m "refactor(analytics): extract getPeriodBounds into pure util"
```

---

## Task 2: Add `resolveGranularity` to the period-bounds helper

**Files:**
- Modify: `src/analytics/util/period-bounds.ts`
- Modify: `src/analytics/util/period-bounds.spec.ts`

`resolveGranularity` decides the bucket granularity for `/analytics/timeseries`: auto-picks from period when the client omits `granularity`, and validates explicit overrides.

Validation rule: explicit `granularity` must be **strictly finer** than the period's natural granularity. `period=day&granularity=week` is rejected. `period=week&granularity=week` is also rejected (use `/analytics/total` for that). For `period=custom`, granularity must fit inside the span — anything equal to or coarser than the span is rejected.

- [ ] **Step 1: Write the failing tests**

Append to `src/analytics/util/period-bounds.spec.ts`:

```ts
import { resolveGranularity } from './period-bounds';
import { BadRequestException } from '@nestjs/common';

describe('resolveGranularity', () => {
  it('period=day auto-picks hour', () => {
    expect(resolveGranularity('day', undefined)).toBe('hour');
  });

  it('period=week auto-picks day', () => {
    expect(resolveGranularity('week', undefined)).toBe('day');
  });

  it('period=month auto-picks day', () => {
    expect(resolveGranularity('month', undefined)).toBe('day');
  });

  it('period=year auto-picks month', () => {
    expect(resolveGranularity('year', undefined)).toBe('month');
  });

  it('period=custom picks hour for <= 2 day spans', () => {
    const start = new Date('2026-04-10T00:00:00.000Z');
    const end = new Date('2026-04-11T23:59:59.999Z');
    expect(resolveGranularity('custom', undefined, { start, end })).toBe('hour');
  });

  it('period=custom picks day for spans under 94 days', () => {
    const start = new Date('2026-01-01T00:00:00.000Z');
    const end = new Date('2026-03-31T23:59:59.999Z'); // 90 days
    expect(resolveGranularity('custom', undefined, { start, end })).toBe('day');
  });

  it('period=custom picks month for long spans', () => {
    const start = new Date('2025-01-01T00:00:00.000Z');
    const end = new Date('2026-04-01T23:59:59.999Z');
    expect(resolveGranularity('custom', undefined, { start, end })).toBe('month');
  });

  it('honors explicit override when strictly finer than period', () => {
    expect(resolveGranularity('month', 'hour')).toBe('hour');
    expect(resolveGranularity('year', 'day')).toBe('day');
  });

  it('rejects override equal to period granularity', () => {
    expect(() => resolveGranularity('day', 'day')).toThrow(BadRequestException);
    expect(() => resolveGranularity('week', 'week')).toThrow(BadRequestException);
  });

  it('rejects override coarser than period', () => {
    expect(() => resolveGranularity('day', 'month')).toThrow(BadRequestException);
    expect(() => resolveGranularity('week', 'month')).toThrow(BadRequestException);
  });

  it('rejects custom override that does not fit the span', () => {
    const start = new Date('2026-04-10T00:00:00.000Z');
    const end = new Date('2026-04-11T23:59:59.999Z'); // 2 days
    expect(() => resolveGranularity('custom', 'month', { start, end })).toThrow(
      BadRequestException,
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- period-bounds`
Expected: FAIL — `resolveGranularity is not a function`.

- [ ] **Step 3: Implement `resolveGranularity`**

Append to `src/analytics/util/period-bounds.ts`:

```ts
import { BadRequestException } from '@nestjs/common';

export type Granularity = 'hour' | 'day' | 'week' | 'month';
type Period = 'day' | 'week' | 'month' | 'year' | 'custom';

const GRANULARITY_RANK: Record<Granularity, number> = {
  hour: 1,
  day: 2,
  week: 3,
  month: 4,
};

// Natural granularity of a period (used as the "floor" — overrides must be strictly finer).
const PERIOD_RANK: Record<Exclude<Period, 'custom'>, number> = {
  day: GRANULARITY_RANK.day,
  week: GRANULARITY_RANK.week,
  month: GRANULARITY_RANK.month,
  year: GRANULARITY_RANK.month + 1, // year > month
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function resolveGranularity(
  period: Period,
  granularity: Granularity | undefined,
  bounds?: PeriodBounds,
): Granularity {
  if (period === 'custom') {
    if (!bounds) {
      throw new BadRequestException(
        'bounds are required when resolving granularity for custom period',
      );
    }
    const spanDays = (bounds.end.getTime() - bounds.start.getTime()) / MS_PER_DAY;

    if (granularity) {
      // Reject anything that would produce zero or one buckets.
      if (granularity === 'month' && spanDays < 60) {
        throw new BadRequestException(
          'granularity must be finer than period span',
        );
      }
      if (granularity === 'week' && spanDays < 14) {
        throw new BadRequestException(
          'granularity must be finer than period span',
        );
      }
      if (granularity === 'day' && spanDays < 2) {
        throw new BadRequestException(
          'granularity must be finer than period span',
        );
      }
      return granularity;
    }

    if (spanDays <= 2) return 'hour';
    if (spanDays < 94) return 'day';
    return 'month';
  }

  const periodRank = PERIOD_RANK[period];

  if (granularity) {
    if (GRANULARITY_RANK[granularity] >= periodRank) {
      throw new BadRequestException('granularity must be finer than period');
    }
    return granularity;
  }

  // Auto-pick: one step finer than the period.
  switch (period) {
    case 'day':
      return 'hour';
    case 'week':
      return 'day';
    case 'month':
      return 'day';
    case 'year':
      return 'month';
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- period-bounds`
Expected: all PASS (15 tests total in this file).

- [ ] **Step 5: Commit**

```bash
git add src/analytics/util/period-bounds.ts src/analytics/util/period-bounds.spec.ts
git commit -m "feat(analytics): add resolveGranularity for timeseries bucketing"
```

---

## Task 3: Add `timeseries-buckets.ts` pure helper

**Files:**
- Create: `src/analytics/util/timeseries-buckets.ts`
- Create: `src/analytics/util/timeseries-buckets.spec.ts`

`generateBuckets(start, end, granularity)` returns an ordered array of `Date` bucket starts from `start` to `end` (inclusive of both endpoints' buckets). `fillBuckets(rows, buckets)` merges the query results against that skeleton, zero-filling any missing bucket.

Weeks use Monday-based (ISO) alignment to match Postgres `date_trunc('week', ...)`. This does not conflict with `period=week` (Sunday-based) because that period cannot request weekly granularity (Task 2 rejects it).

- [ ] **Step 1: Write the failing tests**

Create `src/analytics/util/timeseries-buckets.spec.ts` with:

```ts
import { generateBuckets, fillBuckets } from './timeseries-buckets';

describe('generateBuckets', () => {
  it('hourly over a single UTC day produces 24 buckets', () => {
    const buckets = generateBuckets(
      new Date('2026-04-15T00:00:00.000Z'),
      new Date('2026-04-15T23:59:59.999Z'),
      'hour',
    );
    expect(buckets).toHaveLength(24);
    expect(buckets[0].toISOString()).toBe('2026-04-15T00:00:00.000Z');
    expect(buckets[23].toISOString()).toBe('2026-04-15T23:00:00.000Z');
  });

  it('daily over April 2026 produces 30 buckets', () => {
    const buckets = generateBuckets(
      new Date('2026-04-01T00:00:00.000Z'),
      new Date('2026-04-30T23:59:59.999Z'),
      'day',
    );
    expect(buckets).toHaveLength(30);
    expect(buckets[0].toISOString()).toBe('2026-04-01T00:00:00.000Z');
    expect(buckets[29].toISOString()).toBe('2026-04-30T00:00:00.000Z');
  });

  it('monthly over 2026 produces 12 buckets', () => {
    const buckets = generateBuckets(
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-12-31T23:59:59.999Z'),
      'month',
    );
    expect(buckets).toHaveLength(12);
    expect(buckets[0].toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(buckets[11].toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });

  it('weekly aligns to ISO Monday', () => {
    // Span covers 2026-04-12 (Sun) through 2026-05-03 (Sun) — 3+ weeks
    // ISO weeks starting Monday: Mar 30, Apr 6, Apr 13, Apr 20, Apr 27
    const buckets = generateBuckets(
      new Date('2026-04-12T00:00:00.000Z'),
      new Date('2026-05-03T23:59:59.999Z'),
      'week',
    );
    expect(buckets.map((b) => b.toISOString())).toEqual([
      '2026-04-06T00:00:00.000Z',
      '2026-04-13T00:00:00.000Z',
      '2026-04-20T00:00:00.000Z',
      '2026-04-27T00:00:00.000Z',
    ]);
  });

  it('produces output in UTC regardless of local tz', () => {
    const buckets = generateBuckets(
      new Date('2026-04-01T00:00:00.000Z'),
      new Date('2026-04-03T23:59:59.999Z'),
      'day',
    );
    for (const b of buckets) {
      expect(b.getUTCHours()).toBe(0);
      expect(b.getUTCMinutes()).toBe(0);
    }
  });
});

describe('fillBuckets', () => {
  it('zero-fills every bucket when rows are empty', () => {
    const buckets = [
      new Date('2026-04-01T00:00:00.000Z'),
      new Date('2026-04-02T00:00:00.000Z'),
      new Date('2026-04-03T00:00:00.000Z'),
    ];
    expect(fillBuckets([], buckets)).toEqual([
      { bucket: '2026-04-01T00:00:00.000Z', total: 0 },
      { bucket: '2026-04-02T00:00:00.000Z', total: 0 },
      { bucket: '2026-04-03T00:00:00.000Z', total: 0 },
    ]);
  });

  it('preserves totals for matched buckets and zero-fills gaps', () => {
    const buckets = [
      new Date('2026-04-01T00:00:00.000Z'),
      new Date('2026-04-02T00:00:00.000Z'),
      new Date('2026-04-03T00:00:00.000Z'),
    ];
    const rows = [
      { bucket: new Date('2026-04-01T00:00:00.000Z'), total: 12.34 },
      { bucket: new Date('2026-04-03T00:00:00.000Z'), total: 56.78 },
    ];
    expect(fillBuckets(rows, buckets)).toEqual([
      { bucket: '2026-04-01T00:00:00.000Z', total: 12.34 },
      { bucket: '2026-04-02T00:00:00.000Z', total: 0 },
      { bucket: '2026-04-03T00:00:00.000Z', total: 56.78 },
    ]);
  });

  it('output is ordered ascending by bucket', () => {
    const buckets = [
      new Date('2026-04-01T00:00:00.000Z'),
      new Date('2026-04-02T00:00:00.000Z'),
    ];
    const rows = [
      { bucket: new Date('2026-04-02T00:00:00.000Z'), total: 2 },
      { bucket: new Date('2026-04-01T00:00:00.000Z'), total: 1 },
    ];
    const result = fillBuckets(rows, buckets);
    expect(result[0].bucket).toBe('2026-04-01T00:00:00.000Z');
    expect(result[1].bucket).toBe('2026-04-02T00:00:00.000Z');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- timeseries-buckets`
Expected: FAIL — `Cannot find module './timeseries-buckets'`.

- [ ] **Step 3: Implement the helper**

Create `src/analytics/util/timeseries-buckets.ts` with:

```ts
import { Granularity } from './period-bounds';

export interface FilledBucket {
  bucket: string; // ISO-8601 UTC
  total: number;
}

export interface BucketRow {
  bucket: Date;
  total: number;
}

// Snap a date to the start of its bucket for the given granularity (UTC).
function truncToGranularity(date: Date, granularity: Granularity): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const hour = date.getUTCHours();

  switch (granularity) {
    case 'hour':
      return new Date(Date.UTC(year, month, day, hour, 0, 0, 0));
    case 'day':
      return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    case 'week': {
      // ISO week: Monday = 1, Sunday = 7. Postgres date_trunc('week', ...) uses the same.
      const dow = date.getUTCDay(); // 0=Sun..6=Sat
      const daysSinceMonday = (dow + 6) % 7; // Mon=0..Sun=6
      const monday = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      monday.setUTCDate(day - daysSinceMonday);
      return monday;
    }
    case 'month':
      return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  }
}

// Advance a date by one bucket step.
function addOneStep(date: Date, granularity: Granularity): Date {
  const next = new Date(date);
  switch (granularity) {
    case 'hour':
      next.setUTCHours(date.getUTCHours() + 1);
      break;
    case 'day':
      next.setUTCDate(date.getUTCDate() + 1);
      break;
    case 'week':
      next.setUTCDate(date.getUTCDate() + 7);
      break;
    case 'month':
      next.setUTCMonth(date.getUTCMonth() + 1);
      break;
  }
  return next;
}

export function generateBuckets(
  start: Date,
  end: Date,
  granularity: Granularity,
): Date[] {
  const buckets: Date[] = [];
  let cursor = truncToGranularity(start, granularity);
  while (cursor.getTime() <= end.getTime()) {
    buckets.push(new Date(cursor));
    cursor = addOneStep(cursor, granularity);
  }
  return buckets;
}

export function fillBuckets(
  rows: BucketRow[],
  buckets: Date[],
): FilledBucket[] {
  const byKey = new Map<string, number>();
  for (const r of rows) {
    byKey.set(r.bucket.toISOString(), r.total);
  }
  return buckets.map((b) => {
    const key = b.toISOString();
    return { bucket: key, total: byKey.get(key) ?? 0 };
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- timeseries-buckets`
Expected: all PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/analytics/util/timeseries-buckets.ts src/analytics/util/timeseries-buckets.spec.ts
git commit -m "feat(analytics): add timeseries bucket generator + zero-fill helper"
```

---

## Task 4: Expand `byCategory` response

**Files:**
- Modify: `src/analytics/analytics.service.ts`

Add `receipt_count`, `expense_count`, `avg_expense`, `share_pct`, `last_purchased_at` to each `by-category` row. Single SQL query with the aggregates; `avg_expense` and `share_pct` computed in JS.

No service spec test (repo convention — scaffold only, see Task 10). Verified via manual curl smoke at the end of this task.

- [ ] **Step 1: Replace `byCategory` + add `round2` helper**

In `src/analytics/analytics.service.ts`, replace the existing `byCategory` method with:

```ts
async byCategory(userId: string, dto: AnalyticsQueryDto) {
  const { start, end } = getPeriodBounds(dto);
  const rows = await this.expenseRepository
    .createQueryBuilder('expense')
    .innerJoin('expense.receipt', 'receipt')
    .innerJoin('expense.category', 'category')
    .select('category.id', 'category_id')
    .addSelect('category.name', 'category_name')
    .addSelect('SUM(expense.price * COALESCE(expense.amount, 1))', 'total')
    .addSelect('COUNT(DISTINCT receipt.id)', 'receipt_count')
    .addSelect('COUNT(*)', 'expense_count')
    .addSelect('MAX(receipt.purchased_at)', 'last_purchased_at')
    .where('receipt.user_id = :userId', { userId })
    .andWhere('receipt.purchased_at BETWEEN :start AND :end', { start, end })
    .groupBy('category.id')
    .addGroupBy('category.name')
    .orderBy('total', 'DESC')
    .getRawMany();

  const mapped = rows.map((r) => ({
    category_id: r.category_id,
    category_name: r.category_name,
    total: parseFloat(r.total ?? '0') || 0,
    receipt_count: parseInt(r.receipt_count ?? '0', 10) || 0,
    expense_count: parseInt(r.expense_count ?? '0', 10) || 0,
    last_purchased_at: r.last_purchased_at
      ? new Date(r.last_purchased_at).toISOString()
      : null,
  }));

  const grandTotal = mapped.reduce((sum, row) => sum + row.total, 0);

  return mapped.map((row) => ({
    category_id: row.category_id,
    category_name: row.category_name,
    total: round2(row.total),
    receipt_count: row.receipt_count,
    expense_count: row.expense_count,
    avg_expense: row.expense_count
      ? round2(row.total / row.expense_count)
      : 0,
    share_pct: grandTotal ? round2((row.total / grandTotal) * 100) : 0,
    last_purchased_at: row.last_purchased_at,
  }));
}
```

At the bottom of the file (after the class definition), add:

```ts
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
```

- [ ] **Step 2: Build + lint**

Run: `npm run build`
Expected: clean build.

Run: `npm run lint`
Expected: clean.

- [ ] **Step 3: Manual smoke**

Start the dev server and hit the endpoint against seeded data (adjust JWT/cookies per your local auth setup):

```bash
npm run start:dev
```

```bash
curl -s -H "Authorization: Bearer $JWT" 'http://localhost:3004/analytics/by-category?period=month' | jq
```

Expected: array of objects, each with `category_id`, `category_name`, `total`, `receipt_count`, `expense_count`, `avg_expense`, `share_pct`, `last_purchased_at`. `share_pct` across all rows sums to ~100 (within rounding).

- [ ] **Step 4: Commit**

```bash
git add src/analytics/analytics.service.ts
git commit -m "feat(analytics): expand by-category response with counts, average, share, recency"
```

---

## Task 5: Add `GET /analytics/by-merchant`

**Files:**
- Modify: `src/analytics/analytics.service.ts`
- Modify: `src/analytics/analytics.controller.ts`

- [ ] **Step 1: Add `byMerchant` to the service**

Append to the `AnalyticsService` class body (after `total`):

```ts
async byMerchant(userId: string, dto: AnalyticsQueryDto) {
  const { start, end } = getPeriodBounds(dto);
  const rows = await this.expenseRepository
    .createQueryBuilder('expense')
    .innerJoin('expense.receipt', 'receipt')
    .leftJoin('receipt.merchant', 'merchant')
    .select('merchant.id', 'merchant_id')
    .addSelect('merchant.name', 'merchant_name')
    .addSelect('SUM(expense.price * COALESCE(expense.amount, 1))', 'total')
    .addSelect('COUNT(DISTINCT receipt.id)', 'receipt_count')
    .addSelect('MAX(receipt.purchased_at)', 'last_purchased_at')
    .where('receipt.user_id = :userId', { userId })
    .andWhere('receipt.purchased_at BETWEEN :start AND :end', { start, end })
    .groupBy('merchant.id')
    .addGroupBy('merchant.name')
    .orderBy('total', 'DESC')
    .getRawMany();

  const mapped = rows.map((r) => ({
    merchant_id: r.merchant_id ?? null,
    merchant_name: r.merchant_name ?? 'Unknown',
    total: parseFloat(r.total ?? '0') || 0,
    receipt_count: parseInt(r.receipt_count ?? '0', 10) || 0,
    last_purchased_at: r.last_purchased_at
      ? new Date(r.last_purchased_at).toISOString()
      : null,
  }));

  const grandTotal = mapped.reduce((sum, row) => sum + row.total, 0);

  return mapped.map((row) => ({
    merchant_id: row.merchant_id,
    merchant_name: row.merchant_name,
    total: round2(row.total),
    receipt_count: row.receipt_count,
    share_pct: grandTotal ? round2((row.total / grandTotal) * 100) : 0,
    last_purchased_at: row.last_purchased_at,
  }));
}
```

- [ ] **Step 2: Add the controller handler**

In `src/analytics/analytics.controller.ts`, add a new handler below the existing ones:

```ts
@Get('by-merchant')
byMerchant(@CurrentUser() user, @Query() dto: AnalyticsQueryDto) {
  return this.analyticsService.byMerchant(user.sub, dto);
}
```

- [ ] **Step 3: Build + lint**

Run: `npm run build && npm run lint`
Expected: clean.

- [ ] **Step 4: Manual smoke**

With the dev server running:

```bash
curl -s -H "Authorization: Bearer $JWT" 'http://localhost:3004/analytics/by-merchant?period=month' | jq
```

Expected: array of `{merchant_id, merchant_name, total, receipt_count, share_pct, last_purchased_at}`. If any seeded receipts have `merchant_id = null`, there should be exactly one row with `merchant_id: null, merchant_name: "Unknown"`.

- [ ] **Step 5: Commit**

```bash
git add src/analytics/analytics.service.ts src/analytics/analytics.controller.ts
git commit -m "feat(analytics): add GET /analytics/by-merchant"
```

---

## Task 6: Add `GET /analytics/by-payment-method`

**Files:**
- Modify: `src/analytics/analytics.service.ts`
- Modify: `src/analytics/analytics.controller.ts`

- [ ] **Step 1: Add `byPaymentMethod` to the service**

Append to the `AnalyticsService` class body:

```ts
async byPaymentMethod(userId: string, dto: AnalyticsQueryDto) {
  const { start, end } = getPeriodBounds(dto);
  const rows = await this.expenseRepository
    .createQueryBuilder('expense')
    .innerJoin('expense.receipt', 'receipt')
    .select('receipt.payment_method', 'payment_method')
    .addSelect('SUM(expense.price * COALESCE(expense.amount, 1))', 'total')
    .addSelect('COUNT(DISTINCT receipt.id)', 'receipt_count')
    .where('receipt.user_id = :userId', { userId })
    .andWhere('receipt.purchased_at BETWEEN :start AND :end', { start, end })
    .groupBy('receipt.payment_method')
    .orderBy('total', 'DESC')
    .getRawMany();

  const mapped = rows.map((r) => ({
    payment_method: r.payment_method ?? null,
    total: parseFloat(r.total ?? '0') || 0,
    receipt_count: parseInt(r.receipt_count ?? '0', 10) || 0,
  }));

  const grandTotal = mapped.reduce((sum, row) => sum + row.total, 0);

  return mapped.map((row) => ({
    payment_method: row.payment_method,
    total: round2(row.total),
    receipt_count: row.receipt_count,
    share_pct: grandTotal ? round2((row.total / grandTotal) * 100) : 0,
  }));
}
```

- [ ] **Step 2: Add the controller handler**

Add below `byMerchant` in `src/analytics/analytics.controller.ts`:

```ts
@Get('by-payment-method')
byPaymentMethod(@CurrentUser() user, @Query() dto: AnalyticsQueryDto) {
  return this.analyticsService.byPaymentMethod(user.sub, dto);
}
```

- [ ] **Step 3: Build + lint**

Run: `npm run build && npm run lint`
Expected: clean.

- [ ] **Step 4: Manual smoke**

```bash
curl -s -H "Authorization: Bearer $JWT" 'http://localhost:3004/analytics/by-payment-method?period=month' | jq
```

Expected: array of `{payment_method, total, receipt_count, share_pct}`. Receipts with null `payment_method` produce a row with `payment_method: null`.

- [ ] **Step 5: Commit**

```bash
git add src/analytics/analytics.service.ts src/analytics/analytics.controller.ts
git commit -m "feat(analytics): add GET /analytics/by-payment-method"
```

---

## Task 7: Add `GET /analytics/top-expenses`

**Files:**
- Create: `src/analytics/dto/top-expenses-query.dto.ts`
- Modify: `src/analytics/analytics.service.ts`
- Modify: `src/analytics/analytics.controller.ts`

- [ ] **Step 1: Create the DTO**

Create `src/analytics/dto/top-expenses-query.dto.ts` with:

```ts
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { AnalyticsQueryDto } from './analytics-query.dto';

export class TopExpensesQueryDto extends AnalyticsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
```

- [ ] **Step 2: Add `topExpenses` to the service**

Append to the `AnalyticsService` class body:

```ts
async topExpenses(userId: string, dto: TopExpensesQueryDto) {
  const { start, end } = getPeriodBounds(dto);
  const limit = dto.limit ?? 10;
  const rows = await this.expenseRepository
    .createQueryBuilder('expense')
    .innerJoin('expense.receipt', 'receipt')
    .innerJoin('expense.category', 'category')
    .leftJoin('receipt.merchant', 'merchant')
    .select('expense.id', 'expense_id')
    .addSelect('expense.name', 'name')
    .addSelect('expense.price * COALESCE(expense.amount, 1)', 'amount')
    .addSelect('category.name', 'category_name')
    .addSelect('merchant.name', 'merchant_name')
    .addSelect('receipt.purchased_at', 'purchased_at')
    .addSelect('receipt.id', 'receipt_id')
    .where('receipt.user_id = :userId', { userId })
    .andWhere('receipt.purchased_at BETWEEN :start AND :end', { start, end })
    .orderBy('amount', 'DESC')
    .limit(limit)
    .getRawMany();

  return rows.map((r) => ({
    expense_id: r.expense_id,
    name: r.name,
    amount: round2(parseFloat(r.amount ?? '0') || 0),
    category_name: r.category_name,
    merchant_name: r.merchant_name ?? null,
    purchased_at: r.purchased_at
      ? new Date(r.purchased_at).toISOString()
      : null,
    receipt_id: r.receipt_id,
  }));
}
```

Add the import near the top of the file:

```ts
import { TopExpensesQueryDto } from './dto/top-expenses-query.dto';
```

- [ ] **Step 3: Add the controller handler**

In `src/analytics/analytics.controller.ts`, add:

```ts
@Get('top-expenses')
topExpenses(@CurrentUser() user, @Query() dto: TopExpensesQueryDto) {
  return this.analyticsService.topExpenses(user.sub, dto);
}
```

And import:

```ts
import { TopExpensesQueryDto } from './dto/top-expenses-query.dto';
```

- [ ] **Step 4: Build + lint**

Run: `npm run build && npm run lint`
Expected: clean.

- [ ] **Step 5: Manual smokes**

```bash
curl -s -H "Authorization: Bearer $JWT" 'http://localhost:3004/analytics/top-expenses?period=month' | jq '. | length'
# Expected: up to 10 (default limit)

curl -s -H "Authorization: Bearer $JWT" 'http://localhost:3004/analytics/top-expenses?period=month&limit=3' | jq '. | length'
# Expected: up to 3

curl -sw '%{http_code}' -H "Authorization: Bearer $JWT" 'http://localhost:3004/analytics/top-expenses?period=month&limit=500' -o /dev/null
# Expected: 400 (validation rejects limit > 100)
```

- [ ] **Step 6: Commit**

```bash
git add src/analytics/dto/top-expenses-query.dto.ts src/analytics/analytics.service.ts src/analytics/analytics.controller.ts
git commit -m "feat(analytics): add GET /analytics/top-expenses with limit query param"
```

---

## Task 8: Add `GET /analytics/timeseries`

**Files:**
- Create: `src/analytics/dto/timeseries-query.dto.ts`
- Modify: `src/analytics/analytics.service.ts`
- Modify: `src/analytics/analytics.controller.ts`

- [ ] **Step 1: Create the DTO**

Create `src/analytics/dto/timeseries-query.dto.ts` with:

```ts
import { IsOptional, IsIn } from 'class-validator';
import { AnalyticsQueryDto } from './analytics-query.dto';

export class TimeseriesQueryDto extends AnalyticsQueryDto {
  @IsOptional()
  @IsIn(['hour', 'day', 'week', 'month'])
  granularity?: 'hour' | 'day' | 'week' | 'month';
}
```

- [ ] **Step 2: Add `timeseries` to the service**

Append to the `AnalyticsService` class body:

```ts
async timeseries(userId: string, dto: TimeseriesQueryDto) {
  const bounds = getPeriodBounds(dto);
  const granularity = resolveGranularity(dto.period, dto.granularity, bounds);

  const rows = await this.expenseRepository
    .createQueryBuilder('expense')
    .innerJoin('expense.receipt', 'receipt')
    .select(`date_trunc('${granularity}', receipt.purchased_at)`, 'bucket')
    .addSelect('SUM(expense.price * COALESCE(expense.amount, 1))', 'total')
    .where('receipt.user_id = :userId', { userId })
    .andWhere('receipt.purchased_at BETWEEN :start AND :end', {
      start: bounds.start,
      end: bounds.end,
    })
    .groupBy('bucket')
    .orderBy('bucket', 'ASC')
    .getRawMany();

  const bucketRows = rows.map((r) => ({
    bucket: new Date(r.bucket),
    total: round2(parseFloat(r.total ?? '0') || 0),
  }));
  const buckets = generateBuckets(bounds.start, bounds.end, granularity);
  const filled = fillBuckets(bucketRows, buckets);

  return {
    period: dto.period,
    granularity,
    buckets: filled,
  };
}
```

Add the imports near the top of the file:

```ts
import { TimeseriesQueryDto } from './dto/timeseries-query.dto';
import { resolveGranularity } from './util/period-bounds';
import { generateBuckets, fillBuckets } from './util/timeseries-buckets';
```

**Safety note:** `granularity` is interpolated into the raw `date_trunc('${granularity}', ...)` expression. That's safe here because `granularity` came from `resolveGranularity` which only ever returns one of the four allow-listed strings — never raw client input. Do not change this to accept other values.

- [ ] **Step 3: Add the controller handler**

In `src/analytics/analytics.controller.ts`, add:

```ts
@Get('timeseries')
timeseries(@CurrentUser() user, @Query() dto: TimeseriesQueryDto) {
  return this.analyticsService.timeseries(user.sub, dto);
}
```

And import:

```ts
import { TimeseriesQueryDto } from './dto/timeseries-query.dto';
```

- [ ] **Step 4: Build + lint**

Run: `npm run build && npm run lint`
Expected: clean.

- [ ] **Step 5: Manual smokes**

```bash
# Auto-granularity for period=month → day buckets, zero-filled to ~28-31 entries
curl -s -H "Authorization: Bearer $JWT" 'http://localhost:3004/analytics/timeseries?period=month' | jq '.granularity, (.buckets | length)'
# Expected: "day", 28..31

# Explicit override
curl -s -H "Authorization: Bearer $JWT" 'http://localhost:3004/analytics/timeseries?period=month&granularity=week' | jq '.granularity'
# Expected: "week"

# Invalid override — coarser than period
curl -sw '%{http_code}' -H "Authorization: Bearer $JWT" 'http://localhost:3004/analytics/timeseries?period=day&granularity=month' -o /dev/null
# Expected: 400
```

- [ ] **Step 6: Commit**

```bash
git add src/analytics/dto/timeseries-query.dto.ts src/analytics/analytics.service.ts src/analytics/analytics.controller.ts
git commit -m "feat(analytics): add GET /analytics/timeseries with auto + explicit granularity"
```

---

## Task 9: Add `GET /analytics/summary`

**Files:**
- Modify: `src/analytics/analytics.service.ts`
- Modify: `src/analytics/analytics.controller.ts`

Summary composes already-built methods + one tiny new private method for receipt/expense counts, to avoid a 5-aggregate custom query.

- [ ] **Step 1: Add `receiptAndExpenseCounts` + `summary` to the service**

Append to the `AnalyticsService` class body:

```ts
private async receiptAndExpenseCounts(userId: string, dto: AnalyticsQueryDto) {
  const { start, end } = getPeriodBounds(dto);
  const row = await this.expenseRepository
    .createQueryBuilder('expense')
    .innerJoin('expense.receipt', 'receipt')
    .select('COUNT(DISTINCT receipt.id)', 'receipt_count')
    .addSelect('COUNT(expense.id)', 'expense_count')
    .where('receipt.user_id = :userId', { userId })
    .andWhere('receipt.purchased_at BETWEEN :start AND :end', { start, end })
    .getRawOne();

  return {
    receipt_count: parseInt(row?.receipt_count ?? '0', 10) || 0,
    expense_count: parseInt(row?.expense_count ?? '0', 10) || 0,
  };
}

async summary(userId: string, dto: AnalyticsQueryDto) {
  const [totalRow, counts, categories, merchants] = await Promise.all([
    this.total(userId, dto),
    this.receiptAndExpenseCounts(userId, dto),
    this.byCategory(userId, dto),
    this.byMerchant(userId, dto),
  ]);

  return {
    total: totalRow.total,
    receipt_count: counts.receipt_count,
    expense_count: counts.expense_count,
    avg_receipt_value: counts.receipt_count
      ? round2(totalRow.total / counts.receipt_count)
      : 0,
    top_categories: categories.slice(0, 3).map((c) => ({
      category_id: c.category_id,
      category_name: c.category_name,
      total: c.total,
    })),
    top_merchants: merchants.slice(0, 3).map((m) => ({
      merchant_id: m.merchant_id,
      merchant_name: m.merchant_name,
      total: m.total,
    })),
  };
}
```

- [ ] **Step 2: Add the controller handler**

In `src/analytics/analytics.controller.ts`, add:

```ts
@Get('summary')
summary(@CurrentUser() user, @Query() dto: AnalyticsQueryDto) {
  return this.analyticsService.summary(user.sub, dto);
}
```

- [ ] **Step 3: Build + lint**

Run: `npm run build && npm run lint`
Expected: clean.

- [ ] **Step 4: Manual smoke**

```bash
curl -s -H "Authorization: Bearer $JWT" 'http://localhost:3004/analytics/summary?period=month' | jq
```

Expected shape:

```json
{
  "total": 567.89,
  "receipt_count": 42,
  "expense_count": 137,
  "avg_receipt_value": 13.52,
  "top_categories": [ /* up to 3 */ ],
  "top_merchants":  [ /* up to 3 */ ]
}
```

Verify `total` matches `GET /analytics/total?period=month`, `top_categories.length <= 3`, `top_merchants.length <= 3`.

- [ ] **Step 5: Commit**

```bash
git add src/analytics/analytics.service.ts src/analytics/analytics.controller.ts
git commit -m "feat(analytics): add GET /analytics/summary dashboard payload"
```

---

## Task 10: Add service + controller spec scaffolds

**Files:**
- Create: `src/analytics/analytics.service.spec.ts`
- Create: `src/analytics/analytics.controller.spec.ts`

Scaffold spec (matches `categories.service.spec.ts`) + thin controller delegation tests with a mocked service. No DB required.

- [ ] **Step 1: Write the service scaffold spec**

Create `src/analytics/analytics.service.spec.ts` with:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { Expense } from '../expenses/expenses.entity';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(Expense),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

- [ ] **Step 2: Run it**

Run: `npm test -- analytics.service`
Expected: PASS (1 test).

- [ ] **Step 3: Write the controller delegation spec**

Create `src/analytics/analytics.controller.spec.ts` with:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

type ServiceMock = {
  [K in keyof AnalyticsService]: jest.Mock;
};

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: ServiceMock;

  const user = { sub: 'user-123' };

  beforeEach(async () => {
    service = {
      total: jest.fn(),
      byCategory: jest.fn(),
      byMerchant: jest.fn(),
      byPaymentMethod: jest.fn(),
      timeseries: jest.fn(),
      topExpenses: jest.fn(),
      summary: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [{ provide: AnalyticsService, useValue: service }],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates total() with user.sub and dto', async () => {
    const dto = { period: 'month' as const };
    service.total.mockResolvedValue({ total: 42 });

    const result = await controller.total(user, dto);

    expect(service.total).toHaveBeenCalledWith('user-123', dto);
    expect(result).toEqual({ total: 42 });
  });

  it('delegates byCategory()', async () => {
    const dto = { period: 'month' as const };
    service.byCategory.mockResolvedValue([]);

    await controller.byCategory(user, dto);

    expect(service.byCategory).toHaveBeenCalledWith('user-123', dto);
  });

  it('delegates byMerchant()', async () => {
    const dto = { period: 'month' as const };
    service.byMerchant.mockResolvedValue([]);

    await controller.byMerchant(user, dto);

    expect(service.byMerchant).toHaveBeenCalledWith('user-123', dto);
  });

  it('delegates byPaymentMethod()', async () => {
    const dto = { period: 'month' as const };
    service.byPaymentMethod.mockResolvedValue([]);

    await controller.byPaymentMethod(user, dto);

    expect(service.byPaymentMethod).toHaveBeenCalledWith('user-123', dto);
  });

  it('delegates timeseries()', async () => {
    const dto = { period: 'month' as const };
    service.timeseries.mockResolvedValue({
      period: 'month',
      granularity: 'day',
      buckets: [],
    });

    await controller.timeseries(user, dto);

    expect(service.timeseries).toHaveBeenCalledWith('user-123', dto);
  });

  it('delegates topExpenses()', async () => {
    const dto = { period: 'month' as const, limit: 5 };
    service.topExpenses.mockResolvedValue([]);

    await controller.topExpenses(user, dto);

    expect(service.topExpenses).toHaveBeenCalledWith('user-123', dto);
  });

  it('delegates summary()', async () => {
    const dto = { period: 'month' as const };
    service.summary.mockResolvedValue({
      total: 0,
      receipt_count: 0,
      expense_count: 0,
      avg_receipt_value: 0,
      top_categories: [],
      top_merchants: [],
    });

    await controller.summary(user, dto);

    expect(service.summary).toHaveBeenCalledWith('user-123', dto);
  });
});
```

- [ ] **Step 4: Run it**

Run: `npm test -- analytics.controller`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/analytics/analytics.service.spec.ts src/analytics/analytics.controller.spec.ts
git commit -m "test(analytics): scaffold service spec + delegation tests for controller"
```

---

## Task 11: Full-module verification

**Files:** (none modified)

Sanity pass to catch anything the incremental smokes missed.

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all analytics tests PASS. No regressions elsewhere.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: clean `dist/`.

- [ ] **Step 4: Reconciliation smoke**

With the dev server running, verify the three endpoints that share a grand total agree:

```bash
T=$(curl -s -H "Authorization: Bearer $JWT" 'http://localhost:3004/analytics/total?period=month' | jq -r .total)
S=$(curl -s -H "Authorization: Bearer $JWT" 'http://localhost:3004/analytics/summary?period=month' | jq -r .total)
C=$(curl -s -H "Authorization: Bearer $JWT" 'http://localhost:3004/analytics/by-category?period=month' | jq '[.[].total] | add')
M=$(curl -s -H "Authorization: Bearer $JWT" 'http://localhost:3004/analytics/by-merchant?period=month' | jq '[.[].total] | add')
P=$(curl -s -H "Authorization: Bearer $JWT" 'http://localhost:3004/analytics/by-payment-method?period=month' | jq '[.[].total] | add')
echo "total=$T summary=$S category_sum=$C merchant_sum=$M payment_sum=$P"
```

Expected: all five values agree to within 2 decimal places (rounding differences of ≤0.05 acceptable).

- [ ] **Step 5: No commit**

Verification only — no file changes.

---

## Done

All six endpoints (one expanded, five new) are live with DTO validation, thorough pure-helper coverage, thin controller delegation tests, and documented curl smokes. No schema changes, no module changes, no new dependencies.
