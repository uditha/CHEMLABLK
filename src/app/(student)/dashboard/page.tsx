"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { EXPERIMENTS, UNIT_NAMES, UNITS } from "@/data/experiments";
import { Badge } from "@/components/ui/Badge";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useExperimentStore } from "@/store/experimentStore";
import { useProgressSync } from "@/hooks/useProgressSync";
import type { ExperimentData } from "@/types";

type FilterStatus = "all" | "Built" | "Next" | "Planned";
type FilterPriority = "all" | "P1" | "P2" | "P3";

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "#22c55e",
  Medium: "#f59e0b",
  Hard: "#ef4444",
};

function ExperimentCard({ exp, completed }: { exp: ExperimentData; completed: boolean }) {
  const { lang } = useExperimentStore();
  const isAvailable = exp.status !== "Planned";
  const title = lang === "si" ? exp.titleSi : lang === "ta" ? exp.titleTa : exp.title;

  return (
    <motion.div
      whileHover={isAvailable ? { scale: 1.01, y: -2 } : undefined}
      className={`lab-panel rounded p-4 flex flex-col gap-3 transition-all duration-200 ${
        isAvailable ? "lab-panel-hover cursor-pointer" : "opacity-50 cursor-not-allowed"
      } ${completed ? "border-teal/30" : ""}`}
    >
      {isAvailable ? (
        <Link href={`/lab/${exp.slug}`} className="contents">
          <ExperimentCardContent exp={exp} title={title} completed={completed} />
        </Link>
      ) : (
        <ExperimentCardContent exp={exp} title={title} completed={completed} />
      )}
    </motion.div>
  );
}

function ExperimentCardContent({
  exp,
  title,
  completed,
}: {
  exp: ExperimentData;
  title: string;
  completed: boolean;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-slate-500 font-orbitron text-xs">
          U{String(exp.unit).padStart(2, "0")}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {completed && (
            <span className="text-teal text-xs">✓</span>
          )}
          <Badge variant={exp.status === "Built" ? "built" : exp.status === "Next" ? "next" : "planned"}>
            {exp.status}
          </Badge>
          {exp.priority === "P1" && <Badge variant="p1">P1</Badge>}
        </div>
      </div>

      <h3 className="text-white font-rajdhani font-semibold text-sm leading-tight line-clamp-2">
        {title}
      </h3>

      <div className="flex items-center justify-between mt-auto">
        <span
          className="text-xs font-rajdhani font-medium"
          style={{ color: DIFFICULTY_COLORS[exp.difficulty] }}
        >
          {exp.difficulty}
        </span>
        {completed && (
          <div className="w-full max-w-[60%] progress-bar ml-2">
            <div className="progress-fill" style={{ width: "100%" }} />
          </div>
        )}
      </div>
    </>
  );
}

