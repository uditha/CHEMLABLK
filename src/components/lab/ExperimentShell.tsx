"use client";

import { useEffect, useCallback, lazy, Suspense } from "react";
import Link from "next/link";
import { useExperimentStore } from "@/store/experimentStore";
import { useProgressSync } from "@/hooks/useProgressSync";
import type { ExperimentData, ExperimentMode } from "@/types";

// ─── Lazy‑load each experiment ────────────────────────────────────────────────
const EXPERIMENT_MAP: Record<
  string,
  React.LazyExoticComponent<React.ComponentType<{ onScoreUpdate?: (pts: number) => void }>>
> = {
  "flame-test": lazy(() =>
    import("./experiments/FlameTest").then((m) => ({ default: m.FlameTest }))
  ),
  "titration-hcl-naoh": lazy(() =>
    import("./experiments/Titration").then((m) => ({ default: m.Titration }))
  ),
  "titration-ch3cooh-naoh": lazy(() =>
    import("./experiments/Titration").then((m) => ({ default: m.Titration }))
  ),
  "iodine-clock-reaction": lazy(() =>
    import("./experiments/IodineClock").then((m) => ({ default: m.IodineClock }))
  ),
  "tollens-test": lazy(() =>
    import("./experiments/TollensTest").then((m) => ({ default: m.TollensTest }))
  ),
  "fehlings-test": lazy(() =>
    import("./experiments/FehlingTest").then((m) => ({ default: m.FehlingTest }))
  ),
  "salt-analysis-d-block": lazy(() =>
    import("./experiments/SaltAnalysis").then((m) => ({ default: m.SaltAnalysis }))
  ),
  "cu2-zn2-naoh-nh3": lazy(() =>
    import("./experiments/CuZnNaOH").then((m) => ({ default: m.CuZnNaOH }))
  ),
  "enthalpy-neutralisation": lazy(() =>
    import("./experiments/EnthalpyNeutralisation").then((m) => ({ default: m.EnthalpyNeutralisation }))
  ),
  "rate-reaction-temperature": lazy(() =>
    import("./experiments/RateTemperature").then((m) => ({ default: m.RateTemperature }))
  ),
  "rate-reaction-catalyst": lazy(() =>
    import("./experiments/RateCatalyst").then((m) => ({ default: m.RateCatalyst }))
  ),
  "functional-group-identification": lazy(() =>
    import("./experiments/FunctionalGroups").then((m) => ({ default: m.FunctionalGroups }))
  ),
  "electrolysis-cuso4": lazy(() =>
    import("./experiments/ElectrolysisCuSO4").then((m) => ({ default: m.ElectrolysisCuSO4 }))
  ),
  "electrolysis-brine": lazy(() =>
    import("./experiments/ElectrolysisBrine").then((m) => ({ default: m.ElectrolysisBrine }))
  ),
  "lucas-test": lazy(() =>
    import("./experiments/LucasTest").then((m) => ({ default: m.LucasTest }))
  ),
  "unsaturation-test-br2-kmno4": lazy(() =>
    import("./experiments/UnsaturationTest").then((m) => ({ default: m.UnsaturationTest }))
  ),
};

// ─── Mode config ──────────────────────────────────────────────────────────────
const AVAILABLE_MODES: ExperimentMode[] = ["Guided", "Free", "Exam"];

const MODE_COLORS: Record<ExperimentMode, string> = {
  Guided: "#0D7E6A",
  Free: "#4F6BEF",
  Exam: "#E53935",
  Mistake: "#FF9800",
  Teacher: "#9C27B0",
};

// ─── Exam Timer ───────────────────────────────────────────────────────────────
function ExamTimer({
  startTime,
  limitSeconds,
}: {
  startTime: number;
  limitSeconds: number;
}) {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const remaining = Math.max(0, limitSeconds - elapsed);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const urgent = remaining < 120;

  return (
    <div
      className={`font-orbitron text-sm font-bold tabular-nums ${
        urgent ? "text-red-400 animate-pulse" : "text-teal"
      }`}
    >
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </div>
  );
}

// ─── ExperimentShell ──────────────────────────────────────────────────────────
interface ExperimentShellProps {
  experiment: ExperimentData;
}

