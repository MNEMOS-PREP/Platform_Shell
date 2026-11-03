/**
 * The DSA route map: which stops exist, what opens what, and what a student's progress makes of each.
 *
 * A stop is one topic (concepts.ts lists everything inside it). The student works through its concepts, then has
 * a short mini interview on that one topic. A stop is covered only on a strong result: every basic and core
 * concept done AND the mini interview went well. Advanced concepts are there to go further and never hold the next
 * stop shut. A weak interview keeps the stop in progress, so the next stops do not open on a pass not yet earned.
 *
 * The ids are the M04 ontology's where it has one, so the interview can be started as a focused M06 session on that
 * concept and the practice set can be fetched from M05 by the same key.
 */
import { ROUTE_DEFS, TOPICS, type Topic } from "./concepts.ts";

/** The two Amrita B.Tech programmes the map is aligned to: CSE (2023 curriculum) and CSE Artificial Intelligence (2022). */
export type ProgrammeId = "cse" | "aie";

export const PROGRAMMES: { id: ProgrammeId; name: string; short: string }[] = [
  { id: "cse", name: "B.Tech CSE", short: "CSE" },
  { id: "aie", name: "B.Tech CSE (AI)", short: "CSE AI" },
];

export type StopState = "covered" | "current" | "ready" | "locked";

/** 0 to do, 1 learning, 2 done. */
export type ConceptState = 0 | 1 | 2;

export interface Progress {
  concepts: Record<string, ConceptState | undefined>;
  /** Mini interview score 0..1 per stop, absent until one has been taken. */
  interview: Record<string, number | undefined>;
}

export const EMPTY_PROGRESS: Progress = { concepts: {}, interview: {} };

/** Concepts done that open the mini interview. */
export const DONE_TO_INTERVIEW = 3;
/** Mini interview score that counts as a strong result. */
export const INTERVIEW_TO_COVER = 0.6;

export interface Stop extends Topic {
  /** The stop that must be covered first; the first stop of the map has none. */
  after: string[];
}

/** Routes branch off Foundations once Complexity is covered; within a route each stop follows the one before. */
const GATE = "time_complexity";

export const ROUTES = ROUTE_DEFS.map((r) => ({ id: r.id, name: r.name }));

export const STOPS: Stop[] = ROUTE_DEFS.flatMap((r, ri) =>
  r.topics.map((t, i) => ({
    ...t,
    after: i > 0 ? [r.topics[i - 1].id] : ri === 0 ? [] : [GATE],
  })),
);

export const stopById = (id: string): Stop | undefined => STOPS.find((s) => s.id === id);

export const conceptKey = (stopId: string, group: number, index: number): string => `${stopId}:${group}:${index}`;

export interface StopCounts {
  total: number;
  done: number;
  learning: number;
  /** Basic and core concepts: what covering the stop needs. */
  required: number;
  requiredDone: number;
}

export function countsOf(stop: Topic, progress: Progress): StopCounts {
  const c: StopCounts = { total: 0, done: 0, learning: 0, required: 0, requiredDone: 0 };
  stop.groups.forEach((g, gi) =>
    g.concepts.forEach((k, ci) => {
      const v = progress.concepts[conceptKey(stop.id, gi, ci)] ?? 0;
      const need = k.level !== "advanced";
      c.total++;
      if (need) c.required++;
      if (v === 2) {
        c.done++;
        if (need) c.requiredDone++;
      } else if (v === 1) c.learning++;
    }),
  );
  return c;
}

export function isCovered(stop: Topic, progress: Progress): boolean {
  const c = countsOf(stop, progress);
  return c.requiredDone === c.required && (progress.interview[stop.id] ?? 0) >= INTERVIEW_TO_COVER;
}

export function statesOf(progress: Progress, stops: Stop[] = STOPS): Record<string, StopState> {
  const covered = new Set(stops.filter((s) => isCovered(s, progress)).map((s) => s.id));
  const out: Record<string, StopState> = {};
  for (const s of stops) {
    if (covered.has(s.id)) out[s.id] = "covered";
    else if (!s.after.every((a) => covered.has(a))) out[s.id] = "locked";
    else {
      const c = countsOf(s, progress);
      out[s.id] = c.done + c.learning > 0 || progress.interview[s.id] !== undefined ? "current" : "ready";
    }
  }
  return out;
}

/** Where the student is: the stop they have started and not finished, else the first one ready, in map order. */
export function hereOf(states: Record<string, StopState>, stops: Stop[] = STOPS): Stop | undefined {
  return stops.find((s) => states[s.id] === "current") ?? stops.find((s) => states[s.id] === "ready");
}

export interface Interview {
  open: boolean;
  score?: number;
  /** Taken, and not strong enough: the stop stays in progress and the student is offered another go. */
  weak: boolean;
}

export function interviewOf(stop: Topic, progress: Progress): Interview {
  const score = progress.interview[stop.id];
  return {
    open: countsOf(stop, progress).done >= DONE_TO_INTERVIEW,
    score,
    weak: score !== undefined && score < INTERVIEW_TO_COVER,
  };
}

/** The stops a locked stop is waiting on, by name. */
export function waitingOn(stop: Stop, states: Record<string, StopState>): string[] {
  return stop.after.filter((a) => states[a] !== "covered").map((a) => stopById(a)?.name ?? a);
}

/** Moves a concept to its next state: to do, learning, done, and round again. Pure: returns new progress. */
export function cycleConcept(progress: Progress, key: string): Progress {
  const next = (((progress.concepts[key] ?? 0) + 1) % 3) as ConceptState;
  return { ...progress, concepts: { ...progress.concepts, [key]: next } };
}

/** Records a mini interview result. Only counts once the interview is open; the best score is kept. */
export function recordInterview(progress: Progress, stopId: string, score: number): Progress {
  const stop = TOPICS.find((t) => t.id === stopId);
  if (!stop || !interviewOf(stop, progress).open) return progress;
  const clamped = Math.max(0, Math.min(1, score));
  return { ...progress, interview: { ...progress.interview, [stopId]: Math.max(progress.interview[stopId] ?? 0, clamped) } };
}