export default function StudentDashboard() {
  useProgressSync();
  const { lang, experimentsCompleted } = useExperimentStore();
  const [activeUnit, setActiveUnit] = useState<number | "all">("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterPriority, setFilterPriority] = useState<FilterPriority>("all");
  const [search, setSearch] = useState("");

  const filteredExperiments = useMemo(() => {
    return EXPERIMENTS.filter((exp) => {
      if (activeUnit !== "all" && exp.unit !== activeUnit) return false;
      if (filterStatus !== "all" && exp.status !== filterStatus) return false;
      if (filterPriority !== "all" && exp.priority !== filterPriority) return false;
      if (search) {
        const q = search.toLowerCase();
        const titleMatch = exp.title.toLowerCase().includes(q) ||
          exp.titleSi.toLowerCase().includes(q) ||
          exp.titleTa.toLowerCase().includes(q);
        const unitMatch = `unit ${exp.unit}`.includes(q);
        if (!titleMatch && !unitMatch) return false;
      }
      return true;
    });
  }, [activeUnit, filterStatus, filterPriority, search]);

  const completedCount = experimentsCompleted.length;
  const progressPercent = Math.round((completedCount / EXPERIMENTS.length) * 100);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-deep">
      {/* Header */}
      <div className="bg-panel border-b border-border px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="font-orbitron text-xl font-bold text-white mb-1">
                Experiment Dashboard
              </h1>
              <p className="text-slate-400 text-sm font-rajdhani">
                NIE Chemistry {new Date().getFullYear()} · {EXPERIMENTS.length} Practicals
              </p>
            </div>
            <LanguageToggle showNative />
          </div>

          {/* Progress */}
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-sm">
              <div className="flex justify-between text-xs text-slate-400 font-rajdhani mb-1">
                <span>Overall Progress</span>
                <span>
                  {completedCount}/{EXPERIMENTS.length} ({progressPercent}%)
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <div className="flex gap-4 text-xs text-slate-500 font-rajdhani">
              <span>
                <span className="text-green-400 font-bold">{EXPERIMENTS.filter(e => e.status === "Built").length}</span> Available
              </span>
              <span>
                <span className="text-blue-400 font-bold">{EXPERIMENTS.filter(e => e.status === "Next").length}</span> Coming Soon
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Search */}
          <input
            type="text"
            placeholder="Search experiments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="lab-input max-w-xs text-sm"
          />

          {/* Unit filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveUnit("all")}
              className={`px-3 py-1 rounded text-xs font-rajdhani font-medium transition-colors ${
                activeUnit === "all"
                  ? "bg-teal/20 text-teal border border-teal/30"
                  : "text-slate-400 hover:text-white border border-border hover:border-slate-500"
              }`}
            >
              All Units
            </button>
            {UNITS.map((unit) => (
              <button
                key={unit}
                onClick={() => setActiveUnit(unit)}
                className={`px-3 py-1 rounded text-xs font-rajdhani font-medium transition-colors ${
                  activeUnit === unit
                    ? "bg-teal/20 text-teal border border-teal/30"
                    : "text-slate-400 hover:text-white border border-border hover:border-slate-500"
                }`}
              >
                U{String(unit).padStart(2, "0")}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1">
            {(["all", "Built", "Next", "Planned"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded text-xs font-rajdhani transition-colors ${
                  filterStatus === s
                    ? "bg-navy text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {s === "all" ? "All Status" : s}
              </button>
            ))}
          </div>
        </div>

        {/* Experiment count */}
        <p className="text-slate-500 text-xs font-rajdhani mb-4">
          Showing {filteredExperiments.length} of {EXPERIMENTS.length} experiments
        </p>

        {/* Group by unit */}
        {activeUnit === "all" ? (
          <div className="space-y-8">
            {UNITS.map((unit) => {
              const unitExps = filteredExperiments.filter((e) => e.unit === unit);
              if (unitExps.length === 0) return null;
              return (
                <motion.section
                  key={unit}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h2 className="font-orbitron text-sm font-bold text-slate-300 mb-3 flex items-center gap-3">
                    <span className="text-teal">
                      U{String(unit).padStart(2, "0")}
                    </span>
                    <span className="text-xs text-slate-500 font-rajdhani font-normal">
                      {UNIT_NAMES[unit] ?? `Unit ${unit}`}
                    </span>
                    <span className="text-slate-600 text-xs font-rajdhani font-normal">
                      ({unitExps.length} experiment{unitExps.length !== 1 ? "s" : ""})
                    </span>
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {unitExps.map((exp) => (
                      <ExperimentCard
                        key={exp.slug}
                        exp={exp}
                        completed={experimentsCompleted.includes(exp.slug)}
                      />
                    ))}
                  </div>
                </motion.section>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredExperiments.map((exp) => (
              <ExperimentCard
                key={exp.slug}
                exp={exp}
                completed={experimentsCompleted.includes(exp.slug)}
              />
            ))}
          </div>
        )}

        {filteredExperiments.length === 0 && (
          <div className="text-center py-20 text-slate-500 font-rajdhani">
            <div className="text-4xl mb-4">🔬</div>
            <p>No experiments match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
