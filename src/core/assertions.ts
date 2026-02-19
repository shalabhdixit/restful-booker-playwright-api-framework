import { expect } from '@playwright/test';
import type { ApiResponse } from './types';

export function expectOk(resp: ApiResponse): void {
  expect(resp.ok, `Expected ok=true but got ok=false (status ${resp.status}). Body: ${truncate(resp.bodyText)}`).toBeTruthy();
}

export function expectStatus(resp: ApiResponse, expected: number): void {
  expect(resp.status, `Expected status ${expected} but got ${resp.status}. Body: ${truncate(resp.bodyText)}`).toBe(expected);
}

export function expectDurationUnder(resp: ApiResponse, maxMs: number): void {
  expect(resp.durationMs, `Expected duration <= ${maxMs}ms but got ${resp.durationMs}ms`).toBeLessThanOrEqual(maxMs);
}

function truncate(s: string, max = 600): string {
  if (!s) return '';
  return s.length <= max ? s : s.slice(0, max) + '...';
}
