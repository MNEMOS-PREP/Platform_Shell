/**
 * The student journey, as the platform can actually walk it today.
 *
 * `@ai/core` ships a MODULES registry, and it is stale: it marks only M15
 * `live`, from before M01, M02 and M13 had UIs. Rather than render a wrong
 * registry from a versioned package, the shell keeps its own ordered view and
 * the package gets corrected on its next bump. Two lists is a cost; a home
 * page that tells a student a built module is not built is a bigger one.
 *
 * `to` is the truth test. A stage with a path is clickable; a stage without
 * one is named, explained and NOT rendered as a dead link — the same rule the
 * modules follow internally for features they have not built.
 */
export type StageKind = "ui" | "headless" | "planned";

export interface Stage {
  step: number;
  module: string;
  title: string;
  /** What this stage does, in the student's terms. */
  blurb: string;
  /** The mechanism, in the panel's terms. */
  mechanism: string;
  kind: StageKind;
  /** Present only when there is a screen to open. */
  to?: string;
  /** Present for modules that are real but have no UI. */
  api?: string;
}

export const JOURNEY: Stage[] = [
  {
    step: 1,
    module: "M01",
    title: "Resume",
    blurb: "Paste your resume; we read the skills off it.",
    mechanism: "Every concept records whether M04's ontology resolved it or an offline table guessed it.",
    kind: "ui",
    to: "/resume",
  },
  {
    step: 2,
    module: "M02",
    title: "Job description",
    blurb: "Paste the JD you are preparing for.",
    mechanism: "Requirements come back covered, missing or not_measured — never a fabricated zero.",
    kind: "ui",
    to: "/jd",
  },
  {
    step: 3,
    module: "M05",
    title: "Question selection",
    blurb: "The next question, chosen for what we do not yet know about you.",
    mechanism: "Maximum Fisher information over a fixed ability grid, with content balancing and exposure control.",
    kind: "headless",
    api: "/sys/m05/v1/bank/health",
  },
  {
    step: 4,
    module: "M06",
    title: "Mock interview",
    blurb: "The front door: a real practice interview that probes until understanding breaks.",
    mechanism:
      "A ladder of follow-ups on one question until the reasoning stops holding, and the depth it broke at is the measurement. Scoring runs off the conversation's path, so the interviewer never waits for it — and never sees it.",
    kind: "ui",
    to: "/mock",
  },
  {
    step: 5,
    module: "M13",
    title: "Evaluation",
    blurb: "Your answer, scored against a rubric, with the words that earned it.",
    mechanism: "Every dimension must quote your answer at a verified offset, or the number is withheld.",
    kind: "ui",
    to: "/score",
  },
  {
    step: 6,
    module: "M04",
    title: "Skill graph",
    blurb: "What you know, tracked over time, with an honest error bar.",
    mechanism: "IRT posterior (theta and SE) is the single source of truth. Untested is never zero.",
    kind: "headless",
    api: "/sys/m04/v1/concepts",
  },
  {
    step: 7,
    module: "M15",
    title: "Company prep",
    blurb: "What this company actually asks — and who said so.",
    mechanism: "Allowlisted sources only; two independent publishers before a fact is confirmed.",
    kind: "ui",
    to: "/companies",
  },
  {
    step: 8,
    module: "M16",
    title: "Study plan",
    blurb: "A plan for the days you have left, aimed at the concept that is actually blocking you.",
    mechanism: "Specified in plan_in_depth/M16_Counselor.md. Not built — Q4.",
    kind: "planned",
  },
];

/** Every module with a backend the shell can reach, for the System page. */
export const BACKENDS = [
  { id: "m01", label: "M01 · Resume Ingestion", port: 8101 },
  { id: "m02", label: "M02 · JD Parser", port: 8102 },
  { id: "m04", label: "M04 · Skill Graph & Memory", port: 8104 },
  { id: "m05", label: "M05 · Question Intelligence", port: 8105 },
  { id: "m06", label: "M06 · Mock Interview Engine", port: 8106 },
  { id: "m13", label: "M13 · Evaluation Engine", port: 8113 },
  { id: "m15", label: "M15 · Company Guider", port: 8115 },
] as const;
