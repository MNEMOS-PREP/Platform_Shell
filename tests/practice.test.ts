/**
 * The habit loop's arithmetic (src/lib/practice.ts), pinned. A streak is one
 * number nothing else checks, so it is checked here: counts of sessions that
 * actually started, a streak alive until today is over, and a planned session
 * that never began counting for nothing.
 *
 *   npm test        (Node 22+ runs TypeScript directly)
 */
import { bestStreak, currentStreak, practiceDays, recentDays, thisWeek, measuredOverTime, dayKey, instant } from "../src/lib/practice.ts";
const at = (d: string, h = 10) => new Date(`${d}T${String(h).padStart(2,"0")}:00:00`).toISOString();
const today = new Date("2026-10-08T15:00:00"); // a Thursday
const s = (d: string) => ({ started_at: at(d), status: "ended" });
const sessions = [s("2026-10-08"), s("2026-10-07"), s("2026-10-06"), s("2026-10-04"), s("2026-10-03"), s("2026-10-02"), s("2026-10-01"), { started_at: null, status: "planned" }];
const days = practiceDays(sessions);
const check = (name: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${JSON.stringify(got)}${ok ? "" : " want " + JSON.stringify(want)}`); if (!ok) process.exitCode = 1; };
check("current streak counts back from today", currentStreak(days, today), 3);
check("a streak is alive until today is over", currentStreak(practiceDays([s("2026-10-07"), s("2026-10-06")]), today), 2);
check("a gap ends it", currentStreak(practiceDays([s("2026-10-06")]), today), 0);
check("best streak", bestStreak(days), 4);
check("a planned session that never started counts for nothing", practiceDays([{ started_at: null, status: "planned" }]).size, 0);
check("this week = Monday..today", thisWeek(sessions, today), 3);
check("14 days, oldest first, today last", [recentDays(days, 14, today).length, recentDays(days, 14, today).at(-1)!.key, recentDays(days, 14, today).at(-1)!.practised], [14, "2026-10-08", true]);
check("measured over time", measuredOverTime([{ points: [{ observed_at: at("2026-09-02") }, { observed_at: at("2026-09-01") }] }, { points: [{ observed_at: at("2026-09-01", 9) }] }, { points: [{ observed_at: at("2026-09-05") }] }, { points: [] }]), [{ date: "2026-09-01", count: 2 }, { date: "2026-09-05", count: 3 }]);
check("dayKey is local", dayKey(new Date(2026, 0, 5)), "2026-01-05");
// SQLite hands timestamps back with no zone; they were written in UTC. 19:51 UTC is
// 1:21 a.m. the next day in India: the practice day is the student's, not London's.
const naive = "2026-10-07T19:51:04.954538";
const utc = new Date(Date.UTC(2026, 9, 7, 19, 51, 4, 954));
check("a timestamp with no zone is UTC", instant(naive).getTime(), utc.getTime());
check("and its practice day is the student's", [...practiceDays([{ started_at: naive, status: "ended" }])], [dayKey(utc)]);
check("growth counts the student's day too", measuredOverTime([{ points: [{ observed_at: naive }] }]), [{ date: dayKey(utc), count: 1 }]);
check("a date alone is that day", dayKey(instant("2026-10-07")), "2026-10-07");
