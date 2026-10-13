/**
 * Settings — the student's own record, and their rights over it.
 *
 * Before 2026-10-04 there was nowhere to put a name (so the greeting was
 * anonymous), the weekly goal lived in one browser, consent had no home, and
 * M04's export and delete endpoints had no screen behind them — FR-4.18's
 * rights existed only for someone with `curl`. Everything here saves to M04's
 * profile and consent tables, so it is the same on every device.
 *
 * Delete is the one place a confirmation asks for typing: it is the hard
 * delete (M04 removes the rows, and the numbers cannot come back), and a
 * button that does that on one click is how somebody loses a semester.
 */
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { Icon, PageHeader, SkeletonRows, candidateIdOf, signIn, signOut, useSession } from "@ai/core";
import {
  downloadMyData,
  useCurricula,
  useCurriculum,
  useDeleteMyData,
  useGrantConsent,
  usePracticeConsent,
  useProfile,
  useSaveProfile,
  type ProfileDrive,
} from "@ai/m04";

import { readEmail, writeEmail } from "../lib/account";
import { SEMESTERS, defaultCourses, programmeLabel, semesterOf, yearForSemester } from "../lib/courses";
import { dailyReminderIcs, downloadIcs } from "../lib/goals";
import { GOAL_OPTIONS, writeGoal } from "../lib/practice";
import { CoursePicker } from "../ui/CoursePicker";
import { DrivePicker } from "../ui/DrivePicker";

function Section({
  id,
  title,
  sub,
  children,
}: {
  id: string;
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="grid gap-4 border-b border-line py-8 last:border-0 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div>
        <h2 id={`${id}-h`} className="text-sm font-semibold text-ink">
          {title}
        </h2>
        {sub && <p className="mt-1 text-xs leading-relaxed text-ink-faint">{sub}</p>}
      </div>
      <div className="min-w-0 max-w-xl">{children}</div>
    </section>
  );
}

// `block`: without it a narrow input (the reminder, the DELETE box) sat on its
// label's line instead of under it, which no other field on the page did.
const field =
  "mt-1.5 block h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-brand";

const OTHER = "other";
const GRADUATED = "graduated";

function Saved({ when }: { when: boolean }) {
  return when ? (
    <span className="inline-flex items-center gap-1 text-xs text-confirmed" role="status">
      <Icon name="check" size={13} /> Saved
    </span>
  ) : null;
}

