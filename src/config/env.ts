import * as dotenv from 'dotenv';

export type Env = {
  BASE_URL: string;
  USERNAME: string;
  PASSWORD: string;
  CI: boolean;
};

export function loadEnv(): Env {
  dotenv.config();

  const BASE_URL = process.env.BASE_URL?.trim() || 'https://restful-booker.herokuapp.com';
  const USERNAME = process.env.USERNAME?.trim() || 'admin';
  const PASSWORD = process.env.PASSWORD?.trim() || 'password123';
  const CI =
    (process.env.CI || '').toLowerCase() === 'true' ||
    !!process.env.GITHUB_ACTIONS;

  return { BASE_URL, USERNAME, PASSWORD, CI };
}
