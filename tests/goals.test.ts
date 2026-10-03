/**
 * The countdown, the milestones, the calendar files and the account id
 * (src/lib/goals.ts, src/lib/account.ts), pinned. Each is a promise to a
 * student — "TCS Digital in 12 days", "the same email is the same you" — that
 * nothing else on the page checks.
 *
 *   npm test
 */
import { countdownLabel, daysUntil, driveIcs, dailyReminderIcs, milestones, nextDrive } from "../src/lib/goals.ts";
import { firstName, looksLikeEmail, subjectForEmail } from "../src/lib/account.ts";

const check = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${JSON.stringify(got)}${ok ? "" : " want " + JSON.stringify(want)}`);
  if (!ok) process.exitCode = 1;
};
const today = new Date("2026-10-04T21:30:00"); // late evening: days are calendar days, not 24h blocks

check("days until a date counts calendar days", daysUntil("2026-10-16", today), 12);
check("today is zero", daysUntil("2026-10-04", today), 0);
check("yesterday is negative", daysUntil("2026-10-03", today), -1);
check("labels", [countdownLabel(0), countdownLabel(1), countdownLabel(12)], ["today", "tomorrow", "in 12 days"]);
const drives = [
  { label: "Past", date: "2026-09-30" },
  { label: "Infosys SP", date: "2026-11-02" },
  { label: "TCS Digital", date: "2026-10-16" },
];
check("the next drive skips past ones and takes the soonest", nextDrive(drives, today)?.label, "TCS Digital");
check("no upcoming drive is null", nextDrive([{ label: "Past", date: "2026-09-30" }], today), null);

const at = (d: string) => ({ started_at: `${d}T10:00:00`, status: "ended" });
const earned = milestones([at("2026-10-01"), at("2026-10-02"), at("2026-10-03"), { started_at: null, status: "planned" }], 0);
check("first interview earned", earned.find((m) => m.id === "first")?.earned, true);
check("three days running earned", earned.find((m) => m.id === "streak3")?.earned, true);
check("five interviews shows progress, planned sessions not counted", earned.find((m) => m.id === "five")?.progress, [3, 5]);
check("no solid topic yet", earned.find((m) => m.id === "solid")?.earned, false);

const daily = dailyReminderIcs("19:30", "http://localhost:5173/", today);
check("daily reminder repeats daily at the chosen time", [daily.includes("RRULE:FREQ=DAILY"), daily.includes("DTSTART:20261004T193000")], [true, true]);
check("calendar lines end CRLF", daily.split("\r\n")[0], "BEGIN:VCALENDAR");
const drive = driveIcs({ label: "TCS Digital, campus", date: "2026-10-16" }, "http://x/", today);
check("drive is an all-day event with a day-before alarm", [drive.includes("DTSTART;VALUE=DATE:20261016"), drive.includes("DTEND;VALUE=DATE:20261017"), drive.includes("TRIGGER:-P1D")], [true, true, true]);
check("commas are escaped", drive.includes("SUMMARY:TCS Digital\\, campus"), true);

const a = await subjectForEmail("Asha@College.edu ");
const b = await subjectForEmail("asha@college.edu");
check("the same email is the same student", a, b);
check("it is a UUID the backends accept", /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(a), true);
check("a different email is a different student", a === (await subjectForEmail("ravi@college.edu")), false);
check("emails", [looksLikeEmail("asha@college.edu"), looksLikeEmail("asha"), looksLikeEmail("a@b")], [true, false, false]);
check("first name", [firstName("asha rao"), firstName(""), firstName(undefined)], ["Asha", null, null]);
