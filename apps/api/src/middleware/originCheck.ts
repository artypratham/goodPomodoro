import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { normalizeOrigin, parseAllowedOrigins } from '../utils/origin';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

export function originCheck(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.includes(req.method)) {
    next();
    return;
  }

  const origin = req.headers.origin;
  if (!origin) {
    res.status(403).json({ error: 'Origin header required' });
    return;
  }

  const allowed = parseAllowedOrigins(env.corsOrigin);
  if (!allowed.includes(normalizeOrigin(origin))) {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }

  next();
}
