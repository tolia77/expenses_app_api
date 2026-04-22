# Analytics expansion — design

**Date:** 2026-04-22
**Scope:** Expand `GET /analytics/by-category` with richer per-row fields, and add five new analytics endpoints.

## Motivation

Today the analytics module ships two endpoints (`GET /analytics/total`, `GET /analytics/by-category`) that cover only the coarsest question: "how much did I spend, overall or per category?". Users need richer per-category context (receipt counts, averages, share of spend, recency) and more slicing axes (merchant, payment method, time series, top line items, dashboard summary) to turn the API into something a UI can build a dashboard on.

## Scope

### Expanded endpoint

`GET /analytics/by-category` keeps its existing query shape (`?period=day|week|month|year|custom`, `from`/`to` when custom) and expands each row from:

```json
{ "category_id": "uuid", "category_name": "Food", "total": 123.45 }
```

to:

```json
{
  "category_id": "uuid",
  "category_name": "Food",
  "total": 123.45,
  "receipt_count": 7,
  "expense_count": 15,
  "avg_expense": 8.23,
  "share_pct": 34.50,
  "last_purchased_at": "2026-04-20T14:30:00.000Z"
}
```

Definitions:

- `total` — sum of `expense.price * COALESCE(expense.amount, 1)` for expenses in this category, over the period. Unchanged from today.
- `receipt_count` — `COUNT(DISTINCT receipt.id)` contributing to the category in the period.
- `expense_count` — count of expense line items in the category in the period.
- `avg_expense` — `total / expense_count` (0 if `expense_count = 0`, rounded to 2 decimals).
- `share_pct` — this row's `total` as a percentage of the sum of `total` across all rows in the response (i.e., the user's period total). Rounded to 2 decimals.
- `last_purchased_at` — `MAX(receipt.purchased_at)` of receipts contributing to this category in the period. ISO-8601 UTC string.

Rows ordered by `total DESC`.

### New endpoints

All accept the same period query (`AnalyticsQueryDto`) as the existing endpoints. All are scoped to the authenticated user via `@CurrentUser` and `receipt.user_id = :userId`.

#### `GET /analytics/by-merchant?period=...`

```json
[
  {
    "merchant_id": "uuid | null",
    "merchant_name": "Starbucks",
    "total": 123.45,
    "receipt_count": 7,
    "share_pct": 12.30,
    "last_purchased_at": "2026-04-20T14:30:00.000Z"
  }
]
```

Null merchants collapse into a single row with `merchant_id: null`, `merchant_name: "Unknown"`. This keeps row totals reconcilable against `/analytics/total`.

#### `GET /analytics/by-payment-method?period=...`

```json
[
  {
    "payment_method": "card | null",
    "total": 123.45,
    "receipt_count": 7,
    "share_pct": 12.30
  }
]
```

