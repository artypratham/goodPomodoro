import type { Request, Response } from 'express';
import { prisma } from '../db/prisma';

export async function health(_req: Request, res: Response) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    res.status(200).json({ status: 'degraded' });
  }
}
