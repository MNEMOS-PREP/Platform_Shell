/**
 * The student's semester and courses (2026-10-13): what sign-in asks, and
 * what Today offers to practise because of it.
 *
 * The courses come from M04's `/v1/curricula`, which is built from the
 * college's own curriculum PDFs, and each course carries the ontology
 * concepts its syllabus teaches. So a course the student ticks is not a label
 * on a profile: it is a focused practice session on exactly those concepts,
 * through the same `/mock?focus=` door Today's "Practise Recursion" uses.
 *
 * Earlier semesters are the curriculum's, not asked: a student in semester 5
 * has sat semesters 1-4's courses, and asking them to tick twenty boxes they
 * cannot get wrong is the kind of onboarding people abandon.
 */
import type { Course, Curriculum, ElectiveBasket, Semester } from "@ai/m04";

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/** M06 plans at most eight focus concepts (M04 §3.2.1's sizing rule). */
export const MAX_FOCUS = 8;

/**
 * "B.Tech CSE (Artificial Intelligence) · 2022 curriculum" from the PDF's
 * "B.Tech Computer Science and Engineering (Artificial Intelligence)": the
 * initials a student calls their branch, the specialisation kept, and the
 * curriculum year, because two batches on one branch follow different ones.
 */
export function programmeLabel(programme: { name: string; curriculum_year: number | null }): string {
  const match = programme.name.match(/^B\.?\s?Tech\s+(.*?)(\s*\(.*\))?$/i);
  const base = match ? match[1]! : programme.name;
  const initials = base
    .split(/\s+/)
    .filter((w) => w && !/^(and|of|in|&)$/i.test(w))
    .map((w) => w[0]!.toUpperCase())
    .join("");
  const short = initials.length >= 2 && initials.length <= 5 ? initials : base;
  const label = match ? `B.Tech ${short}${match[2] ?? ""}` : programme.name;
  return programme.curriculum_year ? `${label} · ${programme.curriculum_year} curriculum` : label;
}

/** The `year` other screens still read, from the semester the student gave. */
export function yearForSemester(semester: number | null): string {
  if (semester === null || semester < 1) return "";
  return ["1st year", "2nd year", "3rd year", "Final year"][Math.min(3, Math.ceil(semester / 2) - 1)]!;
}

export function semesterOf(curriculum: Curriculum | undefined, semester: number | null): Semester | undefined {
  if (!curriculum || semester === null) return undefined;
  return curriculum.semesters.find((s) => s.number === semester);
}

/** Every course in the curriculum by code: its semesters, then its baskets. */
export function courseIndex(curriculum: Curriculum | undefined): Map<string, Course> {
  const index = new Map<string, Course>();
  if (!curriculum) return index;
  for (const s of curriculum.semesters) for (const c of s.courses) index.set(c.code, c);
  for (const b of curriculum.electives) for (const c of b.courses) if (!index.has(c.code)) index.set(c.code, c);
  return index;
}

/** What a semester starts ticked with: every course it lists. Electives are
 *  chosen, never defaulted — a guessed elective is a wrong one. */
export function defaultCourses(semester: Semester | undefined): string[] {
  return semester ? semester.courses.map((c) => c.code) : [];
}

/** The professional-elective slots a semester has ("Professional Elective I"). */
export function electiveSlots(semester: Semester | undefined): string[] {
  return semester ? semester.slots.filter((s) => s.kind === "professional").map((s) => s.title) : [];
}

/** Which of a saved selection are electives, in slot order. */
export function chosenElectives(semester: Semester | undefined, selected: readonly string[]): string[] {
  const own = new Set(defaultCourses(semester));
  return selected.filter((code) => !own.has(code));
}

/** The baskets an elective slot is filled from, each kept to its courses. */
export function electiveOptions(curriculum: Curriculum | undefined): ElectiveBasket[] {
  return curriculum ? curriculum.electives.filter((b) => b.courses.length > 0) : [];
}

/** The selected courses an interview can practise, in the order selected. */
export function practisable(curriculum: Curriculum | undefined, selected: readonly string[]): Course[] {
  const index = courseIndex(curriculum);
  return selected.map((code) => index.get(code)).filter((c): c is Course => Boolean(c && c.concepts.length));
}

/** A focused practice on a course: its most-taught concepts, named for the course. */
export function practiseCourseLink(course: Course): string {
  const focus = course.concepts.slice(0, MAX_FOCUS).map((c) => c.id).join(",");
  return `/mock?${new URLSearchParams({ focus, label: course.title })}`;
}

/** "Operating Systems covers Deadlocks, Paging and 7 more." */
export function coversLine(course: Course, shown = 3): string {
  const names = course.concepts.map((c) => c.name);
  if (names.length <= shown) return names.join(", ");
  return `${names.slice(0, shown).join(", ")} and ${names.length - shown} more`;
}
