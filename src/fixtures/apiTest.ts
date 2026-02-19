import { test as base } from '@playwright/test';
import { loadEnv } from '../config/env';
import { ApiClient } from '../core/apiClient';
import { AuthApi } from '../apis/auth.api';
import { BookingApi } from '../apis/booking.api';
import { expectOk } from '../core/assertions';

type Fixtures = {
  env: ReturnType<typeof loadEnv>;
  apiClient: ApiClient;
  authApi: AuthApi;
  bookingApi: BookingApi;
  token: string;
};

export const test = base.extend<Fixtures>({
  env: async ({}, use) => {
    await use(loadEnv());
  },

  apiClient: async ({ request, env }, use) => {
    await use(new ApiClient(request, env.BASE_URL));
  },

  authApi: async ({ apiClient }, use) => {
    await use(new AuthApi(apiClient));
  },

  bookingApi: async ({ apiClient }, use) => {
    await use(new BookingApi(apiClient));
  },

  token: async ({ authApi, env }, use) => {
    const resp = await authApi.createToken(env.USERNAME, env.PASSWORD);
    expectOk(resp);
    const token = resp.bodyJson?.token;
    if (!token) throw new Error(`Token missing. Status=${resp.status} Body=${resp.bodyText}`);
    await use(token);
  },
});

export { expect } from '@playwright/test';
export { expectOk } from '../core/assertions';
