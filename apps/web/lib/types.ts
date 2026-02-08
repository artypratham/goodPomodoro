export type User = {
  id: string;
  username: string;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
};

export type Settings = {
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
};

export type Stats = {
  totalSessions: number;
  totalFocusMinutes: number;
  currentStreak: number;
  longestStreak: number;
  lastSessionDate: string | null;
  dailySessions: Record<string, number>;
};
