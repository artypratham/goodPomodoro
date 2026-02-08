import { env } from '../config/env';
import type { CookieOptions } from 'express';

export const ACCESS_COOKIE = 'pf_access';
export const REFRESH_COOKIE = 'pf_refresh';

export function getCookieOptions(): CookieOptions {
  const isProd = env.nodeEnv === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/'
  };
}
