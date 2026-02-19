import { test, expectOk, expect } from '../src/fixtures/apiTest';

test.describe('Auth', () => {
  test('POST /auth returns token @auth @smoke', async ({ authApi, env }) => {
    const resp = await authApi.createToken(env.USERNAME, env.PASSWORD);
    expectOk(resp);
    expect(resp.bodyJson?.token).toBeTruthy();
  });

  test('POST /auth with wrong password returns no token @auth', async ({ authApi, env }) => {
    const resp = await authApi.createToken(env.USERNAME, env.PASSWORD + '_wrong');
    expect(resp.bodyJson?.token).toBeFalsy();
  });
});
