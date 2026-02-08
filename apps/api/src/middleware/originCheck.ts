import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

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

  const allowed = env.corsOrigin.split(',').map((value) => value.trim());
  if (!allowed.includes(origin)) {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }

  next();
}
