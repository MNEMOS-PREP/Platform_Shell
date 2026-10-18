/**
 * `/gd` — M14's group discussion, inside the shell (wrap-up Day 4).
 *
 * GD Arena is a Next.js app with its own backend, so unlike the Vite modules
 * it cannot be mounted from source. It is framed instead, on its reserved port
 * (PORTS.txt: 5214 web, 8114 API), and told who the student is: its
 * `/platform` page trades the shell's development identity for GD's own
 * tokens, the same `X-Candidate-Id` every backend here already honours under
 * `AI_AUTH_MODE=dev`. Inside the frame GD drops its own brand and sign-out.
 *
 * Its results reach the skill graph from GD's backend (M04 observations,
 * `gd_contribution`), so a practised discussion shows on /skills as evidence.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { EmptyState, SkeletonRows, candidateIdOf, useSession } from "@ai/core";
import { useProfile } from "@ai/m04";

/** GD's web app. Read from env, like every other address here. */
const GD_WEB = (import.meta.env.VITE_GD_WEB_URL as string | undefined) ?? "http://localhost:5214";

export function GroupDiscussion() {
  const session = useSession();
  const candidate = candidateIdOf(session);
  const profile = useProfile(candidate);
  // Any answer means it is running; `degraded` is GD's word for "no Redis",
  // which its no-Docker mode runs without.
  const health = useQuery({
    queryKey: ["shell", "m14", "health"],
    queryFn: async () => {
      const response = await fetch("/sys/m14/health");
      if (!response.ok) throw new Error(`${response.status}`);
      return response.json() as Promise<{ status: string }>;
    },
    retry: false,
    staleTime: 10_000,
  });

  if (!candidate) return null; // staff are routed to the student-only notice
  if (health.isLoading || profile.isLoading) {
    return <SkeletonRows label="Opening group discussion" rows={2} className="mx-auto mt-10 max-w-xl" />;
  }
  if (health.isError) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <EmptyState
          icon="users"
          title="Group discussion isn't open right now"
          action={
            <Link
              to="/mock"
              className="inline-flex h-9 items-center rounded-lg border border-line bg-surface px-4 text-sm text-ink hover:border-line-strong"
            >
              Practise an interview meanwhile
            </Link>
          }
        >
          <p>It runs alongside the platform and has not started on this machine. The rest of the platform is open.</p>
        </EmptyState>
      </div>
    );
  }

  const params = new URLSearchParams({
    candidate,
    name: profile.data?.display_name || session?.name || "",
  });
  return (
    <iframe
      key={candidate}
      title="Group discussion"
      src={`${GD_WEB}/platform?${params}`}
      // The panel listens and speaks: the frame needs the microphone and
      // autoplay, which a cross-origin frame only gets when asked for.
      allow="microphone; autoplay; clipboard-write"
      className="-mt-2 block h-[calc(100dvh-8.5rem)] min-h-[36rem] w-full rounded-xl border border-line bg-surface md:-mt-4"
    />
  );
}