Null `payment_method` collapses into one row with `payment_method: null`. Client reads null as "Unknown" (no synthesized label in the payload — `payment_method` is a free-form string so there's no identity separate from the value).

#### `GET /analytics/timeseries?period=...&granularity=hour|day|week|month`

```json
{
  "period": "month",
  "granularity": "day",
  "buckets": [
    { "bucket": "2026-04-01T00:00:00.000Z", "total": 12.34 },
    { "bucket": "2026-04-02T00:00:00.000Z", "total": 0 }
  ]
}
```

- `granularity` is optional. Auto-pick when omitted:
  - `period=day` → `hour`
  - `period=week` → `day`
  - `period=month` → `day`
  - `period=year` → `month`
  - `period=custom` → span-based: `≤ 2 days → hour`, `≤ 93 days → day`, otherwise `month`
- When explicitly provided, `granularity` must be equal to or finer than the period's natural granularity. A `period=day&granularity=month` request returns `400 BadRequest`.
- Zero-filled: every bucket in the period range is present, even with `total = 0`.
- Bucket labels are ISO-8601 UTC timestamps at the bucket start.

#### `GET /analytics/top-expenses?period=...&limit=N`

```json
[
  {
    "expense_id": "uuid",
    "name": "Widget",
    "amount": 123.45,
    "category_name": "Tools",
    "merchant_name": "Hardware Store | null",
    "purchased_at": "2026-04-20T14:30:00.000Z",
    "receipt_id": "uuid"
  }
]
```

- `amount` = `expense.price * COALESCE(expense.amount, 1)` — the line's effective total.
- `limit` optional, default `10`, max `100`. Invalid `limit` returns `400`.
- Ordered by `amount DESC`.

#### `GET /analytics/summary?period=...`

```json
{
  "total": 567.89,
  "receipt_count": 42,
  "expense_count": 137,
  "avg_receipt_value": 13.52,
  "top_categories": [
    { "category_id": "uuid", "category_name": "Food", "total": 234.56 }
  ],
  "top_merchants": [
    { "merchant_id": "uuid", "merchant_name": "Starbucks", "total": 123.45 }
  ]
}
```

- `avg_receipt_value` = `total / receipt_count` (0 if `receipt_count = 0`).
- `top_categories` / `top_merchants` each capped at 3, sorted by `total DESC`. Fields are a strict subset of the full `by-category` / `by-merchant` rows.
- Built by composing the other service methods in parallel (see Implementation).

## Non-goals

- Period-over-period comparison (proposed option F during brainstorming, deferred).
- Custom grouping/dimensions selectable by the client. Each endpoint is a fixed shape.
- Caching or materialized views. Queries run against live data every request. Reasonable at the current scale.
- Pagination on `top-expenses`. The endpoint returns up to `limit` and that's it. Clients wanting deeper lists can use the existing `GET /expenses` search endpoint.

## Architecture

Single service, two pure helper modules. Matches the "small well-bounded units" guideline without introducing sub-services for this size.

### Files to create

```
src/analytics/
  dto/
    timeseries-query.dto.ts          # extends AnalyticsQueryDto + optional granularity
    top-expenses-query.dto.ts        # extends AnalyticsQueryDto + optional limit (default 10, max 100)
  util/
    period-bounds.ts                 # getPeriodBounds(dto), resolveGranularity(period, granularity?, bounds)
    period-bounds.spec.ts
    timeseries-buckets.ts            # generateBuckets(start, end, granularity) + fillBuckets(rows, buckets)
    timeseries-buckets.spec.ts
  analytics.service.spec.ts          # new — covers all service methods
  analytics.controller.spec.ts       # new — thin, asserts delegation
```

### Files to modify

```
src/analytics/
  analytics.controller.ts            # add 5 @Get handlers; all thin, delegate to service
  analytics.service.ts               # add 5 methods + expand byCategory(); use util helpers
  analytics.module.ts                # add Receipt to TypeOrmModule.forFeature
```

`dto/analytics-query.dto.ts` is unchanged — reused as base for the new DTOs via `extends`.

### Unit responsibilities

| Unit | Purpose | Depends on |
|---|---|---|
| `AnalyticsController` | HTTP surface, DTO validation, auth | `AnalyticsService` |
| `AnalyticsService` | Compose TypeORM queries, return API shape | `Repository<Expense>`, `Repository<Receipt>`, helpers |
| `period-bounds.ts` | Pure date math: period → `{start, end}`, resolve granularity | nothing |
| `timeseries-buckets.ts` | Pure bucketing: generate labels + zero-fill | nothing (hand-rolled UTC math) |

### DTO shape

```ts
// timeseries-query.dto.ts
import { IsOptional, IsIn } from 'class-validator';
import { AnalyticsQueryDto } from './analytics-query.dto';

export class TimeseriesQueryDto extends AnalyticsQueryDto {
  @IsOptional()
  @IsIn(['hour', 'day', 'week', 'month'])
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

// top-expenses-query.dto.ts
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { AnalyticsQueryDto } from './analytics-query.dto';

export class TopExpensesQueryDto extends AnalyticsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;  // service defaults to 10 when undefined
}
```

### Module change

`AnalyticsService` currently only injects `Repository<Expense>`. `by-payment-method` and `summary` need receipt-level aggregates, so inject `Repository<Receipt>` too. One-line change to `AnalyticsModule`:

```ts
TypeOrmModule.forFeature([Expense, Receipt])
```

## Query strategy

### Expanded `byCategory` (single query)

```sql
SELECT
  category.id                                             AS category_id,
  category.name                                           AS category_name,
  SUM(expense.price * COALESCE(expense.amount, 1))        AS total,
  COUNT(DISTINCT receipt.id)                              AS receipt_count,
  COUNT(*)                                                AS expense_count,
  MAX(receipt.purchased_at)                               AS last_purchased_at
FROM expense
INNER JOIN receipt  ON receipt.id = expense.receipt_id
INNER JOIN category ON category.id = expense.category_id
WHERE receipt.user_id = :userId
  AND receipt.purchased_at BETWEEN :start AND :end
GROUP BY category.id, category.name
ORDER BY total DESC
```

In JS after the query: compute `grand_total = sum(rows.total)`, then per row `share_pct = grand_total ? (total / grand_total) * 100 : 0`, `avg_expense = expense_count ? total / expense_count : 0`. Round to 2 decimals.

### `byMerchant`

Same shape, `LEFT JOIN merchant`, `GROUP BY merchant.id, merchant.name`. Postgres groups all null `merchant.id` rows into a single bucket. JS mapper emits `merchant_name: row.merchant_name ?? 'Unknown'`.

### `byPaymentMethod`

```sql
SELECT
  receipt.payment_method                                  AS payment_method,
  SUM(expense.price * COALESCE(expense.amount, 1))        AS total,
  COUNT(DISTINCT receipt.id)                              AS receipt_count
FROM expense
INNER JOIN receipt ON receipt.id = expense.receipt_id
WHERE receipt.user_id = :userId
  AND receipt.purchased_at BETWEEN :start AND :end
GROUP BY receipt.payment_method
ORDER BY total DESC
```

JS mapper passes `payment_method` through (null stays null). `share_pct` computed in JS.

### `timeseries`

```sql
SELECT
  date_trunc(:granularity, receipt.purchased_at)          AS bucket,
  SUM(expense.price * COALESCE(expense.amount, 1))        AS total
FROM expense
INNER JOIN receipt ON receipt.id = expense.receipt_id
WHERE receipt.user_id = :userId
  AND receipt.purchased_at BETWEEN :start AND :end
GROUP BY bucket
ORDER BY bucket ASC
```

`:granularity` comes from a hard-coded allow-list (`'hour' | 'day' | 'week' | 'month'`) — never interpolated from raw client input — to keep `date_trunc` safe. Then `fillBuckets(rows, generateBuckets(start, end, granularity))` zero-fills gaps. Output ordered ASC by bucket.

### `topExpenses` (no GROUP BY)

```sql
SELECT
  expense.id                                              AS expense_id,
  expense.name                                            AS name,
  (expense.price * COALESCE(expense.amount, 1))           AS amount,
  category.name                                           AS category_name,
  merchant.name                                           AS merchant_name,
  receipt.purchased_at                                    AS purchased_at,
  receipt.id                                              AS receipt_id
FROM expense
INNER JOIN receipt  ON receipt.id = expense.receipt_id
INNER JOIN category ON category.id = expense.category_id
LEFT  JOIN merchant ON merchant.id = receipt.merchant_id
WHERE receipt.user_id = :userId
  AND receipt.purchased_at BETWEEN :start AND :end
ORDER BY amount DESC
LIMIT :limit
```

### `summary` (composes existing methods)

```ts
async summary(userId: string, dto: AnalyticsQueryDto) {
  const [totalRow, receiptStats, categories, merchants] = await Promise.all([
    this.total(userId, dto),
    this.receiptAndExpenseCounts(userId, dto),
    this.byCategory(userId, dto),
    this.byMerchant(userId, dto),
  ]);
  return {
    total: totalRow.total,
    receipt_count: receiptStats.receipt_count,
    expense_count: receiptStats.expense_count,
    avg_receipt_value: receiptStats.receipt_count
      ? round2(totalRow.total / receiptStats.receipt_count)
      : 0,
    top_categories: categories.slice(0, 3).map(c => ({
      category_id: c.category_id,
      category_name: c.category_name,
      total: c.total,
    })),
    top_merchants: merchants.slice(0, 3).map(m => ({
      merchant_id: m.merchant_id,
      merchant_name: m.merchant_name,
      total: m.total,
    })),
  };
}
```

`receiptAndExpenseCounts` is a new small private method:

```sql
SELECT
  COUNT(DISTINCT receipt.id)                              AS receipt_count,
  COUNT(expense.id)                                       AS expense_count
FROM expense
INNER JOIN receipt ON receipt.id = expense.receipt_id
WHERE receipt.user_id = :userId
  AND receipt.purchased_at BETWEEN :start AND :end
```

Four queries in parallel. Simpler than a custom multi-aggregate, and the grouping methods are already covered by tests.

## Error handling and validation

- **DTO layer** (existing `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, `transform`) covers most cases:
  - `period` not in enum → 400
  - `period=custom` without `from`/`to` → 400
  - `granularity` not in enum → 400
  - `limit` out of range (1..100) or not an integer → 400
- **Service layer** validates the one thing DTOs can't: `granularity` must be ≤ the period's natural granularity. A `period=day&granularity=month` throws `BadRequestException('granularity must be finer than period')`. Logic lives in `resolveGranularity`.
- **Auth**: uses existing `@CurrentUser` decorator. No user scoping logic beyond `WHERE receipt.user_id = :userId`.
- **Empty results**: endpoints returning arrays return `[]`. `summary` with no receipts returns zeros and empty top arrays (not an error).
- **Divide-by-zero**: `avg_expense`, `avg_receipt_value`, `share_pct` all guarded before rounding.
- **Numeric precision**: Postgres `SUM` on `decimal` returns a string via TypeORM. Use existing `parseFloat(r.total ?? '0') || 0` pattern. Round displayed values to 2 decimals using a shared `round2(n) = Math.round(n * 100) / 100` helper.
- **SQL injection on `granularity`**: only values from the enum are forwarded to `date_trunc`; never raw client input.

## Testing strategy

### `period-bounds.spec.ts` (pure unit)

- Each period produces expected `{start, end}` (fix `Date.now()` via fake timers).
- Custom period parses `from`/`to` correctly.
- `resolveGranularity`: auto-pick for each period; respects explicit override; rejects granularity coarser than period.

### `timeseries-buckets.spec.ts` (pure unit)

- `generateBuckets`: correct count and labels for each granularity over known spans.
- `fillBuckets`: preserves totals for matched buckets, emits `0` for gaps, output ordered ASC.
- Timezone: inputs are UTC, outputs are UTC ISO strings. One test asserting no local-time drift.

### `analytics.service.spec.ts` (integration, real test DB)

Seed fixture (one `beforeAll`): 1 user, 3 categories, 2 merchants, 4 receipts across different dates and payment methods, ~10 expenses. One receipt with `merchant_id = null`. One receipt with `payment_method = null`.

- `byCategory`: totals, `receipt_count` (distinct), `expense_count`, `avg_expense`, `share_pct` sums to ~100 (within rounding), `last_purchased_at`.
- `byMerchant`: "Unknown" bucket present for the null-merchant receipt; shares reconcile.
- `byPaymentMethod`: `payment_method: null` row present; shares reconcile.
- `timeseries`: zero-filled empty days present; explicit granularity honored; granularity-coarser-than-period throws `BadRequestException`.
- `topExpenses`: returns in `amount DESC` order; respects `limit`; out-of-range `limit` rejected by DTO.
- `summary`: `avg_receipt_value` correct; `top_categories` / `top_merchants` capped at 3.
- **User isolation**: seed a second user with expenses and assert they don't leak into the first user's results for every method.

### `analytics.controller.spec.ts` (thin unit)

For each handler: service method called with `(user.sub, dto)`; return value passed through.

### Test DB pattern

The existing `receipts` / `expenses` service specs are the reference — match their setup style before implementing. If they use a real test DB, mirror that. If they use mocked repositories, mirror that for the new spec (and note that SQL coverage moves to e2e).

## Open questions / follow-ups

- Period-over-period comparison (`/analytics/compare`) deferred. Worth revisiting if users start wanting deltas.
- If response payloads grow, consider `Cache-Control` hints or an in-memory per-user cache keyed on `(userId, period, from, to)`.
