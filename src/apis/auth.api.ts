import type { ApiClient } from '../core/apiClient';

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
