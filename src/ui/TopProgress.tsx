/**
 * A two-pixel bar across the top while a screen waits (2026-10-16).
 *
 * Planning an interview, opening a company, reading a skill graph for the
 * first time: each took a second or more with nothing to say the click had
 * landed except whichever skeleton the page drew. The bar is the one cue that
 * is the same on every screen of every module, the way a browser's own
 * loading bar is.
 *
 * It counts only what the student is actually waiting for: a query with no
 * data yet (a first load), and a save in flight. Background refetches — the
 * skill graph's five-second poll, the room's — already have data and never
 * show it. Shown after 150 ms, so a fast answer never flickers it.
 */
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function TopProgress() {
  const loading = useIsFetching({ predicate: (query) => query.state.status === "pending" });
  const saving = useIsMutating();
  const busy = loading + saving > 0;
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!busy) {
      setShown(false);
      return;
    }
    const timer = setTimeout(() => setShown(true), 150);
    return () => clearTimeout(timer);
  }, [busy]);

  return <div aria-hidden className={`top-progress${shown ? " is-on" : ""}`} />;
}
