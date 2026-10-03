/**
 * What the student is preparing for, turned into dates and milestones.
 *
 * Every function here is pure and every figure is a count or a date the
 * student gave us — the countdown is their drive date, a milestone is
 * something that happened. Nothing is a prediction.
 */
import { bestStreak, dayKey, practiceDays, type PracticeSession } from "./practice.ts";

export interface Drive {
  label: string;
  /** `YYYY-MM-DD`. */
  date: string;
  company_id?: string | null;
  drive_id?: string | null;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDay(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

/** Whole days from today to `date`; 0 is today, negative is past. */
export function daysUntil(date: string, today = new Date()): number {
  return Math.round((parseDay(date).getTime() - startOfDay(today).getTime()) / 86_400_000);
}

/** The soonest drive that is today or later. */
export function nextDrive(drives: Drive[], today = new Date()): Drive | null {
  return (
    [...drives]
      .filter((d) => daysUntil(d.date, today) >= 0)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
  );
}

export function countdownLabel(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/* ── milestones (1.1): earned, never bought, never inflated ─────────────── */

export interface Milestone {
  id: string;
  title: string;
  /** What it took, in one line. */
  detail: string;
  earned: boolean;
  /** Progress toward it, when not earned: `[have, need]`. */
  progress?: [number, number];
}

export function milestones(
  sessions: PracticeSession[],
  solidTopics: number,
): Milestone[] {
  const started = sessions.filter((s) => s.started_at).length;
  const best = bestStreak(practiceDays(sessions));
  const ladder = (id: string, title: string, detail: string, have: number, need: number): Milestone => ({
    id,
    title,
    detail,
    earned: have >= need,
    progress: have >= need ? undefined : [have, need],
  });
  return [
    ladder("first", "First interview", "You sat your first mock interview.", started, 1),
    ladder("streak3", "Three days running", "Practised three days in a row.", best, 3),
    ladder("solid", "First solid topic", "A topic on your skill graph reached solid.", solidTopics, 1),
    ladder("five", "Five interviews", "Five interviews started.", started, 5),
    ladder("streak7", "A full week", "Practised seven days in a row.", best, 7),
    ladder("ten", "Ten interviews", "Ten interviews started.", started, 10),
  ];
}

/* ── calendar files (3.3): reminders the student's own calendar keeps ───── */

function icsDate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}T${p(date.getHours())}${p(date.getMinutes())}00`;
}

function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function calendar(event: string[]): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AI Interviewer//Placement prep//EN",
    "BEGIN:VEVENT",
    ...event,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

/** A daily practice reminder at `time` (HH:MM), floating local time, with an alarm. */
export function dailyReminderIcs(time: string, url: string, today = new Date()): string {
  const [h, m] = time.split(":").map(Number);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m);
  const end = new Date(start.getTime() + 20 * 60_000);
  return calendar([
    `UID:practice-reminder-${dayKey(today)}@ai-interviewer`,
    `DTSTAMP:${icsDate(today)}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    "RRULE:FREQ=DAILY",
    `SUMMARY:${icsEscape("Practise one interview question")}`,
    `DESCRIPTION:${icsEscape(`Keep your streak going: ${url}`)}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:PT0M",
    `DESCRIPTION:${icsEscape("Time to practise")}`,
    "END:VALARM",
  ]);
}

/** An all-day event on the drive's date, reminding the day before. */
export function driveIcs(drive: Drive, url: string, today = new Date()): string {
  const day = drive.date.replace(/-/g, "");
  const next = parseDay(drive.date);
  next.setDate(next.getDate() + 1);
  return calendar([
    `UID:drive-${day}-${drive.label.replace(/\W+/g, "-").toLowerCase()}@ai-interviewer`,
    `DTSTAMP:${icsDate(today)}`,
    `DTSTART;VALUE=DATE:${day}`,
    `DTEND;VALUE=DATE:${dayKey(next).replace(/-/g, "")}`,
    `SUMMARY:${icsEscape(drive.label)}`,
    `DESCRIPTION:${icsEscape(`Placement drive. Practise for it: ${url}`)}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-P1D",
    `DESCRIPTION:${icsEscape(`${drive.label} is tomorrow`)}`,
    "END:VALARM",
  ]);
}

export function downloadIcs(filename: string, body: string): void {
  const url = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
