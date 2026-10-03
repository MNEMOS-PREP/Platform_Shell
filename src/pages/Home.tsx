/**
 * Today — the first screen after sign-in.
 *
 * Built (2026-10-03) on what makes the products people return to worth
 * returning to, and nothing they do that this platform refuses to:
 *
 *   · ONE next thing to do, top-left, chosen from the student's own data (the
 *     2026 "AI-native dashboard" pattern: summarise and prioritise, don't make
 *     people read a grid). No resume → add one. Never practised → first
 *     interview. Otherwise → the weak concept underneath the most others.
 *   · The habit loop, counted honestly (lib/practice.ts): a streak of days the
 *     student actually practised, the last two weeks as a strip, and a weekly
 *     goal THEY set. Duolingo's lesson, without Duolingo's guilt: the copy says
 *     a missed day resets the streak, never the progress.
 *   · Growth you can see: how much of the skill graph you have shown, over
 *     time, from M04's trajectory — a count, not an invented readiness score.
 *   · What you did last, one click from its notes.
 *
 * Every figure is a count of something that happened. Staff, who are nobody's
 * candidate, get the platform overview instead.
 */
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import {
  Icon,
  STATE_LABEL,
  candidateIdOf,
  relativeDays,
  useSession,
  type IconName,
  type MasteryState,
} from "@ai/core";
import { useCandidateResumes } from "@ai/m01";
import { useBottlenecks, useMastery, useTrajectory } from "@ai/m04";
import { useHistory } from "@ai/m06";

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
  if (points.length === 0) return null;
  const series = points.length === 1 ? [{ ...points[0]!, count: 0 }, points[0]!] : points;
  const max = Math.max(...series.map((p) => p.count), 1);
  const xs = series.map((_, i) => (i / (series.length - 1)) * w);
  const ys = series.map((p) => h - 8 - (p.count / max) * (h - 24));
  // A step line: a concept is measured from the day it first was, not gradually.
  let line = `M ${xs[0]} ${ys[0]}`;
  for (let i = 1; i < series.length; i++) line += ` H ${xs[i]} V ${ys[i]}`;
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

/* ────────────────────────────── the cards ─────────────────────────────── */

