import { z } from 'zod';
import { prisma } from '../db/prisma';

const settingsSchema = z.object({
  focusDuration: z.number().int().min(1).max(120).optional(),
  shortBreakDuration: z.number().int().min(1).max(30).optional(),
  longBreakDuration: z.number().int().min(1).max(60).optional(),
  sessionsBeforeLongBreak: z.number().int().min(1).max(10).optional(),
  autoStartBreaks: z.boolean().optional(),
  autoStartFocus: z.boolean().optional(),
  soundEnabled: z.boolean().optional()
});

export async function getSettings(userId: string) {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  return settings ?? null;
}

export async function updateSettings(userId: string, payload: unknown) {
  const parsed = settingsSchema.parse(payload);
  return prisma.userSettings.update({
    where: { userId },
    data: parsed
  });
}
