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
 * ── Their semester and courses (2026-10-13) ─────────────────────────────────
 * "Year" and a free-text "Branch" became a programme and a semester, and the
 * semester's courses come straight after, ticked, with an elective picker per
 * slot. The programmes and courses are M04's `/v1/curricula`, built from the
 * college's own curriculum PDFs, so the list is the student's real timetable,
 * not one we typed. Each ticked course that teaches something an interview
 * asks becomes a practice on Today (lib/courses.ts), and a mixed interview is
 * drawn from what the courses have covered (M04 `/coursework`, M06's planner)
 * — the step promises both and those two keep it. A branch without a
 * curriculum keeps the free-text box, and the courses step is skipped rather
 * than shown empty.
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
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { Icon, SkeletonRows, candidateIdOf, signIn, useSession } from "@ai/core";
import {
  useCurricula,
  useCurriculum,
  useGrantConsent,
  usePracticeConsent,
  useProfile,
  useSaveProfile,
  type ProfileCompany,
  type ProfileDrive,
} from "@ai/m04";
import { useCreateSession } from "@ai/m06";

import { firstName } from "../lib/account";
import {
  SEMESTERS,
  defaultCourses,
  practisable,
  programmeLabel,
  semesterOf,
  yearForSemester,
} from "../lib/courses";
import { countdownLabel, dailyReminderIcs, daysUntil, downloadIcs, nextDrive } from "../lib/goals";
import { GOAL_OPTIONS, writeGoal } from "../lib/practice";
import { CoursePicker } from "../ui/CoursePicker";
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

type StepKey = "you" | "courses" | "drives" | "rhythm" | "consent";

const STEP_LABEL: Record<StepKey, string> = {
  you: "You",
  courses: "Your courses",
  drives: "Your drives",
  rhythm: "Your rhythm",
  consent: "Save your progress",
};

/** A programme the college has published no curriculum for (yet). */
const OTHER = "other";
const GRADUATED = "graduated";

export function Welcome() {
  const session = useSession();
  const candidate = candidateIdOf(session);
  const navigate = useNavigate();
  const profile = useProfile(candidate);
  const grant = useGrantConsent(candidate);
  const consent = usePracticeConsent(candidate);
  const save = useSaveProfile(candidate);
  const create = useCreateSession();
  const curricula = useCurricula();

  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [name, setName] = useState(session?.name && session.name !== "New student" ? session.name : "");
  const [role, setRole] = useState("");
  // A curriculum id, OTHER, or "" for not said.
  const [programme, setProgramme] = useState("");
  // "1".."8", GRADUATED, or "" for not said.
  const [term, setTerm] = useState("");
  const [branch, setBranch] = useState("");
  const [courses, setCourses] = useState<string[]>([]);
  // The programme and semester the ticks were defaulted for, so going back and
  // changing either re-ticks the new semester instead of keeping the old one's.
  const [coursesFor, setCoursesFor] = useState("");
  const [companies, setCompanies] = useState<ProfileCompany[]>([]);
  const [drives, setDrives] = useState<ProfileDrive[]>([]);
  const [goal, setGoal] = useState(3);
  const [reminder, setReminder] = useState("");

  const curriculumId = programme && programme !== OTHER ? programme : null;
  const curriculum = useCurriculum(curriculumId);
  const semester = /^[1-8]$/.test(term) ? Number(term) : null;
  const pickKey = `${programme}:${term}`;
  useEffect(() => {
    if (!curriculum.data || semester === null || coursesFor === pickKey) return;
    setCourses(defaultCourses(semesterOf(curriculum.data, semester)));
    setCoursesFor(pickKey);
  }, [curriculum.data, semester, pickKey, coursesFor]);

  // Answers already on the profile (given in Settings, or in a welcome left
  // half-way) are where this starts, not blanks: finishing would otherwise
  // save "—" over a semester the student had already told us (2026-10-13).
  const seeded = useRef(false);
  useEffect(() => {
    const saved = profile.data;
    if (!saved || seeded.current) return;
    seeded.current = true;
    if (saved.display_name) setName(saved.display_name);
    if (saved.target_role) setRole(saved.target_role);
    if (saved.curriculum_id) setProgramme(saved.curriculum_id);
    else if (saved.branch) {
      setProgramme(OTHER);
      setBranch(saved.branch);
    }
    if (saved.semester !== null) setTerm(String(saved.semester));
    else if (saved.year === "Graduated") setTerm(GRADUATED);
    if (saved.curriculum_id && saved.semester !== null) {
      setCourses(saved.courses);
      setCoursesFor(`${saved.curriculum_id}:${saved.semester}`);
    }
    if (saved.companies.length) setCompanies(saved.companies);
    if (saved.drives.length) setDrives(saved.drives);
    setGoal(saved.weekly_goal);
    if (saved.reminder_time) setReminder(saved.reminder_time);
  }, [profile.data]);

  // Consent is asked once, never re-asked: a student who already gave it (the
  // demo student, a second visit) has no consent step. Latched when it first
  // loads, so granting it on the last step doesn't shrink the count under the
  // student's feet.
  const hadConsent = useRef<boolean | null>(null);
  if (consent.isSuccess && hadConsent.current === null) hadConsent.current = Boolean(consent.data);
  const askConsent = hadConsent.current !== true;
  // The courses step follows choosing a programme on the first step, so the
  // first step counts it: "Step 1 of 4" then "Step 2 of 5" read as a form
  // growing under the student (walkthrough, 2026-10-29). Only a student who
  // leaves step 1 without a programme sees the count drop, and theirs is true.
  const steps: StepKey[] = [
    "you",
    ...(step === 0 || (curriculumId && semester !== null) ? (["courses"] as const) : []),
    "drives",
    "rhythm",
    ...(askConsent ? (["consent"] as const) : []),
  ];
  const at = Math.min(step, steps.length - 1);
  const key = steps[at]!;
  const labels = steps.map((k) => STEP_LABEL[k]);
  const next = () => setStep(at + 1);

  if (!candidate) return <Navigate to="/" replace />;

  const known = curricula.data?.find((c) => c.id === curriculumId);

  /** Save every answer, stamp the welcome as done, then show the last screen. */
  const saveAll = () =>
    save.mutate(
      {
        display_name: name.trim(),
        target_role: role.trim(),
        year: term === GRADUATED ? "Graduated" : yearForSemester(semester),
        branch: known ? known.short : branch.trim(),
        curriculum_id: known ? known.id : "",
        ...(term === GRADUATED ? { semester: null } : semester !== null ? { semester } : {}),
        courses: known && semester !== null ? courses : [],
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
    const practice = known && semester !== null ? practisable(curriculum.data, courses) : [];
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
          {practice.length > 0 && (
            <p className="mt-3 text-sm text-ink-soft">
              Today also has a practice for each of your {practice.length} course
              {practice.length === 1 ? "" : "s"}, on what its syllabus teaches.
            </p>
          )}
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

  /* ── what you're preparing for, and where you are in your degree ───────── */
  if (key === "you") {
    return (
      <Shell step={at} steps={labels}>
        <h1 className="text-title font-semibold text-ink">
          Welcome{shown ? `, ${shown}` : ""}. What are you preparing for?
        </h1>
        <p className="mt-2 text-ink-soft">
          So the interviewer asks what your role will need, from what you've studied so far.
        </p>
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
          <label className="block text-sm font-medium text-ink">
            Your programme
            <select className={field} value={programme} onChange={(e) => setProgramme(e.target.value)}>
              <option value="">—</option>
              {(curricula.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {programmeLabel(c)}
                </option>
              ))}
              <option value={OTHER}>Another branch</option>
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-ink">
              Current semester
              <select className={field} value={term} onChange={(e) => setTerm(e.target.value)}>
                <option value="">—</option>
                {SEMESTERS.map((n) => (
                  <option key={n} value={String(n)}>
                    Semester {n}
                  </option>
                ))}
                <option value={GRADUATED}>Graduated</option>
              </select>
            </label>
            {programme === OTHER && (
              <label className="block text-sm font-medium text-ink">
                Branch
                <input className={field} value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="e.g. ECE" />
              </label>
            )}
          </div>
        </div>
        <div className="mt-7 flex flex-wrap items-center gap-2">
          <Next onClick={next}>Next</Next>
          <Skip onClick={next} />
        </div>
      </Shell>
    );
  }

  /* ── this semester's courses ───────────────────────────────────────────── */
  if (key === "courses" && semester !== null) {
    return (
      <Shell step={at} steps={labels}>
        <h1 className="text-title font-semibold text-ink">Which courses are you taking this semester?</h1>
        <p className="mt-2 text-ink-soft">
          Semester {semester}
          {known ? ` of ${programmeLabel({ ...known, curriculum_year: null })}` : ""}. Each course you tick gets
          its own practice on Today, and a mixed interview asks about what your courses have covered.
        </p>
        <div className="mt-6">
          {curriculum.data ? (
            <CoursePicker curriculum={curriculum.data} semester={semester} selected={courses} onChange={setCourses} />
          ) : curriculum.isError ? (
            <p role="alert" className="text-sm text-contested">
              The course list didn't load: {(curriculum.error as Error).message}
            </p>
          ) : (
            <SkeletonRows label="Loading your semester's courses" rows={5} />
          )}
        </div>
        <div className="mt-7 flex flex-wrap items-center gap-2">
          <Next onClick={next}>Next</Next>
          <Skip onClick={next} />
        </div>
      </Shell>
    );
  }

  /* ── drives ────────────────────────────────────────────────────────────── */
  if (key === "drives") {
    return (
      <Shell step={at} steps={labels}>
        <h1 className="text-title font-semibold text-ink">Any drives coming up?</h1>
        <p className="mt-2 text-ink-soft">
          Add the companies you're sitting and the date, and Today counts down to the next one.
        </p>
        <div className="mt-6">
          <DrivePicker
            drives={drives}
            onChange={(nextDrives) => {
              setDrives(nextDrives);
              const seen = new Map(companies.map((c) => [c.company_id ?? c.name, c]));
              for (const d of nextDrives) {
                const id = d.company_id ?? d.label.split(" · ")[0]!;
                if (!seen.has(id)) seen.set(id, { name: d.label.split(" · ")[0]!, company_id: d.company_id ?? null });
              }
              setCompanies([...seen.values()]);
            }}
          />
        </div>
        <div className="mt-7 flex flex-wrap items-center gap-2">
          <Next onClick={next}>{drives.length ? "Next" : "No drives yet"}</Next>
          <Skip onClick={next} />
        </div>
      </Shell>
    );
  }

  /* ── rhythm ────────────────────────────────────────────────────────────── */
  if (key === "rhythm") {
    return (
      <Shell step={at} steps={labels}>
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
            <Next onClick={next}>Next</Next>
          ) : (
            <Next onClick={saveAll} disabled={save.isPending || profile.isLoading}>
              {save.isPending ? "Saving…" : "Finish"}
            </Next>
          )}
        </div>
      </Shell>
    );
  }

  /* ── save your progress — asked where it applies ───────────────────────── */
  return (
    <Shell step={at} steps={labels}>
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