function FocusCard({ candidate }: { candidate: string }) {
  const resumes = useCandidateResumes(candidate);
  const history = useHistory(120);
  const bottlenecks = useBottlenecks(candidate, false);
  const mastery = useMastery(candidate, false);

  const hasResume = (resumes.data?.length ?? 0) > 0;
  const practised = (history.data ?? []).some((s) => s.started_at);
  const measured = (mastery.data?.totals.measured ?? 0) > 0;
  const blocker = bottlenecks.data?.bottlenecks[0];
  const loading = resumes.isLoading || history.isLoading;

  let focus: { eyebrow: string; title: ReactNode; body: string; cta: string; to: string; icon: IconName; why: string };
  if (!hasResume) {
    focus = {
      eyebrow: "Start here",
      title: "Add your resume",
      body: "The interviewer asks about your own projects. Give it something to ask about — and see which lines you can't yet defend, before a panel finds them.",
      cta: "Upload your resume",
      to: "/resume",
      icon: "document",
      why: "You haven't added a resume yet.",
    };
  } else if (!practised) {
    focus = {
      eyebrow: "Your first interview",
      title: "Take a 15-minute mock interview",
      body: "A real interviewer probes until it finds the edge of what you know. You leave with notes on where your understanding held — and where it broke.",
      cta: "Start the interview",
      to: "/mock",
      icon: "mic",
      why: "Your resume is in. Nothing has been asked yet.",
    };
  } else if (blocker) {
    focus = {
      eyebrow: "Today's focus",
      title: (
        <>
          Practise <span className="text-gradient">{blocker.name}</span>
        </>
      ),
      body: `It sits underneath ${blocker.blocks} of your weak topics. Fix it first and the rest get easier — that's the most progress one session can buy today.`,
      cta: "Start a focused interview",
      to: "/mock",
      icon: "target",
      why: "Chosen from your skill graph: the weak concept under the most others.",
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

  const steps = [
    { done: hasResume, label: "Add your resume" },
    { done: practised, label: "Take a first interview" },
    { done: measured, label: "Get your skill graph moving" },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <section className="panel relative overflow-hidden p-7 lg:col-span-2">
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
          {blocker && practised && hasResume && (
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

        {doneCount < steps.length && (
          <div className="mt-6 border-t border-line pt-5">
            <p className="text-xs font-medium text-ink-faint">
              Getting set up · {doneCount} of {steps.length} done
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              {steps.map((step) => (
                <li key={step.label} className="flex items-center gap-2 text-sm">
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full ${
                      step.done ? "bg-confirmed text-white" : "border border-line-strong text-transparent"
                    }`}
                  >
                    <Icon name="check" size={12} />
                  </span>
                  <span className={step.done ? "text-ink-faint line-through" : "text-ink"}>{step.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function HabitCard() {
  const history = useHistory(120);
  const [goal, setGoal] = useState(readGoal);
  const sessions = history.data ?? [];
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

function GrowthCard({ candidate }: { candidate: string }) {
  const mastery = useMastery(candidate, false);
  const trajectory = useTrajectory(candidate);
  const points = useMemo(() => measuredOverTime(trajectory.data?.series ?? []), [trajectory.data]);
  const rows = mastery.data?.measured ?? [];
  const counts = STATE_ORDER.map((state) => ({ state, n: rows.filter((r) => r.state === state).length }));
  const total = counts.reduce((a, b) => a + b.n, 0);

  return (
    <Card className="lg:col-span-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardLabel icon="graph">Your skill graph</CardLabel>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-semibold tracking-tight text-ink" data-numeric>
              {mastery.data ? mastery.data.totals.measured : "—"}
            </span>
            <span className="text-sm text-ink-faint">
              of {mastery.data?.totals.in_ontology ?? "—"} concepts shown so far
            </span>
          </p>
        </div>
        <Link to="/skills" className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-brand">
          Open <Icon name="arrowRight" size={15} />
        </Link>
      </div>

      {points.length > 0 ? (
        <div className="mt-4">
          <Growth points={points} />
          <p className="mt-1 flex justify-between text-[0.6875rem] text-ink-faint">
            <span>{relativeDays(points[0]!.date)}</span>
            <span>concepts with evidence, over time</span>
          </p>
        </div>
      ) : (
        <p className="mt-6 rounded-lg border border-dashed border-line p-6 text-center text-sm text-ink-faint">
          Empty on purpose: a belief needs an answer behind it. Your first interview starts it.
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

const MODE_LABEL: Record<string, string> = {
  practice: "Practice",
  mock: "Mock",
  real_drive: "Real drive",
  final_boss: "Final boss",
};

function RecentCard() {
  const history = useHistory(120);
  const recent = (history.data ?? []).slice(0, 4);
  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardLabel icon="clock">Recent sessions</CardLabel>
        <Link to="/mock" className="text-xs font-medium text-brand">
          New
        </Link>
      </div>
      {recent.length === 0 ? (
        <p className="mt-6 text-sm leading-relaxed text-ink-faint">
          Nothing yet. Your interviews will be listed here with the notes from each.
        </p>
      ) : (
        <ul className="mt-4 space-y-1">
          {recent.map((s) => {
            const finished = s.status === "ended" || s.status === "aborted";
            return (
              <li key={s.id}>
                <Link
                  to={finished ? `/mock/${s.id}/report` : `/mock/${s.id}`}
                  className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-sunken"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-sunken text-ink-soft">
                    <Icon name={s.kind === "drill" ? "zap" : "mic"} size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {MODE_LABEL[s.mode] ?? s.mode} · {s.requested_minutes} min
                    </span>
                    <span className="block text-xs text-ink-faint">{relativeDays(s.created_at)}</span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ${
                      finished
                        ? "bg-surface-sunken text-ink-soft"
                        : "border border-brand-line bg-brand-soft text-brand"
                    }`}
                  >
                    {finished ? "Notes" : s.status === "planned" ? "Planned" : "Continue"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
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
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  if (!candidate) {
    return (
      <>
        <header>
          <p className="text-sm text-ink-faint">{today}</p>
          <h1 className="mt-1 text-title font-semibold text-ink">
            {greeting()}.
          </h1>
          <p className="mt-2 max-w-2xl text-ink-soft">
            Signed in as staff. Students' practice is theirs; what you can open is in the menu —
            and the platform below.
          </p>
        </header>
        <Platform />
      </>
    );
  }

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-faint">{today}</p>
          <h1 className="mt-1 text-title font-semibold text-ink">
            {greeting()}.
          </h1>
        </div>
        <Link
          to="/mock"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink hover:border-line-strong"
        >
          <Icon name="plus" size={15} />
          New interview
        </Link>
      </header>

      <div className="stagger mt-7 grid gap-5 lg:grid-cols-3">
        <FocusCard candidate={candidate} />
        <HabitCard />
        <GrowthCard candidate={candidate} />
        <RecentCard />
      </div>

      <Platform />
    </>
  );
}
