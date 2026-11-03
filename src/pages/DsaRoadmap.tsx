/**
 * `/roadmap` — the DSA roadmap, inside the shell.
 *
 * The whole of DSA as a route map: topics on routes, every concept inside each, what is covered and where the
 * student is, aligned to the Amrita B.Tech CSE and CSE (AI) syllabi. Learning, not interviewing: the map, its rules
 * and the checkpoint logic live in `src/roadmap`; this page owns what the shell owns, which is where progress is kept
 * and where the checkpoint interview goes. Progress lives in this browser for now (there is no backend for it yet),
 * under one key.
 *
 * The checkpoint is a short M06 interview on one topic. Starting it opens that session; coming back here reads how it
 * ended and, if it went well, covers the topic and opens the next. "Practise" goes to the coding screen.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ErrorNote } from "@ai/core";

import { EMPTY_PROGRESS, INTERVIEW_TO_COVER, Roadmap, pending, settle, startCheckpoint, type ProgrammeId, type Progress } from "../roadmap";

const PROGRESS_KEY = "ai.dsaProgress";
const PROGRAMME_KEY = "ai.programme";

function load(): Progress {
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "null") as Progress | null;
    return saved && saved.concepts && saved.interview ? saved : EMPTY_PROGRESS;
  } catch {
    return EMPTY_PROGRESS;
  }
}

function loadProgramme(): ProgrammeId {
  try {
    return localStorage.getItem(PROGRAMME_KEY) === "aie" ? "aie" : "cse";
  } catch {
    return "cse";
  }
}

type Notice =
  | { kind: "running"; topic: string; sessionId: string }
  | { kind: "result"; topic: string; score?: number }
  | { kind: "error"; message: string };

export function DsaRoadmap() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<Progress>(load);
  const [programme, setProgramme] = useState<ProgrammeId>(loadProgramme);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      /* a private window: the map still works for this visit */
    }
  }, [progress]);

  /** Reads how a started checkpoint ended: on arrival, and whenever the student comes back to this tab. */
  const check = useCallback(async () => {
    const p = pending();
    if (!p) return;
    const found = await settle(progress);
    if (found === "running") {
      setNotice({ kind: "running", topic: p.stopId, sessionId: p.sessionId });
    } else if (found) {
      setProgress(found.progress);
      setNotice({ kind: "result", topic: found.stop.name, score: found.score });
    }
  }, [progress]);

  useEffect(() => {
    void check();
    const onVisible = () => document.visibilityState === "visible" && void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // Once on arrival and on return to the tab; `check` rebuilds with every progress change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickProgramme = (p: ProgrammeId) => {
    setProgramme(p);
    try {
      localStorage.setItem(PROGRAMME_KEY, p);
    } catch {
      /* as above */
    }
  };

  const interview = async (stop: Parameters<typeof startCheckpoint>[0]) => {
    if (starting) return;
    setStarting(true);
    setNotice(null);
    try {
      navigate(`/mock/${await startCheckpoint(stop)}/plan`);
    } catch (e) {
      setNotice({ kind: "error", message: (e as Error).message || "The interview could not start." });
    } finally {
      setStarting(false);
    }
  };

  return (
    <>
      {notice?.kind === "error" && <ErrorNote message="The checkpoint could not start." detail={notice.message} onRetry={() => setNotice(null)} />}
      {notice?.kind === "running" && (
        <p className="mb-4 rounded-xl border border-brand-line bg-brand-soft px-4 py-3 text-sm text-ink">
          A checkpoint interview is in progress.{" "}
          <Link className="font-medium text-brand" to={`/mock/${notice.sessionId}`}>
            Go back to it
          </Link>
          . When it ends, the result lands here.
        </p>
      )}
      {notice?.kind === "result" && (
        <p className="mb-4 rounded-xl border border-line bg-surface-sunken px-4 py-3 text-sm text-ink">
          {notice.score === undefined
            ? `Your ${notice.topic} checkpoint ended before any answer was judged, so nothing changed. Have another go when you are ready.`
            : notice.score >= INTERVIEW_TO_COVER
              ? `Checkpoint on ${notice.topic}: ${Math.round(notice.score * 100)}%. A strong result, so once its core concepts are done the next topic opens.`
              : `Checkpoint on ${notice.topic}: ${Math.round(notice.score * 100)}%. Not quite there yet. Revisit the concepts you missed and try again.`}
        </p>
      )}
      <Roadmap
        progress={progress}
        onChange={(update) => setProgress(update)}
        programme={programme}
        onProgramme={pickProgramme}
        onPractise={() => navigate("/code")}
        onInterview={(stop) => void interview(stop)}
      />
    </>
  );
}
