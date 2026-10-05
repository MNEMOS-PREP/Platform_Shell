/**
 * The drives a student is sitting: a company from M15's list (or typed, when
 * M15 doesn't know it yet), the drive variant when M15 has one — TCS Digital
 * and TCS Ninja are different interviews — and the date. Used by the welcome
 * step and by Settings, so both save the same shape to M04's profile.
 */
import { useRef, useState } from "react";

import { Icon } from "@ai/core";
import type { ProfileDrive } from "@ai/m04";
import { useCompanySearch, useDriveVariants, type Company } from "@ai/m15";

import { countdownLabel, daysUntil, downloadIcs, driveIcs } from "../lib/goals";

const input =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-brand";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DrivePicker({
  drives,
  onChange,
}: {
  drives: ProfileDrive[];
  onChange: (drives: ProfileDrive[]) => void;
}) {
  const [q, setQ] = useState("");
  const [company, setCompany] = useState<Company | null>(null);
  const [typed, setTyped] = useState<string | null>(null);
  const [variant, setVariant] = useState("");
  const [date, setDate] = useState("");
  const search = useCompanySearch(q);
  const variants = useDriveVariants(company?.id);
  const dateRef = useRef<HTMLInputElement>(null);

  const companyName = company?.canonical_name ?? typed;
  // Closed once a company is chosen either way — from M15's list or typed. It
  // used to close only for a listed one, so "Use “Amazon”" took the name but
  // left the list open over the date, and looked like it did nothing.
  const searching = Boolean(q.trim()) && !companyName;
  const results = searching ? (search.data ?? []).slice(0, 6) : [];
  const open = searching && (results.length > 0 || !search.isLoading);

  const pick = (c: Company | null) => {
    if (c) setCompany(c);
    else setTyped(q.trim());
    // The date is the next thing to fill; wait a frame for the list to close.
    requestAnimationFrame(() => dateRef.current?.focus());
  };
  const chosen = (variants.data ?? []).find((v) => v.id === variant);
  const label = companyName ? (chosen ? `${companyName} · ${chosen.name}` : companyName) : "";

  const reset = () => {
    setQ("");
    setCompany(null);
    setTyped(null);
    setVariant("");
    setDate("");
  };

  const add = () => {
    if (!label || !date) return;
    onChange(
      [...drives, { label, date, company_id: company?.id ?? null, drive_id: chosen?.id ?? null }].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    );
    reset();
  };

  return (
    <div className="space-y-4">
      {drives.length > 0 && (
        <ul className="space-y-2">
          {drives.map((drive, i) => {
            const days = daysUntil(drive.date);
            return (
              <li key={`${drive.label}-${drive.date}`} className="panel flex items-center gap-3 p-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                  <Icon name="building" size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{drive.label}</span>
                  <span className="block text-xs text-ink-faint">
                    {new Date(`${drive.date}T00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                    {" · "}
                    {days >= 0 ? countdownLabel(days) : "past"}
                  </span>
                </span>
                <button
                  type="button"
                  title="Add to calendar"
                  aria-label={`Add ${drive.label} to calendar`}
                  onClick={() => downloadIcs(`${drive.label.replace(/\W+/g, "-")}.ics`, driveIcs(drive, `${window.location.origin}/mock`))}
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-surface-sunken hover:text-ink"
                >
                  <Icon name="calendar" size={15} />
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${drive.label}`}
                  onClick={() => onChange(drives.filter((_, j) => j !== i))}
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-surface-sunken hover:text-contested"
                >
                  <Icon name="close" size={15} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-xl border border-dashed border-line p-4">
        <div className="relative">
          {companyName ? (
            // Not a <label>: a label hands every click inside it to its first
            // button, so a click on the name itself cleared the choice.
            <div className="text-xs font-medium text-ink-soft">
              Company
              <span className="mt-1.5 flex h-10 items-center gap-2 rounded-lg border border-brand-line bg-brand-soft px-3 text-sm text-ink">
                <span className="flex-1 truncate">{companyName}</span>
                <button type="button" onClick={reset} aria-label="Choose another company" className="text-ink-soft hover:text-ink">
                  <Icon name="close" size={14} />
                </button>
              </span>
            </div>
          ) : (
            <label className="block text-xs font-medium text-ink-soft">
              Company
              <input
                className={`${input} mt-1.5`}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && q.trim()) {
                    e.preventDefault();
                    // Wait for M15's answer, or "TCS" would be taken as typed
                    // text and lose its company page and drive variants.
                    if (search.isLoading && !results.length) return;
                    pick(results[0] ?? null);
                  } else if (e.key === "Escape") {
                    setQ("");
                  }
                }}
                placeholder="Search companies — TCS, Infosys, Zoho…"
                autoComplete="off"
              />
            </label>
          )}
          {open ? (
            <ul className="panel absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto p-1 shadow-raised">
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => pick(c)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-surface-sunken"
                  >
                    {c.canonical_name}
                    {c.sector && <span className="text-xs text-ink-faint">{c.sector}</span>}
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => pick(null)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-sunken"
                >
                  <Icon name="plus" size={14} /> Use “{q.trim()}”
                </button>
              </li>
            </ul>
          ) : null}
        </div>

        {company && (variants.data ?? []).length > 0 && (
          <label className="mt-3 block text-xs font-medium text-ink-soft">
            Which drive
            <select className={`${input} mt-1.5`} value={variant} onChange={(e) => setVariant(e.target.value)}>
              <option value="">Not sure yet</option>
              {(variants.data ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block text-xs font-medium text-ink-soft">
            Date
            <input
              ref={dateRef}
              type="date"
              min={today()}
              className={`${input} mt-1.5 w-44`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={add}
            disabled={!label || !date}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line px-3.5 text-sm font-medium text-ink hover:border-brand-line disabled:opacity-40"
          >
            <Icon name="plus" size={15} /> Add drive
          </button>
        </div>
      </div>
    </div>
  );
}
