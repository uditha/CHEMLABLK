"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { EXPERIMENTS, UNIT_NAMES } from "@/data/experiments";
import { Badge } from "@/components/ui/Badge";

interface TeacherStats {
  totalStudents: number;
  completedExperiments: number;
  activeAssignments: number;
}

export default function TeacherDashboard() {
  const [stats] = useState<TeacherStats>({
    totalStudents: 0,
    completedExperiments: 0,
    activeAssignments: 0,
  });

  const p1Experiments = EXPERIMENTS.filter((e) => e.priority === "P1");
  const builtExperiments = EXPERIMENTS.filter((e) => e.status === "Built");

  return (
    <div className="min-h-[calc(100vh-56px)] bg-deep">
      {/* Header */}
      <div className="bg-panel border-b border-border px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-orbitron text-xl font-bold text-white mb-1">
            Teacher Dashboard
          </h1>
          <p className="text-slate-400 text-sm font-rajdhani">
            Manage assignments and track class progress
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Students", value: stats.totalStudents, color: "#0D7E6A" },
            { label: "Completions", value: stats.completedExperiments, color: "#C4962A" },
            { label: "Assignments", value: stats.activeAssignments, color: "#9966CC" },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              className="lab-panel rounded p-5 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div
                className="font-orbitron text-3xl font-bold mb-1"
                style={{ color: stat.color }}
              >
                {stat.value}
              </div>
              <div className="text-slate-400 text-sm font-rajdhani">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Available experiments */}
        <div className="mb-8">
          <h2 className="font-orbitron text-sm font-bold text-slate-300 mb-4">
            Available Experiments ({builtExperiments.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {builtExperiments.map((exp) => (
              <div key={exp.slug} className="lab-panel rounded p-4 flex items-start justify-between gap-3">
                <div>
                  <span className="text-slate-500 font-orbitron text-xs">
                    U{String(exp.unit).padStart(2, "0")}
                  </span>
                  <h3 className="text-white font-rajdhani text-sm mt-1 leading-tight">
                    {exp.title}
                  </h3>
                </div>
                <div className="flex flex-col gap-1 items-end flex-shrink-0">
                  <Badge variant={exp.difficulty === "Easy" ? "easy" : exp.difficulty === "Medium" ? "medium" : "hard"}>
                    {exp.difficulty}
                  </Badge>
                  <button className="text-teal text-xs font-rajdhani hover:underline mt-1">
                    Assign →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority experiments coming soon */}
        <div>
          <h2 className="font-orbitron text-sm font-bold text-slate-300 mb-4">
            P1 Priority Experiments (Coming Soon)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {p1Experiments
              .filter((e) => e.status !== "Built")
              .map((exp) => (
                <div
                  key={exp.slug}
                  className="lab-panel rounded p-4 opacity-60 flex items-start justify-between gap-3"
                >
                  <div>
                    <span className="text-slate-600 font-orbitron text-xs">
                      U{String(exp.unit).padStart(2, "0")}
                    </span>
                    <h3 className="text-slate-400 font-rajdhani text-sm mt-1 leading-tight">
                      {exp.title}
                    </h3>
                  </div>
                  <Badge variant={exp.status === "Next" ? "next" : "planned"}>
                    {exp.status}
                  </Badge>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