export function ExperimentShell({ experiment }: ExperimentShellProps) {
  useProgressSync();
  const {
    currentMode,
    setMode,
    setCurrentExperiment,
    setTutorContext,
    score,
    lang,
    resetExperiment,
    observations,
    examStartTime,
    examTimeLimit,
    startExam,
    addScore,
    isModeUnlocked,
    modeCompletions,
  } = useExperimentStore();

  const completedModes = modeCompletions[experiment.slug] ?? [];

  // Initialise this experiment
  useEffect(() => {
    setCurrentExperiment(experiment.slug);
  }, [experiment.slug, setCurrentExperiment]);

  // Set tutor context in store so StepWizard can access it
  useEffect(() => {
    setTutorContext({
      experimentSlug: experiment.slug,
      experimentTitle: experiment.title,
      unit: experiment.unit,
      mode: currentMode,
      observations,
      language: lang,
    });
  }, [experiment.slug, experiment.title, experiment.unit, currentMode, observations, lang, setTutorContext]);

  const handleModeChange = useCallback(
    (mode: ExperimentMode) => {
      if (mode === "Exam") {
        startExam();
      } else {
        setMode(mode);
      }
    },
    [startExam, setMode]
  );

  const handleScoreUpdate = useCallback(
    (pts: number) => {
      addScore(pts);
    },
    [addScore]
  );

  const ExperimentComponent = EXPERIMENT_MAP[experiment.slug];

  const titleDisplay =
    lang === "si"
      ? experiment.titleSi
      : lang === "ta"
      ? experiment.titleTa
      : experiment.title;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-deep">
      {/* Progress banner when user has completed modes */}
      {completedModes.length > 0 && (
        <div className="px-4 py-1.5 bg-teal/10 border-b border-teal/20 flex-shrink-0">
          <p className="text-xs font-rajdhani text-teal">
            ✓ Completed: {completedModes.join(", ")} — Try other modes or redo for practice
          </p>
        </div>
      )}
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 bg-panel border-b border-border flex-shrink-0 min-w-0">
        {/* Back */}
        <Link
          href="/dashboard"
          className="text-slate-500 hover:text-white transition-colors mr-1 flex-shrink-0"
          title="Back to dashboard"
        >
          ←
        </Link>

        {/* Title */}
        <div className="flex-1 min-w-0 mr-2">
          <p className="text-slate-500 font-orbitron text-xs">
            U{String(experiment.unit).padStart(2, "0")} ·{" "}
            {experiment.difficulty}
          </p>
          <h1 className="text-sm font-rajdhani font-semibold text-white truncate leading-tight">
            {titleDisplay}
          </h1>
        </div>

        {/* Mode selector */}
        <div className="flex items-center bg-deep rounded p-0.5 border border-border flex-shrink-0">
          {AVAILABLE_MODES.map((mode) => {
            const unlocked = isModeUnlocked(experiment.slug, mode);
            const isActive = currentMode === mode;
            return (
              <button
                key={mode}
                onClick={() => unlocked && handleModeChange(mode)}
                disabled={!unlocked}
                className={`
                  px-2.5 py-1 rounded text-xs font-orbitron tracking-wider transition-colors duration-150
                  ${isActive
                    ? "text-white shadow hover:text-white"
                    : unlocked
                    ? "text-slate-500 hover:text-slate-200 hover:bg-white/10"
                    : "text-slate-700 cursor-not-allowed opacity-50"}
                `}
                style={
                  isActive
                    ? { backgroundColor: MODE_COLORS[mode] + "CC" }
                    : undefined
                }
                title={
                  !unlocked
                    ? mode === "Free"
                      ? "Complete Guided mode first"
                      : "Complete Free mode first"
                    : undefined
                }
              >
                {!unlocked && (
                  <span className="mr-0.5 text-[10px]">🔒</span>
                )}
                {mode}
              </button>
            );
          })}
        </div>

        {/* Score / timer */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {currentMode === "Exam" && examStartTime ? (
            <ExamTimer startTime={examStartTime} limitSeconds={examTimeLimit} />
          ) : null}
          <div className="text-right">
            <div className="text-teal font-orbitron text-sm font-bold leading-none">
              {score}
            </div>
            <div className="text-slate-600 text-xs font-rajdhani">pts</div>
          </div>
        </div>

        {/* Reset */}
        <button
          onClick={resetExperiment}
          className="text-slate-500 hover:text-red-400 text-xs font-rajdhani border border-border hover:border-red-800 rounded px-2 py-1 transition-colors flex-shrink-0"
          title="Reset experiment"
        >
          ↺ Reset
        </button>
      </div>

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 relative">
        <div className="flex-1 min-w-0 min-h-0 relative">
          {ExperimentComponent ? (
            <Suspense
              fallback={
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-slate-500 font-rajdhani flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
                    <span>Loading experiment…</span>
                  </div>
                </div>
              }
            >
              <div className="absolute inset-0 flex min-w-0 min-h-0">
                <ExperimentComponent onScoreUpdate={handleScoreUpdate} />
              </div>
            </Suspense>
          ) : (
            <ComingSoonFallback experiment={experiment} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Fallback for experiments not yet implemented ─────────────────────────────
function ComingSoonFallback({ experiment }: { experiment: ExperimentData }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">⚗️</div>
        <h2 className="font-orbitron text-lg font-bold text-white mb-3">
          Experiment Coming Soon
        </h2>
        <p className="text-slate-400 font-rajdhani mb-2">{experiment.title}</p>
        <p className="text-slate-600 text-sm font-rajdhani">
          This simulation is currently being built. Use the AI Tutor to learn
          about this experiment in the meantime.
        </p>
        <div className="mt-6 p-4 bg-navy/50 border border-border rounded text-left">
          <p className="text-slate-300 text-sm font-rajdhani leading-relaxed">
            {experiment.description}
          </p>
        </div>
      </div>
    </div>
  );
}
