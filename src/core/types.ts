export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RequestOptions = {
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined | null>;
  data?: unknown;
  cookieToken?: string; // Restful Booker: Cookie: token=<token>
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
