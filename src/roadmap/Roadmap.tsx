/**
 * The DSA roadmap: routes of topics, every concept inside each topic, what is covered and where the student is.
 *
 * Learning, not interviewing. A topic is worked through concept by concept; once enough are done a short
 * checkpoint interview on that one topic opens, and only a strong result covers it and opens the next. The host owns
 * the progress and decides what "practise" and "checkpoint interview" start; without `onChange` it is read-only.
 */
import { useMemo, useRef, useState } from "react";

import { Icon } from "@ai/core";

import "./roadmap.css";

import type { Level } from "./concepts";
import {
  DONE_TO_INTERVIEW,
  INTERVIEW_TO_COVER,
  PROGRAMMES,
  ROUTES,
  STOPS,
  conceptKey,
  countsOf,
  cycleConcept,
  hereOf,
  interviewOf,
  statesOf,
  stopById,
  waitingOn,
  type ProgrammeId,
  type Progress,
  type Stop,
  type StopState,
} from "./rules";
import { DETAIL } from "./stopDetail";
import { SYLLABUS } from "./syllabus";

export interface RoadmapProps {
  progress: Progress;
  /** Asks the host to update its progress. An updater, not a value, so quick successive clicks each build on the latest. */
  onChange?: (update: (current: Progress) => Progress) => void;
  /** Which Amrita programme the syllabus lines are read from. */
  programme: ProgrammeId;
  onProgramme?: (p: ProgrammeId) => void;
  /** Start the practice set for a topic. */
  onPractise?: (stop: Stop) => void;
  /** Start the checkpoint interview (a focused M06 session) for a topic. */
  onInterview?: (stop: Stop) => void;
}

const ROUTE_COLOURS = ["#1d9e75", "#378add", "#ba7517", "#0f6e56", "#7f77dd", "#d85a30"];

const STATE_LABEL: Record<StopState, string> = {
  covered: "Covered",
  current: "In progress",
  ready: "Ready to start",
  locked: "Locked",
};

const LEVELS: { id: Level | ""; label: string }[] = [
  { id: "", label: "All" },
  { id: "basic", label: "Basic" },
  { id: "core", label: "Core" },
  { id: "advanced", label: "Advanced" },
];

type Tab = "concepts" | "interview" | "syllabus";

function Tile({ tone, icon, value, label }: { tone: string; icon: "checkCircle" | "clock" | "layers" | "listChecks" | "target"; value: number | string; label: string }) {
  return (
    <div className={`rm-tile ${tone}`}>
      <span className="rm-tico">
        <Icon name={icon} size={20} />
      </span>
      <span>
        <b>{value}</b>
        <small>{label}</small>
      </span>
    </div>
  );
}

