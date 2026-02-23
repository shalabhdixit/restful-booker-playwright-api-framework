# Playwright API Automation Framework — Restful Booker

> A production-quality, zero-fluff API testing framework built entirely on **Playwright's `APIRequestContext`** — no Axios, no Supertest, no extra HTTP libraries needed.

**Target API:** [https://restful-booker.herokuapp.com](https://restful-booker.herokuapp.com)
**Stack:** TypeScript · Playwright Test · dotenv
**Pattern:** Page Object Model adapted for APIs (API Object Model)

---

## Table of Contents

1. [Why This Framework Exists](#1-why-this-framework-exists)
2. [Architecture at a Glance](#2-architecture-at-a-glance)
3. [Project Structure — Every File Explained](#3-project-structure--every-file-explained)
   - [playwright.config.ts](#playwrightconfigts)
   - [src/core/types.ts](#srccoretypts)
   - [src/core/apiClient.ts](#srccoreapiclientts)
   - [src/core/assertions.ts](#srccoreassertionsts)
   - [src/config/env.ts](#srcconfigenvts)
   - [src/data/factories.ts](#srcdatafactoriests)
   - [src/apis/auth.api.ts](#srcapisauthapiits)
   - [src/apis/booking.api.ts](#srcapisbookingapiits)
   - [src/fixtures/apiTest.ts](#srcfixturesapitestts)
   - [tests/ping.spec.ts](#testspingspects)
   - [tests/auth.spec.ts](#testsauthspects)
   - [tests/booking.lifecycle.spec.ts](#testsbookinglifecyclespects)
   - [.env.example](#envexample)
   - [.gitignore](#gitignore)
4. [Key Concepts Explained](#4-key-concepts-explained)
   - [Playwright APIRequestContext vs HTTP Libraries](#playwright-apirequestcontext-vs-http-libraries)
   - [The API Object Model Pattern](#the-api-object-model-pattern)
   - [Playwright Fixtures — Dependency Injection for Tests](#playwright-fixtures--dependency-injection-for-tests)
   - [TypeScript Generics in the Client](#typescript-generics-in-the-client)
   - [Token-Based Authentication via Cookie](#token-based-authentication-via-cookie)
   - [The Factory Pattern for Test Data](#the-factory-pattern-for-test-data)
   - [Test Tagging Strategy](#test-tagging-strategy)
5. [How Authentication Works — Step by Step](#5-how-authentication-works--step-by-step)
6. [Request Lifecycle — What Happens on Every Call](#6-request-lifecycle--what-happens-on-every-call)
7. [Quick Start](#7-quick-start)
8. [Running Tests](#8-running-tests)
9. [Reading the HTML Report](#9-reading-the-html-report)
10. [How to Add a New API Endpoint](#10-how-to-add-a-new-api-endpoint)
11. [Environment Variables Reference](#11-environment-variables-reference)
12. [Design Decisions & Trade-offs](#12-design-decisions--trade-offs)
13. [What to Build Next](#13-what-to-build-next)

---

## 1. Why This Framework Exists

Most teams bolt API tests on top of browser-UI test runners as an afterthought, or reach for separate libraries (Axios + Jest, SuperTest + Mocha) that duplicate tooling.

This framework proves you can build a **serious, layered API test suite using only Playwright** — the same tool you likely already use for UI tests. Benefits:

| Concern | This framework's answer |
|---|---|
| HTTP client | Playwright `APIRequestContext` (built-in, no extra dep) |
| Test runner | Playwright Test (parallel, retries, fixtures, reports) |
| Authentication | Cookie-token injected transparently by `ApiClient` |
| Type safety | Full TypeScript: request options, responses, domain models |
| Test isolation | Fixtures provide fresh state per test, injected automatically |
| Test data | Factory functions generate unique, randomised data |
| Reporting | Playwright's built-in HTML reporter |

---

## 2. Architecture at a Glance

```
┌──────────────────────────────────────────────────────────────┐
│                       TEST FILES                             │
│   ping.spec.ts  ·  auth.spec.ts  ·  booking.lifecycle.spec  │
│          use fixtures; call domain-API methods               │
└────────────────────────┬─────────────────────────────────────┘
                         │ inject via Playwright fixture system
┌────────────────────────▼─────────────────────────────────────┐
│                  FIXTURES  (apiTest.ts)                      │
│  env → apiClient → authApi / bookingApi → token              │
│  Each fixture knows its dependencies; Playwright wires them  │
└────────────────────────┬─────────────────────────────────────┘
                         │ compose
┌────────────────────────▼─────────────────────────────────────┐
│             DOMAIN APIs  (src/apis/)                         │
│   AuthApi.createToken()                                      │
│   BookingApi.getAll() / getById() / create() / update() …   │
│          thin wrappers: path + headers + body                │
└────────────────────────┬─────────────────────────────────────┘
                         │ delegate all HTTP to
┌────────────────────────▼─────────────────────────────────────┐
│               CORE  (src/core/)                              │
│   ApiClient  — single _send() method, handles:              │
│     · URL construction   · Cookie injection                  │
│     · Response parsing   · Duration tracking                 │
│   assertions.ts — expectOk / expectStatus / expectDuration   │
│   types.ts      — HttpMethod / RequestOptions / ApiResponse  │
└────────────────────────┬─────────────────────────────────────┘
                         │ reads config from
┌────────────────────────▼─────────────────────────────────────┐
│               CONFIG  (src/config/env.ts)                    │
│   Reads .env via dotenv; exposes typed Env object            │
│   Falls back to sensible defaults for every variable         │
└──────────────────────────────────────────────────────────────┘
                         │ generates data via
┌────────────────────────▼─────────────────────────────────────┐
│               DATA  (src/data/factories.ts)                  │
│   bookingFactory() — unique, randomised booking objects      │
│   Supports partial overrides for targeted tests              │
└──────────────────────────────────────────────────────────────┘
```

The dependency arrow always points **downward**: tests know about fixtures, fixtures know about domain APIs, domain APIs know about the core client. Nothing lower ever imports from above — a clean, layered architecture.

---

## 3. Project Structure — Every File Explained

```
restful-booker-playwright-api-framework/
│
├── playwright.config.ts          ← Global Playwright configuration
├── package.json                  ← Dependencies and npm scripts
├── .env.example                  ← Template for local environment variables
├── .gitignore                    ← Keeps secrets and build artefacts out of git
│
├── src/
│   ├── core/
│   │   ├── types.ts              ← Shared TypeScript types (the contract layer)
│   │   ├── apiClient.ts          ← The single HTTP engine of the framework
│   │   └── assertions.ts        ← Custom assertion helpers with clear error messages
│   │
│   ├── config/
│   │   └── env.ts               ← Environment loader with type safety + defaults
│   │
│   ├── data/
│   │   └── factories.ts         ← Test-data factories (Factory pattern)
│   │
│   ├── apis/
│   │   ├── auth.api.ts          ← Domain API: authentication endpoints
│   │   └── booking.api.ts       ← Domain API: booking CRUD endpoints
│   │
│   └── fixtures/
│       └── apiTest.ts           ← Extended Playwright test with all fixtures
│
└── tests/
    ├── ping.spec.ts              ← Health-check smoke test
    ├── auth.spec.ts              ← Token generation tests
    └── booking.lifecycle.spec.ts ← Full Create→Read→Update→Patch→Delete flow
```

---

### `playwright.config.ts`

**What it does:** The single source of truth for how Playwright runs every test in this project.

```typescript
import { defineConfig } from '@playwright/test';
import { loadEnv } from './src/config/env';

const env = loadEnv();

export default defineConfig({
  testDir: './tests',          // Where to look for spec files
  timeout: 30_000,             // Each test must finish within 30 s
  expect: { timeout: 10_000 },// Each assertion has 10 s to succeed
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: env.BASE_URL,     // Shared across all tests
    trace: 'retain-on-failure',// Captures a full trace only when a test fails
  },
  workers: env.CI ? 2 : undefined, // 2 parallel workers in CI, unlimited locally
});
```

**Why each setting matters:**

- **`testDir: './tests'`** — Keeps test files separate from source code. Playwright only scans this directory for `*.spec.ts` files, so it won't accidentally try to run source files.
- **`timeout: 30_000`** — API calls to a shared demo service (Heroku cold-starts!) can be slow. 30 seconds prevents false negatives without masking genuinely stuck tests.
- **`expect: { timeout: 10_000 }`** — Playwright's `expect()` retries assertions by default. 10 seconds is the retry window before it marks an assertion as failed.
- **`reporter`** — Two reporters run simultaneously: `html` builds a rich interactive report (saved to `playwright-report/`), `list` prints real-time pass/fail lines to the console. `open: 'never'` prevents the browser from auto-opening in CI.
- **`trace: 'retain-on-failure'`** — Traces include a full timeline of every request and response. They're only kept when a test fails so disk usage stays low.
- **`workers: env.CI ? 2 : undefined`** — In CI environments, cap at 2 workers to stay within free-tier rate limits. Locally, Playwright uses all available CPU cores.

---

### `src/core/types.ts`

**What it does:** Defines all the shared TypeScript types used by the client, domain APIs, and assertions. Think of this as the **contract** that every layer agrees to.

```typescript
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RequestOptions = {
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined | null>;
  data?: unknown;
  cookieToken?: string;
};

export type ApiResponse<T = unknown> = {
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  url: string;
  bodyText: string;
  bodyJson?: T;
  durationMs: number;
};
```

**Why it is a separate file:**

- Prevents circular imports — both `apiClient.ts` and `assertions.ts` import from `types.ts` without importing from each other.
- Any type change happens in one place and TypeScript flags every caller that needs to update.
- `ApiResponse<T>` is generic, so callers get a typed `bodyJson` when they specify `T` (e.g., `ApiResponse<Booking>`).

**`RequestOptions` field by field:**

| Field | Type | Purpose |
|---|---|---|
| `headers` | `Record<string, string>` | Extra HTTP headers (Content-Type, Accept, etc.) |
| `query` | `Record<string, string \| number \| boolean \| undefined \| null>` | URL query params; `undefined`/`null` values are stripped automatically |
| `data` | `unknown` | Request body — Playwright serialises objects to JSON automatically |
| `cookieToken` | `string` | Restful Booker's auth mechanism; the client injects `Cookie: token=<value>` |

**`ApiResponse<T>` field by field:**

| Field | Type | Purpose |
|---|---|---|
| `ok` | `boolean` | `true` when HTTP status is 200–299 |
| `status` | `number` | Raw HTTP status code |
| `headers` | `Record<string, string>` | All response headers, lowercased |
| `url` | `string` | The fully-resolved URL that was called |
| `bodyText` | `string` | Raw response body as text (always available) |
| `bodyJson` | `T \| undefined` | Parsed JSON body when content is JSON; `undefined` for plain-text responses |
| `durationMs` | `number` | Wall-clock time from request start to response body read |

---

### `src/core/apiClient.ts`

**What it does:** The **single HTTP engine** of the entire framework. Every API call — regardless of endpoint or method — goes through `ApiClient._send()`. This is the most important file in the framework.

```typescript
export class ApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseURL: string
  ) {}

  get<T>(path: string, options: RequestOptions = {})    { return this._send<T>('GET',    path, options); }
  post<T>(path: string, options: RequestOptions = {})   { return this._send<T>('POST',   path, options); }
  put<T>(path: string, options: RequestOptions = {})    { return this._send<T>('PUT',    path, options); }
  patch<T>(path: string, options: RequestOptions = {})  { return this._send<T>('PATCH',  path, options); }
  delete<T>(path: string, options: RequestOptions = {}) { return this._send<T>('DELETE', path, options); }

  private async _send<T>(method, path, options): Promise<ApiResponse<T>> { ... }
}
```

**How `_send()` works — step by step:**

```
1. URL RESOLUTION
   If path starts with 'http' → use as-is (allows absolute URLs)
   Otherwise → baseURL + / + path   (handles leading-slash safety)

2. HEADER MERGING
   Start with options.headers (caller-provided)
   If cookieToken present → append "Cookie: token=<value>"
   Existing Cookie header? → merge with semicolon (never overwrite)

3. QUERY NORMALISATION
   _normalizeQuery() converts numbers/booleans to strings
   null/undefined values are filtered out (clean URLs, no ?key=null)

4. HTTP DISPATCH
   Calls Playwright's request.fetch() — this is Playwright's own HTTP engine
   Records wall-clock start time before the call

5. RESPONSE PARSING
   Reads body as text first (always works, even for 204/empty)
   Lowercases all header names for consistent access
   Detects JSON by:
     a) content-type header includes 'application/json'
     b) body text starts with '{' or '[' (defensive fallback)
   Parses JSON safely — parse failure keeps bodyText, bodyJson stays undefined

6. RETURN
   Returns a plain ApiResponse<T> object — no exceptions thrown for 4xx/5xx
   Callers decide what to assert (status check, ok check, etc.)
```

**Critical design choice — no exceptions on HTTP errors:**
`_send()` never throws for 4xx or 5xx responses. It always returns the `ApiResponse`. This means tests can freely assert on error responses (e.g., checking that a wrong password returns a specific body) without wrapping in try/catch.

---

### `src/core/assertions.ts`

**What it does:** Provides three focused assertion helpers that wrap Playwright's `expect()` with **clear, context-rich failure messages**.

```typescript
export function expectOk(resp: ApiResponse): void {
  expect(resp.ok, `Expected ok=true but got ok=false (status ${resp.status}). Body: ${truncate(resp.bodyText)}`).toBeTruthy();
}

export function expectStatus(resp: ApiResponse, expected: number): void {
  expect(resp.status, `Expected status ${expected} but got ${resp.status}. Body: ${truncate(resp.bodyText)}`).toBe(expected);
}

export function expectDurationUnder(resp: ApiResponse, maxMs: number): void {
  expect(resp.durationMs, `Expected duration <= ${maxMs}ms but got ${resp.durationMs}ms`).toBeLessThanOrEqual(maxMs);
}
```

**Why not just use `expect(resp.ok).toBeTruthy()` directly in tests?**

Playwright's raw failure message for `expect(false).toBeTruthy()` is just:
```
Expected: truthy
Received: false
```

With `expectOk()`, the failure message becomes:
```
Expected ok=true but got ok=false (status 401). Body: {"reason":"Bad credentials"}
```

You immediately know the status code and the response body — without having to add extra logging or re-run in debug mode.

**The `truncate()` private helper** caps body output at 600 characters. Long error bodies (HTML error pages, stack traces) are cut off with `...` so the failure message stays readable.

**`expectDurationUnder()`** is a **performance assertion** — it makes response-time expectations a first-class part of your test suite. Use it to catch regressions where an endpoint suddenly takes 3× as long.

---

### `src/config/env.ts`

**What it does:** Loads environment variables from `.env` (via `dotenv`) and exposes them as a strongly-typed `Env` object with safe defaults.

```typescript
export type Env = {
  BASE_URL: string;
  USERNAME: string;
  PASSWORD: string;
  CI: boolean;
};

export function loadEnv(): Env {
  dotenv.config(); // reads .env file into process.env

  return {
    BASE_URL: process.env.BASE_URL?.trim() || 'https://restful-booker.herokuapp.com',
    USERNAME: process.env.USERNAME?.trim() || 'admin',
    PASSWORD: process.env.PASSWORD?.trim() || 'password123',
    CI: (process.env.CI || '').toLowerCase() === 'true' || !!process.env.GITHUB_ACTIONS,
  };
}
```

**Why this pattern:**

- **`.trim()` on every string value** — copy-paste errors (trailing spaces in `.env` files) cause mysterious auth failures. Trimming prevents that class of bug silently.
- **Fallback defaults** — you can clone the repo and run `npm test` immediately, without creating a `.env` file. Great for demos and new contributors.
- **`CI` detection** — checks both a generic `CI=true` (set by most CI systems) and `GITHUB_ACTIONS` (set by GitHub Actions specifically). This drives the `workers` setting in `playwright.config.ts`.
- **Called at module load time** in `playwright.config.ts` and at fixture setup time — `dotenv.config()` is idempotent (safe to call multiple times).

---

### `src/data/factories.ts`

**What it does:** Implements the **Factory Pattern** for test data. Instead of hardcoding static booking objects in every test, you call `bookingFactory()` to get a unique, realistic booking.

```typescript
export function bookingFactory(overrides: Partial<Booking> = {}): Booking {
  const id = rand(999_999);         // Random 6-digit number for uniqueness
  const checkin  = tomorrow();       // Always a future date
  const checkout = in3Days();        // Always after checkin

  return {
    firstname:       overrides.firstname       ?? `John${id}`,
    lastname:        overrides.lastname        ?? `Doe${id}`,
    totalprice:      overrides.totalprice      ?? (100 + (id % 300)),
    depositpaid:     overrides.depositpaid     ?? true,
    bookingdates:    overrides.bookingdates    ?? { checkin: fmt(checkin), checkout: fmt(checkout) },
    additionalneeds: overrides.additionalneeds ?? 'Breakfast',
  };
}
```

**Why random IDs in names?**

Restful Booker is a **shared public API**. Thousands of people run tests against it simultaneously. If every test creates `{ firstname: 'John', lastname: 'Doe' }`, your `getAll({ firstname: 'John' })` filter returns bookings from everyone else too, breaking your assertions.

Unique names like `John847291` ensure filter queries return only your test's data.

**The `overrides` pattern (Partial\<Booking\>):**

The `Partial<Booking>` TypeScript utility type makes every field optional. This lets tests customise exactly what they care about:

```typescript
// Default booking (all random)
const booking = bookingFactory();

// Override only the fields relevant to this test
const vipBooking = bookingFactory({ totalprice: 9999, depositpaid: false });

// Override nested objects too
const pastBooking = bookingFactory({ bookingdates: { checkin: '2020-01-01', checkout: '2020-01-05' } });
```

The nullish coalescing `??` operator (not `||`) is used deliberately: it only falls back when the value is `null` or `undefined`, never for `false` or `0`. So `bookingFactory({ depositpaid: false })` correctly produces `depositpaid: false`, not `true`.

---

### `src/apis/auth.api.ts`

**What it does:** Encapsulates all authentication-related API calls. Currently wraps `POST /auth`.

```typescript
export type AuthTokenResponse = { token: string };

export class AuthApi {
  constructor(private readonly client: ApiClient) {}

  createToken(username: string, password: string) {
    return this.client.post<AuthTokenResponse>('/auth', {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      data: { username, password },
    });
  }
}
```

**Why a dedicated `AuthApi` class?**

- **Single Responsibility** — auth logic is isolated. If the server changes its token endpoint, you change one file, not every test.
- **Type-safe response** — `post<AuthTokenResponse>` means `resp.bodyJson?.token` is typed as `string | undefined`, not `unknown`. TypeScript guides you to check for existence before using the token.
- **Explicit headers** — `Content-Type: application/json` tells the server this is a JSON body. `Accept: application/json` tells it to respond in JSON. Without these, Restful Booker may return unexpected formats.

---

### `src/apis/booking.api.ts`

**What it does:** Encapsulates all booking-related API calls: list, get, create, full update, partial update, and delete.

```typescript
export class BookingApi {
  getAll(query?)        → GET  /booking            (with optional filters)
  getById(id)           → GET  /booking/:id
  create(booking)       → POST /booking
  update(id, booking, token)        → PUT  /booking/:id  (requires auth)
  partialUpdate(id, patch, token)   → PATCH /booking/:id (requires auth)
  delete(id, token)     → DELETE /booking/:id      (requires auth)
}
```

**Authentication-required methods:**

`update`, `partialUpdate`, and `delete` all accept a `token` parameter and pass it as `cookieToken`. The `ApiClient` then injects `Cookie: token=<value>` into the request headers automatically. Test code never has to construct cookie strings manually.

**Why `PUT` for full update and `PATCH` for partial?**

This follows REST semantics:
- `PUT /booking/:id` — **replaces** the entire booking. You must send all fields.
- `PATCH /booking/:id` — **merges** changes. You only send the fields you want to change. The `Partial<Booking>` type enforces this at the TypeScript level.

**`getById` sends `Accept: application/json`:**

Without this header, Restful Booker returns the booking details as plain text in some clients. The `Accept` header explicitly requests JSON format, ensuring `bodyJson` is always populated.

---

### `src/fixtures/apiTest.ts`

**What it does:** Extends Playwright's `test` function with a set of custom fixtures. This is the **dependency injection system** of the framework — tests declare what they need, and Playwright provides it automatically.

```typescript
export const test = base.extend<Fixtures>({
  env:        async ({},            use) => { await use(loadEnv()); },
  apiClient:  async ({ request, env }, use) => { await use(new ApiClient(request, env.BASE_URL)); },
  authApi:    async ({ apiClient }, use) => { await use(new AuthApi(apiClient)); },
  bookingApi: async ({ apiClient }, use) => { await use(new BookingApi(apiClient)); },
  token:      async ({ authApi, env }, use) => {
    const resp = await authApi.createToken(env.USERNAME, env.PASSWORD);
    expectOk(resp);
    const token = resp.bodyJson?.token;
    if (!token) throw new Error(`Token missing. Status=${resp.status} Body=${resp.bodyText}`);
    await use(token);
  },
});
```

**The Fixture Dependency Graph:**

```
request (Playwright built-in)
    └── apiClient
            ├── authApi
            │       └── token (makes a real HTTP call to get auth token)
            └── bookingApi
env (reads .env)
    ├── apiClient (provides BASE_URL)
    └── token (provides USERNAME + PASSWORD)
```

**How fixtures work — the `use` pattern:**

Each fixture is an async function that receives already-resolved dependencies and a `use` callback:
- Everything **before** `await use(value)` is **setup** (runs before the test)
- `await use(value)` **provides** the value to the test
- Everything **after** `await use(value)` would be **teardown** (runs after the test — nothing here currently, but you can add cleanup)

**Lazy loading — a key performance feature:**

Playwright only instantiates fixtures that a test actually requests. A test that only uses `apiClient` will **not** trigger a real HTTP call to fetch a `token`. Fixtures are completely on-demand.

```typescript
// This test only needs apiClient — no token HTTP call happens
test('ping', async ({ apiClient }) => { ... });

// This test needs token — exactly one POST /auth call happens before this test
test('update booking', async ({ bookingApi, token }) => { ... });
```

---

### `tests/ping.spec.ts`

**What it does:** A single smoke test that verifies the API server is up and reachable.

```typescript
test.describe('Health', () => {
  test('GET /ping returns Created @smoke', async ({ apiClient }) => {
    const resp = await apiClient.get('/ping');
    expect(resp.status).toBe(201);
    expect(resp.bodyText.trim()).toBe('Created');
  });
});
```

**Why `201` and not `200`?**

This is a quirk of Restful Booker — its health-check endpoint returns HTTP `201 Created` with the body text `Created`. This is unusual (health checks normally return `200 OK`) but it's what the API does, so the test asserts what's actually true rather than what's theoretically correct.

**Why use `apiClient` directly instead of a domain API?**

`/ping` is not a business-domain endpoint — it's infrastructure. Using `apiClient` directly (bypassing `AuthApi` or `BookingApi`) keeps the test honest: it tests the raw connection, not domain logic.

**Why `bodyText.trim()`?**

The response body may include trailing whitespace or newline characters. `.trim()` makes the assertion robust against insignificant whitespace differences.

---

### `tests/auth.spec.ts`

**What it does:** Tests the authentication contract — both the happy path (valid credentials) and the failure path (wrong password).

```typescript
test('POST /auth returns token @auth @smoke', async ({ authApi, env }) => {
  const resp = await authApi.createToken(env.USERNAME, env.PASSWORD);
  expectOk(resp);
  expect(resp.bodyJson?.token).toBeTruthy();
});

test('POST /auth with wrong password returns no token @auth', async ({ authApi, env }) => {
  const resp = await authApi.createToken(env.USERNAME, env.PASSWORD + '_wrong');
  expect(resp.bodyJson?.token).toBeFalsy();
});
```

**Why the negative test (`wrong password`) does NOT use `expectOk()`:**

Restful Booker returns HTTP `200` even for wrong credentials — it's just missing the `token` field in the body. Asserting `expectOk()` would pass (200 is ok), but we actually want to prove the `token` is absent. This is a reminder that status codes alone don't always tell the full story — check response bodies too.

**Why read credentials from `env` in tests?**

Tests never hardcode `'admin'` or `'password123'`. They read from the `env` fixture. This means the test suite works correctly against different environments (staging, production) by simply changing the `.env` file — zero test code changes needed.

---

### `tests/booking.lifecycle.spec.ts`

**What it does:** An end-to-end CRUD lifecycle test that exercises every booking operation in sequence within a single test.

```typescript
test('Create -> Get -> Update -> Patch -> Delete @regression', async ({ bookingApi, token }) => {
  // 1. CREATE a new booking
  const booking = bookingFactory();
  const createResp = await bookingApi.create(booking);
  expectOk(createResp);
  const bookingId = createResp.bodyJson?.bookingid;

  // 2. READ it back and verify core fields
  const getResp = await bookingApi.getById(bookingId!);
  expectOk(getResp);
  expect(getResp.bodyJson?.firstname).toBe(booking.firstname);

  // 3. FULL UPDATE (PUT) — replaces the entire booking
  const updated = bookingFactory({ firstname: booking.firstname + '_Updated' });
  const putResp = await bookingApi.update(bookingId!, updated, token);
  expectOk(putResp);
  expect(putResp.bodyJson?.firstname).toBe(updated.firstname);

  // 4. PARTIAL UPDATE (PATCH) — only changes additionalneeds
  const patchResp = await bookingApi.partialUpdate(bookingId!, { additionalneeds: 'Late Checkout' }, token);
  expectOk(patchResp);
  expect(patchResp.bodyJson?.additionalneeds).toBe('Late Checkout');

  // 5. DELETE the booking
  const delResp = await bookingApi.delete(bookingId!, token);
  expect(delResp.status).toBe(201); // Restful Booker quirk: DELETE returns 201

  // 6. VERIFY deletion — must get 404 now
  const getAfterDel = await bookingApi.getById(bookingId!);
  expect(getAfterDel.status).toBe(404);
});
```

**Why one big test instead of individual tests for each operation?**

On a shared public API, ordering matters. If `create` and `delete` were separate tests, a different test run could delete your booking before your `get` test runs. Keeping the full lifecycle in one sequential test guarantees:
- The booking you created is the one you read, update, and delete
- Cleanup (the DELETE at the end) happens even if assertions in the middle fail (Playwright still runs the rest of the test body)
- No leftover data pollutes other testers' runs

**The `token` fixture — requested, not created:**

The test declares `{ bookingApi, token }` in its parameter list. Playwright resolves the `token` fixture (makes one `POST /auth` call), and the resulting token string is ready before the test body runs. The test never calls `authApi.createToken()` manually.

---

### `.env.example`

**What it does:** A committed template showing every environment variable the framework uses, with the public demo values filled in.

```dotenv
BASE_URL=https://restful-booker.herokuapp.com
USERNAME=admin
PASSWORD=password123
CI=false
```

**Why commit this but gitignore `.env`?**

`.env.example` documents the expected variables (no secrets, all public demo values). The real `.env` file may contain credentials for a private environment and must never be committed. `.gitignore` enforces this.

**Setup workflow:**
```bash
# macOS / Linux
cp .env.example .env

# Windows PowerShell
copy .env.example .env
```

Then edit `.env` with real values if you're targeting a private environment.

---

### `.gitignore`

**What it ignores:**

| Pattern | Reason |
|---|---|
| `node_modules/` | 100MB+ of dependencies — reinstall via `npm install` |
| `playwright-report/` | Generated HTML report — never commit build artefacts |
| `test-results/` | Raw test traces — generated fresh each run |
| `.env` | May contain real credentials — never commit |
| `dist/` | TypeScript compile output — generated |
| `.DS_Store` | macOS Finder metadata — irrelevant to the project |
| `*.log` | Any log files — noisy, machine-specific |
| `.idea/` | JetBrains IDE settings — machine-specific |
| `.vscode/` | VS Code settings — can conflict between developers |

---

## 4. Key Concepts Explained

### Playwright APIRequestContext vs HTTP Libraries

Playwright ships with a first-class HTTP client designed for testing. Here is why it wins over adding a separate library:

| Feature | Playwright `APIRequestContext` | Axios / node-fetch |
|---|---|---|
| Session handling | Built-in cookie jar, shared with browser tests | Manual |
| Trace recording | Automatic — recorded in Playwright traces | Not possible |
| Integration with `expect` | Native Playwright assertions with retry | External |
| Parallel isolation | Each worker gets its own context | Shared by default |
| Setup cost | Zero — already installed | Extra dependency |

The key API is `request.fetch(url, options)`. Playwright's `APIRequestContext` wraps Node's native `fetch` with tracing, cookie management, and test lifecycle hooks.

---

### The API Object Model Pattern

Just as **Page Object Model** in UI testing wraps UI pages in classes (hiding selectors from tests), **API Object Model** wraps API endpoints in classes (hiding URLs and headers from tests).

```
WITHOUT API Object Model:                  WITH API Object Model:
─────────────────────────────────────────  ─────────────────────────────
test('update booking', async ({ request }) => {
  const resp = await request.fetch(          const resp = await bookingApi.update(
    'https://restful-booker.../booking/42',    42, updatedBooking, token
    {                                        );
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': `token=${token}`,
      },
      data: JSON.stringify(updatedBooking),
    }
  );
});
```

The right column is what this framework delivers. Tests read like specifications, not HTTP plumbing.

---

### Playwright Fixtures — Dependency Injection for Tests

Playwright's fixture system is **inversion of control** for tests. Instead of tests building their own objects, they declare what they need, and Playwright assembles the dependency graph.

```typescript
// Test declares its needs in the parameter list
test('my test', async ({ bookingApi, token }) => {
  // bookingApi and token arrive fully initialised
  // Playwright resolved their dependencies automatically
});
```

**Benefits:**
- **No `beforeEach` boilerplate** — shared setup lives in fixture definitions, not in every test file
- **Automatic teardown** — code after `await use(value)` in a fixture runs after the test, even on failure
- **Lazy evaluation** — unused fixtures are never instantiated
- **Composable** — fixtures can depend on other fixtures, and Playwright handles the ordering

---

### TypeScript Generics in the Client

`ApiClient` uses generics to make response bodies type-safe without losing flexibility:

```typescript
// Generic type T defaults to unknown when not specified
get<T = unknown>(path: string, options = {}): Promise<ApiResponse<T>>

// Usage without generic — bodyJson is unknown (you must check type yourself)
const resp = await apiClient.get('/ping');

// Usage with generic — bodyJson is typed as Booking
const resp = await apiClient.get<Booking>('/booking/42');
resp.bodyJson?.firstname; // TypeScript knows this is string | undefined
```

Domain API methods pre-supply the generic so tests get full type-safety automatically:

```typescript
// In booking.api.ts
getById(bookingId: number) {
  return this.client.get<Booking>(`/booking/${bookingId}`, ...);
}

// In a test — no need to specify <Booking>
const resp = await bookingApi.getById(42);
resp.bodyJson?.firstname; // ✅ TypeScript: string | undefined
```

---

### Token-Based Authentication via Cookie

Restful Booker uses an unusual auth mechanism — not `Authorization: Bearer <token>`, but `Cookie: token=<value>`.

**Full flow:**

```
Test                    AuthApi             BookingApi          Server
 │                        │                    │                  │
 │── token fixture ───────▶                    │                  │
 │                        │── POST /auth ──────────────────────▶  │
 │                        │◀── { token: "abc123" } ──────────────  │
 │◀── "abc123" ───────────│                    │                  │
 │                                             │                  │
 │── bookingApi.update(id, data, "abc123") ───▶│                  │
 │                                             │── PUT /booking/  │
 │                                             │   Cookie: token=abc123
 │                                             │─────────────────▶│
 │                                             │◀── 200 OK ───────│
```

The `cookieToken` field in `RequestOptions` and the merging logic in `ApiClient._send()` ensure cookies are handled safely even if the caller already has other cookies set.

---

### The Factory Pattern for Test Data

The Factory Pattern provides a function that creates a fully-valid object with sensible defaults, but accepts overrides for the parts a test cares about.

```typescript
// Generate a completely random booking — for tests that just need any booking
const booking = bookingFactory();

// Generate a booking with a specific price — for a pricing test
const expensiveBooking = bookingFactory({ totalprice: 9999 });

// Generate a booking with specific dates — for a date-filter test
const juneBooking = bookingFactory({
  bookingdates: { checkin: '2025-06-01', checkout: '2025-06-07' }
});
```

This keeps tests **focused** (only override what matters) and **isolated** (each test gets its own unique data, not shared references).

---

### Test Tagging Strategy

Tags are embedded in test titles using `@` prefixes. Playwright's `--grep` flag uses regex to filter by tag:

| Tag | Meaning | Command |
|---|---|---|
| `@smoke` | Fast, critical path — run before any deployment | `npm run test:smoke` |
| `@regression` | Full coverage — run nightly or on PR | `npm run test:regression` |
| `@auth` | Authentication-related only | `npm run test:auth` |

A test can have **multiple tags**: `'POST /auth returns token @auth @smoke'` runs in both `test:auth` and `test:smoke` suites.

---

## 5. How Authentication Works — Step by Step

```
1. TEST FILE requests { token } fixture
   ↓
2. FIXTURE resolves: needs { authApi, env }
   ↓
3. FIXTURE calls: authApi.createToken(env.USERNAME, env.PASSWORD)
   ↓
4. AuthApi calls: apiClient.post<AuthTokenResponse>('/auth', { data: { username, password } })
   ↓
5. ApiClient._send() → POST https://restful-booker.herokuapp.com/auth
   Request body: { "username": "admin", "password": "password123" }
   ↓
6. Server responds: 200 OK  { "token": "abc123xyz" }
   ↓
7. FIXTURE validates: resp.ok === true, resp.bodyJson.token exists
   If token is missing → throw Error (test fails with a clear message)
   ↓
8. FIXTURE calls: await use("abc123xyz")
   → The token string "abc123xyz" is now available to the test
   ↓
9. TEST passes token to: bookingApi.update(id, data, "abc123xyz")
   ↓
10. BookingApi calls: apiClient.put(..., { cookieToken: "abc123xyz" })
    ↓
11. ApiClient._send() adds header: Cookie: token=abc123xyz
    → PUT https://restful-booker.herokuapp.com/booking/42
    → Server validates cookie, authorises the mutation
```

---

## 6. Request Lifecycle — What Happens on Every Call

```
bookingApi.create(booking)
    │
    ▼
apiClient.post<CreateBookingResponse>('/booking', { headers: {...}, data: booking })
    │
    ▼
_send('POST', '/booking', options)
    │
    ├─ URL:  'https://restful-booker.herokuapp.com/booking'
    ├─ Headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    ├─ Body: JSON.stringify(booking)   ← Playwright does this automatically
    │
    ▼
request.fetch(url, { method, headers, data })
    │                   ← Wall clock timer starts here
    ▼
Network → Heroku server
    │
    ▼
APIResponse (Playwright's raw response object)
    │
    ├─ resp.ok()          → boolean
    ├─ resp.status()      → 200
    ├─ resp.headersArray()→ [{ name, value }, ...]
    ├─ resp.text()        → '{"bookingid":42,"booking":{...}}'
    │                      ← Timer ends here
    ▼
Parse into ApiResponse<CreateBookingResponse>:
    {
      ok: true,
      status: 200,
      headers: { 'content-type': 'application/json', ... },
      url: 'https://restful-booker.herokuapp.com/booking',
      bodyText: '{"bookingid":42,"booking":{...}}',
      bodyJson: { bookingid: 42, booking: { firstname: 'John847291', ... } },
      durationMs: 312
    }
    │
    ▼
Returned to test — test asserts on whatever it cares about
```

---

## 7. Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm (bundled with Node.js)

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd restful-booker-playwright-api-framework

# 2. Install dependencies (Playwright, TypeScript, dotenv)
npm install

# 3. Create your local environment file
cp .env.example .env          # macOS / Linux
copy .env.example .env        # Windows PowerShell
```

The default `.env` values point to the public Restful Booker demo — no changes needed for a first run.

```bash
# 4. Run all tests
npm test
```

You should see output like:

```
Running 4 tests using 4 workers

  ✓  tests/ping.spec.ts:4:3 › Health › GET /ping returns Created @smoke (312ms)
  ✓  tests/auth.spec.ts:4:3 › Auth › POST /auth returns token @auth @smoke (288ms)
  ✓  tests/auth.spec.ts:10:3 › Auth › POST /auth with wrong password returns no token @auth (201ms)
  ✓  tests/booking.lifecycle.spec.ts:5:3 › Booking lifecycle › Create -> Get -> Update -> Patch -> Delete @regression (1.8s)

  4 passed (3.2s)
```

---

## 8. Running Tests

| Command | What runs | When to use |
|---|---|---|
| `npm test` | All tests | Full validation |
| `npm run test:smoke` | Tests tagged `@smoke` | Quick pre-deploy check |
| `npm run test:regression` | Tests tagged `@regression` | Nightly / PR gate |
| `npm run test:auth` | Tests tagged `@auth` | Auth changes |

### Run a specific file

```bash
npx playwright test tests/booking.lifecycle.spec.ts
```

### Run in debug mode (shows requests in real time)

```bash
npx playwright test --debug
```

### Run with verbose output

```bash
npx playwright test --reporter=list
```

---

## 9. Reading the HTML Report

```bash
npm run report
```

This opens `playwright-report/index.html` in your browser. The report shows:

- Pass/fail status for every test
- Duration of each test and each step
- Full request/response details for failed tests (from the trace)
- Error messages with the `bodyText` context from `expectOk()` / `expectStatus()`

To view a trace manually (for a failed test):

```bash
npx playwright show-trace test-results/<test-folder>/trace.zip
```

Traces include a timeline view of every HTTP request, response headers, and body.

---

## 10. How to Add a New API Endpoint

Walk through adding `GET /booking` with query filters as a new named method.

### Step 1 — Add the method to the domain API

In [src/apis/booking.api.ts](src/apis/booking.api.ts), the method already exists (`getAll`). For a hypothetical new domain, create `src/apis/room.api.ts`:

```typescript
import type { ApiClient } from '../core/apiClient';

export type Room = { id: number; name: string; price: number; };

export class RoomApi {
  constructor(private readonly client: ApiClient) {}

  getAll() {
    return this.client.get<Room[]>('/room', {
      headers: { 'Accept': 'application/json' },
    });
  }

  getById(id: number) {
    return this.client.get<Room>(`/room/${id}`, {
      headers: { 'Accept': 'application/json' },
    });
  }
}
```

### Step 2 — Register a fixture

In [src/fixtures/apiTest.ts](src/fixtures/apiTest.ts), add to the `Fixtures` type and the `test.extend` call:

```typescript
import { RoomApi } from '../apis/room.api';

type Fixtures = {
  // ...existing fixtures
  roomApi: RoomApi;
};

export const test = base.extend<Fixtures>({
  // ...existing fixtures
  roomApi: async ({ apiClient }, use) => {
    await use(new RoomApi(apiClient));
  },
});
```

### Step 3 — Write the test

```typescript
// tests/room.spec.ts
import { test, expectOk } from '../src/fixtures/apiTest';

test.describe('Rooms', () => {
  test('GET /room returns a list @smoke', async ({ roomApi }) => {
    const resp = await roomApi.getAll();
    expectOk(resp);
    expect(Array.isArray(resp.bodyJson)).toBeTruthy();
  });
});
```

That is it. Three files touched, clean separation of concerns maintained.

---

## 11. Environment Variables Reference

| Variable | Default | Required | Description |
|---|---|---|---|
| `BASE_URL` | `https://restful-booker.herokuapp.com` | No | Target API base URL. Change to point at staging or local server. |
| `USERNAME` | `admin` | No | Credentials for `POST /auth`. |
| `PASSWORD` | `password123` | No | Credentials for `POST /auth`. |
| `CI` | `false` | No | Set to `true` to cap Playwright workers at 2. Auto-detected from `GITHUB_ACTIONS`. |

**Targeting a local server:**

```dotenv
BASE_URL=http://localhost:3001
USERNAME=testuser
PASSWORD=supersecret
```

No test code changes needed — just update `.env`.

---

## 12. Design Decisions & Trade-offs

### Why `APIRequestContext` over Axios?

Playwright's built-in HTTP client integrates natively with the test runner — traces, fixtures, retries, and reporters all understand it. Axios would require bridging layers and adds a dependency that duplicates built-in capability.

### Why a single `ApiClient` class?

All HTTP calls flow through one place. This means:
- Cookie injection works for every method without repeating logic
- Duration tracking is automatic for every call
- If Playwright changes its API, you update one class

### Why not throw on 4xx/5xx?

Tests need to assert on error scenarios. If the client threw on `401`, testing the "wrong password" path would require try/catch everywhere. Returning the full `ApiResponse` always lets tests decide what to assert.

### Why `bodyText` alongside `bodyJson`?

Not every endpoint returns JSON. `GET /ping` returns plain text `Created`. Keeping `bodyText` always populated means you can always read the response, even when JSON parsing fails.

### Why store duration in `ApiResponse`?

Performance regressions are real bugs. By capturing `durationMs` on every response, you can add `expectDurationUnder(resp, 2000)` to any existing test without any refactoring. The data is always there.

### Why per-test tokens instead of a global token?

Test isolation. A global token would be shared across parallel workers and could expire mid-run. Playwright's fixture system makes per-test tokens cheap — one `POST /auth` per test that needs auth — and guarantees a fresh token every time.

---

## 13. What to Build Next

The framework is intentionally minimal. Here are natural next steps in order of value:

### High value

| Enhancement | Why | How |
|---|---|---|
| **Schema validation with AJV** | Catch breaking API contract changes automatically | `ajv` + a helper that validates `bodyJson` against a JSON Schema |
| **CI/CD workflow** | Run tests on every pull request | `.github/workflows/test.yml` with `npm test` and `actions/upload-artifact` for the HTML report |
| **Request/response logging** | Attach full HTTP details to Playwright's report | Use `test.info().attach()` inside `ApiClient._send()` |

### Medium value

| Enhancement | Why | How |
|---|---|---|
| **Parallel-safe test data** | Prevent ID collisions when workers run simultaneously | Use `test.info().workerIndex` in factory functions to namespace data |
| **Test data cleanup** | Ensure DELETE runs even when a test fails mid-lifecycle | Move DELETE to a fixture teardown (code after `await use(...)`) |
| **Retry on flaky endpoints** | Heroku cold-starts cause intermittent `503`s | Playwright's `retries` config option or a custom retry wrapper in `ApiClient` |

### Nice to have

| Enhancement | Why |
|---|---|
| **Multiple environment configs** | `playwright.config.ts` can use `--project` flags for staging vs prod |
| **Environment-specific `.env` files** | `.env.staging`, `.env.prod` — load with `dotenv.config({ path })` |
| **Allure or JUnit reporter** | If your team uses Allure dashboards or Jenkins XML |

---

> **Restful Booker is a shared public service.** Avoid asserting on data you didn't create, always clean up with DELETE, and prefer specific assertions on a few key fields over full-payload comparisons. This keeps your tests stable and the shared service usable for everyone.

---

*Framework by Shalabh — built with [Playwright](https://playwright.dev/) and TypeScript.*
