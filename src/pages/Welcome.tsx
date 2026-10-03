/**
 * The first five minutes — consent, then what the student is preparing for.
 *
 * ── Why this screen is the first thing a new student sees ──────────────────
 * No interview moves a skill graph without a recorded consent (M04, FR-4.20),
 * and until 2026-10-04 nothing a student could reach recorded one: the demo
 * student worked only because a seed script consented for them. For every
 * real student the growth chart, Today's focus and the bottleneck stayed empty
 * forever and the habit loop never started. So consent is asked once, here, in
 * three sentences — what is kept, why, and how to delete it — and the answer
 * goes to M04's own endpoint. Declining is allowed and said plainly: you can
 * practise, and nothing is remembered.
 *
 * ── Then four quick questions ──────────────────────────────────────────────
 * One per screen, each skippable (the pattern Duolingo and Headspace use for
 * first runs: momentum over completeness). Name, role, the companies and
 * drives with dates — which become Today's countdown and the "practising for"
 * choices in the interview setup — and a weekly goal with an optional daily
 * reminder the student's own calendar keeps. Saved to M04's profile, so it
 * follows the student to any device.
 */
import { useState, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { Icon, candidateIdOf, signIn, useSession } from "@ai/core";
import {
  useGrantConsent,
  usePracticeConsent,
  useProfile,
  useSaveProfile,
  type ProfileCompany,
  type ProfileDrive,
} from "@ai/m04";

import { firstName } from "../lib/account";
import { dailyReminderIcs, downloadIcs } from "../lib/goals";
import { GOAL_OPTIONS, writeGoal } from "../lib/practice";
import { DrivePicker } from "../ui/DrivePicker";

const STEPS = ["Consent", "You", "Your drives", "Your rhythm"] as const;

function Shell({
  step,
  children,
}: {
  step: number;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-xl py-6">
      <div
        className="flex items-center gap-2"
        role="progressbar"
        aria-label="Getting started"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={step + 1}
        aria-valuetext={`Step ${step + 1} of ${STEPS.length}`}
      >
        {STEPS.map((label, i) => (
          <span
            key={label}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-brand" : "bg-line"}`}
          />
        ))}
      </div>
      <p className="mt-3 text-xs font-medium text-ink-faint">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </p>
      <div key={step} className="page-in mt-6">
        {children}
      </div>
    </div>
  );
}

function Next({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="bg-brand-gradient inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-glow disabled:opacity-50"
    >
      {children}
      <Icon name="arrowRight" size={16} />
    </button>
  );
}

function Skip({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="h-11 rounded-xl px-4 text-sm text-ink-soft hover:text-ink">
      Skip for now
    </button>
  );
}

const field =
  "mt-1.5 h-11 w-full rounded-lg border border-line bg-surface px-3 text-[0.9375rem] text-ink outline-none focus:border-brand";

export function Welcome() {
  const session = useSession();
  const candidate = candidateIdOf(session);
  const navigate = useNavigate();
  const profile = useProfile(candidate);
  const grant = useGrantConsent(candidate);
  const consent = usePracticeConsent(candidate);
  const save = useSaveProfile(candidate);

  const [chosen, setStep] = useState(0);
  // Already consented (the demo student, or a second visit): straight to the
  // questions. Consent is asked once, never re-asked.
  const step = chosen === 0 && consent.data ? 1 : chosen;
  const [declined, setDeclined] = useState(false);
  const [name, setName] = useState(session?.name && session.name !== "New student" ? session.name : "");
  const [role, setRole] = useState("");
  const [year, setYear] = useState("");
  const [branch, setBranch] = useState("");
  const [companies, setCompanies] = useState<ProfileCompany[]>([]);
  const [drives, setDrives] = useState<ProfileDrive[]>([]);
  const [goal, setGoal] = useState(3);
  const [reminder, setReminder] = useState("");

  if (!candidate) return <Navigate to="/" replace />;

  const finish = () =>
    save.mutate(
      {
        display_name: name.trim(),
        target_role: role.trim(),
        year,
        branch: branch.trim(),
        companies,
        drives,
        weekly_goal: goal,
        reminder_time: reminder,
        onboarded: true,
      },
      {
        onSuccess: () => {
          writeGoal(goal);
          // The account card and greeting read the session's name.
          if (session && name.trim()) signIn({ ...session, name: name.trim() });
          navigate("/", { replace: true, state: { welcomed: true } });
        },
      },
    );

  if (step === 0) {
    return (
      <Shell step={0}>
        <h1 className="text-title font-semibold text-ink">
          Welcome{firstName(name) ? `, ${firstName(name)}` : ""}. One thing before you start.
        </h1>
        <div className="panel mt-6 space-y-4 p-6 text-[0.9375rem] leading-relaxed text-ink-soft">
          <p className="flex gap-3">
            <Icon name="document" size={18} className="mt-0.5 shrink-0 text-brand" />
            <span>
              <span className="font-medium text-ink">What we keep:</span> your answers, how each was
              marked, and the skill graph built from them.
            </span>
          </p>
          <p className="flex gap-3">
            <Icon name="target" size={18} className="mt-0.5 shrink-0 text-brand" />
            <span>
              <span className="font-medium text-ink">Why:</span> to pick your next questions and to
              show you what's improving. Placement staff see counts, never your answers.
            </span>
          </p>
          <p className="flex gap-3">
            <Icon name="trash" size={18} className="mt-0.5 shrink-0 text-brand" />
            <span>
              <span className="font-medium text-ink">Your call:</span> download or delete all of it
              from Settings, any time.
            </span>
          </p>
        </div>
        {grant.isError && (
          <p role="alert" className="mt-4 text-sm text-contested">
            That didn't save: {(grant.error as Error).message}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Next onClick={() => grant.mutate(undefined, { onSuccess: () => setStep(1) })} disabled={grant.isPending}>
            {grant.isPending ? "Saving…" : "I agree — remember my progress"}
          </Next>
          <button
            type="button"
            onClick={() => {
              setDeclined(true);
              setStep(1);
            }}
            className="h-11 rounded-xl px-4 text-sm text-ink-soft hover:text-ink"
          >
            Practise without saving
          </button>
        </div>
        <p className="mt-4 text-xs text-ink-faint">
          Without it you can still practise and read your notes; your skill graph just won't fill in.
          You can change your mind in Settings.
        </p>
      </Shell>
    );
  }

  if (step === 1) {
    return (
      <Shell step={1}>
        <h1 className="text-title font-semibold text-ink">What are you preparing for?</h1>
        <p className="mt-2 text-ink-soft">So the interviewer asks what your role will.</p>
        {declined && (
          <p className="mt-4 rounded-lg border border-line bg-surface-sunken p-3 text-xs text-ink-soft">
            Noted — nothing from your interviews will be remembered.
          </p>
        )}
        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-ink">
            Your name
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
          <label className="block text-sm font-medium text-ink">
            Role you're aiming for
            <input
              className={field}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Software engineer, Data analyst"
              list="roles"
            />
            <datalist id="roles">
              <option value="Software engineer" />
              <option value="Data analyst" />
              <option value="Data scientist" />
              <option value="Systems engineer" />
            </datalist>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-ink">
              Year
              <select className={field} value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">—</option>
                <option>2nd year</option>
                <option>3rd year</option>
                <option>Final year</option>
                <option>Graduated</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-ink">
              Branch
              <input className={field} value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="e.g. CSE" />
            </label>
          </div>
        </div>
        <div className="mt-7 flex flex-wrap items-center gap-2">
          <Next onClick={() => setStep(2)}>Next</Next>
          <Skip onClick={() => setStep(2)} />
        </div>
      </Shell>
    );
  }

  if (step === 2) {
    return (
      <Shell step={2}>
        <h1 className="text-title font-semibold text-ink">Any drives coming up?</h1>
        <p className="mt-2 text-ink-soft">
          Add the companies you're sitting and the date, and Today counts down to the next one.
        </p>
        <div className="mt-6">
          <DrivePicker
            drives={drives}
            onChange={(next) => {
              setDrives(next);
              const seen = new Map(companies.map((c) => [c.company_id ?? c.name, c]));
              for (const d of next) {
                const key = d.company_id ?? d.label.split(" · ")[0]!;
                if (!seen.has(key)) seen.set(key, { name: d.label.split(" · ")[0]!, company_id: d.company_id ?? null });
              }
              setCompanies([...seen.values()]);
            }}
          />
        </div>
        <div className="mt-7 flex flex-wrap items-center gap-2">
          <Next onClick={() => setStep(3)}>{drives.length ? "Next" : "No drives yet"}</Next>
          <Skip onClick={() => setStep(3)} />
        </div>
      </Shell>
    );
  }

  return (
    <Shell step={3}>
      <h1 className="text-title font-semibold text-ink">How often will you practise?</h1>
      <p className="mt-2 text-ink-soft">A goal you set yourself. Today shows how the week is going.</p>
      <div className="mt-6 grid grid-cols-4 gap-2">
        {GOAL_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={goal === option}
            onClick={() => setGoal(option)}
            className={`rounded-xl border px-3 py-3 text-center ${
              goal === option ? "border-brand bg-brand-soft text-ink" : "border-line bg-surface text-ink-soft hover:border-line-strong"
            }`}
          >
            <span className="block text-xl font-semibold" data-numeric>
              {option}
            </span>
            <span className="block text-2xs text-ink-faint">a week</span>
          </button>
        ))}
      </div>
      <label className="mt-6 block text-sm font-medium text-ink">
        Daily reminder <span className="font-normal text-ink-faint">(optional)</span>
        <input type="time" className={`${field} max-w-[10rem]`} value={reminder} onChange={(e) => setReminder(e.target.value)} />
      </label>
      {reminder && (
        <button
          type="button"
          onClick={() => downloadIcs("practice-reminder.ics", dailyReminderIcs(reminder, window.location.origin))}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand"
        >
          <Icon name="calendar" size={15} /> Add it to my calendar
        </button>
      )}
      {save.isError && (
        <p role="alert" className="mt-4 text-sm text-contested">
          That didn't save: {(save.error as Error).message}
        </p>
      )}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        <Next onClick={finish} disabled={save.isPending || profile.isLoading}>
          {save.isPending ? "Saving…" : "Take me to Today"}
        </Next>
      </div>
    </Shell>
  );
}
