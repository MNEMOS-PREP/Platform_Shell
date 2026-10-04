/**
 * Today — the first screen after sign-in.
 *
 * Built (2026-10-03) on what makes the products people return to worth
 * returning to, and nothing they do that this platform refuses to:
 *
 *   · ONE next thing to do, top-left, chosen from the student's own data (the
 *     2026 "AI-native dashboard" pattern: summarise and prioritise, don't make
 *     people read a grid).
 *   · The habit loop, counted honestly (lib/practice.ts): a streak of days the
 *     student actually practised, the last two weeks as a strip, and a weekly
 *     goal THEY set. Duolingo's lesson, without Duolingo's guilt: the copy says
 *     a missed day resets the streak, never the progress.
 *   · Growth you can see: how much of the skill graph you have shown, over
 *     time, from M04's trajectory — a count, not an invented readiness score.
 *
 * Every figure is a count of something that happened.
 *
 * ── The order of things (2026-10-04, round 2) ──────────────────────────────
 * The first page decides whether a student stays, so what comes first is the
 * one thing that matters most to THIS student now, and the rest follows in
 * one order: urgency, habit, feedback, progress, social.
 *
 *   · The focus card's priority: an interview left half-done, then a drive
 *     two weeks out or closer, then the first interview, then the resume,
 *     then the weak topic, then momentum. Until now "add your resume" came
 *     first, so a student eight days from TCS NQT was told to upload a file.
 *   · A student who has never practised does not get five empty cards. They
 *     get the next step, the setup steps, what the first interview unlocks,
 *     and how many others practised this week. The other cards appear once
 *     they have something to say (progressive disclosure).
 *   · A returning student reads: Focus · Streak, then Last interview (with its
 *     bands — the result is what brings people back) · Next drive, then Skill
 *     graph · Milestones, then the week's cohort as a footer. On a phone that
 *     is the same order, top to bottom.
 *   · Staff land on their own queues with counts, not on a tour of student
 *     modules.
 */
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import {
  ANSWER_BAND_LABEL,
  Icon,
  STATE_LABEL,
  SkeletonCards,
  candidateIdOf,
  isStaff,
  relativeDays,
  useSession,
  type AnswerBand,
  type IconName,
  type MasteryState,
} from "@ai/core";
import { useCandidateResumes } from "@ai/m01";
import {
  useBottlenecks,
  useMastery,
  usePracticeConsent,
  useProfile,
  useSaveProfile,
  useTrajectory,
  type StudentProfile,
} from "@ai/m04";
import {
  bandOf,
  topicName,
  useCohortStats,
  useHistory,
  useReport,
  type SessionSummary,
} from "@ai/m06";
import { useDisputeQueue, useOutbox } from "@ai/m13";
import { useClaimReports, useReviewQueue } from "@ai/m15";

import { firstName } from "../lib/account";
import { countdownLabel, daysUntil, downloadIcs, driveIcs, milestones, nextDrive } from "../lib/goals";
import { JOURNEY, type Stage } from "../lib/journey";
import {
  GOAL_OPTIONS,
  bestStreak,
  currentStreak,
  measuredOverTime,
  practiceDays,
  readGoal,
  recentDays,
  thisWeek,
  writeGoal,
} from "../lib/practice";
import { Flame } from "../ui/Frame";

/* ─────────────────────────── small visual parts ─────────────────────────── */

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`panel p-6 ${className}`}>{children}</section>;
}

function CardLabel({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs font-medium text-ink-faint">
      <Icon name={icon} size={14} />
      {children}
    </p>
  );
}

/** A progress ring. `of` is a count the student chose; nothing is a percentage. */
function Ring({ value, of, size = 88 }: { value: number; of: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const done = Math.min(value / of, 1);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={done >= 1 ? "var(--color-confirmed)" : "var(--color-brand)"}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - done)}
        style={{ transition: "stroke-dashoffset 600ms var(--ease-out-soft)" }}
      />
    </svg>
  );
}

/** Cumulative count over time, as an area. Honest axes: it starts at the first evidence. */
function Growth({ points }: { points: { date: string; count: number }[] }) {
  const w = 560;
  const h = 120;
  if (points.length < 2) return null;
  const max = Math.max(...points.map((p) => p.count), 1);
  const xs = points.map((_, i) => (i / (points.length - 1)) * w);
  const ys = points.map((p) => h - 8 - (p.count / max) * (h - 24));
  // A step line: a concept is measured from the day it first was, not gradually.
  let line = `M ${xs[0]} ${ys[0]}`;
  for (let i = 1; i < points.length; i++) line += ` H ${xs[i]} V ${ys[i]}`;
  const area = `${line} V ${h} H 0 Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-28 w-full" aria-hidden>
      <defs>
        <linearGradient id="growth-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#growth-fill)" />
      <path d={line} fill="none" stroke="var(--color-brand)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const STATE_ORDER: MasteryState[] = ["strong", "adequate", "weak", "emerging"];
const STATE_FILL: Record<string, string> = {
  strong: "bg-mastery-strong",
  adequate: "bg-mastery-ok",
  weak: "bg-mastery-weak",
  emerging: "bg-line-strong",
};

const BAND_DOT: Record<AnswerBand, string> = {
  strong: "bg-mastery-strong",
  partly: "bg-mastery-ok",
  not_yet: "bg-mastery-weak",
};

/** A band word with its colour as a dot — ink text passes contrast in both themes. */
function BandChip({ band, n }: { band: AnswerBand; n?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-ink">
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${BAND_DOT[band]}`} />
      {n !== undefined && <span data-numeric>{n}</span>}
      {ANSWER_BAND_LABEL[band]}
    </span>
  );
}

