import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export function httpsOnly(req: Request, res: Response, next: NextFunction): void {
  if (env.nodeEnv !== 'production') {
    next();
    return;
  }

  const forwardedProto = req.headers['x-forwarded-proto'];
  const isSecure = req.secure || forwardedProto === 'https';
  if (!isSecure) {
    res.status(400).json({ error: 'HTTPS required' });
    return;
  }
  next();
}
