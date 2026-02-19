# Playwright API Automation Framework (Restful Booker)

This repository is a ready-to-use Playwright framework for API testing (APIRequestContext only).  
It is intentionally simple, practical, and easy to extend.

Base URL used by default:
https://restful-booker.herokuapp.com

--------------------------------------------------------------------------

1. Setup

Install dependencies:

  npm install

Create your environment file:

  Copy .env.example to .env

  Windows (PowerShell):
    copy .env.example .env

  macOS/Linux:
    cp .env.example .env

Run all tests:

  npm test

Open the HTML report:

  npm run report

--------------------------------------------------------------------------

2. What is included

- ApiClient: a reusable wrapper over Playwright request.fetch()
- Domain APIs:
  - AuthApi: POST /auth
  - BookingApi: /booking endpoints
- Fixtures:
  - env: loads configuration
  - apiClient: shared client
  - token: fetches auth token once per test (cookie-based)
- Tests:
  - ping.spec.ts: health check (plain text response)
  - auth.spec.ts: token generation
  - booking.lifecycle.spec.ts: end-to-end CRUD lifecycle

--------------------------------------------------------------------------

3. How authentication works

Restful Booker uses token-based auth via cookie.

Step 1: Create token

  POST /auth
  Body: { "username": "...", "password": "..." }

Step 2: Use token as cookie for secured endpoints

  Cookie: token=<token>

In this repo:
- token is created in src/fixtures/apiTest.ts
- ApiClient adds Cookie: token=<token> when you pass cookieToken option

--------------------------------------------------------------------------

4. How to run targeted suites

Smoke:

  npm run test:smoke

Regression:

  npm run test:regression

Auth-only:

  npm run test:auth

Tags are simple grep targets in test titles:
@smoke, @regression, @auth

--------------------------------------------------------------------------

5. Framework layout

restful-booker-playwright-api-framework/
  src/
    core/
      apiClient.ts
      assertions.ts
      types.ts
    apis/
      auth.api.ts
      booking.api.ts
    fixtures/
      apiTest.ts
    config/
      env.ts
    data/
      factories.ts
  tests/
    ping.spec.ts
    auth.spec.ts
    booking.lifecycle.spec.ts
  playwright.config.ts

--------------------------------------------------------------------------

6. Adding a new endpoint

1) Add a method in a domain API in src/apis

Example:

  async getAllBookings() {
    return this.client.get('/booking');
  }

2) Write a test in tests/

3) Use fixtures to keep tests clean:

  test('...', async ({ bookingApi }) => {
    const resp = await bookingApi.getAll();
  });

--------------------------------------------------------------------------

7. Notes for demo environments

Restful Booker is a shared demo service.  
Avoid over-asserting full payloads and prefer:
- status checks
- a few key fields
- create-your-own-data flow
- cleanup using DELETE

--------------------------------------------------------------------------

8. Next improvements (optional)

If you want to evolve this into an enterprise-grade baseline:
- Add structured logging and attach request/response to reports
- Add schema validation (AJV) for contract tests
- Add CI workflow to upload reports as artifacts
- Add test data seeding and parallel-safe IDs
