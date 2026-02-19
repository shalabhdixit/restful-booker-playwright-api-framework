import { test, expect } from '../src/fixtures/apiTest';

test.describe('Health', () => {
  test('GET /ping returns Created @smoke', async ({ apiClient }) => {
    const resp = await apiClient.get('/ping');
    expect(resp.status).toBe(201);
    expect(resp.bodyText.trim()).toBe('Created');
  });
});
