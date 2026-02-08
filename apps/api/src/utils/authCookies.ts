import type { Response } from 'express';
import { env } from '../config/env';
import { ACCESS_COOKIE, REFRESH_COOKIE, getCookieOptions } from './cookies';
import type { SessionTokens } from '../services/authService';

export function setAuthCookies(res: Response, tokens: SessionTokens) {
  const options = getCookieOptions();
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...options,
    maxAge: env.accessTokenTtlMinutes * 60 * 1000
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...options,
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000
  });
}

export function clearAuthCookies(res: Response) {
  const options = getCookieOptions();
  res.clearCookie(ACCESS_COOKIE, options);
  res.clearCookie(REFRESH_COOKIE, options);
}
