# Roadmap: Expenses App API

## Overview

Starting from a partially-built NestJS skeleton (Categories module, config, database), this roadmap
completes a multi-user expense tracker API end-to-end. Phase 1 fixes the existing bugs before
anything new is built; Phases 2-6 then layer in auth, per-user CRUD, TypeORM relations, and
querying/analytics — the four learning areas the project prioritises.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Cleanup** — Fix existing bugs across all modules, wire ValidationPipe, complete Receipts stub, standardize to scaffold patterns
- [x] **Phase 2: Auth** — User entity, JWT sign-up/login, guards, and per-user identity
- [x] **Phase 3: Categories + Merchants** — Extend Categories to per-user scope; add Merchants with full per-user CRUD and ownership enforcement
- [ ] **Phase 4: Receipts** — Receipt entity with TypeORM relations, nested CRUD, and date-range filtering
- [ ] **Phase 5: Expenses** — Expense entity nested under receipts, completing the core domain with full TypeORM relation chain
- [ ] **Phase 6: Search + Analytics** — Cross-field search and QueryBuilder-powered analytics grouped by category and period

---

## Phase Details

### Phase 1: Cleanup
**Goal**: All existing modules (Categories, Merchants, Receipts) are bug-free with consistent scaffold patterns, and the codebase is a correct template that future phases can safely build on.
**Depends on**: Nothing (first phase)
**Requirements**: CLEAN-01, CLEAN-02, CLEAN-03, CLEAN-04, CLEAN-05, VAL-02
**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md — Fix Categories + Merchants bugs, wire ValidationPipe, update CLAUDE.md
- [x] 01-02-PLAN.md — Complete Receipts module from stub to full CRUD with migration

---

### Phase 2: Auth
**Goal**: Users can create accounts, log in, and receive a JWT that gates every non-auth endpoint.
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, VAL-05
**Success Criteria** (what must be TRUE):
  1. `POST /auth/signup` with `{ "email": "a@b.com", "password": "secret" }` returns a JWT and creates a user row; re-sending the same email returns 409
  2. `POST /auth/login` with correct credentials returns a JWT; wrong password returns 401 without indicating whether the email exists
  3. `GET /auth/me` with a valid Bearer token returns `{ "id": ..., "email": "..." }` and no password field
  4. Any request to a non-`/auth/*` endpoint without a valid Bearer token returns 401
  5. A valid JWT carries the user id into the handler via `@CurrentUser()` so the user can be identified without a second DB query
**Plans:** 2 plans

Plans:
- [x] 02-01-PLAN.md — User entity + UsersModule + migration, install @nestjs/jwt + bcrypt, extend config for JWT env vars
- [x] 02-02-PLAN.md — AuthGuard + @Public() + @CurrentUser() decorators, AuthService with signup/login/me, global guard via APP_GUARD

---

### Phase 3: Categories + Merchants
**Goal**: Categories are per-user and Merchants are fully implemented with per-user isolation and correct ownership errors.
**Depends on**: Phase 2
**Requirements**: CAT-01, CAT-02, CAT-03, MERC-01, MERC-02, MERC-03, MERC-04, MERC-05, MERC-06, MERC-07, VAL-03, VAL-04
**Success Criteria** (what must be TRUE):
  1. `POST /categories` creates a category owned by the current user; `GET /categories` lists only that user's categories (another user's categories do not appear)
  2. `GET /categories/:id` on a category belonging to another user returns 404 (not 200, not 403)
  3. `POST /merchants`, `GET /merchants`, `GET /merchants/:id`, `PUT /merchants/:id`, `DELETE /merchants/:id` all work correctly for the owning user
  4. `GET /merchants/:id` or `DELETE /merchants/:id` for a merchant owned by a different user returns 404
  5. `GET /categories/:id` or `GET /merchants/:id` for a non-existent row returns 404 (never null or 500)
**Plans:** 2 plans

Plans:
- [x] 03-01-PLAN.md — Add userId FK to Category entity + migration; scope Categories service/controller to current user
- [x] 03-02-PLAN.md — Add userId FK to Merchant entity + migration; scope Merchants service/controller to current user

---