export function Settings() {
  const session = useSession();
  const candidate = candidateIdOf(session);
  const navigate = useNavigate();
  const profile = useProfile(candidate);
  const save = useSaveProfile(candidate);
  const consent = usePracticeConsent(candidate);
  const grant = useGrantConsent(candidate);
  const wipe = useDeleteMyData(candidate);
  const curricula = useCurricula();

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [programme, setProgramme] = useState("");
  const [term, setTerm] = useState("");
  const [branch, setBranch] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [exporting, setExporting] = useState(false);
  // The saved programme drives the Courses section, not the unsaved select.
  const savedCurriculum = useCurriculum(profile.data?.curriculum_id || null);
  // The one being picked, so saving a new programme or semester can re-tick
  // that semester's courses in the same request.
  const pickedCurriculum = useCurriculum(programme && programme !== OTHER ? programme : null);

  useEffect(() => {
    if (!profile.data) return;
    setName(profile.data.display_name);
    setRole(profile.data.target_role);
    setProgramme(profile.data.curriculum_id || (profile.data.branch ? OTHER : ""));
    setTerm(
      profile.data.semester !== null
        ? String(profile.data.semester)
        : profile.data.year === "Graduated"
          ? GRADUATED
          : "",
    );
    setBranch(profile.data.branch);
  }, [profile.data]);

  if (!candidate) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Settings" subtitle="Signed in as staff — there is no student record to manage here." />
        <button
          type="button"
          onClick={() => {
            signOut();
            navigate("/signin");
          }}
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg border border-line px-4 text-sm text-ink hover:border-line-strong"
        >
          <Icon name="arrowLeft" size={15} /> Sign out
        </button>
      </div>
    );
  }

  const persist = (key: string, update: Parameters<typeof save.mutate>[0]) =>
    save.mutate(update, { onSuccess: () => setSavedAt(key) });

  const p = profile.data;
  const email = readEmail();

  /** The profile form's save. A new programme or semester re-ticks that
   *  semester's courses; the old ones belonged to another timetable. */
  const saveProfile = () => {
    const known = curricula.data?.find((c) => c.id === programme);
    const semester = /^[1-8]$/.test(term) ? Number(term) : null;
    const moved = (known?.id ?? "") !== (p?.curriculum_id ?? "") || semester !== (p?.semester ?? null);
    const fresh = moved && known && semester !== null ? defaultCourses(semesterOf(pickedCurriculum.data, semester)) : null;
    persist("profile", {
      display_name: name.trim(),
      target_role: role.trim(),
      year: term === GRADUATED ? "Graduated" : yearForSemester(semester),
      branch: known ? known.short : programme === OTHER ? branch.trim() : "",
      curriculum_id: known?.id ?? "",
      semester,
      ...(fresh ? { courses: fresh } : moved ? { courses: [] } : {}),
    });
    if (session && name.trim()) signIn({ ...session, name: name.trim() });
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Settings" subtitle="Your profile, your goals, and your data." />

      {profile.isLoading ? (
        <SkeletonRows label="Loading your settings" rows={4} className="mt-8" />
      ) : (
        <>
          <Section id="profile" title="Profile" sub="Used for your greeting and to set what the interviewer asks.">
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                saveProfile();
              }}
            >
              <label className="block text-xs font-medium text-ink-soft">
                Name
                <input className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </label>
              <label className="block text-xs font-medium text-ink-soft">
                Role you're aiming for
                <input className={field} value={role} onChange={(e) => setRole(e.target.value)} placeholder="Software engineer" />
              </label>
              <label className="block text-xs font-medium text-ink-soft">
                Programme
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
                <label className="block text-xs font-medium text-ink-soft">
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
                  <label className="block text-xs font-medium text-ink-soft">
                    Branch
                    <input className={field} value={branch} onChange={(e) => setBranch(e.target.value)} />
                  </label>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button type="submit" disabled={save.isPending} className="h-9 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
                  Save
                </button>
                <Saved when={savedAt === "profile"} />
              </div>
              {email && <p className="text-xs text-ink-faint">Signed in with {email}.</p>}
            </form>
          </Section>

          <Section
            id="courses"
            title="Courses"
            sub="This semester's, from your programme's curriculum. Each one that teaches something an interview asks gets a practice on Today."
          >
            {!p?.curriculum_id || p.semester === null ? (
              <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-soft">
                Pick your programme and current semester under Profile, and save — this semester's courses
                appear here.
              </p>
            ) : savedCurriculum.data ? (
              <CoursePicker
                idPrefix="settings-course"
                curriculum={savedCurriculum.data}
                semester={p.semester}
                selected={p.courses}
                onChange={(courses) => persist("courses", { courses })}
              />
            ) : (
              <SkeletonRows label="Loading your courses" rows={4} />
            )}
            <div className="mt-2">
              <Saved when={savedAt === "courses"} />
            </div>
          </Section>

          <Section id="drives" title="Drives" sub="Today counts down to the next one, and the interview setup offers each.">
            <DrivePicker
              drives={p?.drives ?? []}
              onChange={(drives: ProfileDrive[]) => persist("drives", { drives })}
            />
            <div className="mt-2">
              <Saved when={savedAt === "drives"} />
            </div>
          </Section>

          <Section id="rhythm" title="Goal and reminder" sub="A reminder your own calendar keeps — it works with the tab closed.">
            <p className="text-xs font-medium text-ink-soft">Interviews a week</p>
            <div className="mt-1.5 flex gap-1.5">
              {GOAL_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={(p?.weekly_goal ?? 3) === option}
                  onClick={() => {
                    writeGoal(option);
                    persist("goal", { weekly_goal: option });
                  }}
                  className={`h-9 min-w-10 rounded-lg px-3 text-sm font-medium ${
                    (p?.weekly_goal ?? 3) === option ? "bg-brand text-white" : "border border-line text-ink-soft hover:border-line-strong"
                  }`}
                >
                  {option}
                </button>
              ))}
              <span className="ml-2 self-center">
                <Saved when={savedAt === "goal"} />
              </span>
            </div>
            <label className="mt-5 block text-xs font-medium text-ink-soft">
              Daily reminder at
              <input
                type="time"
                className={`${field} max-w-[10rem]`}
                defaultValue={p?.reminder_time ?? ""}
                onBlur={(e) => persist("reminder", { reminder_time: e.target.value })}
              />
            </label>
            <div className="mt-3 flex items-center gap-3">
              {p?.reminder_time && (
                <button
                  type="button"
                  onClick={() => downloadIcs("practice-reminder.ics", dailyReminderIcs(p.reminder_time, window.location.origin))}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand"
                >
                  <Icon name="calendar" size={15} /> Add the {p.reminder_time} reminder to my calendar
                </button>
              )}
              <Saved when={savedAt === "reminder"} />
            </div>
          </Section>

          <Section id="voice" title="Voice" sub="The interviewer reads each question aloud; every line is on screen too.">
            <div className="panel flex flex-wrap items-center gap-3 p-4">
              <Icon name="mic" size={17} className="shrink-0 text-brand" />
              <span className="min-w-0 flex-1 text-sm text-ink-soft">
                Hear each interviewer in the voice this browser gives them, and turn the voice on or off.
              </span>
              <button
                type="button"
                onClick={() => navigate("/voice")}
                className="h-9 rounded-lg border border-line px-3.5 text-sm font-medium text-ink hover:border-brand-line"
              >
                Hear your interviewers
              </button>
            </div>
          </Section>

          <Section id="privacy" title="Your data" sub="What is kept, and your rights over it.">
            <div className="panel p-4">
              {consent.isLoading ? (
                <SkeletonRows label="Checking consent" rows={1} />
              ) : consent.data ? (
                <p className="flex items-start gap-2.5 text-sm text-ink-soft">
                  <Icon name="checkCircle" size={17} className="mt-0.5 shrink-0 text-confirmed" />
                  <span>
                    <span className="font-medium text-ink">Your progress is being remembered.</span> You
                    agreed on{" "}
                    {new Date(consent.data.granted_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    . Your answers and
                    marks build your skill graph; placement staff see counts, never your answers.
                  </span>
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="flex flex-1 items-start gap-2.5 text-sm text-ink-soft">
                    <Icon name="info" size={17} className="mt-0.5 shrink-0 text-ink-faint" />
                    <span>
                      <span className="font-medium text-ink">Nothing is being remembered.</span> Your
                      interviews give notes, but your skill graph won't fill in.
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => grant.mutate()}
                    disabled={grant.isPending}
                    className="h-9 rounded-lg bg-brand px-3.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
                  >
                    Remember my progress
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={exporting}
                onClick={async () => {
                  setExporting(true);
                  try {
                    await downloadMyData(candidate);
                  } finally {
                    setExporting(false);
                  }
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3.5 text-sm font-medium text-ink hover:border-line-strong"
              >
                <Icon name="document" size={15} />
                {exporting ? "Preparing…" : "Download my data"}
              </button>
              <span className="text-xs text-ink-faint">Every row kept about you, as a JSON file.</span>
            </div>

            <div className="mt-6 rounded-xl border border-contested-line bg-contested-soft p-4">
              <p className="text-sm font-semibold text-contested">Delete my data</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                Removes your skill graph, every mark and answer it was built from, and your profile.
                It can't be undone. Your consent record stays, marked withdrawn, as the record of
                when you left.
              </p>
              <label className="mt-3 block text-xs font-medium text-ink-soft">
                Type DELETE to confirm
                <input className={`${field} max-w-[12rem]`} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </label>
              <button
                type="button"
                disabled={confirm !== "DELETE" || wipe.isPending}
                onClick={() =>
                  wipe.mutate(undefined, {
                    onSuccess: () => {
                      setConfirm("");
                      setSavedAt("deleted");
                    },
                  })
                }
                className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-contested px-3.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                <Icon name="trash" size={15} />
                {wipe.isPending ? "Deleting…" : "Delete everything"}
              </button>
              {savedAt === "deleted" && (
                <p className="mt-2 text-sm text-ink" role="status">
                  Deleted. Your interviews' notes stay with the interview engine; your skill graph is empty.
                </p>
              )}
            </div>
          </Section>

          <Section id="account" title="Account">
            <button
              type="button"
              onClick={() => {
                writeEmail(null);
                signOut();
                navigate("/signin");
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3.5 text-sm text-ink hover:border-line-strong"
            >
              <Icon name="arrowLeft" size={15} /> Sign out
            </button>
          </Section>
        </>
      )}
    </div>
  );
}
