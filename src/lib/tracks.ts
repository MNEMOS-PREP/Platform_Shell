/**
 * What M05 calls each of its tracks ("Data structures and algorithms"), by
 * round type ("dsa_verbal"). The review screens showed the ids made into words
 * ("Dsa verbal", "Cn verbal"); the names are M05's, from `/v1/bank/tracks`,
 * the same ones a student picks a track by (2026-10-14).
 */
import { useQuery } from "@tanstack/react-query";

import { api } from "@ai/core";

interface TracksResponse {
  tracks: { round_type: string; title: string }[];
}

export function useTrackTitles(): (roundType: string) => string {
  const tracks = useQuery({
    queryKey: ["m05", "bank", "tracks"],
    queryFn: () => api.get<TracksResponse>("/v1/bank/tracks"),
    staleTime: Infinity,
    retry: 0,
  });
  const titles = new Map((tracks.data?.tracks ?? []).map((t) => [t.round_type, t.title]));
  return (roundType) => {
    const known = titles.get(roundType);
    if (known) return known;
    // Before M05 answers, or a round type it no longer offers.
    const text = roundType.replace(/_/g, " ");
    return text.charAt(0).toUpperCase() + text.slice(1);
  };
}
