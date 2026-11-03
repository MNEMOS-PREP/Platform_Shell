/**
 * The checkpoint interview: a short Mock session on ONE roadmap topic, and its result read back into the roadmap.
 *
 * Starting it creates an M06 session focused on the topic's concept and remembers which topic it was for. M06 gives no
 * number for an interview (M13 owns scores, and its gate is closed), so the result is built from what M06 does say:
 * how each question ended. A correct answer counts one, a partial half; vague, wrong, unsupported and unanswered count
 * nothing. A result of INTERVIEW_TO_COVER or more covers the topic.
 */
import { api } from "@ai/core";

import { recordInterview, stopById, type Progress, type Stop } from "./rules";

const KEY = "ai.dsaCheckpoint";
/** Long enough for about four questions on one topic, short enough to be a checkpoint and not a mock. */
export const CHECKPOINT_MINUTES = 10;

export interface PendingCheckpoint {
  stopId: string;
  sessionId: string;
}

export interface Settled {
  stop: Stop;
  /** 0..1, or undefined when the interview ended with nothing judged (it was left early). */
  score?: number;
  progress: Progress;
}

export function pending(): PendingCheckpoint | null {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "null") as PendingCheckpoint | null;
    return p && p.stopId && p.sessionId ? p : null;
  } catch {
    return null;
  }
}

function remember(p: PendingCheckpoint | null): void {
  try {
    if (p) localStorage.setItem(KEY, JSON.stringify(p));
    else localStorage.removeItem(KEY);
  } catch {
    /* a private window: the result is not carried back, the interview still runs */
  }
}

/** Creates the focused session and returns its id, for the caller to open. */
export async function startCheckpoint(stop: Stop): Promise<string> {
  const label = stop.name.toLowerCase();
  const resolved = await api
    .post<{ resolved: Record<string, string | null> }>("/v1/concepts/resolve", { labels: [label] })
    .then((r) => r.resolved[label] ?? null)
    .catch(() => null);
  const session = await api.post<{ id: string }>("/v1/interviews", {
    mode: "practice",
    minutes: CHECKPOINT_MINUTES,
    focus_concepts: resolved ? [resolved] : [],
    focus_label: stop.name,
  });
  remember({ stopId: stop.id, sessionId: session.id });
  return session.id;
}

interface ReportBits {
  status: string;
  summary?: { status_counts?: Record<string, number> };
}

/** Correct counts one, partial a half, over every question that was judged. Undefined when none was. */
export function scoreOf(counts: Record<string, number>): number | undefined {
  const judged = ["correct", "partial", "vague", "incorrect", "unanswered", "unsupported"].reduce((n, k) => n + (counts[k] ?? 0), 0);
  if (!judged) return undefined;
  return ((counts.correct ?? 0) + 0.5 * (counts.partial ?? 0)) / judged;
}

/**
 * Looks at the interview a checkpoint started. Still running: nothing yet. Over: its result goes into the progress and
 * the memory is cleared. Gone or unreadable: cleared too, so a dead session never blocks the next checkpoint.
 */
export async function settle(progress: Progress): Promise<Settled | "running" | null> {
  const p = pending();
  const stop = p && stopById(p.stopId);
  if (!p || !stop) {
    remember(null);
    return null;
  }
  let report: ReportBits;
  try {
    report = await api.get<ReportBits>(`/v1/interviews/${p.sessionId}/report`);
  } catch {
    remember(null);
    return null;
  }
  if (report.status !== "ended" && report.status !== "aborted") return "running";
  remember(null);
  const score = scoreOf(report.summary?.status_counts ?? {});
  return { stop, score, progress: score === undefined ? progress : recordInterview(progress, stop.id, score) };
}
