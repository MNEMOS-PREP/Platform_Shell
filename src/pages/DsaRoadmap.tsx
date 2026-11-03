/**
 * `/roadmap` — the DSA route map (M07), inside the shell.
 *
 * The whole of DSA as a route map: topics on routes, every concept inside each, what is covered and where the
 * student is, aligned to the Amrita B.Tech CSE and CSE (AI) syllabi. The map and its rules are M07's
 * (`Roadmap` in @ai/m07); this page owns what the shell owns: where progress is kept and where "Mini interview"
 * goes. Progress lives in this browser for now (there is no backend for it yet), under one key.
 *
 * "Mini interview" is M06's focused interview on the topic, reached the way M15's "Practise this now" reaches
 * it, through /practice, which resolves the topic to its concept. "Practise" is not offered: the coding practice
 * sets need questions M05 does not have yet, and a button that opened nothing would be a dead end.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { EMPTY_PROGRESS, Roadmap, type ProgrammeId, type Progress } from "../roadmap";

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

export function DsaRoadmap() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<Progress>(load);
  const [programme, setProgramme] = useState<ProgrammeId>(loadProgramme);

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      /* a private window: the map still works for this visit */
    }
  }, [progress]);
  const pickProgramme = (p: ProgrammeId) => {
    setProgramme(p);
    try {
      localStorage.setItem(PROGRAMME_KEY, p);
    } catch {
      /* as above */
    }
  };

  return (
    <>
      <Roadmap
        progress={progress}
        onChange={(update) => setProgress(update)}
        programme={programme}
        onProgramme={pickProgramme}
        onPractise={() => navigate("/code")}
        onInterview={(stop) => navigate(`/practice?topic=${encodeURIComponent(stop.name.toLowerCase())}`)}
      />
    </>
  );
}
