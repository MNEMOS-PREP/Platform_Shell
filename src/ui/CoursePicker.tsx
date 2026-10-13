/**
 * "Which courses are you taking this semester?" — the welcome step's picker,
 * and Settings' (2026-10-13).
 *
 * The semester's courses come ticked, because the curriculum says the student
 * is taking them; unticking is for the exceptions (an arrear, a lateral
 * entry). Each professional-elective slot is a choice from the curriculum's
 * baskets, never defaulted: a guessed elective is a wrong one. Free and value
 * electives are named and left alone — they change nothing an interview asks.
 *
 * A course whose syllabus teaches something an interview asks says how many
 * topics, so the student can see which ticks matter: those become practices on
 * Today (lib/courses.ts).
 */
import type { Curriculum } from "@ai/m04";

import { chosenElectives, coversLine, electiveOptions, electiveSlots, semesterOf } from "../lib/courses";

export function CoursePicker({
  curriculum,
  semester,
  selected,
  onChange,
  idPrefix = "course",
}: {
  curriculum: Curriculum;
  semester: number;
  selected: readonly string[];
  onChange: (next: string[]) => void;
  /** Distinct ids when two pickers could share a page. */
  idPrefix?: string;
}) {
  const sem = semesterOf(curriculum, semester);
  if (!sem) {
    return (
      <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-faint">
        The curriculum has no courses listed for semester {semester}.
      </p>
    );
  }

  const own = sem.courses.map((c) => c.code);
  const ticked = new Set(selected.filter((code) => own.includes(code)));
  const slots = electiveSlots(sem);
  const electives = chosenElectives(sem, selected);
  const baskets = electiveOptions(curriculum);
  const other = sem.slots.filter((s) => s.kind !== "professional");

  const emit = (nextTicked: Set<string>, nextElectives: string[]) =>
    onChange([...own.filter((code) => nextTicked.has(code)), ...nextElectives.filter(Boolean)]);

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="sr-only">Semester {semester} courses</legend>
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {sem.courses.map((course) => {
            const id = `${idPrefix}-${course.code}`;
            const on = ticked.has(course.code);
            return (
              <li key={course.code}>
                <label htmlFor={id} className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-surface-sunken/60">
                  <input
                    id={id}
                    type="checkbox"
                    checked={on}
                    onChange={() => {
                      const next = new Set(ticked);
                      if (on) next.delete(course.code);
                      else next.add(course.code);
                      emit(next, electives);
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">{course.title}</span>
                    <span className="mt-0.5 block text-2xs text-ink-faint">
                      <span className="font-mono">{course.code}</span>
                      {course.concepts.length > 0 && <> · {coversLine(course)}</>}
                    </span>
                  </span>
                  {course.concepts.length > 0 && (
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-brand-soft px-2 py-0.5 text-2xs font-medium text-brand">
                      {course.concepts.length} topic{course.concepts.length === 1 ? "" : "s"}
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {slots.length > 0 && baskets.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {slots.map((title, i) => {
            const id = `${idPrefix}-slot-${i}`;
            const value = electives[i] ?? "";
            const takenElsewhere = new Set(electives.filter((_, j) => j !== i));
            return (
              <label key={title} htmlFor={id} className="block text-sm font-medium text-ink">
                {title}
                <select
                  id={id}
                  value={value}
                  onChange={(e) => {
                    const next = [...electives];
                    while (next.length < i) next.push("");
                    next[i] = e.target.value;
                    emit(ticked, next);
                  }}
                  className="mt-1.5 block h-11 w-full rounded-lg border border-line bg-surface px-3 text-[0.9375rem] text-ink outline-none focus:border-brand"
                >
                  <option value="">Not chosen yet</option>
                  {baskets.map((basket) => (
                    <optgroup key={basket.name} label={basket.name}>
                      {basket.courses.map((course) => (
                        <option key={course.code} value={course.code} disabled={takenElsewhere.has(course.code)}>
                          {course.title}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
      )}

      {other.length > 0 && (
        <p className="text-xs text-ink-faint">
          Also this semester: {other.map((s) => s.title).join(", ")} — your choice, and it doesn't change what
          you're asked.
        </p>
      )}
    </div>
  );
}
