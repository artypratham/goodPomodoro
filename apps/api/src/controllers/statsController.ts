import type { Request, Response } from 'express';
import { z } from 'zod';
import { getStatsWithDailySessions, recordFocusSession } from '../services/statsService';

const sessionSchema = z.object({
  duration: z.number().int().min(1).max(240)
});

export async function getStats(req: Request, res: Response) {
  const userId = req.auth?.sub;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const stats = await getStatsWithDailySessions(userId);
  res.status(200).json(stats);
}

export async function recordSession(req: Request, res: Response) {
  const userId = req.auth?.sub;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const parsed = sessionSchema.parse(req.body);
    await recordFocusSession(userId, parsed.duration);
    const stats = await getStatsWithDailySessions(userId);
    res.status(200).json(stats);
  } catch (error) {
    res.status(400).json({ error: 'Invalid session' });
  }
}
