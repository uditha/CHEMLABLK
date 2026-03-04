/**
 * Progress API client — save and fetch student progress from database.
 * Used to persist mode completions, scores, and time across devices.
 */

import type { ExperimentMode } from "@/types";

export interface ProgressPayload {
  slug: string;
  mode: ExperimentMode;
  score?: number;
  timeSpentSeconds?: number;
  testedMetals?: string[];
}

export interface ProgressRecord {
  slug: string;
  modeCompletions: string[];
  testedMetals: string[];
  completed: boolean;
  score: number;
  bestScore: number;
  attempts: number;
  timeSpentSeconds: number;
  lastAttempt: string;
}

export async function saveProgress(payload: ProgressPayload): Promise<ProgressRecord | null> {
  try {
    const res = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export async function fetchProgress(slug?: string): Promise<ProgressRecord[]> {
  try {
    const url = slug ? `/api/progress?slug=${encodeURIComponent(slug)}` : "/api/progress";
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}
