/**
 * The habit loop, counted honestly.
 *
 * A streak is the single strongest retention mechanic in learning products
 * (Duolingo, Brilliant, Khan Academy), and the easiest to make dishonest: it is
 * one number, and nothing checks it. So every figure here is a COUNT of things
 * that happened — interviews and drills M06 recorded as started — and nothing
 * is estimated, weighted or rounded. A planned session nobody started does not
 * count; neither does a day with nothing in it.
 *
 * Humane by construction, after Duolingo's own lesson (streak freezes): a
 * streak is "alive" until the end of today, so opening the app in the morning
 * never shows a broken streak for a day that is not over.
 */

export interface PracticeSession {
  started_at: string | null;
  status: string;
}

/** Local calendar date, `YYYY-MM-DD` — a streak is about the student's days. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** The days on which the student actually practised. */
export function practiceDays(sessions: PracticeSession[]): Set<string> {
  const days = new Set<string>();
  for (const s of sessions) {
    if (s.started_at) days.add(dayKey(new Date(s.started_at)));
  }
  return days;
}

/** Consecutive days ending today — or yesterday, while today is not over. */
export function currentStreak(days: Set<string>, today = new Date()): number {
  let cursor = days.has(dayKey(today)) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(dayKey(cursor))) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

function parseDay(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

export function bestStreak(days: Set<string>): number {
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const key of [...days].sort()) {
    run = previous !== null && dayKey(addDays(parseDay(previous), 1)) === key ? run + 1 : 1;
    best = Math.max(best, run);
    previous = key;
  }
  return best;
}

/** The last `n` days, oldest first, each marked practised or not. */
export function recentDays(days: Set<string>, n = 14, today = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const date = addDays(today, i - (n - 1));
    return { key: dayKey(date), date, practised: days.has(dayKey(date)) };
  });
}

/** Sessions started this week (Monday to today). */
export function thisWeek(sessions: PracticeSession[], today = new Date()): number {
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  const start = dayKey(monday);
  const end = dayKey(today);
  return sessions.filter((s) => {
    if (!s.started_at) return false;
    const key = dayKey(new Date(s.started_at));
    return key >= start && key <= end;
  }).length;
}

/* ── the weekly goal: the student's own number, kept in this browser ─────── */

const GOAL_KEY = "ai.weeklyGoal";
export const GOAL_OPTIONS = [2, 3, 5, 7] as const;

export function readGoal(): number {
  try {
    const saved = Number(localStorage.getItem(GOAL_KEY));
    return (GOAL_OPTIONS as readonly number[]).includes(saved) ? saved : 3;
  } catch {
    return 3;
  }
}

export function writeGoal(goal: number): void {
  try {
    localStorage.setItem(GOAL_KEY, String(goal));
  } catch {
    /* the goal still holds for this page */
  }
}

/**
 * Concepts with evidence, cumulatively, by the date each first got some —
 * "how much of the skill graph you have shown", drawn from M04's trajectory.
 * A count over time, not an invented ability score.
 */
export function measuredOverTime(
  series: { points: { observed_at: string }[] }[],
): { date: string; count: number }[] {
  const firsts = series
    .map((s) => s.points.map((p) => p.observed_at).sort()[0])
    .filter((d): d is string => Boolean(d))
    .map((d) => d.slice(0, 10))
    .sort();
  const out: { date: string; count: number }[] = [];
  firsts.forEach((date, i) => {
    const last = out[out.length - 1];
    if (last && last.date === date) last.count = i + 1;
    else out.push({ date, count: i + 1 });
  });
  return out;
}