### Phase 4: Receipts
**Goal**: Receipts can be created, read, updated, and deleted under the current user, with TypeORM `@ManyToOne` relations wired and date-range filtering working.
**Depends on**: Phase 3
**Requirements**: RECP-01, RECP-02, RECP-03, RECP-04, RECP-05, RECP-06, RECP-07, RECP-08
**Success Criteria** (what must be TRUE):
  1. `POST /receipts` with a valid `merchant_id` (owned by the current user) creates a receipt and returns it; using a merchant owned by another user returns 403 or 404
  2. `GET /receipts/:id` returns the receipt with its expenses array eagerly loaded (empty array if none yet)
  3. `DELETE /receipts/:id` removes the receipt and all its child expenses (cascade confirmed by `GET /receipts/:id` returning 404)
  4. `GET /receipts?from=2025-01-01&to=2025-03-31` returns only receipts whose `purchased_at` falls within the range; receipts outside that range do not appear
  5. TypeORM relations are visible in the schema: `receipt.user`, `receipt.merchant`, and `receipt.expenses` are navigable via the entity definitions
**Plans:** 2/3 plans executed

Plans:
- [x] 04-01-PLAN.md — Add userId FK + User relation + Expense relation stub to Receipt entity; generate and run migration
- [x] 04-02-PLAN.md — Scope all Receipts CRUD to current user; merchant ownership validation on create/update
- [x] 04-03-PLAN.md — Date-range filtering on GET /receipts with from/to query params and DTO validation

---

### Phase 5: Expenses
**Goal**: Expenses can be created, read, updated, and deleted as children of a receipt, completing the User → Receipt → Expense relation chain.
**Depends on**: Phase 4
**Requirements**: EXPN-01, EXPN-02, EXPN-03, EXPN-04, EXPN-05, EXPN-06
**Success Criteria** (what must be TRUE):
  1. `POST /receipts/:receiptId/expenses` creates an expense on a receipt the current user owns; using a `category_id` from a different user returns 403 or 404
  2. `GET /expenses/:id` returns the expense only if its parent receipt belongs to the current user; another user's expense returns 404
  3. `PUT /expenses/:id` updates the expense and returns the updated row; `DELETE /expenses/:id` removes it and returns 204 or a success body
  4. `GET /receipts/:id` (from Phase 4) now shows created expenses in its `expenses` array
  5. The full domain round-trip works: log in → POST receipt → POST expense on that receipt → GET receipt shows the expense
**Plans:** 2 plans

Plans:
- [ ] 05-01-PLAN.md — Expense entity + migration, Receipt OneToMany relation, module exports for CategoriesModule and ReceiptsModule
- [ ] 05-02-PLAN.md — ExpensesModule with CRUD endpoints, ownership validation, ReceiptsService fixes (load expenses, use save)

---

### Phase 6: Search + Analytics
**Goal**: Expenses are searchable by name, merchant, or category; analytics return per-category and total spend figures computed via SQL aggregation.
**Depends on**: Phase 5
**Requirements**: SRCH-01, SRCH-02, SRCH-03, ANLT-01, ANLT-02, ANLT-03, ANLT-04, VAL-01
**Success Criteria** (what must be TRUE):
  1. `GET /expenses?search=coffee` returns all of the current user's expenses where "coffee" appears (case-insensitive) in the expense name, merchant name, or category name; expenses from other users do not appear
  2. `GET /analytics/by-category?period=month` returns an array of `{ categoryId, categoryName, total }` objects summing `price × amount` for the current month, computed by a SQL `GROUP BY` (not in-memory)
  3. `GET /analytics/total?period=week` returns a single `{ total }` value for the current week; `period=custom` with missing `from`/`to` returns 400
  4. `GET /analytics/by-category?period=custom&from=2025-01-01&to=2025-03-31` correctly filters by the supplied date range
  5. Every DTO across all modules has `class-validator` decorators on every field — a request with an unrecognised field returns 400 (whitelist enforcement is active everywhere)
**Plans**: TBD

Plans:
- [ ] 06-01: `GET /expenses?search=...` using TypeORM `QueryBuilder` with `ILIKE` joins across `expense.name`, `merchant.name`, `category.name`; scoped to current user
- [ ] 06-02: Analytics module — `GET /analytics/by-category` and `GET /analytics/total` with `QueryBuilder` `GROUP BY`, `SUM(price * amount)`, period computation, and `period=custom` validation
- [ ] 06-03: Audit all DTOs across all modules for missing `class-validator` decorators; confirm whitelist enforcement end-to-end

---

## Progress

**Execution Order:** 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Cleanup | 2/2 | Complete | 2026-04-15 |
| 2. Auth | 2/2 | Complete | 2026-04-15 |
| 3. Categories + Merchants | 2/2 | Complete | 2026-04-15 |
| 4. Receipts | 2/3 | In Progress|  |
| 5. Expenses | 0/2 | Not started | - |
| 6. Search + Analytics | 0/3 | Not started | - |
