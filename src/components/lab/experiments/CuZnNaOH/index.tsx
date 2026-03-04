"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";

// ─── Data ─────────────────────────────────────────────────────────────────────

type IonId = "cu2" | "zn2";
type Reagent = "naoh-drop" | "naoh-excess" | "nh3-drop" | "nh3-excess";

interface TestResult {
  ion: IonId;
  reagent: Reagent;
  precipitate: string;
  color: string;
  dissolves: boolean;
  finalColor: string;
  description: string;
}

const RESULTS: Record<IonId, Record<Reagent, TestResult>> = {
  cu2: {
    "naoh-drop": {
      ion: "cu2", reagent: "naoh-drop",
      precipitate: "Cu(OH)₂↓",
      color: "#6DB6E8",
      dissolves: false,
      finalColor: "#6DB6E8",
      description: "Pale blue precipitate of copper(II) hydroxide forms.",
    },
    "naoh-excess": {
      ion: "cu2", reagent: "naoh-excess",
      precipitate: "Cu(OH)₂↓ (insoluble)",
      color: "#6DB6E8",
      dissolves: false,
      finalColor: "#6DB6E8",
      description: "Precipitate does NOT dissolve in excess NaOH — Cu(OH)₂ is not amphoteric.",
    },
    "nh3-drop": {
      ion: "cu2", reagent: "nh3-drop",
      precipitate: "Cu(OH)₂↓",
      color: "#6DB6E8",
      dissolves: false,
      finalColor: "#6DB6E8",
      description: "Pale blue Cu(OH)₂ precipitate forms.",
    },
    "nh3-excess": {
      ion: "cu2", reagent: "nh3-excess",
      precipitate: "Cu(OH)₂ dissolves",
      color: "#0D47A1",
      dissolves: true,
      finalColor: "#0D47A1",
      description: "Precipitate dissolves in excess NH₃ to form deep blue [Cu(NH₃)₄]²⁺ — Schweizer's reagent.",
    },
  },
  zn2: {
    "naoh-drop": {
      ion: "zn2", reagent: "naoh-drop",
      precipitate: "Zn(OH)₂↓",
      color: "#EEEEEE",
      dissolves: false,
      finalColor: "#EEEEEE",
      description: "White gelatinous precipitate of zinc hydroxide forms.",
    },
    "naoh-excess": {
      ion: "zn2", reagent: "naoh-excess",
      precipitate: "Zn(OH)₂ dissolves",
      color: "#E8F4FD",
      dissolves: true,
      finalColor: "#E8F4FD",
      description: "Precipitate dissolves in excess NaOH (Zn(OH)₂ is amphoteric): Zn(OH)₂ + 2OH⁻ → [Zn(OH)₄]²⁻",
    },
    "nh3-drop": {
      ion: "zn2", reagent: "nh3-drop",
      precipitate: "Zn(OH)₂↓",
      color: "#EEEEEE",
      dissolves: false,
      finalColor: "#EEEEEE",
      description: "White Zn(OH)₂ precipitate forms.",
    },
    "nh3-excess": {
      ion: "zn2", reagent: "nh3-excess",
      precipitate: "Zn(OH)₂ dissolves",
      color: "#F0F8FF",
      dissolves: true,
      finalColor: "#F0F8FF",
      description: "Dissolves in excess NH₃ to give colourless [Zn(NH₃)₄]²⁺ complex.",
    },
  },
};

const GUIDED_STEPS = [
  {
    id: 0,
    title: "Prepare ion solutions",
    instructions: "Prepare dilute solutions of CuSO₄ (pale blue) and ZnSO₄ (colourless) in separate test tubes.",
  },
  {
    id: 1,
    title: "Add NaOH dropwise",
    instructions: "Add dilute NaOH dropwise to each solution. Note the colour and nature of any precipitate.",
  },
  {
    id: 2,
    title: "Add excess NaOH",
    instructions: "Continue adding NaOH in excess. Does the precipitate dissolve? This distinguishes Zn²⁺ (amphoteric) from Cu²⁺.",
  },
  {
    id: 3,
    title: "Test with NH₃",
    instructions: "Repeat with fresh samples using NH₃. Excess NH₃ gives deep blue [Cu(NH₃)₄]²⁺ — a key distinction.",
  },
];

// ─── Test tube SVG ────────────────────────────────────────────────────────────

