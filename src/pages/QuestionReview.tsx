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
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { sessionHeaders } from "@ai/core";

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
  items: Item[];
}
interface Progress {
  tracks: Record<string, { approved: number; pending: number; rejected: number }>;
  totals: { approved: number; pending: number; rejected: number };
}

const BANDS = ["intro", "easy", "core", "hard", "stretch"];
const BASE = "/sys/m05/v1/review";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...sessionHeaders(), ...(init?.headers ?? {}) },
  });
  if (!r.ok) {
    let detail = `${r.status} ${r.statusText}`;
    try {
      const body = (await r.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      /* keep the status line */
    }
    throw new Error(detail);
  }
  return (await r.json()) as T;
}

export function QuestionReview() {
  const qc = useQueryClient();
  const [track, setTrack] = useState<string>("");
  const queue = useQuery({
    queryKey: ["m05-review", "queue", track],
    queryFn: () => call<Queue>(`/queue?limit=1${track ? `&track=${encodeURIComponent(track)}` : ""}`),
    retry: 0,
  });
  const progress = useQuery({
    queryKey: ["m05-review", "progress"],
    queryFn: () => call<Progress>("/progress"),
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
      await call(`/${item.id}/decision`, {
        method: "POST",
        body: JSON.stringify({ action, reason, changes: action === "reject" ? {} : changes() }),
      });
      await qc.invalidateQueries({ queryKey: ["m05-review"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that decision.");
    } finally {
      setBusy(false);
    }
  }

  const tracks = Object.entries(progress.data?.tracks ?? {});

  return (
    <>
      <header className="border-b border-line pb-7">
        <p className="rule-label">Question review</p>
        <h1 className="mt-2.5 text-title font-semibold text-ink">
          {queue.data ? `${queue.data.remaining} drafted questions waiting` : "Drafted questions"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          A question counts for scoring only after a person has read it. Check that the answer key is
          right &mdash; nothing else has verified it.
        </p>
      </header>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Track">
        <button
          className={`rounded-full border px-3 py-1 text-xs ${track === "" ? "border-brand text-ink" : "border-line text-ink-soft"}`}
          onClick={() => setTrack("")}
        >
          All · {progress.data?.totals.pending ?? "…"} pending
        </button>
        {tracks.map(([name, row]) => (
          <button
            key={name}
            className={`rounded-full border px-3 py-1 text-xs capitalize ${track === name ? "border-brand text-ink" : "border-line text-ink-soft"}`}
            onClick={() => setTrack(name)}
          >
            {name.replace(/_/g, " ")} · {row.approved} approved · {row.pending} pending
          </button>
        ))}
      </div>

      {queue.isError && (
        <p role="alert" className="mt-8 text-sm text-ink">
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
          <p className="text-xs text-ink-faint capitalize">
            {item.track.replace(/_/g, " ")} · {item.concepts.map((c) => c.replace(/^concept:/, "").replace(/_/g, " ")).join(", ")} · {item.provenance}
          </p>

          <label className="block">
            <span className="rule-label">Question</span>
            <textarea
              className="mt-1 w-full rounded border border-line bg-transparent p-2 text-sm text-ink"
              rows={3}
              value={stem}
              onChange={(e) => setStem(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="rule-label">Reference answer</span>
            <textarea
              className="mt-1 w-full rounded border border-line bg-transparent p-2 text-sm text-ink"
              rows={5}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </label>

          <fieldset>
            <legend className="rule-label">Key points the answer should reach</legend>
            <ul className="mt-1 space-y-2">
              {points.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <input
                    aria-label={`Key point ${i + 1}`}
                    className="flex-1 rounded border border-line bg-transparent p-2 text-sm text-ink"
                    value={p}
                    onChange={(e) => setPoints(points.map((x, j) => (j === i ? e.target.value : x)))}
                  />
                  <button
                    type="button"
                    className="text-xs text-ink-faint"
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

          <label className="block">
            <span className="rule-label">Difficulty</span>
            <select
              className="mt-1 rounded border border-line bg-transparent p-2 text-sm text-ink"
              value={band}
              onChange={(e) => setBand(e.target.value)}
            >
              {BANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="rule-label">Automatic checks</p>
            <ul className="mt-1 space-y-1 text-sm">
              {item.checks.map((c) => (
                <li key={c.name} className="text-ink">
                  <span aria-hidden>{c.passed ? "✓" : "✗"}</span>{" "}
                  <span className="font-medium">{c.name.replace(/_/g, " ")}</span>
                  <span className="text-ink-faint">
                    {" "}
                    — {c.passed ? "passed" : "FAILED"}
                    {c.detail ? ` · ${c.detail}` : ""}
                  </span>
                </li>
              ))}
              <li className="text-ink-faint">
                <span aria-hidden>—</span> <span className="font-medium">reference answer</span> — not
                machine-checked; yours to verify
              </li>
            </ul>
          </div>

          <label className="block">
            <span className="rule-label">Reason (required to reject)</span>
            <input
              className="mt-1 w-full rounded border border-line bg-transparent p-2 text-sm text-ink"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-ink">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button disabled={busy} className="h-9 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50" onClick={() => decide("approve")}>
              Approve for scoring
            </button>
            <button disabled={busy} className="h-9 rounded-lg border border-line px-4 text-sm font-medium text-ink hover:bg-surface-2 disabled:opacity-50" onClick={() => decide("edit")}>
              Save edits, keep in queue
            </button>
            <button
              disabled={busy || !reason.trim()}
              className="h-9 rounded-lg border border-line px-4 text-sm font-medium text-ink hover:bg-surface-2 disabled:opacity-50"
              onClick={() => decide("reject")}
            >
              Reject
            </button>
          </div>
        </section>
      )}
    </>
  );
}
