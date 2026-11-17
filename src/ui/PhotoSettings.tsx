/**
 * "Your picture" in Settings (2026-11-17).
 *
 * One picture, set here and used wherever the platform shows the student: the
 * top-right corner of every page, their tile in a mock interview when the
 * camera is off, and the resumes they tailor (where it can be left off any
 * one of them). Without one, everything shows what it showed before —
 * initials, the "You" circle — so not adding a picture is a choice, not a gap.
 *
 * The browser crops it square and shrinks it before it is sent (`squarePhoto`),
 * so what M04 stores is exactly what every screen draws.
 */
import { useRef, useState } from "react";

import { useProfile, useProfilePhoto, useRemovePhoto, useSetPhoto, squarePhoto } from "@ai/m04";

export function PhotoSettings({ candidate, initials }: { candidate: string; initials: string }) {
  const profile = useProfile(candidate);
  const digest = profile.data?.photo || null;
  const photo = useProfilePhoto(candidate, digest);
  const set = useSetPhoto(candidate);
  const remove = useRemovePhoto(candidate);
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const use = async (file: File | undefined) => {
    if (!file) return;
    setProblem(null);
    try {
      set.mutate(await squarePhoto(file), { onError: (error) => setProblem(error.message) });
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "That picture could not be used.");
    }
  };

  const shown = digest ? photo.data : null;
  const busy = set.isPending || remove.isPending;

  return (
    <div
      className={`flex flex-wrap items-center gap-5 rounded-xl border border-dashed p-4 transition-colors ${
        dragging ? "border-brand bg-brand-soft" : "border-line"
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void use(event.dataTransfer.files?.[0]);
      }}
    >
      {shown ? (
        <img src={shown} alt="Your picture" className="h-20 w-20 rounded-full object-cover ring-2 ring-line" />
      ) : (
        <span
          aria-hidden
          className="bg-brand-gradient grid h-20 w-20 place-items-center rounded-full text-xl font-semibold text-white"
        >
          {initials}
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Choose a picture"
            onChange={(event) => {
              void use(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="h-9 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {set.isPending ? "Saving…" : shown ? "Change picture" : "Add a picture"}
          </button>
          {digest && (
            <button
              type="button"
              disabled={busy}
              onClick={() => remove.mutate(undefined, { onError: (error) => setProblem(error.message) })}
              className="h-9 rounded-lg border border-line px-3.5 text-sm text-ink hover:border-line-strong disabled:opacity-50"
            >
              {remove.isPending ? "Removing…" : "Remove"}
            </button>
          )}
        </div>
        <p className="text-xs text-ink-soft">
          A clear, front-facing photo works best. It is cropped to a square — or drop one here.
        </p>
        {problem && (
          <p role="alert" className="text-xs text-contested">
            {problem}
          </p>
        )}
      </div>
    </div>
  );
}
