import type { APIRequestContext } from '@playwright/test';
import type { ApiResponse, RequestOptions, HttpMethod } from './types';

export class ApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseURL: string
  ) { }

  get<T = unknown>(path: string, options: RequestOptions = {}) {
    return this._send<T>('GET', path, options);
  }
  post<T = unknown>(path: string, options: RequestOptions = {}) {
    return this._send<T>('POST', path, options);
  }
  put<T = unknown>(path: string, options: RequestOptions = {}) {
    return this._send<T>('PUT', path, options);
  }
  patch<T = unknown>(path: string, options: RequestOptions = {}) {
    return this._send<T>('PATCH', path, options);
  }
  delete<T = unknown>(path: string, options: RequestOptions = {}) {
    return this._send<T>('DELETE', path, options);
  }

  private async _send<T>(method: HttpMethod, path: string, options: RequestOptions): Promise<ApiResponse<T>> {
    const url = path.startsWith('http')
      ? path
      : `${this.baseURL}${path.startsWith('/') ? '' : '/'}${path}`;

    const headers: Record<string, string> = { ...(options.headers || {}) };

    if (options.cookieToken) {
      const existingCookie = headers['Cookie'] || headers['cookie'];
      const tokenCookie = `token=${options.cookieToken}`;
      headers['Cookie'] = existingCookie ? `${existingCookie}; ${tokenCookie}` : tokenCookie;
    }

    const params = options.query ? this._normalizeQuery(options.query) : undefined;

    const start = Date.now();
    const resp = await this.request.fetch(url, {
      method,
      headers,
      params,
      data: options.data,
    });
    const durationMs = Date.now() - start;

    const bodyText = await resp.text();
    const headersObj: Record<string, string> = {};
    for (const { name, value } of resp.headersArray()) headersObj[name.toLowerCase()] = value;

    let bodyJson: T | undefined;
    const ct = headersObj['content-type'] || '';
    const looksJson = bodyText.trim().startsWith('{') || bodyText.trim().startsWith('[');
    const ctJson = ct.includes('application/json') || ct.includes('+json');

    if (bodyText && (looksJson || ctJson)) {
      try { bodyJson = JSON.parse(bodyText) as T; } catch { /* keep text */ }
    }

    return {
      ok: resp.ok(),
      status: resp.status(),
      headers: headersObj,
      url,
      bodyText,
      bodyJson,
      durationMs,
    };
  }

  private _normalizeQuery(query: Record<string, string | number | boolean | undefined | null>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      out[k] = String(v);
    }
    return out;
  }
}
