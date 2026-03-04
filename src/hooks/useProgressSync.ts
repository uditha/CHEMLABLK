"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { fetchProgress } from "@/lib/progress";
import { useExperimentStore } from "@/store/experimentStore";
import type { ExperimentMode } from "@/types";

/**
 * Fetches progress from database and merges into store.
 * Run on dashboard/lab load for logged-in students.
 */
export function useProgressSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "student") return;

    fetchProgress()
      .then((records) => {
        if (records.length === 0) return;

        const state = useExperimentStore.getState();
        const dbModeCompletions: Record<string, ExperimentMode[]> = { ...state.modeCompletions };
        const dbCompleted = new Set(state.experimentsCompleted);

        for (const r of records) {
          const modes = (r.modeCompletions || []) as ExperimentMode[];
          if (modes.length > 0) {
            const existing = dbModeCompletions[r.slug] ?? [];
            const merged = Array.from(new Set([...existing, ...modes]));
            dbModeCompletions[r.slug] = merged;
            dbCompleted.add(r.slug);
          }
        }

        useExperimentStore.setState({
          modeCompletions: dbModeCompletions,
          experimentsCompleted: Array.from(dbCompleted),
        });
      })
      .catch(() => {});
  }, [status, session?.user?.role]);
}
