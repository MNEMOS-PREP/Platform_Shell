/**
 * An address no screen answers.
 *
 * It used to redirect to Today without a word, so a mistyped link or a stale
 * bookmark looked like the platform ignoring the click (2026-10-16). Now it
 * says so, shows the address it could not open, and offers the two ways on.
 */
import { Link, useLocation } from "react-router-dom";
import { Icon } from "@ai/core";

import { MOD, openPalette } from "../ui/Frame";

export function NotFound() {
  const { pathname } = useLocation();
  return (
    <div className="mx-auto max-w-xl py-20 text-center">
      <span
        aria-hidden
        className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-line bg-surface text-ink-faint shadow-card"
      >
        <Icon name="compass" size={22} />
      </span>
      <h1 className="mt-6 text-title font-semibold text-ink">There is no page at this address.</h1>
      <p className="mt-3 text-ink-soft">
        The link may be mistyped, or the page has moved. Search for what you were after, or
        start again from Today.
      </p>
      <p className="provenance mt-4 break-all">{pathname}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link
          to="/"
          className="bg-brand-gradient inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white shadow-glow"
        >
          Go to Today
          <Icon name="arrowRight" size={15} />
        </Link>
        <button
          type="button"
          onClick={openPalette}
          className="inline-flex h-10 items-center gap-2.5 rounded-lg border border-line bg-surface px-4 text-sm text-ink hover:border-line-strong"
        >
          <Icon name="search" size={15} />
          Search
          <span className="kbd">{MOD}K</span>
        </button>
      </div>
    </div>
  );
}