const LIVE_STATUSES = new Set(["live", "paused"]);

/** The gentlest real start: 15 minutes of Practice — hints on, a retry allowed. */
const FIRST_INTERVIEW = "/mock?minutes=15&mode=practice";

/* ────────────────────────────── the cards ─────────────────────────────── */

/** A drive two weeks out or closer outranks the skill graph's suggestion. */
const DRIVE_FIRST_WITHIN_DAYS = 14;

interface Focus {
  eyebrow: string;
  title: ReactNode;
  body: string;
  cta: string;
  to: string;
  icon: IconName;
  why: string;
}

function FocusCard({
  candidate,
  profile,
  sessions,
  className = "",
}: {
  candidate: string;
  profile?: StudentProfile;
  sessions: SessionSummary[];
  className?: string;
}) {
  const resumes = useCandidateResumes(candidate);
  const bottlenecks = useBottlenecks(candidate, false);
  const mastery = useMastery(candidate, false);

  const hasResume = (resumes.data?.length ?? 0) > 0;
  const practised = sessions.some((s) => s.started_at);
  const measured = (mastery.data?.totals.measured ?? 0) > 0;
  const blocker = bottlenecks.data?.bottlenecks[0];
  const open = sessions.find((s) => LIVE_STATUSES.has(s.status));
  const planned = sessions.find((s) => s.status === "planned");
  const drive = nextDrive(profile?.drives ?? []);
  const driveDays = drive ? daysUntil(drive.date) : null;
  const driveSoon = drive !== null && driveDays !== null && driveDays <= DRIVE_FIRST_WITHIN_DAYS;
  const driveLink =
    drive?.company_id && drive.drive_id
      ? `/mock?${new URLSearchParams({ company: drive.company_id, drive: drive.drive_id, label: drive.label })}`
      : "/mock";

  // The order is the argument: what is already started, then the deadline,
  // then the first step, then setup, then the skill graph's suggestion.
  let focus: Focus;
  if (open) {
    focus = {
      eyebrow: "In progress",
      title: "Pick up where you left off",
      body: "Your interview is still open. Your answers so far are kept, and the notes come when you finish — or end it early, and you still get them.",
      cta: "Continue the interview",
      to: `/mock/${open.id}`,
      icon: "mic",
      why: `Started ${relativeDays(open.started_at ?? open.created_at)}.`,
    };
  } else if (planned) {
    focus = {
      eyebrow: "Ready when you are",
      title: "Your interview is planned",
      body: "The plan is built — see what you'll be asked, then start. You can remove a part you don't want.",
      cta: "See the plan",
      to: `/mock/${planned.id}/plan`,
      icon: "listChecks",
      why: `Planned ${relativeDays(planned.created_at)}.`,
    };
  } else if (driveSoon && drive) {
    focus = {
      eyebrow: `${drive.label} ${countdownLabel(driveDays!)}`,
      title: (
        <>
          Practise for <span className="text-gradient">{drive.label}</span>
        </>
      ),
      body: drive.drive_id
        ? "An interview planned from what this drive asks for — the closest thing to the real one you can sit today."
        : "Your drive is close. A full interview today — and pick the drive in Settings to plan from what it asks for.",
      cta: "Practise for this drive",
      to: driveLink,
      icon: "building",
      why: "Your nearest drive comes first while it's two weeks away or closer.",
    };
  } else if (!practised) {
    focus = {
      eyebrow: "Start here",
      title: "Take your first interview",
      body: "15 minutes of practice: hints on, and you can try a question again. You leave with notes on every answer — where your reasoning held, and where it stopped.",
      cta: "Start my first interview",
      to: FIRST_INTERVIEW,
      icon: "mic",
      why: "Nothing has been asked yet — this is the quickest way to see what the platform does.",
    };
  } else if (!hasResume) {
    focus = {
      eyebrow: "Next step",
      title: "Add your resume",
      body: "So the next interview asks about your own projects — and you can see which lines on it you can't defend yet, before a panel finds them.",
      cta: "Upload your resume",
      to: "/resume",
      icon: "document",
      why: "Interviews so far were general. A resume makes them yours.",
    };
  } else if (blocker) {
    focus = {
      eyebrow: "Today's focus",
      title: (
        <>
          Practise <span className="text-gradient">{blocker.name}</span>
        </>
      ),
      body: `It sits underneath ${blocker.blocks} of your weak topics. Fix it first and the rest get easier.`,
      cta: `Practise ${blocker.name}`,
      to: `/mock?${new URLSearchParams({ focus: blocker.concept_id, label: blocker.name })}`,
      icon: "target",
      why: "Chosen from your skill graph: the weak topic underneath the most others.",
    };
  } else {
    focus = {
      eyebrow: "Today's focus",
      title: "Keep your momentum",
      body: "One interview today keeps your streak and gives your skill graph new evidence to work with.",
      cta: "Start an interview",
      to: "/mock",
      icon: "mic",
      why: measured ? "Nothing is blocking you right now." : "Your skill graph needs more answers.",
    };
  }

  // Setup, as actions — each one a link while it is not done. The drive is
  // optional, so it never keeps the checklist open on its own.
  const steps = [
    { done: practised, label: "Take your first interview", to: FIRST_INTERVIEW },
    { done: hasResume, label: "Add your resume", to: "/resume" },
    { done: (profile?.drives.length ?? 0) > 0, label: "Add a drive date", to: "/settings#drives", optional: true },
  ];
  const required = steps.filter((s) => !s.optional);
  const doneCount = steps.filter((s) => s.done).length;
  const loading = resumes.isLoading;

  return (
    <section className={`panel relative overflow-hidden p-7 ${className}`}>
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-brand opacity-[0.16] blur-3xl" />
      <div className={`relative ${loading ? "opacity-0" : "page-in"}`}>
        <p className="inline-flex items-center gap-1.5 rounded-full border border-brand-line bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
          <Icon name="sparkles" size={13} />
          {focus.eyebrow}
        </p>
        <h2 className="mt-4 text-[1.75rem] leading-tight font-semibold tracking-tight text-ink">{focus.title}</h2>
        <p className="mt-2.5 max-w-xl text-[0.9375rem] leading-relaxed text-ink-soft">{focus.body}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to={focus.to}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white shadow-glow hover:bg-brand-hover"
          >
            <Icon name={focus.icon} size={16} />
            {focus.cta}
          </Link>
          {blocker && focus.to.includes("focus=") && (
            <Link
              to={`/skills?concept=${encodeURIComponent(blocker.concept_id)}`}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-ink-soft hover:bg-surface-sunken hover:text-ink"
            >
              See the evidence <Icon name="arrowRight" size={15} />
            </Link>
          )}
        </div>
        <p className="mt-5 flex items-center gap-1.5 text-xs text-ink-faint">
          <Icon name="info" size={13} /> {focus.why}
        </p>

        {required.some((s) => !s.done) && (
          <div className="mt-6 border-t border-line pt-5">
            <p className="text-xs font-medium text-ink-faint">
              Getting set up · {doneCount} of {steps.length} done
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              {steps.map((step) => (
                <li key={step.label}>
                  <Link
                    to={step.to}
                    aria-disabled={step.done || undefined}
                    className={`flex items-center gap-2 text-sm ${step.done ? "pointer-events-none" : "hover:text-brand"}`}
                  >
                    <span
                      className={`grid h-5 w-5 place-items-center rounded-full ${
                        step.done ? "bg-confirmed text-white" : "border border-line-strong text-transparent"
                      }`}
                    >
                      <Icon name="check" size={12} />
                    </span>
                    <span className={step.done ? "text-ink-faint line-through" : "text-ink"}>{step.label}</span>
                    {step.optional && !step.done && <span className="text-xs text-ink-faint">optional</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Before the first interview: what it unlocks, shown rather than five empty
 * cards. Illustrations, labelled as examples, of the three things a student
 * gets back — notes with bands, a skill graph that fills in, a streak.
 */
function WhatYouGetCard() {
  return (
    <Card>
      <CardLabel icon="sparkles">What your first interview unlocks</CardLabel>
      <ul className="mt-5 space-y-5">
        <li>
          <p className="text-sm font-medium text-ink">Notes on every answer</p>
          <p className="mt-0.5 text-xs text-ink-faint">Where your reasoning held, and a word for each answer.</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5" aria-hidden>
            <BandChip band="strong" />
            <BandChip band="partly" />
            <BandChip band="not_yet" />
          </div>
        </li>
        <li>
          <p className="text-sm font-medium text-ink">A skill graph that fills in</p>
          <p className="mt-0.5 text-xs text-ink-faint">Topic by topic, each with your own answer behind it.</p>
          <div className="mt-2.5 space-y-1.5" aria-hidden>
            {[
              ["Hashing", 78, "bg-mastery-strong"],
              ["Recursion", 46, "bg-mastery-ok"],
              ["Dynamic programming", 22, "bg-mastery-weak"],
            ].map(([label, width, fill]) => (
              <div key={label as string} className="flex items-center gap-2 text-xs text-ink-soft">
                <span className="w-32 truncate">{label}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                  <span className={`block h-full rounded-full ${fill}`} style={{ width: `${width}%` }} />
                </span>
              </div>
            ))}
          </div>
        </li>
        <li>
          <p className="text-sm font-medium text-ink">A streak that counts real days</p>
          <div className="mt-2.5 flex gap-1" aria-hidden>
            {Array.from({ length: 7 }, (_, i) => (
              <span
                key={i}
                className={`h-4 flex-1 rounded-[4px] ${i === 6 ? "bg-brand" : "border border-line bg-surface-sunken"}`}
              />
            ))}
          </div>
        </li>
      </ul>
      <p className="mt-5 text-[0.6875rem] text-ink-faint">Examples — yours start with your first interview.</p>
    </Card>
  );
}

function HabitCard({
  candidate,
  profile,
  sessions,
}: {
  candidate: string;
  profile?: StudentProfile;
  sessions: SessionSummary[];
}) {
  const saveProfile = useSaveProfile(candidate);
  const [picked, setGoal] = useState<number | null>(null);
  const goal = picked ?? profile?.weekly_goal ?? readGoal();
  const days = useMemo(() => practiceDays(sessions), [sessions]);
  const streak = currentStreak(days);
  const best = bestStreak(days);
  const week = thisWeek(sessions);
  const strip = recentDays(days, 14);

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardLabel icon="calendar">Practice streak</CardLabel>
          {streak > 0 ? (
            <p className="mt-3 flex items-center gap-2">
              <span className="text-reported">
                <Flame lit size={26} />
              </span>
              <span className="text-4xl font-semibold tracking-tight text-ink" data-numeric>
                {streak}
              </span>
              <span className="text-sm text-ink-faint">day{streak === 1 ? "" : "s"}</span>
            </p>
          ) : (
            // Zero is an invitation, not a score.
            <p className="mt-3 flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-dashed border-line-strong text-ink-faint">
                <Flame lit={false} size={20} />
              </span>
              <span className="text-lg leading-tight font-semibold text-ink">
                Start a streak
                <span className="block text-xs font-normal text-ink-faint">one interview today</span>
              </span>
            </p>
          )}
          {best > 0 && (
            <p className="mt-1 text-xs text-ink-faint">Best: {best} day{best === 1 ? "" : "s"}</p>
          )}
        </div>
        <div className="relative grid place-items-center">
          <Ring value={week} of={goal} />
          <span className="absolute text-center leading-tight">
            <span className="block text-lg font-semibold text-ink" data-numeric>
              {week}
              <span className="text-ink-faint">/{goal}</span>
            </span>
            <span className="block text-[0.625rem] text-ink-faint">this week</span>
          </span>
        </div>
      </div>

      <div className="mt-5 flex gap-1" aria-label="The last 14 days">
        {strip.map((day) => (
          <span
            key={day.key}
            title={`${day.date.toDateString()}${day.practised ? " — practised" : ""}`}
            className={`h-6 flex-1 rounded-[5px] ${
              day.practised ? "bg-brand" : "border border-line bg-surface-sunken"
            } ${day.key === strip[strip.length - 1]!.key ? "ring-1 ring-brand-line ring-offset-0" : ""}`}
          />
        ))}
      </div>
      <p className="mt-2 flex justify-between text-[0.6875rem] text-ink-faint">
        <span>2 weeks ago</span>
        <span>today</span>
      </p>

      <div className="mt-5 flex items-center gap-2 border-t border-line pt-4">
        <span className="text-xs text-ink-faint">Weekly goal</span>
        <div className="ml-auto flex gap-1">
          {GOAL_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={goal === option}
              onClick={() => {
                setGoal(option);
                writeGoal(option);
                saveProfile.mutate({ weekly_goal: option });
              }}
              className={`h-7 min-w-7 rounded-md px-2 text-xs font-medium ${
                goal === option ? "bg-brand text-white" : "text-ink-soft hover:bg-surface-sunken"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-faint">
        Miss a day and the streak starts again. What you've learnt doesn't.
      </p>
    </Card>
  );
}

const MODE_LABEL: Record<string, string> = {
  practice: "Practice",
  mock: "Mock",
  real_drive: "Real drive",
  final_boss: "Final boss",
};

/**
 * How the last interview went — the reason to come back, so it sits second
 * only to the next action. Its bands (from M06's notes, the same reading the
 * notes and My answers use), the weakest topic as a one-click focused
 * interview, and the two before it.
 */
function LastInterviewCard({ sessions, className = "" }: { sessions: SessionSummary[]; className?: string }) {
  const finished = sessions.filter((s) => s.status === "ended" && s.kind !== "drill");
  const last = finished[0];
  const report = useReport(last?.id);
  const earlier = sessions.filter((s) => s.id !== last?.id).slice(0, 2);

  const questions = report.data?.questions ?? [];
  const bands = questions.map(bandOf);
  const counts = (["strong", "partly", "not_yet"] as AnswerBand[])
    .map((band) => ({ band, n: bands.filter((b) => b === band).length }))
    .filter((c) => c.n > 0);
  const marking = questions.some((q) => q.scoring_status === "queued");
  const weakest = questions.find((q) => bandOf(q) === "not_yet" && q.concept_id) ??
    questions.find((q) => bandOf(q) === "partly" && q.concept_id);
  const weakName = weakest ? topicName(weakest) : null;

  return (
    <Card className={className}>
      <div className="flex items-center justify-between">
        <CardLabel icon="clock">Your last interview</CardLabel>
        <Link to="/history" className="text-xs font-medium text-brand">
          All interviews
        </Link>
      </div>

      {!last ? (
        <p className="mt-5 text-sm text-ink-soft">Your notes appear here when you finish an interview.</p>
      ) : (
        <>
          <p className="mt-3 text-lg font-semibold text-ink">
            {MODE_LABEL[last.mode] ?? last.mode} · {relativeDays(last.ended_at ?? last.created_at)}
          </p>
          <p className="mt-0.5 text-xs text-ink-faint">
            {report.data
              ? `${questions.length} question${questions.length === 1 ? "" : "s"} · ${Math.max(1, Math.round(report.data.minutes_used))} of ${report.data.minutes_planned} min`
              : "Reading the notes…"}
          </p>
          {counts.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {counts.map((c) => (
                <BandChip key={c.band} band={c.band} n={c.n} />
              ))}
            </div>
          )}
          {marking && (
            <p className="mt-3 text-xs text-ink-soft">Some answers are still being marked — usually a minute.</p>
          )}
          {report.data && counts.length === 0 && !marking && (
            <p className="mt-3 text-xs text-ink-soft">No answers to mark in this one.</p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link
              to={`/mock/${last.id}/report`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3.5 text-sm font-medium text-ink hover:border-brand-line"
            >
              Read the notes <Icon name="arrowRight" size={14} />
            </Link>
            {weakest && weakName && (
              <Link
                to={`/mock?${new URLSearchParams({ focus: weakest.concept_id!, label: weakName })}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-brand hover:bg-brand-soft"
              >
                <Icon name="refresh" size={14} /> Practise {weakName} again
              </Link>
            )}
          </div>
        </>
      )}

      {earlier.length > 0 && (
        <ul className="mt-5 space-y-0.5 border-t border-line pt-3">
          {earlier.map((s) => {
            const done = s.status === "ended" || s.status === "aborted";
            return (
              <li key={s.id}>
                <Link
                  to={done ? `/mock/${s.id}/report` : `/mock/${s.id}`}
                  className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-sunken"
                >
                  <Icon name={s.kind === "drill" ? "zap" : "mic"} size={14} className="shrink-0 text-ink-faint" />
                  <span className="min-w-0 flex-1 truncate text-ink-soft">
                    {s.kind === "drill" ? "Defend drill" : `${MODE_LABEL[s.mode] ?? s.mode} · ${s.requested_minutes} min`}
                  </span>
                  <span className="shrink-0 text-xs text-ink-faint">{relativeDays(s.created_at)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function GrowthCard({ candidate, className = "" }: { candidate: string; className?: string }) {
  const mastery = useMastery(candidate, false);
  const trajectory = useTrajectory(candidate);
  const points = useMemo(() => measuredOverTime(trajectory.data?.series ?? []), [trajectory.data]);
  const rows = mastery.data?.measured ?? [];
  const counts = STATE_ORDER.map((state) => ({ state, n: rows.filter((r) => r.state === state).length }));
  const total = counts.reduce((a, b) => a + b.n, 0);

  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardLabel icon="graph">Your skill graph</CardLabel>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-semibold tracking-tight text-ink" data-numeric>
              {mastery.data ? mastery.data.totals.measured : "—"}
            </span>
            <span className="text-sm text-ink-faint">
              of {mastery.data?.totals.in_ontology ?? "—"} topics shown so far
            </span>
          </p>
        </div>
        <Link to="/skills" className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-brand">
          Open <Icon name="arrowRight" size={15} />
        </Link>
      </div>

      {/* The line needs two days to compare; with one it drew a flat line and
          a spike at the edge, which read as a broken chart. */}
      {points.length >= 2 && (
        <div className="mt-4">
          <Growth points={points} />
          <p className="mt-1 flex justify-between text-[0.6875rem] text-ink-faint">
            <span>{relativeDays(points[0]!.date)}</span>
            <span>topics with your answers behind them, over time</span>
          </p>
        </div>
      )}
      {total === 0 && (
        <p className="mt-6 rounded-lg border border-dashed border-line p-6 text-center text-sm text-ink-faint">
          It fills in as your answers are marked — every topic here has one of your answers behind it.
        </p>
      )}

      {total > 0 && (
        <div className="mt-5">
          <div className="flex h-2 overflow-hidden rounded-full bg-surface-sunken">
            {counts.map(
              ({ state, n }) =>
                n > 0 && (
                  <span key={state} className={STATE_FILL[state]} style={{ width: `${(n / total) * 100}%` }} />
                ),
            )}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-soft">
            {counts.map(({ state, n }) => (
              <li key={state} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${STATE_FILL[state]}`} />
                {STATE_LABEL[state]} <span className="text-ink-faint" data-numeric>{n}</span>
              </li>
            ))}
            <li className="flex items-center gap-1.5 text-ink-faint">
              <span className="h-2 w-2 rounded-full border border-dashed border-line-strong" />
              not tested {mastery.data?.not_yet_tested.count ?? 0}
            </li>
          </ul>
        </div>
      )}
    </Card>
  );
}

function CountdownCard({ profile }: { profile?: StudentProfile }) {
  const drive = nextDrive(profile?.drives ?? []);
  const later = (profile?.drives ?? []).filter((d) => d !== drive && daysUntil(d.date) >= 0).slice(0, 2);
  if (!drive) {
    return (
      <Card>
        <CardLabel icon="calendar">Next drive</CardLabel>
        <p className="mt-4 text-lg leading-snug font-semibold text-ink">Got a drive coming up?</p>
        <p className="mt-1.5 text-sm text-ink-soft">Add its date and Today counts down to it, and puts it first when it's close.</p>
        <Link to="/settings#drives" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
          <Icon name="plus" size={15} /> Add a drive
        </Link>
      </Card>
    );
  }
  const days = daysUntil(drive.date);
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <CardLabel icon="calendar">Next drive</CardLabel>
        <button
          type="button"
          onClick={() => downloadIcs(`${drive.label.replace(/\W+/g, "-")}.ics`, driveIcs(drive, `${window.location.origin}/mock`))}
          className="text-xs font-medium text-brand"
        >
          Add to calendar
        </button>
      </div>
      <p className="mt-3 flex items-baseline gap-2">
        <span className="text-4xl font-semibold tracking-tight text-ink" data-numeric>
          {days}
        </span>
        <span className="text-sm text-ink-faint">{days === 1 ? "day" : "days"} to go</span>
      </p>
      <p className="mt-1 truncate text-sm font-medium text-ink">{drive.label}</p>
      <p className="text-xs text-ink-faint">
        {new Date(`${drive.date}T00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
      </p>
      {later.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-line pt-3 text-xs text-ink-soft">
          {later.map((d) => (
            <li key={`${d.label}-${d.date}`} className="flex justify-between gap-2">
              <span className="truncate">{d.label}</span>
              <span className="shrink-0 text-ink-faint">{countdownLabel(daysUntil(d.date))}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function MilestonesCard({ candidate, sessions }: { candidate: string; sessions: SessionSummary[] }) {
  const mastery = useMastery(candidate, false);
  const solid = (mastery.data?.measured ?? []).filter((r) => r.state === "adequate" || r.state === "strong").length;
  const all = milestones(sessions, solid);
  const earned = all.filter((m) => m.earned);
  const next = all.find((m) => !m.earned);
  return (
    <Card>
      <CardLabel icon="star">Milestones</CardLabel>
      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Earned">
        {all.map((m) => (
          <li
            key={m.id}
            title={m.earned ? `${m.title} — ${m.detail}` : `Not yet: ${m.detail}`}
            className={`grid h-10 w-10 place-items-center rounded-xl ${
              m.earned ? "bg-reported-soft text-reported" : "border border-dashed border-line text-ink-faint/60"
            }`}
          >
            <Icon name={m.earned ? "star" : "minus"} size={16} />
            <span className="sr-only">{m.earned ? `${m.title}, earned` : `${m.title}, not yet`}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-ink">
        {earned.length === 0 ? "Your first interview earns the first one." : `${earned.length} of ${all.length} earned`}
        {earned.length > 0 && <span className="text-ink-faint"> · latest: {earned[earned.length - 1]!.title}</span>}
      </p>
      {next?.progress && (
        <div className="mt-3">
          <p className="flex justify-between text-xs text-ink-faint">
            <span>Next: {next.title}</span>
            <span data-numeric>
              {next.progress[0]}/{next.progress[1]}
            </span>
          </p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
            <div className="h-full rounded-full bg-brand" style={{ width: `${(next.progress[0] / next.progress[1]) * 100}%` }} />
          </div>
        </div>
      )}
    </Card>
  );
}

/** The week's cohort, last and slim: social proof supports; it never leads. */
function TogetherStrip() {
  const cohort = useCohortStats();
  const [shared, setShared] = useState<string | null>(null);
  const invite = async () => {
    const text = "I'm practising placement interviews here — mock interviews that follow up like a real panel. Join me:";
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Practise with me", text, url });
        setShared("Sent");
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setShared("Link copied");
      }
    } catch {
      setShared(null);
    }
  };
  const n = cohort.data?.students_this_week ?? 0;
  return (
    <section className="panel flex flex-wrap items-center gap-x-5 gap-y-3 px-6 py-4 lg:col-span-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-sunken text-ink-soft">
        <Icon name="users" size={16} />
      </span>
      {/* basis-64: on a phone the button wraps under the sentence rather than
          squeezing it into a one-word column. */}
      <p className="min-w-0 flex-1 basis-64 text-sm text-ink">
        {cohort.data && n > 0 ? (
          <>
            <span className="font-semibold" data-numeric>
              {n} student{n === 1 ? "" : "s"}
            </span>{" "}
            practised this week · {cohort.data.interviews_this_week} interview
            {cohort.data.interviews_this_week === 1 ? "" : "s"}
            <span className="text-ink-faint"> · counts only, never names</span>
          </>
        ) : (
          "Be the first to practise this week."
        )}
      </p>
      <button
        type="button"
        onClick={invite}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-medium text-ink hover:border-brand-line"
      >
        <Icon name="send" size={14} />
        {shared ?? "Invite a friend to practise"}
      </button>
    </section>
  );
}

/** One line, above everything, when something is stopping the loop. */
function Nudges({ candidate, profile }: { candidate: string; profile?: StudentProfile }) {
  const consent = usePracticeConsent(candidate);
  if (consent.isLoading || !profile) return null;
  if (!consent.data) {
    return (
      <Link
        to="/settings#privacy"
        className="mt-6 flex items-center gap-3 rounded-xl border border-reported-line bg-reported-soft px-4 py-3 text-sm text-ink hover:border-reported"
      >
        <Icon name="info" size={17} className="shrink-0 text-reported" />
        <span className="flex-1">
          <span className="font-medium">Your progress isn't being remembered</span>
          <span className="text-ink-soft"> — your skill graph won't fill in until you turn it on.</span>
        </span>
        <Icon name="arrowRight" size={15} />
      </Link>
    );
  }
  if (!profile.onboarded_at) {
    return (
      <Link
        to="/welcome"
        className="mt-6 flex items-center gap-3 rounded-xl border border-brand-line bg-brand-soft px-4 py-3 text-sm text-ink hover:border-brand"
      >
        <Icon name="sparkles" size={17} className="shrink-0 text-brand" />
        <span className="flex-1">
          <span className="font-medium">Tell us what you're preparing for</span>
          <span className="text-ink-soft"> — your role and drive dates, in under a minute.</span>
        </span>
        <Icon name="arrowRight" size={15} />
      </Link>
    );
  }
  return null;
}

/* ───────────────────────── staff: their own work first ──────────────────── */

function QueueCard({
  icon,
  count,
  label,
  sub,
  to,
  loading,
}: {
  icon: IconName;
  count: number | null;
  label: string;
  sub: string;
  to: string;
  loading: boolean;
}) {
  const waiting = (count ?? 0) > 0;
  return (
    <Link to={to} className="panel group flex items-start gap-4 p-5 hover:border-brand-line">
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
          waiting ? "bg-reported-soft text-reported" : "bg-surface-sunken text-ink-faint"
        }`}
      >
        <Icon name={icon} size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight text-ink" data-numeric>
            {loading ? "—" : count ?? "—"}
          </span>
          <span className="text-sm font-medium text-ink">{label}</span>
        </span>
        <span className="mt-0.5 block text-xs text-ink-faint">{waiting ? sub : "Nothing waiting."}</span>
      </span>
      <Icon name="arrowRight" size={16} className="mt-1 text-ink-faint group-hover:text-brand" />
    </Link>
  );
}

/** Admin-only queues, in their own component so nobody else sends the requests. */
function AdminQueues() {
  const disputes = useDisputeQueue();
  const outbox = useOutbox();
  const stuck = Object.values(outbox.data?.channels ?? {}).reduce((sum, c) => sum + c.stuck, 0);
  return (
    <>
      <QueueCard
        icon="scales"
        count={disputes.data?.open ?? null}
        label="disputed marks"
        sub="Students asked for a mark to be looked at again."
        to="/disputes"
        loading={disputes.isLoading}
      />
      <QueueCard
        icon="send"
        count={outbox.data ? stuck : null}
        label="stuck in the outbox"
        sub="Marks that haven't reached the skill graph yet."
        to="/outbox"
        loading={outbox.isLoading}
      />
    </>
  );
}

function StaffHome({ admin }: { admin: boolean }) {
  const reports = useReviewQueue();
  const claims = useClaimReports(false);
  const cohort = useCohortStats();
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  return (
    <>
      <header>
        <p className="text-sm text-ink-faint">{today}</p>
        <h1 className="mt-1 text-title font-semibold text-ink">{greeting()}.</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">Here's what is waiting for you.</p>
      </header>

      <div className="stagger mt-7 grid gap-4 md:grid-cols-2">
        <QueueCard
          icon="document"
          count={reports.data?.length ?? null}
          label="experience reports to review"
          sub="Students' post-drive reports waiting before they reach company pages."
          to="/review"
          loading={reports.isLoading}
        />
        <QueueCard
          icon="alert"
          count={claims.data?.length ?? null}
          label="reported claims"
          sub="Facts on company pages that students say are wrong."
          to="/review"
          loading={claims.isLoading}
        />
        {admin && <AdminQueues />}
      </div>

      <section className="panel mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4">
        <CardLabel icon="users">This week on the platform</CardLabel>
        <p className="text-sm text-ink">
          <span className="font-semibold" data-numeric>
            {cohort.data?.students_this_week ?? "—"}
          </span>{" "}
          students practised ·{" "}
          <span className="font-semibold" data-numeric>
            {cohort.data?.interviews_this_week ?? "—"}
          </span>{" "}
          interviews
        </p>
        <span className="text-xs text-ink-faint">Counts only — never one student's record.</span>
      </section>

      <Platform />
    </>
  );
}

/* ───────────────────────── the platform, compact ───────────────────────── */

const STAGE_ICON: Record<string, IconName> = {
  M01: "document",
  M02: "listChecks",
  M05: "filter",
  M06: "mic",
  M13: "target",
  M04: "graph",
  M15: "building",
  M16: "calendar",
};

function StageTile({ stage }: { stage: Stage }) {
  const inner = (
    <>
      <span
        aria-hidden
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
          stage.kind === "ui" ? "bg-brand-soft text-brand" : "bg-surface-sunken text-ink-faint"
        }`}
      >
        <Icon name={STAGE_ICON[stage.module] ?? "layers"} size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-ink">{stage.title}</span>
          {stage.kind !== "ui" && (
            <span className="shrink-0 text-[0.625rem] text-ink-faint">
              {stage.kind === "planned" ? "planned" : "service"}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-ink-faint">{stage.blurb}</span>
      </span>
    </>
  );
  if (stage.to) {
    return (
      <Link to={stage.to} className="panel flex items-center gap-3 p-3.5 hover:border-brand-line">
        {inner}
      </Link>
    );
  }
  return (
    <div className={`flex items-center gap-3 rounded-panel p-3.5 ${stage.kind === "planned" ? "border border-dashed border-line" : "panel opacity-80"}`}>
      {inner}
    </div>
  );
}

function Platform() {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-medium text-ink-soft">Everything on the platform</h2>
      <div className="stagger mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {JOURNEY.map((stage) => (
          <StageTile key={stage.module} stage={stage} />
        ))}
      </div>
      <p className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink-faint">
        <span className="flex items-center gap-1.5">
          <Icon name="shield" size={13} /> Every fact shows its source
        </span>
        <span className="flex items-center gap-1.5">
          <Icon name="scales" size={13} /> Not measured is never zero
        </span>
        <span className="flex items-center gap-1.5">
          <Icon name="layers" size={13} /> A missing module says so, by name
        </span>
        <Link to="/system" className="font-medium text-brand">
          System status →
        </Link>
      </p>
    </section>
  );
}

/* ─────────────────────────────── the page ─────────────────────────────── */

export function Home() {
  const session = useSession();
  const candidate = candidateIdOf(session);
  const profile = useProfile(candidate);
  const history = useHistory(120);
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  if (!candidate) {
    if (isStaff(session) || session?.role === "admin") return <StaffHome admin={session?.role === "admin"} />;
    return (
      <header>
        <p className="text-sm text-ink-faint">{today}</p>
        <h1 className="mt-1 text-title font-semibold text-ink">{greeting()}.</h1>
        <Platform />
      </header>
    );
  }

  const sessions = history.data ?? [];
  const practised = sessions.some((s) => s.started_at);
  const name = firstName(profile.data?.display_name || session?.name);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-faint">{today}</p>
          <h1 className="mt-1 text-title font-semibold text-ink">
            {greeting()}
            {name && name !== "Demo" && name !== "New" ? `, ${name}` : ""}.
          </h1>
        </div>
        {/* A quick start for people who already know the way, on a laptop
            only: the focus card has the button a new student needs, and a
            phone has the Interview tab in thumb reach. */}
        {practised && (
          <Link
            to="/mock"
            className="hidden h-10 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink hover:border-line-strong lg:inline-flex"
          >
            <Icon name="plus" size={15} />
            New interview
          </Link>
        )}
      </header>

      <Nudges candidate={candidate} profile={profile.data} />

      {history.isLoading ? (
        <SkeletonCards label="Loading your day" cards={3} className="mt-7" />
      ) : !practised ? (
        // First run: the next step, what it unlocks, and the setup — not five
        // empty cards. Everything else appears once there is something in it.
        <div className="stagger mt-7 grid gap-5 lg:grid-cols-3">
          <FocusCard candidate={candidate} profile={profile.data} sessions={sessions} className="lg:col-span-2" />
          <div className="space-y-5">
            {nextDrive(profile.data?.drives ?? []) && <CountdownCard profile={profile.data} />}
            <WhatYouGetCard />
          </div>
          <TogetherStrip />
        </div>
      ) : (
        // Returning: action · habit, then feedback · deadline, then progress ·
        // rewards, then the week's cohort. Same order down a phone.
        <div className="stagger mt-7 grid gap-5 lg:grid-cols-3">
          <FocusCard candidate={candidate} profile={profile.data} sessions={sessions} className="lg:col-span-2" />
          <HabitCard candidate={candidate} profile={profile.data} sessions={sessions} />
          <LastInterviewCard sessions={sessions} className="lg:col-span-2" />
          <CountdownCard profile={profile.data} />
          <GrowthCard candidate={candidate} className="lg:col-span-2" />
          <MilestonesCard candidate={candidate} sessions={sessions} />
          <TogetherStrip />
        </div>
      )}
    </>
  );
}
