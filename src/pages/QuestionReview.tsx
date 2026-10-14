/**
 * Question review — M05 FR-5.6, the human gate on scored use.
 *
 * One drafted question at a time: the stem, the answer key it expects, its
 * topic, and the automatic checks it already passed. The reviewer approves,
 * edits or rejects, and a rejection needs a reason. Approval is what makes a
 * question count for scoring; each decision is appended to M05's log.
 *
 * What this page does NOT claim: the reference answer is not machine-checked
 * (G2/G3 need a model call), so the reviewer is the only check on it and the
 * page says so.
 *
 * 2026-10-14, on merging: it reads M05 through the platform's api client and
 * the shell's `review` noun (it called `/sys/m05` with its own fetch), and a
 * reviewer can skip a question — with a fixed order and no skip, one they
 * were unsure about, or had just edited, came back first every time.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Icon, PageHeader, SkeletonRows, api } from "@ai/core";

import { useTrackTitles } from "../lib/tracks";

interface Check {
  name: string;
  passed: boolean;
  detail: string;
}
interface KeyPoint {
  id: string;
  statement: string;
  weight?: number;
  required?: boolean;
}
interface Item {
  id: string;
  track: string;
  stem: string;
  reference_answer: string;
  key_points: KeyPoint[];
  difficulty_band: string;
  time_budget_s: number;
  concepts: string[];
  provenance: string;
  checks: Check[];
}
interface Queue {
  remaining: number;
  offset: number;
  items: Item[];
}
interface Progress {
  tracks: Record<string, { approved: number; pending: number; rejected: number }>;
  totals: { approved: number; pending: number; rejected: number };
}

const BANDS = ["intro", "easy", "core", "hard", "stretch"];

const field =
  "mt-1.5 block w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand";

/** `dsa_verbal` -> "Dsa verbal"; M05's track titles are a student's words, not a reviewer's. */
function words(id: string): string {
  const text = id.replace(/^concept:/, "").replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function QuestionReview() {
  const qc = useQueryClient();
  const trackTitle = useTrackTitles();
  const [track, setTrack] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const queue = useQuery({
    queryKey: ["m05-review", "queue", track, offset],
    queryFn: () =>
      api.get<Queue>(
        `/v1/review/queue?${new URLSearchParams({ limit: "1", offset: String(offset), ...(track ? { track } : {}) })}`,
      ),
    retry: 0,
  });
  const progress = useQuery({
    queryKey: ["m05-review", "progress"],
    queryFn: () => api.get<Progress>("/v1/review/progress"),
    retry: 0,
  });

  const item = queue.data?.items[0];
  const [stem, setStem] = useState("");
  const [reference, setReference] = useState("");
  const [points, setPoints] = useState<string[]>([]);
  const [band, setBand] = useState("core");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!item) return;
    setStem(item.stem);
    setReference(item.reference_answer);
    setPoints(item.key_points.map((k) => k.statement));
    setBand(item.difficulty_band);
    setReason("");
    setError(null);
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function changes() {
    if (!item) return {};
    const out: Record<string, unknown> = {};
    if (stem !== item.stem) out.stem = stem;
    if (reference !== item.reference_answer) out.reference_answer = reference;
    if (band !== item.difficulty_band) out.difficulty_band = band;
    if (JSON.stringify(points) !== JSON.stringify(item.key_points.map((k) => k.statement))) {
      out.key_points = points.map((statement, i) => ({
        id: item.key_points[i]?.id ?? `kp_${i + 1}`,
        statement,
        weight: item.key_points[i]?.weight ?? 1,
        required: item.key_points[i]?.required ?? false,
      }));
    }
    return out;
  }

  async function decide(action: "approve" | "edit" | "reject") {
    if (!item) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/v1/review/${item.id}/decision`, {
        action,
        reason,
        changes: action === "reject" ? {} : changes(),
      });
      // Approved or rejected, the item leaves the queue and the same offset
      // is the next one; edited, it stays, so step past it.
      if (action === "edit") setOffset((o) => o + 1);
      await qc.invalidateQueries({ queryKey: ["m05-review"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that decision.");
    } finally {
      setBusy(false);
    }
  }

  const tracks = Object.entries(progress.data?.tracks ?? {});
  const remaining = queue.data?.remaining ?? 0;
  const position = queue.data ? queue.data.offset + 1 : 0;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={queue.data ? `${remaining} drafted question${remaining === 1 ? "" : "s"} waiting` : "Question review"}
        subtitle="A question counts for scoring only after a person has read it. Check that the answer key is right — nothing else has verified it."
      />

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Track">
        <button
          type="button"
          aria-pressed={track === ""}
          className={`rounded-full border px-3 py-1 text-xs ${track === "" ? "border-brand bg-brand-soft text-ink" : "border-line text-ink-soft hover:border-line-strong"}`}
          onClick={() => {
            setTrack("");
            setOffset(0);
          }}
        >
          All · {progress.data?.totals.pending ?? "…"} pending
        </button>
        {tracks.map(([name, row]) => (
          <button
            type="button"
            key={name}
            aria-pressed={track === name}
            className={`rounded-full border px-3 py-1 text-xs ${track === name ? "border-brand bg-brand-soft text-ink" : "border-line text-ink-soft hover:border-line-strong"}`}
            onClick={() => {
              setTrack(name);
              setOffset(0);
            }}
          >
            {trackTitle(name)} · {row.approved} approved · {row.pending} pending
          </button>
        ))}
      </div>

      {queue.isLoading && <SkeletonRows label="Loading the next question" rows={5} className="mt-8" />}
      {queue.isError && (
        <p role="alert" className="mt-8 text-sm text-contested">
          {(queue.error as Error).message}
        </p>
      )}
      {queue.data && !item && (
        <p className="mt-8 text-sm text-ink-soft">
          Nothing waiting{track ? " in this track" : ""}. Every drafted question here has a decision.
        </p>
      )}

      {item && (
        <section className="panel mt-6 space-y-5 p-5" aria-label="Question under review">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs text-ink-faint">
              {trackTitle(item.track)} · {item.concepts.map(words).join(", ")} · {item.provenance}
            </p>
            <p className="text-xs text-ink-faint" data-numeric>
              {position} of {remaining}
            </p>
          </div>

          <label className="block text-xs font-medium text-ink-soft">
            Question
            <textarea className={field} rows={3} value={stem} onChange={(e) => setStem(e.target.value)} />
          </label>

          <label className="block text-xs font-medium text-ink-soft">
            Reference answer
            <textarea className={field} rows={5} value={reference} onChange={(e) => setReference(e.target.value)} />
          </label>

          <fieldset>
            <legend className="text-xs font-medium text-ink-soft">Key points the answer should reach</legend>
            <ul className="mt-1.5 space-y-2">
              {points.map((p, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input
                    aria-label={`Key point ${i + 1}`}
                    className={`${field} mt-0`}
                    value={p}
                    onChange={(e) => setPoints(points.map((x, j) => (j === i ? e.target.value : x)))}
                  />
                  <button
                    type="button"
                    className="shrink-0 text-xs text-ink-faint hover:text-contested"
                    onClick={() => setPoints(points.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-2 text-xs font-medium text-brand"
              onClick={() => setPoints([...points, ""])}
            >
              + Add a key point
            </button>
          </fieldset>

          <label className="block text-xs font-medium text-ink-soft">
            Difficulty
            <select className={`${field} max-w-[12rem]`} value={band} onChange={(e) => setBand(e.target.value)}>
              {BANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="text-xs font-medium text-ink-soft">Automatic checks</p>
            <ul className="mt-1.5 space-y-1 text-sm">
              {item.checks.map((c) => (
                <li key={c.name} className="flex items-start gap-2 text-ink">
                  <Icon
                    name={c.passed ? "checkCircle" : "alert"}
                    size={15}
                    className={`mt-0.5 shrink-0 ${c.passed ? "text-confirmed" : "text-contested"}`}
                  />
                  <span>
                    <span className="font-medium">{words(c.name)}</span>
                    <span className="text-ink-faint">
                      {" "}
                      — {c.passed ? "passed" : "failed"}
                      {c.detail ? ` · ${c.detail}` : ""}
                    </span>
                  </span>
                </li>
              ))}
              <li className="flex items-start gap-2 text-ink-faint">
                <Icon name="info" size={15} className="mt-0.5 shrink-0" />
                <span>
                  <span className="font-medium">Reference answer</span> — not machine-checked; yours to verify
                </span>
              </li>
            </ul>
          </div>

          <label className="block text-xs font-medium text-ink-soft">
            Reason <span className="font-normal text-ink-faint">(needed to reject)</span>
            <input className={field} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>

          {error && (
            <p role="alert" className="text-sm text-contested">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy}
              className="h-9 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
              onClick={() => decide("approve")}
            >
              Approve for scoring
            </button>
            <button
              type="button"
              disabled={busy}
              className="h-9 rounded-lg border border-line px-4 text-sm font-medium text-ink hover:border-line-strong disabled:opacity-50"
              onClick={() => decide("edit")}
            >
              Save edits, keep in queue
            </button>
            <button
              type="button"
              disabled={busy || !reason.trim()}
              className="h-9 rounded-lg border border-line px-4 text-sm font-medium text-ink hover:border-contested-line hover:text-contested disabled:opacity-50"
              onClick={() => decide("reject")}
            >
              Reject
            </button>
            <button
              type="button"
              disabled={busy || remaining < 2}
              className="ml-auto h-9 rounded-lg px-3 text-sm text-ink-soft hover:text-ink disabled:opacity-40"
              onClick={() => setOffset((o) => o + 1)}
            >
              Skip for now
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
