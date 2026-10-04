/**
 * The first five minutes — what the student is preparing for, then saving
 * their progress, then their first interview.
 *
 * ── Why consent is asked, and why it is asked LAST (2026-10-04, round 2) ─────
 * No interview moves a skill graph without a recorded consent (M04, FR-4.20),
 * and until the welcome step existed nothing a student could reach recorded
 * one. So it is asked here, in three sentences — what is kept, why, and how to
 * delete it — and the answer goes to M04's own endpoint. Declining is allowed
 * and said plainly.
 *
 * It used to be the FIRST screen after sign-in: a new student's first sight of
 * the product was a data notice. Now the student first says what they are
 * preparing for (which invests them — the pattern Duolingo and Headspace use
 * for first runs), and consent comes at the moment it applies: just before the
 * first interview whose answers it covers, framed as what it buys. That is the
 * "ask in context" rule mobile permission prompts follow.
 *
 * ── And it ends IN the product ──────────────────────────────────────────────
 * The last button used to say "Take me to Today", which then asked for a
 * resume: the momentum was spent one step before the aha moment. It now
 * offers the first interview — 15 minutes of Practice, planned and ready —
 * with Today as the second choice.
 *
 * One question per screen, each skippable; answers saved to M04's profile, so
 * they follow the student to any device.
 */
import { useRef, useState, type ReactNode } from "react";
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
import { useCreateSession } from "@ai/m06";

import { firstName } from "../lib/account";
import { countdownLabel, dailyReminderIcs, daysUntil, downloadIcs, nextDrive } from "../lib/goals";
import { GOAL_OPTIONS, writeGoal } from "../lib/practice";
import { DrivePicker } from "../ui/DrivePicker";

