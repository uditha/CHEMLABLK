"use client";

import { useEffect, useState } from "react";
import { useExperimentStore } from "@/store/experimentStore";

/**
 * Rehydrates Zustand persist store after mount to avoid hydration mismatch.
 * Server and initial client render use default state; persisted state loads after hydration.
 */
export function StoreHydration({ children }: { children: React.ReactNode }) {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const unsub = useExperimentStore.persist.onFinishHydration(() => setHasHydrated(true));
    useExperimentStore.persist.rehydrate();
    const fallback = setTimeout(() => setHasHydrated(true), 300);
    return () => {
      unsub();
      clearTimeout(fallback);
    };
  }, []);

  // Avoid flash of wrong state: delay render until rehydration completes (or 300ms max)
  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-deep">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 font-rajdhani text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
