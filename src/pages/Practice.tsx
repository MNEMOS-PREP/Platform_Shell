/**
 * `/practice?company=…&topic=…` — M15's "Practise this now", inside the shell.
 *
 * M15 hands a student's biggest gap for a company to `/practice`, a route its
 * standalone app answers with a hand-off page and the shell never mounted, so
 * the student was dropped on Today without a word (found by the 2026-10-13
 * crawl). The platform's practice for one topic IS M06's focused interview, so
 * this resolves the topic to its concept with M04's resolver (the one four
 * modules already call) and goes there. A topic M04 cannot resolve still gets
 * an interview, never a dead end: the plan page says what it is.
 */
import { useQuery } from "@tanstack/react-query";
import { Navigate, useSearchParams } from "react-router-dom";

import { SkeletonRows, api } from "@ai/core";

export function Practice() {
  const [params] = useSearchParams();
  const topic = (params.get("topic") ?? "").trim();
  const company = params.get("company");
  const resolved = useQuery({
    queryKey: ["shell", "resolve", topic],
    enabled: Boolean(topic),
    queryFn: () =>
      api.post<{ resolved: Record<string, string | null> }>("/v1/concepts/resolve", { labels: [topic] }),
    staleTime: Infinity,
    retry: false,
  });

  if (topic && resolved.isLoading) {
    return <SkeletonRows label="Opening your practice" rows={2} className="mx-auto mt-10 max-w-xl" />;
  }
  const concept = topic ? resolved.data?.resolved[topic] : null;
  const next = new URLSearchParams();
  if (concept) {
    next.set("focus", concept);
    next.set("label", topic[0]!.toUpperCase() + topic.slice(1));
  }
  if (company) next.set("company", company);
  const query = next.toString();
  return <Navigate to={query ? `/mock?${query}` : "/mock"} replace />;
}
