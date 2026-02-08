import dayjs from 'dayjs';
import { prisma } from '../db/prisma';
import { startOfUtcDay, isSameUtcDay } from '../utils/date';
import { listDailyStatsSince } from '../repositories/statsRepository';

export async function getStatsWithDailySessions(userId: string) {
  const [stats, dailyRows] = await Promise.all([
    prisma.userStats.findUnique({ where: { userId } }),
    listDailyStatsSince(userId, dayjs().subtract(365, 'day').toDate())
  ]);

  if (!stats) {
    return {
      totalSessions: 0,
      totalFocusMinutes: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastSessionDate: null,
      dailySessions: {}
    };
  }

  const dailySessions: Record<string, number> = {};
  dailyRows.forEach((row) => {
    const key = row.date.toISOString().split('T')[0];
    dailySessions[key] = row.sessions;
  });

  return {
    totalSessions: stats.totalSessions,
    totalFocusMinutes: stats.totalFocusMinutes,
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    lastSessionDate: stats.lastSessionDate ? stats.lastSessionDate.toISOString().split('T')[0] : null,
    dailySessions
  };
}

export async function recordFocusSession(userId: string, durationMinutes: number) {
  // Use UTC dates to keep streaks consistent across time zones.
  const today = startOfUtcDay(new Date());
  const yesterday = dayjs(today).subtract(1, 'day').toDate();

  return prisma.$transaction(async (tx) => {
    const stats = await tx.userStats.findUnique({ where: { userId } });

    if (!stats) {
      await tx.userStats.create({ data: { userId } });
    }

    const current = stats ?? {
      totalSessions: 0,
      totalFocusMinutes: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastSessionDate: null
    };

    let currentStreak = current.currentStreak;

    if (current.lastSessionDate) {
      if (isSameUtcDay(current.lastSessionDate, yesterday)) {
        currentStreak += 1;
      } else if (!isSameUtcDay(current.lastSessionDate, today)) {
        currentStreak = 1;
      }
    } else {
      currentStreak = 1;
    }

    const longestStreak = Math.max(current.longestStreak, currentStreak);

    await tx.dailyStat.upsert({
      where: { userId_date: { userId, date: today } },
      update: { sessions: { increment: 1 } },
      create: { userId, date: today, sessions: 1 }
    });

    const updated = await tx.userStats.update({
      where: { userId },
      data: {
        totalSessions: { increment: 1 },
        totalFocusMinutes: { increment: durationMinutes },
        currentStreak,
        longestStreak,
        lastSessionDate: today
      }
    });

    return updated;
  });
}
