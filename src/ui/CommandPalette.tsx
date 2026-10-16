/**
 * ⌘K — go anywhere, do anything, from the keyboard.
 *
 * The one interaction every product students think of as premium shares
 * (Linear, Raycast, Vercel, GitHub): a single box that finds a screen, an
 * action, a company or a concept in the skill graph. It searches real data —
 * M15's companies and M04's ontology — through the same `api` every module
 * uses, so it is a door into the platform rather than a menu about it.
 *
 * Keyboard: ⌘K / Ctrl+K or "/" opens it, ↑ ↓ move, ↵ opens, Esc closes.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { api, Icon, type IconName } from "@ai/core";

export interface PaletteItem {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: IconName;
  /** Extra words that should find it ("cv" finds Resume). */
  keywords?: string;
  run: () => void;
}

interface CompanyHit {
  id: string;
  canonical_name: string;
  sector: string;
  report_count?: number;
}

interface ConceptList {
  concepts: { id: string; name: string; domain: string }[];
}

function score(item: PaletteItem, query: string): number {
  if (!query) return 1;
  const label = item.label.toLowerCase();
  const hay = `${label} ${item.keywords ?? ""} ${item.hint ?? ""}`.toLowerCase();
  if (label.startsWith(query)) return 3;
  if (label.includes(query)) return 2;
  return query.split(/\s+/).every((word) => hay.includes(word)) ? 1 : 0;
}

export function CommandPalette({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: PaletteItem[];
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const q = query.trim().toLowerCase();

  // Companies: asked of M15 as the student types (it owns the aliases).
  const companies = useQuery({
    queryKey: ["palette", "companies", q],
    enabled: open && q.length >= 2,
    queryFn: () => api.get<CompanyHit[]>(`/v1/companies?q=${encodeURIComponent(q)}`),
    staleTime: 60_000,
  });
  // Concepts: M04's ontology, fetched once and filtered here.
  const concepts = useQuery({
    queryKey: ["palette", "concepts"],
    enabled: open,
    queryFn: () => api.get<ConceptList>("/v1/concepts"),
    staleTime: 10 * 60_000,
  });

  const results = useMemo(() => {
    const local = items
      .map((item) => ({ item, s: score(item, q) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.item);
    const remote: PaletteItem[] = [];
    if (q.length >= 2) {
      for (const c of (companies.data ?? []).slice(0, 5)) {
        remote.push({
          id: `company:${c.id}`,
          group: "Companies",
          label: c.canonical_name,
          hint: c.report_count ? `${c.report_count} reports` : c.sector,
          icon: "building",
          run: () => navigate(`/companies/${c.id}`),
        });
      }
      for (const c of (concepts.data?.concepts ?? [])
        .filter((c) => c.name.toLowerCase().includes(q))
        .slice(0, 5)) {
        remote.push({
          id: `concept:${c.id}`,
          group: "Skill graph",
          label: c.name,
          hint: c.domain.replace(/_/g, " "),
          icon: "graph",
          run: () => navigate(`/skills?concept=${encodeURIComponent(c.id)}`),
        });
      }
    }
    return [...local, ...remote];
  }, [items, q, companies.data, concepts.data, navigate]);

  // Fresh every time it opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      requestAnimationFrame(() => input.current?.focus());
    }
  }, [open]);
  useEffect(() => setActive(0), [q]);

  // Keep the active row in view.
  useEffect(() => {
    list.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const choose = (item: PaletteItem | undefined) => {
    if (!item) return;
    onClose();
    item.run();
  };

  const groups: { name: string; rows: { item: PaletteItem; index: number }[] }[] = [];
  results.forEach((item, index) => {
    const group = groups.find((g) => g.name === item.group);
    if (group) group.rows.push({ item, index });
    else groups.push({ name: item.group, rows: [{ item, index }] });
  });

  return (
    <div
      className="scrim-in fixed inset-0 z-50 flex items-start justify-center bg-black/45 px-4 pt-[12vh] backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search the platform"
        className="dialog-in w-full max-w-[40rem] overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-raised"
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (event.key === "Enter") {
            event.preventDefault();
            choose(results[active]);
          } else if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        }}
      >
        <div className="flex h-14 items-center gap-3 border-b border-line px-4">
          <Icon name="search" size={18} className="shrink-0 text-ink-faint" />
          <input
            ref={input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search screens, actions, companies, skills…"
            aria-label="Search"
            className="h-full flex-1 bg-transparent text-[0.9375rem] text-ink outline-none placeholder:text-ink-faint"
            style={{ boxShadow: "none" }}
          />
          <span className="kbd">esc</span>
        </div>

        <div ref={list} className="max-h-[min(60vh,28rem)] overflow-y-auto p-2" role="listbox">
          {results.length === 0 && (
            <p className="px-3 py-10 text-center text-sm text-ink-faint">
              {companies.isFetching ? "Searching…" : `Nothing matches “${query}”.`}
            </p>
          )}
          {groups.map((group) => (
            <div key={group.name} className="pb-1">
              <p className="px-3 pt-2 pb-1.5 text-[0.6875rem] font-medium tracking-wide text-ink-faint uppercase">
                {group.name}
              </p>
              {group.rows.map(({ item, index }) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  data-index={index}
                  onMouseMove={() => setActive(index)}
                  onClick={() => choose(item)}
                  className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm ${
                    index === active ? "bg-brand-soft text-ink" : "text-ink-soft"
                  }`}
                >
                  <Icon
                    name={item.icon}
                    size={16}
                    className={index === active ? "text-brand" : "text-ink-faint"}
                  />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.hint && <span className="truncate text-xs text-ink-faint">{item.hint}</span>}
                  {index === active && <Icon name="cornerDownRight" size={14} className="text-brand" />}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-xs text-ink-faint">
          <span className="flex items-center gap-1.5">
            <span className="kbd">↑</span>
            <span className="kbd">↓</span> move
          </span>
          <span className="flex items-center gap-1.5">
            <span className="kbd">↵</span> open
          </span>
          <span className="ml-auto">Companies from M15 · skills from M04</span>
        </div>
      </div>
    </div>
  );
}