export function Roadmap({ progress, onChange, programme, onProgramme, onPractise, onInterview }: RoadmapProps) {
  const states = useMemo(() => statesOf(progress), [progress]);
  const here = hereOf(states);
  const [picked, setPicked] = useState<string | null>(null);
  const [route, setRoute] = useState("");
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const [tab, setTab] = useState<Tab>("concepts");
  const [level, setLevel] = useState<Level | "">("");
  const [show, setShow] = useState<"all" | "done" | "todo">("all");
  const nodes = useRef<Record<string, HTMLButtonElement | null>>({});
  const q = query.trim().toLowerCase();

  const stop = stopById(picked ?? here?.id ?? STOPS[0].id)!;
  const state = states[stop.id];
  const counts = countsOf(stop, progress);
  const iv = interviewOf(stop, progress);
  const detail = DETAIL[stop.id];
  const syllabus = detail?.syllabus[programme] ?? [];
  const taught = SYLLABUS[programme][stop.id];
  const inSyllabus = (id: string) => (DETAIL[id]?.syllabus[programme]?.length ?? 0) > 0;
  const rc = ROUTE_COLOURS[ROUTES.findIndex((r) => r.name === stop.route)] ?? ROUTE_COLOURS[0];
  const pct = counts.total ? Math.round((counts.done / counts.total) * 100) : 0;

  const totals = useMemo(() => {
    let done = 0;
    let all = 0;
    let covered = 0;
    let started = 0;
    for (const s of STOPS) {
      const c = countsOf(s, progress);
      done += c.done;
      all += c.total;
      if (states[s.id] === "covered") covered++;
      else if (states[s.id] === "current") started++;
    }
    return { done, all, covered, started, notStarted: STOPS.length - covered - started };
  }, [progress, states]);

  const matches = (s: Stop) =>
    !q || s.name.toLowerCase().includes(q) || s.groups.some((g) => g.concepts.some((c) => c.name.toLowerCase().includes(q)));
  const matching = q ? STOPS.filter(matches).length : STOPS.length;

  const goHere = () => {
    if (!here) return;
    setPicked(here.id);
    nodes.current[here.id]?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  };

  const overall = totals.all ? Math.round((totals.done / totals.all) * 100) : 0;
  const lanes = ROUTES.map((r, ri) => ({ route: r, ri, stops: STOPS.filter((s) => s.route === r.name) })).filter((l) => !route || l.route.name === route);

  const rows = stop.groups.flatMap((g, gi) =>
    g.concepts.map((c, ci) => ({ c, g: g.name, key: conceptKey(stop.id, gi, ci) })),
  );
  const shown = rows.filter(({ c, key }) => {
    const v = progress.concepts[key] ?? 0;
    if (level && c.level !== level) return false;
    return show === "all" || (show === "done" ? v === 2 : v !== 2);
  });
  const doneRows = rows.filter((r) => progress.concepts[r.key] === 2).length;

  return (
    <div className="rm">
      <header className="rm-head">
        <span className="rm-logo">
          <Icon name="gitBranch" size={26} />
        </span>
        <div className="rm-ht">
          <h2>DSA roadmap</h2>
          <p>A structured path to master data structures and algorithms, mapped to your syllabus.</p>
        </div>
        <div className="rm-hp">
          <div className="rm-hpl">
            <b>{overall}% completed</b>
            <small>
              {totals.done} / {totals.all} concepts
            </small>
          </div>
          <div className="rm-hbar" role="progressbar" aria-label="Concepts done" aria-valuemin={0} aria-valuemax={100} aria-valuenow={overall}>
            <div style={{ width: `${overall}%` }} />
          </div>
        </div>
      </header>

      <div className="rm-tiles">
        <Tile tone="g" icon="checkCircle" value={totals.covered} label="Topics covered" />
        <Tile tone="a" icon="clock" value={totals.started} label="In progress" />
        <Tile tone="n" icon="layers" value={totals.notStarted} label="Not started" />
        <Tile tone="n" icon="listChecks" value={STOPS.length} label="Total topics" />
        <Tile tone="g" icon="target" value={`${totals.done} / ${totals.all}`} label="Concepts done" />
      </div>

      <div className="rm-bar">
        {onProgramme && (
          <div className="rm-seg" role="group" aria-label="Programme">
            {PROGRAMMES.map((p) => (
              <button key={p.id} type="button" aria-pressed={p.id === programme} onClick={() => onProgramme(p.id)}>
                {p.short}
              </button>
            ))}
          </div>
        )}
        <label className="rm-sel">
          <select value={route} onChange={(e) => setRoute(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {ROUTES.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" size={14} />
        </label>
        <label className="rm-find">
          <Icon name="search" size={15} />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search topics or concepts" aria-label="Search topics" />
          {q && <small>{matching} match{matching === 1 ? "" : "es"}</small>}
        </label>
        <button type="button" className="rm-btn" onClick={goHere} disabled={!here}>
          <Icon name="target" size={15} /> Current position
        </button>
        <span className="rm-zoom" role="group" aria-label="Zoom">
          <button type="button" className="rm-btn sq" aria-label="Zoom out" disabled={zoom <= 0.8} onClick={() => setZoom((z) => Math.max(0.8, +(z - 0.1).toFixed(1)))}>
            <Icon name="minus" size={15} />
          </button>
          <button type="button" className="rm-btn sq" aria-label="Zoom in" disabled={zoom >= 1.3} onClick={() => setZoom((z) => Math.min(1.3, +(z + 0.1).toFixed(1)))}>
            <Icon name="plus" size={15} />
          </button>
        </span>
      </div>

      <div className="rm-body">
        <div className="rm-map" role="group" aria-label="DSA route map" style={{ zoom }}>
          {lanes.map(({ route: r, ri, stops }) => (
            <div key={r.id} className="rm-row" style={{ ["--rc" as string]: ROUTE_COLOURS[ri] }}>
              <div className="rm-rname">{r.name}</div>
              <div className="rm-track">
                <div className="rm-line">
                  {stops.map((s, si) => {
                    const st = states[s.id];
                    const c = countsOf(s, progress);
                    const behind = si > 0 && states[stops[si - 1].id] === "covered";
                    return (
                      <button
                        key={s.id}
                        ref={(el) => {
                          nodes.current[s.id] = el;
                        }}
                        type="button"
                        className={`rm-stop s-${st}${behind ? " on" : ""}${si === 0 ? " first" : ""}${s.id === stop.id ? " sel" : ""}${matches(s) ? "" : " dim"}`}
                        aria-label={`${s.name}, ${STATE_LABEL[st]}, ${c.done} of ${c.total} concepts done`}
                        aria-pressed={s.id === stop.id}
                        onClick={() => {
                          setPicked(s.id);
                          setTab("concepts");
                        }}
                      >
                        {inSyllabus(s.id) && <span className="rm-syl" title="In your syllabus" />}
                        <span className="rm-ring" style={{ ["--p" as string]: c.total ? (c.done / c.total) * 100 : 0 }}>
                          {st === "covered" ? <Icon name="check" size={15} strokeWidth={2.5} /> : null}
                        </span>
                        <span className="rm-lbl">{s.name}</span>
                        <span className="rm-cnt">
                          {c.done}/{c.total}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
          <div className="rm-legend" aria-hidden>
            <span><i className="k cov" /> covered</span>
            <span><i className="k cur" /> in progress</span>
            <span><i className="k rdy" /> ready</span>
            <span><i className="k lck" /> locked</span>
            <span><i className="k syl" /> in your syllabus</span>
          </div>
        </div>

        <aside className="rm-side" style={{ ["--rc" as string]: rc }} aria-live="polite">
          <span className="rm-chip">{stop.route}</span>
          <h3>{stop.name}</h3>
          <p className="rm-sub">
            {STATE_LABEL[state]}
            {" · "}
            {inSyllabus(stop.id) ? (taught ? `In your syllabus, semester ${taught.sem}` : "In your syllabus") : "Interview prep"}
          </p>
          {state === "locked" && <p className="rm-note">Opens after {waitingOn(stop, states).join(" and ")} is covered.</p>}

          <div className="rm-prog">
            <div className="rm-cring" style={{ ["--p" as string]: pct }}>
              <b>{pct}%</b>
            </div>
            <div>
              <b>
                {counts.done} / {counts.total}
              </b>
              <small>concepts done</small>
            </div>
          </div>

          {onPractise && (
            <button type="button" className="rm-go" disabled={state === "locked"} onClick={() => onPractise(stop)}>
              {counts.done ? "Continue learning" : "Start learning"} <Icon name="arrowRight" size={16} />
            </button>
          )}

          <div className="rm-tabs" role="tablist">
            {(["concepts", "interview", "syllabus"] as Tab[]).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
                {t === "concepts" ? `Concepts (${rows.length})` : t === "interview" ? "Checkpoint" : "Syllabus"}
              </button>
            ))}
          </div>

          {tab === "concepts" && (
            <>
              <div className="rm-fl">
                {(["all", "done", "todo"] as const).map((f) => (
                  <button key={f} type="button" aria-pressed={show === f} onClick={() => setShow(f)}>
                    {f === "all" ? `All (${rows.length})` : f === "done" ? `Done (${doneRows})` : `Todo (${rows.length - doneRows})`}
                  </button>
                ))}
                <select value={level} onChange={(e) => setLevel(e.target.value as Level | "")} aria-label="Depth">
                  {LEVELS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.id ? l.label : "Any depth"}
                    </option>
                  ))}
                </select>
              </div>
              <ul className="rm-list">
                {shown.map(({ c, g, key }) => {
                  const v = progress.concepts[key] ?? 0;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        disabled={!onChange}
                        className={v === 2 ? "d" : v === 1 ? "l" : ""}
                        aria-label={`${c.name}, ${c.level}, ${v === 2 ? "done" : v === 1 ? "learning" : "to do"}`}
                        onClick={() => onChange?.((current) => cycleConcept(current, key))}
                      >
                        <i className="box">{v === 2 ? <Icon name="check" size={12} strokeWidth={3} /> : v === 1 ? <b /> : null}</i>
                        <span>
                          {c.name}
                          <small>
                            {g} · {c.level}
                          </small>
                        </span>
                      </button>
                    </li>
                  );
                })}
                {!shown.length && <li className="empty">Nothing here.</li>}
              </ul>
            </>
          )}

          {tab === "interview" && (
            <div className="rm-cp">
              <p>
                A short interview on <b>{stop.name}</b> opens after {DONE_TO_INTERVIEW} concepts are done. Score {Math.round(INTERVIEW_TO_COVER * 100)}% or more, with the core concepts done, and the next topic opens.
              </p>
              {iv.score !== undefined && (
                <p className={iv.weak ? "weak" : "good"}>
                  Last score: {Math.round(iv.score * 100)}%. {iv.weak ? "Not quite there yet. Have another go when you are ready." : "Strong result."}
                </p>
              )}
              {detail && (
                <>
                  <h4>It starts with</h4>
                  <ul>
                    {detail.viva.map((v) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                </>
              )}
              {onInterview && (
                <button type="button" className="rm-go alt" disabled={!iv.open || state === "covered"} onClick={() => onInterview(stop)}>
                  {state === "covered" ? "Covered" : iv.weak ? "Try the checkpoint again" : "Start the checkpoint interview"}
                </button>
              )}
              {onInterview && !iv.open && <p className="rm-note">{DONE_TO_INTERVIEW - counts.done} more concept{DONE_TO_INTERVIEW - counts.done === 1 ? "" : "s"} to open it.</p>}
            </div>
          )}

          {tab === "syllabus" && (
            <div className="rm-cp">
              {syllabus.length ? (
                <ul>
                  {syllabus.map((t) => (
                    <li key={t.from}>
                      <b>{t.from}</b>: {t.items.join("; ")}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rm-note">Not part of your syllabus; it is here for interview prep.</p>
              )}
              {detail && (
                <>
                  <h4>Practice set</h4>
                  <ol>
                    {detail.practice.map((p) => (
                      <li key={p.title}>
                        {p.title} <span className="lv">{p.level}</span>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
