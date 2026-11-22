/**
 * The rail, folded (good_and_bads #22, 2026-11-22).
 *
 * The student menu grew from 13 links to 20 in three weeks. A new student sees
 * the first two of each labelled group, plus anything they have opened and the
 * page they are on; the rest wait behind "N more". Nothing is removed: every
 * link is one click away, and Rovix's tour still walks every page by route.
 *
 * What a student has opened is a per-browser convenience, so it lives in
 * localStorage, and every read and write is allowed to fail (a private window,
 * blocked storage): the rail then simply shows everything it would have folded
 * once "N more" is pressed.
 */

const VISITED = "rail.visited";
const OPENED = "rail.opened";

/** How many links a labelled group always shows. */
export const ALWAYS_SHOWN = 2;
/** A group this short is never folded: folding one link saves nothing. */
export const FOLD_FROM = ALWAYS_SHOWN + 2;

function readSet(key: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : []);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, value: Set<string>): void {
  try {
    window.localStorage.setItem(key, JSON.stringify([...value]));
  } catch {
    /* storage blocked: the fold just forgets */
  }
}

export const readVisited = () => readSet(VISITED);
export const readOpened = () => readSet(OPENED);

export function rememberVisit(to: string): Set<string> {
  const visited = readSet(VISITED);
  if (!visited.has(to)) {
    visited.add(to);
    writeSet(VISITED, visited);
  }
  return visited;
}

export function rememberOpened(opened: Set<string>): void {
  writeSet(OPENED, opened);
}

/**
 * Which of a group's links show while it is folded, in their own order. Pure,
 * so the rule is tested without a browser (tests/railFold.test.ts).
 */
export function shownWhileFolded<T extends { to: string }>(
  items: readonly T[],
  visited: ReadonlySet<string>,
  current: string | undefined,
): { shown: T[]; folded: number } {
  if (items.length < FOLD_FROM) return { shown: [...items], folded: 0 };
  const shown = items.filter((item, i) => i < ALWAYS_SHOWN || visited.has(item.to) || item.to === current);
  return { shown, folded: items.length - shown.length };
}
