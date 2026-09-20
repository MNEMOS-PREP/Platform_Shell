/**
 * A module that is specified but has no UI.
 *
 * Core ships `ModulePlaceholder` for this, and it renders its own `Layout` —
 * correct when a module is running standalone, wrong here, where the shell
 * already supplies the chrome and nesting it would draw two headers. Same
 * message, no second frame.
 */
import { EmptyState } from "@ai/core";

export function NotBuilt({ id, name }: { id: string; name: string }) {
  return (
    <div className="mx-auto max-w-3xl py-12">
      <EmptyState icon="🧱" title={`${id} — ${name} is not built yet`}>
        <p className="text-sm text-ink-soft">
          Specified in{" "}
          <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-xs">
            plan_in_depth/{id}_*.md
          </code>{" "}
          with functional requirements, acceptance criteria and a test plan. An honest
          placeholder beats a broken screen.
        </p>
      </EmptyState>
    </div>
  );
}