function TestTube({
  solutionColor,
  precipColor,
  hasPrecip,
  label,
}: {
  solutionColor: string;
  precipColor: string | null;
  hasPrecip: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 44 130" width="50" height="140" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id={`cz-${label}`}>
            <path d="M10 8 L10 100 Q10 120 22 120 Q34 120 34 100 L34 8 Z" />
          </clipPath>
        </defs>
        <path
          d="M10 8 L10 100 Q10 120 22 120 Q34 120 34 100 L34 8"
          fill="rgba(200,220,255,0.06)"
          stroke="#334155"
          strokeWidth="1.5"
        />
        <rect x="10" y="40" width="24" height="82" fill={solutionColor} clipPath={`url(#cz-${label})`} opacity={0.65} />
        {hasPrecip && precipColor && (
          <rect x="10" y="100" width="24" height="22" fill={precipColor} clipPath={`url(#cz-${label})`} opacity={0.85} />
        )}
        <rect x="9" y="6" width="26" height="4" fill="#1E293B" rx="1.5" />
      </svg>
      <p className="text-slate-500 text-xs font-rajdhani text-center">{label}</p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface CuZnNaOHProps {
  onScoreUpdate?: (pts: number) => void;
}

export function CuZnNaOH({ onScoreUpdate }: CuZnNaOHProps) {
  const { currentMode, currentStep, nextStep, addScore, addObservation } =
    useExperimentStore();

  const [selectedIon, setSelectedIon] = useState<IonId | null>(null);
  const [reagent, setReagent] = useState<Reagent | null>(null);
  const [testsDone, setTestsDone] = useState<Set<string>>(new Set());

  const result = selectedIon && reagent ? RESULTS[selectedIon][reagent] : null;

  function handleTest(ion: IonId, r: Reagent) {
    setSelectedIon(ion);
    setReagent(r);
    const key = `${ion}-${r}`;
    if (!testsDone.has(key)) {
      setTestsDone((prev) => new Set(Array.from(prev).concat(key)));
      addScore(10);
      onScoreUpdate?.(10);
      const res = RESULTS[ion][r];
      addObservation(`${ion === "cu2" ? "Cu²⁺" : "Zn²⁺"} + ${r.replace(/-/g, " ")}: ${res.description}`);
      if (r === "naoh-drop" && currentMode === "Guided" && currentStep === 1) nextStep();
      if (r === "naoh-excess" && currentMode === "Guided" && currentStep === 2) nextStep();
      if (r === "nh3-drop" && currentMode === "Guided" && currentStep === 3) nextStep();
    }
  }

  const cuTube = {
    solution: selectedIon === "cu2" && reagent ? (result?.dissolves ? result.finalColor : "#6DB6E8") : "#6DB6E8",
    precip: selectedIon === "cu2" && reagent && !result?.dissolves ? result?.color ?? null : null,
    hasPrecip: selectedIon === "cu2" && !!reagent && !!result && !result.dissolves,
  };

  const znTube = {
    solution: selectedIon === "zn2" && reagent ? (result?.dissolves ? result.finalColor : "#F0F0F0") : "#F0F0F0",
    precip: selectedIon === "zn2" && reagent && !result?.dissolves ? result?.color ?? null : null,
    hasPrecip: selectedIon === "zn2" && !!reagent && !!result && !result.dissolves,
  };

  return (
    <div className="space-y-4">
      {currentMode === "Guided" && (
        <div className="bg-teal/10 border border-teal/30 rounded p-3">
          <div className="text-teal text-xs font-orbitron tracking-wider mb-1">
            STEP {currentStep + 1}/{GUIDED_STEPS.length}
          </div>
          <p className="text-white font-rajdhani font-semibold text-sm mb-1">
            {GUIDED_STEPS[Math.min(currentStep, GUIDED_STEPS.length - 1)]?.title}
          </p>
          <p className="text-slate-300 text-xs font-rajdhani leading-relaxed">
            {GUIDED_STEPS[Math.min(currentStep, GUIDED_STEPS.length - 1)]?.instructions}
          </p>
        </div>
      )}

      <div className="bg-navy/40 border border-border rounded p-3 text-xs font-rajdhani">
        <p className="text-slate-300">
          Both <span className="text-blue-300 font-semibold">Cu²⁺</span> and{" "}
          <span className="text-slate-200 font-semibold">Zn²⁺</span> give precipitates with NaOH and NH₃.
          The key differences:{" "}
          <span className="text-teal">Zn(OH)₂ dissolves in excess NaOH</span> (amphoteric),{" "}
          <span className="text-blue-300">Cu(OH)₂ does not</span>. With excess NH₃,{" "}
          <span className="text-indigo-300">Cu²⁺ gives deep blue [Cu(NH₃)₄]²⁺</span>.
        </p>
      </div>

      {/* Test tube display */}
      <div className="flex items-end justify-around gap-4 py-4">
        <TestTube
          solutionColor={cuTube.solution}
          precipColor={cuTube.precip}
          hasPrecip={cuTube.hasPrecip}
          label="Cu²⁺"
        />
        <TestTube
          solutionColor={znTube.solution}
          precipColor={znTube.precip}
          hasPrecip={znTube.hasPrecip}
          label="Zn²⁺"
        />
      </div>

      {/* Interactive grid */}
      <div>
        <p className="text-slate-400 text-xs font-orbitron tracking-wider mb-2">
          CLICK AN ION + REAGENT TO TEST
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-rajdhani min-w-[400px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 text-slate-400">Reagent</th>
                <th className="px-3 py-2 text-blue-300">Cu²⁺</th>
                <th className="px-3 py-2 text-slate-300">Zn²⁺</th>
              </tr>
            </thead>
            <tbody>
              {(["naoh-drop", "naoh-excess", "nh3-drop", "nh3-excess"] as Reagent[]).map((r) => (
                <tr key={r} className="border-b border-border/50">
                  <td className="px-3 py-2 text-slate-400 font-semibold">
                    {r === "naoh-drop" && "NaOH (drops)"}
                    {r === "naoh-excess" && "Excess NaOH"}
                    {r === "nh3-drop" && "NH₃ (drops)"}
                    {r === "nh3-excess" && "Excess NH₃"}
                  </td>
                  {(["cu2", "zn2"] as IonId[]).map((ion) => {
                    const done = testsDone.has(`${ion}-${r}`);
                    const res = RESULTS[ion][r];
                    return (
                      <td key={ion} className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleTest(ion, r)}
                          className={`
                            px-2 py-1 rounded border text-xs transition-all
                            ${selectedIon === ion && reagent === r
                              ? "border-teal/50 bg-teal/20 text-teal"
                              : done
                              ? "border-green-700/30 bg-green-900/10 text-green-400"
                              : "border-border hover:border-slate-500 text-slate-300"}
                          `}
                        >
                          {done ? (
                            <span style={{ color: res.color }}>
                              {res.dissolves ? "✓ dissolves" : `● ${res.precipitate.split("↓")[0].trim()}`}
                            </span>
                          ) : (
                            "Test →"
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Current observation */}
      <AnimatePresence>
        {result && (
          <motion.div
            className="bg-navy/40 border border-border rounded p-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-slate-400 text-xs font-orbitron tracking-wider mb-1">OBSERVATION</p>
            <p className="text-white font-rajdhani text-sm font-semibold mb-1">
              {selectedIon === "cu2" ? "Cu²⁺" : "Zn²⁺"} +{" "}
              {reagent?.replace(/-/g, " ")}
            </p>
            <p className="text-slate-300 text-xs font-rajdhani">{result.description}</p>
            {result.dissolves && (
              <p className="text-teal text-xs font-rajdhani mt-1">
                ✓ Precipitate dissolves → complex ion forms
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary */}
      <div className="rounded border border-border overflow-hidden">
        <div className="px-3 py-2 bg-navy/30 border-b border-border">
          <p className="text-xs font-orbitron text-slate-400 tracking-wider">SUMMARY TABLE</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-rajdhani min-w-[400px]">
            <thead>
              <tr className="border-b border-border bg-navy/20">
                <th className="text-left px-3 py-1.5 text-slate-400">Test</th>
                <th className="px-3 py-1.5 text-blue-300">Cu²⁺</th>
                <th className="px-3 py-1.5 text-slate-300">Zn²⁺</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="px-3 py-2 text-slate-400">+ NaOH (drops)</td>
                <td className="px-3 py-2 text-center text-blue-300">Pale blue ppt Cu(OH)₂</td>
                <td className="px-3 py-2 text-center text-slate-300">White ppt Zn(OH)₂</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="px-3 py-2 text-slate-400">+ excess NaOH</td>
                <td className="px-3 py-2 text-center text-red-400">Insoluble ✗</td>
                <td className="px-3 py-2 text-center text-teal">Dissolves ✓ (amphoteric)</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="px-3 py-2 text-slate-400">+ NH₃ (drops)</td>
                <td className="px-3 py-2 text-center text-blue-300">Pale blue ppt</td>
                <td className="px-3 py-2 text-center text-slate-300">White ppt</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-slate-400">+ excess NH₃</td>
                <td className="px-3 py-2 text-center text-indigo-300">Deep blue [Cu(NH₃)₄]²⁺</td>
                <td className="px-3 py-2 text-center text-slate-300">Colourless [Zn(NH₃)₄]²⁺</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
