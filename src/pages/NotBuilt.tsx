/**
 * A module that is specified but has no UI.
 *
 * Core ships `ModulePlaceholder` for this, and it renders its own `Layout` —
 * correct when a module is running standalone, wrong here, where the shell
 * already supplies the chrome and nesting it would draw two headers. Same
 * message, no second frame. It speaks to the student (2026-10-16): it used to
 * point them at `plan_in_depth/M07_*.md`.
 */
import { Link } from "react-router-dom";
import { EmptyState } from "@ai/core";

export function NotBuilt({ name, blurb }: { name: string; blurb: string }) {
  return (
    <div className="mx-auto max-w-3xl py-12">
      <EmptyState
        icon="layers"
        title={`${name} is on its way`}
        action={
          <Link
            to="/mock"
            className="inline-flex h-9 items-center rounded-lg border border-line bg-surface px-4 text-sm text-ink hover:border-line-strong"
          >
            Practise an interview meanwhile
          </Link>
        }
      >
        <p>{blurb} It is not open yet; the rest of the platform is.</p>
      </EmptyState>
    </div>
  );
}
