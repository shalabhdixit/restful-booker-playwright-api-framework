import { defineConfig } from '@playwright/test';
import { loadEnv } from './src/config/env';

const env = loadEnv();

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: env.BASE_URL,
    trace: 'retain-on-failure',
  },
  workers: env.CI ? 2 : undefined,
});
