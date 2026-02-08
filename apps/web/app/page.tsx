'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiGet, apiPost, apiPut } from '../lib/api';
import type { Settings, Stats, User } from '../lib/types';
import { Spotlight } from '../components/ui/Spotlight';
import { Toast } from '../components/Toast';

const DEFAULT_SETTINGS: Settings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true
};

const DEFAULT_STATS: Stats = {
  totalSessions: 0,
  totalFocusMinutes: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastSessionDate: null,
  dailySessions: {}
};

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

type TimerState = {
  mode: TimerMode;
  isRunning: boolean;
  timeLeft: number;
  totalTime: number;
  completedSessions: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [tab, setTab] = useState<'timer' | 'stats' | 'settings'>('timer');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; visible: boolean }>({
    message: '',
    type: 'info',
    visible: false
  });
  const [calendar, setCalendar] = useState({
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear()
  });
  const [isCompleted, setIsCompleted] = useState(false);
  const [timer, setTimer] = useState<TimerState>({
    mode: 'focus',
    isRunning: false,
    timeLeft: DEFAULT_SETTINGS.focusDuration * 60,
    totalTime: DEFAULT_SETTINGS.focusDuration * 60,
    completedSessions: 0
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const monthNames = useMemo(
    () => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    []
  );

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const session = await apiGet<{ user: User }>('/auth/me');
        setUser(session.user);
        setIsAuthenticated(true);
        await loadUserData();
      } catch (error) {
        setIsAuthenticated(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (!timer.isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Drive the countdown with a single interval while running.
    intervalRef.current = setInterval(() => {
      setTimer((prev) => ({
        ...prev,
        timeLeft: prev.timeLeft > 0 ? prev.timeLeft - 1 : 0
      }));
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timer.isRunning]);

  useEffect(() => {
    if (timer.isRunning && timer.timeLeft === 0) {
      completeTimer();
    }
  }, [timer.timeLeft, timer.isRunning]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      if (event.code === 'Space') {
        event.preventDefault();
        timer.isRunning ? pauseTimer() : startTimer();
      }
      if (event.code === 'KeyR') {
        resetTimer();
      }
      if (event.code === 'KeyS') {
        skipTimer();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [timer.isRunning, timer.mode, timer.timeLeft, settings]);

  useEffect(() => {
    if (!timer.isRunning) {
      setTimer((prev) => {
        const duration = getModeDuration(prev.mode, settings);
        return { ...prev, timeLeft: duration, totalTime: duration };
      });
    }
  }, [settings]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3000);
  };

  const loadUserData = async () => {
    try {
      const [settingsData, statsData] = await Promise.all([
        apiGet<Settings>('/settings'),
        apiGet<Stats>('/stats')
      ]);
      setSettings(settingsData);
      setStats(statsData);
    } catch (error) {
      showToast('Failed to load data', 'error');
    }
  };

  const handleLogin = async (identifier: string, password: string) => {
    setAuthLoading(true);
    try {
      const data = await apiPost<{ user: User }>('/auth/login', { identifier, password });
      setUser(data.user);
      setIsAuthenticated(true);
      await loadUserData();
      showToast('Welcome back!', 'success');
    } catch (error) {
      showToast((error as Error).message, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (payload: { username: string; email?: string; password: string }) => {
    setAuthLoading(true);
    try {
      const data = await apiPost<{ user: User }>('/auth/register', payload);
      setUser(data.user);
      setIsAuthenticated(true);
      await loadUserData();
      showToast('Account created!', 'success');
    } catch (error) {
      showToast((error as Error).message, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await apiPost('/auth/logout');
    setIsAuthenticated(false);
    setUser(null);
    setSettings(DEFAULT_SETTINGS);
    setStats(DEFAULT_STATS);
    resetTimer();
    showToast('Signed out', 'success');
  };

  const startTimer = () => {
    setTimer((prev) => ({ ...prev, isRunning: true }));
  };

  const pauseTimer = () => {
    setTimer((prev) => ({ ...prev, isRunning: false }));
  };

  const resetTimer = () => {
    pauseTimer();
    setTimer((prev) => {
      const duration = getModeDuration(prev.mode, settings);
      return { ...prev, timeLeft: duration, totalTime: duration };
    });
  };

  const skipTimer = () => {
    pauseTimer();
    completeTimer(true);
  };

  const completeTimer = async (skipped = false) => {
    pauseTimer();

    setIsCompleted(true);
    setTimeout(() => setIsCompleted(false), 600);

    if (settings.soundEnabled && !skipped) {
      playNotificationSound();
    }

    if (timer.mode === 'focus') {
      if (!skipped) {
        await recordSession(settings.focusDuration);
      }
      const nextCompleted = timer.completedSessions + 1;
      const willLongBreak = nextCompleted >= settings.sessionsBeforeLongBreak;
      const nextMode: TimerMode = willLongBreak ? 'longBreak' : 'shortBreak';
      const duration = getModeDuration(nextMode, settings);

      setTimer((prev) => ({
        ...prev,
        mode: nextMode,
        timeLeft: duration,
        totalTime: duration,
        isRunning: false,
        completedSessions: willLongBreak ? 0 : nextCompleted
      }));

      showToast(
        willLongBreak ? 'Time for a long break!' : 'Focus complete! Take a short break.',
        'success'
      );

      if (settings.autoStartBreaks && !skipped) {
        setTimeout(startTimer, 1000);
      }
    } else {
      const duration = getModeDuration('focus', settings);
      setTimer((prev) => ({
        ...prev,
        mode: 'focus',
        timeLeft: duration,
        totalTime: duration,
        isRunning: false
      }));
      showToast('Break complete! Ready to focus.', 'success');

      if (settings.autoStartFocus && !skipped) {
        setTimeout(startTimer, 1000);
      }
    }
  };

  const setTimerMode = (mode: TimerMode) => {
    const duration = getModeDuration(mode, settings);
    setTimer((prev) => ({
      ...prev,
      mode,
      timeLeft: duration,
      totalTime: duration,
      isRunning: false
    }));
  };

  const recordSession = async (duration: number) => {
    try {
      const updated = await apiPost<Stats>('/stats/session', { duration });
      setStats(updated);
    } catch (error) {
      showToast('Failed to sync session', 'error');
    }
  };

  const saveSettings = async () => {
    try {
      const updated = await apiPut<Settings>('/settings', settings);
      setSettings(updated);
      showToast('Settings saved!', 'success');
    } catch (error) {
      showToast('Failed to save settings', 'error');
    }
  };

  const timerModeLabel = timer.mode === 'focus' ? 'Focus Time' : timer.mode === 'shortBreak' ? 'Short Break' : 'Long Break';

  const minutes = Math.floor(timer.timeLeft / 60);
  const seconds = timer.timeLeft % 60;
  const minutesStr = minutes.toString().padStart(2, '0');
  const secondsStr = seconds.toString().padStart(2, '0');

  useEffect(() => {
    document.title = `${minutesStr}:${secondsStr} - Pomodoro Focus`;
  }, [minutesStr, secondsStr]);

  const progressOffset = useMemo(() => {
    const circumference = 2 * Math.PI * 120;
    const progress = timer.totalTime === 0 ? 0 : (timer.totalTime - timer.timeLeft) / timer.totalTime;
    return circumference * (1 - progress);
  }, [timer.totalTime, timer.timeLeft]);

  const calendarDays = useMemo(() => {
    const year = calendar.currentYear;
    const month = calendar.currentMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const cells: Array<{ day?: number; sessions?: number; isToday?: boolean }> = [];

    for (let i = 0; i < firstDay; i += 1) {
      cells.push({});
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const sessions = stats.dailySessions?.[dateStr] ?? 0;
      const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      cells.push({ day, sessions, isToday });
    }

    return cells;
  }, [calendar, stats.dailySessions]);

  return (
    <>
      <Spotlight />
      <div className="container">
        <div className="app-shell">
          <div className="titlebar">
            <div className="titlebar-title">Pomodoro Focus</div>
            <div className="titlebar-controls">
              <span className="titlebar-dot close" />
              <span className="titlebar-dot minimize" />
              <span className="titlebar-dot maximize" />
            </div>
          </div>
          <div className="app-body">
            {!isAuthenticated ? (
              <div className="auth-container">
                <div className="auth-logo">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="white">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
                </div>
                <h1 className="auth-title">{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h1>
                <p className="auth-subtitle">
                  {authMode === 'login' ? 'Sign in to continue your focus journey' : 'Start your productivity journey'}
                </p>

                {authMode === 'login' ? (
                  <AuthLoginForm onSubmit={handleLogin} loading={authLoading} />
                ) : (
                  <AuthRegisterForm onSubmit={handleRegister} loading={authLoading} />
                )}

                {/*
                  <div className="auth-divider">or</div>
                  <button
                    className="google-btn"
                    onClick={() => {
                      window.location.href = `${API_URL}/auth/google?redirect=${encodeURIComponent(window.location.origin)}`;
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M21.805 10.023h-9.18v3.954h5.268c-.226 1.225-1.374 3.594-5.268 3.594-3.167 0-5.745-2.616-5.745-5.845 0-3.23 2.578-5.846 5.745-5.846 1.804 0 3.014.771 3.709 1.437l2.523-2.429C17.49 3.437 15.477 2.5 12.625 2.5 7.668 2.5 3.64 6.529 3.64 11.726c0 5.197 4.028 9.226 8.985 9.226 5.2 0 8.648-3.655 8.648-8.78 0-.591-.067-1.038-.15-1.449Z" fill="white" />
                    </svg>
                    Continue with Google
                  </button>
                */}

                <div className="auth-switch">
                  {authMode === 'login' ? (
                    <span>
                      Don&apos;t have an account?{' '}
                      <button onClick={() => setAuthMode('register')}>Create one</button>
                    </span>
                  ) : (
                    <span>
                      Already have an account?{' '}
                      <button onClick={() => setAuthMode('login')}>Sign in</button>
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="nav-tabs">
                  <button className={`nav-tab ${tab === 'timer' ? 'active' : ''}`} onClick={() => setTab('timer')}>
                    Timer
                  </button>
                  <button className={`nav-tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>
                    Stats
                  </button>
                  <button className={`nav-tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
                    Settings
                  </button>
                </div>

                <div className="timer-display" style={{ display: tab === 'timer' ? 'flex' : 'none' }}>
                  <div className={`timer-mode ${timer.mode === 'focus' ? 'focus' : timer.mode === 'shortBreak' ? 'short-break' : 'long-break'}`}>
                    {timerModeLabel}
                  </div>
                  <div className={`timer-circle ${timer.isRunning ? 'running' : ''} ${isCompleted ? 'completed' : ''}`}>
                    <svg>
                      <circle className="timer-circle-bg" cx="130" cy="130" r="120" />
                      <circle
                        className={`timer-circle-progress ${timer.mode === 'shortBreak' ? 'short-break' : timer.mode === 'longBreak' ? 'long-break' : ''}`}
                        cx="130"
                        cy="130"
                        r="120"
                        strokeDasharray="754"
                        strokeDashoffset={progressOffset}
                      />
                    </svg>
                    <div className="timer-time">
                      <span className="minutes">{minutesStr}</span>:<span className="seconds">{secondsStr}</span>
                    </div>
                  </div>

                  <div className="session-indicator">
                    {Array.from({ length: settings.sessionsBeforeLongBreak }).map((_, index) => (
                      <div
                        key={index}
                        className={`session-dot ${index < timer.completedSessions ? 'completed' : ''}`}
                      />
                    ))}
                  </div>

                  <div className="timer-controls">
                    <button className="control-btn" onClick={resetTimer} title="Reset">
                      <svg viewBox="0 0 24 24">
                        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                      </svg>
                    </button>
                    <button
                      className={`control-btn primary ${timer.mode === 'shortBreak' ? 'short-break' : timer.mode === 'longBreak' ? 'long-break' : ''}`}
                      onClick={() => (timer.isRunning ? pauseTimer() : startTimer())}
                      title={timer.isRunning ? 'Pause' : 'Start'}
                    >
                      {timer.isRunning ? (
                        <svg viewBox="0 0 24 24">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                    <button className="control-btn" onClick={skipTimer} title="Skip">
                      <svg viewBox="0 0 24 24">
                        <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className={`stats-panel ${tab === 'stats' ? 'active' : ''}`}>
                  <div className="stats-header">
                    <h2 className="stats-title">Statistics</h2>
                    <div className="streak-badge">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                        <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
                      </svg>
                      <span>{stats.currentStreak} day{stats.currentStreak === 1 ? '' : 's'} streak</span>
                    </div>
                  </div>

                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-value">{stats.totalSessions}</div>
                      <div className="stat-label">Total Sessions</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{stats.totalFocusMinutes}</div>
                      <div className="stat-label">Focus Minutes</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{stats.dailySessions[new Date().toISOString().split('T')[0]] ?? 0}</div>
                      <div className="stat-label">Today&apos;s Sessions</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{stats.longestStreak}</div>
                      <div className="stat-label">Longest Streak</div>
                    </div>
                  </div>

                  <div className="calendar-section">
                    <div className="calendar-header">
                      <span className="calendar-title">{monthNames[calendar.currentMonth]} {calendar.currentYear}</span>
                      <div className="calendar-nav">
                        <button
                          onClick={() => {
                            setCalendar((prev) => {
                              const nextMonth = prev.currentMonth - 1;
                              if (nextMonth < 0) {
                                return { currentMonth: 11, currentYear: prev.currentYear - 1 };
                              }
                              return { ...prev, currentMonth: nextMonth };
                            });
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setCalendar((prev) => {
                              const nextMonth = prev.currentMonth + 1;
                              if (nextMonth > 11) {
                                return { currentMonth: 0, currentYear: prev.currentYear + 1 };
                              }
                              return { ...prev, currentMonth: nextMonth };
                            });
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="calendar-days">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="calendar-day-name">{day}</div>
                      ))}
                    </div>
                    <div className="calendar-grid">
                      {calendarDays.map((cell, index) => {
                        if (!cell.day) {
                          return <div key={`empty-${index}`} className="calendar-cell" />;
                        }
                        const level = cell.sessions ? Math.min(5, Math.ceil(cell.sessions / 2)) : 0;
                        return (
                          <div
                            key={cell.day}
                            className={`calendar-cell ${cell.sessions ? `has-sessions level-${level}` : ''} ${cell.isToday ? 'today' : ''}`}
                            title={cell.sessions ? `${cell.sessions} session${cell.sessions === 1 ? '' : 's'}` : ''}
                          >
                            {cell.day}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className={`settings-panel ${tab === 'settings' ? 'active' : ''}`}>
                  <div className="settings-header">
                    <h2 className="settings-title">Settings</h2>
                  </div>

                  <div className="settings-section">
                    <div className="settings-section-title">Timer Durations</div>
                    <div className="setting-row">
                      <span className="setting-label">Focus Duration</span>
                      <div className="setting-value">
                        <input
                          type="number"
                          className="setting-input"
                          value={settings.focusDuration}
                          min={1}
                          max={120}
                          onChange={(event) => setSettings((prev) => ({ ...prev, focusDuration: Number(event.target.value) }))}
                        />
                        <span className="setting-unit">min</span>
                      </div>
                    </div>
                    <div className="setting-row">
                      <span className="setting-label">Short Break</span>
                      <div className="setting-value">
                        <input
                          type="number"
                          className="setting-input"
                          value={settings.shortBreakDuration}
                          min={1}
                          max={30}
                          onChange={(event) => setSettings((prev) => ({ ...prev, shortBreakDuration: Number(event.target.value) }))}
                        />
                        <span className="setting-unit">min</span>
                      </div>
                    </div>
                    <div className="setting-row">
                      <span className="setting-label">Long Break</span>
                      <div className="setting-value">
                        <input
                          type="number"
                          className="setting-input"
                          value={settings.longBreakDuration}
                          min={1}
                          max={60}
                          onChange={(event) => setSettings((prev) => ({ ...prev, longBreakDuration: Number(event.target.value) }))}
                        />
                        <span className="setting-unit">min</span>
                      </div>
                    </div>
                    <div className="setting-row">
                      <span className="setting-label">Sessions Before Long Break</span>
                      <div className="setting-value">
                        <input
                          type="number"
                          className="setting-input"
                          value={settings.sessionsBeforeLongBreak}
                          min={1}
                          max={10}
                          onChange={(event) =>
                            setSettings((prev) => ({ ...prev, sessionsBeforeLongBreak: Number(event.target.value) }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="settings-section">
                    <div className="settings-section-title">Automation</div>
                    <div className="setting-row">
                      <span className="setting-label">Auto-start Breaks</span>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings.autoStartBreaks}
                          onChange={(event) => setSettings((prev) => ({ ...prev, autoStartBreaks: event.target.checked }))}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                    <div className="setting-row">
                      <span className="setting-label">Auto-start Focus</span>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings.autoStartFocus}
                          onChange={(event) => setSettings((prev) => ({ ...prev, autoStartFocus: event.target.checked }))}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                    <div className="setting-row">
                      <span className="setting-label">Sound Enabled</span>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings.soundEnabled}
                          onChange={(event) => setSettings((prev) => ({ ...prev, soundEnabled: event.target.checked }))}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                  </div>

                  <button className="btn-primary" onClick={saveSettings}>Save Settings</button>
                  <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </>
  );
}

function AuthLoginForm({
  onSubmit,
  loading
}: {
  onSubmit: (identifier: string, password: string) => void;
  loading: boolean;
}) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form
      className="auth-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(identifier, password);
      }}
    >
      <div className="input-group">
        <label>Email or Username</label>
        <input
          type="text"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="Enter email or username"
          required
        />
      </div>
      <div className="input-group">
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter password"
          required
        />
      </div>
      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}

function AuthRegisterForm({
  onSubmit,
  loading
}: {
  onSubmit: (payload: { username: string; email?: string; password: string }) => void;
  loading: boolean;
}) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form
      className="auth-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ username, email: email.trim() ? email : undefined, password });
      }}
    >
      <div className="input-group">
        <label>Username</label>
        <input
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Choose a username"
          required
        />
      </div>
      <div className="input-group">
        <label>Email (optional)</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <div className="input-group">
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Create a password"
          required
        />
      </div>
      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  );
}

function getModeDuration(mode: TimerMode, settings: Settings) {
  switch (mode) {
    case 'shortBreak':
      return settings.shortBreakDuration * 60;
    case 'longBreak':
      return settings.longBreakDuration * 60;
    default:
      return settings.focusDuration * 60;
  }
}

function playNotificationSound() {
  const AudioContext = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = 800;
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
}