function Shell({
  step,
  steps,
  children,
}: {
  step: number;
  steps: readonly string[];
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-xl py-6">
      <div
        className="flex items-center gap-2"
        role="progressbar"
        aria-label="Getting started"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={step + 1}
        aria-valuetext={`Step ${step + 1} of ${steps.length}`}
      >
        {steps.map((label, i) => (
          <span
            key={label}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-brand" : "bg-line"}`}
          />
        ))}
      </div>
      <p className="mt-3 text-xs font-medium text-ink-faint">
        Step {step + 1} of {steps.length} · {steps[step]}
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

function Skip({ onClick, children = "Skip for now" }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="h-11 rounded-xl px-4 text-sm text-ink-soft hover:text-ink">
      {children}
    </button>
  );
}

const field =
  "mt-1.5 block h-11 w-full rounded-lg border border-line bg-surface px-3 text-[0.9375rem] text-ink outline-none focus:border-brand";

/** The gentlest real start, and what Today's "Start my first interview" opens too. */
const FIRST_INTERVIEW = { minutes: 15, mode: "practice" } as const;

export function Welcome() {
  const session = useSession();
  const candidate = candidateIdOf(session);
  const navigate = useNavigate();
  const profile = useProfile(candidate);
  const grant = useGrantConsent(candidate);
  const consent = usePracticeConsent(candidate);
  const save = useSaveProfile(candidate);
  const create = useCreateSession();

  // Consent is asked once, never re-asked: a student who already gave it (the
  // demo student, a second visit) has three steps, not four. Latched when it
  // first loads, so granting it on the last step doesn't shrink the count
  // under the student's feet.
  const hadConsent = useRef<boolean | null>(null);
  if (consent.isSuccess && hadConsent.current === null) hadConsent.current = Boolean(consent.data);
  const askConsent = hadConsent.current !== true;
  const steps = askConsent
    ? (["You", "Your drives", "Your rhythm", "Save your progress"] as const)
    : (["You", "Your drives", "Your rhythm"] as const);

  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
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

  /** Save every answer, stamp the welcome as done, then show the last screen. */
  const saveAll = () =>
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
          setDone(true);
        },
      },
    );

  const startFirst = () =>
    create.mutate(
      { ...FIRST_INTERVIEW },
      {
        // Straight to the plan: the student sees what they'll be asked, then starts.
        onSuccess: (created) => navigate(`/mock/${created.id}/plan`, { replace: true }),
        onError: () => navigate(`/mock?minutes=${FIRST_INTERVIEW.minutes}&mode=${FIRST_INTERVIEW.mode}`, { replace: true }),
      },
    );

  const shown = firstName(name);

  /* ── the last screen: into the product ─────────────────────────────────── */
  if (done) {
    const drive = nextDrive(drives);
    return (
      <div className="mx-auto w-full max-w-xl py-6">
        <div className="page-in">
          <span className="bg-brand-gradient grid h-12 w-12 place-items-center rounded-2xl text-white shadow-glow">
            <Icon name="check" size={22} />
          </span>
          <h1 className="mt-6 text-title font-semibold text-ink">You're set{shown ? `, ${shown}` : ""}.</h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
            Your first interview is 15 minutes of practice: hints on, and you can try a question again.
            You'll leave with notes on every answer.
          </p>
          {drive && (
            <p className="mt-3 text-sm text-ink-soft">
              After that, Today counts down to <span className="font-medium text-ink">{drive.label}</span>{" "}
              ({countdownLabel(daysUntil(drive.date))}) and puts it first as it gets close.
            </p>
          )}
          {declined && (
            <p className="mt-3 text-xs text-ink-faint">
              Your progress won't be saved — you can turn that on in Settings any time.
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <Next onClick={startFirst} disabled={create.isPending}>
              {create.isPending ? "Building your plan…" : "Start my first interview"}
            </Next>
            <Skip onClick={() => navigate("/", { replace: true })}>Look around first</Skip>
          </div>
        </div>
      </div>
    );
  }

  /* ── 1 · what you're preparing for ─────────────────────────────────────── */
  if (step === 0) {
    return (
      <Shell step={0} steps={steps}>
        <h1 className="text-title font-semibold text-ink">
          Welcome{shown ? `, ${shown}` : ""}. What are you preparing for?
        </h1>
        <p className="mt-2 text-ink-soft">So the interviewer asks what your role will.</p>
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
          <Next onClick={() => setStep(1)}>Next</Next>
          <Skip onClick={() => setStep(1)} />
        </div>
      </Shell>
    );
  }

  /* ── 2 · drives ────────────────────────────────────────────────────────── */
  if (step === 1) {
    return (
      <Shell step={1} steps={steps}>
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
          <Next onClick={() => setStep(2)}>{drives.length ? "Next" : "No drives yet"}</Next>
          <Skip onClick={() => setStep(2)} />
        </div>
      </Shell>
    );
  }

  /* ── 3 · rhythm ────────────────────────────────────────────────────────── */
  if (step === 2) {
    return (
      <Shell step={2} steps={steps}>
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
          {askConsent ? (
            <Next onClick={() => setStep(3)}>Next</Next>
          ) : (
            <Next onClick={saveAll} disabled={save.isPending || profile.isLoading}>
              {save.isPending ? "Saving…" : "Finish"}
            </Next>
          )}
        </div>
      </Shell>
    );
  }

  /* ── 4 · save your progress — asked where it applies ───────────────────── */
  return (
    <Shell step={3} steps={steps}>
      <h1 className="text-title font-semibold text-ink">Save your progress?</h1>
      <p className="mt-2 text-ink-soft">
        So every interview builds your skill graph — and the next one knows what to ask.
      </p>
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
      {(grant.isError || save.isError) && (
        <p role="alert" className="mt-4 text-sm text-contested">
          That didn't save: {((grant.error ?? save.error) as Error).message}
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Next
          onClick={() => grant.mutate(undefined, { onSuccess: saveAll })}
          disabled={grant.isPending || save.isPending}
        >
          {grant.isPending || save.isPending ? "Saving…" : "Yes, save my progress"}
        </Next>
        <Skip
          onClick={() => {
            setDeclined(true);
            saveAll();
          }}
        >
          Not now
        </Skip>
      </div>
      <p className="mt-4 text-xs text-ink-faint">
        Without it you can still practise and read your notes; your skill graph just won't fill in.
      </p>
    </Shell>
  );
}
