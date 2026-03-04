"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";

// ─── Lucas Test data ──────────────────────────────────────────────────────────
// Lucas reagent = ZnCl₂ + conc. HCl
// 3° alcohols → turbidity immediately (fast SN1 with stable 3° carbocation)
// 2° alcohols → turbidity in 5 min (slower SN1)
// 1° alcohols → no reaction at room temp (SN2 too slow without heat)

interface Alcohol {
  id: string;
  name: string;
  formula: string;
  type: "primary" | "secondary" | "tertiary";
  result: "immediate" | "5min" | "none";
  reactionTime: number; // seconds in simulation
  mechanism: string;
  example: string;
  color: string;
}

const ALCOHOLS: Alcohol[] = [
  {
    id: "2-methylpropan-2-ol",
    name: "2-Methylpropan-2-ol",
    formula: "(CH₃)₃COH",
    type: "tertiary",
    result: "immediate",
    reactionTime: 3,
    mechanism: "SN1 — tertiary carbocation (CH₃)₃C⁺ forms instantly. Very stable.",
    example: "t-butanol (3°)",
    color: "#EF4444",
  },
  {
    id: "2-butanol",
    name: "Butan-2-ol",
    formula: "CH₃CH(OH)CH₂CH₃",
    type: "secondary",
    result: "5min",
    reactionTime: 15,
    mechanism: "SN1 — secondary carbocation forms, but slower than 3°.",
    example: "sec-butanol (2°)",
    color: "#F59E0B",
  },
  {
    id: "cyclohexanol",
    name: "Cyclohexanol",
    formula: "C₆H₁₁OH",
    type: "secondary",
    result: "5min",
    reactionTime: 18,
    mechanism: "SN1 — secondary cyclic carbocation; moderate rate.",
    example: "Cyclohexanol (2°)",
    color: "#F97316",
  },
  {
    id: "1-butanol",
    name: "Butan-1-ol",
    formula: "CH₃CH₂CH₂CH₂OH",
    type: "primary",
    result: "none",
    reactionTime: Infinity,
    mechanism: "SN2 only — primary carbocation too unstable. No turbidity at RT.",
    example: "n-butanol (1°)",
    color: "#64748B",
  },
  {
    id: "ethanol",
    name: "Ethanol",
    formula: "CH₃CH₂OH",
    type: "primary",
    result: "none",
    reactionTime: Infinity,
    mechanism: "Primary alcohol — no reaction with Lucas reagent at room temperature.",
    example: "Ethanol (1°)",
    color: "#64748B",
  },
];

const GUIDED_STEPS = [
  {
    id: 0,
    title: "Prepare Lucas reagent",
    instructions:
      "Lucas reagent is prepared by dissolving anhydrous ZnCl₂ in concentrated HCl with cooling. The Lewis acid ZnCl₂ activates the OH group for substitution.",
  },
  {
    id: 1,
    title: "Add alcohol to Lucas reagent",
    instructions:
      "Add ~5 drops of alcohol to ~2 mL Lucas reagent in a test tube. Stopper and shake gently. Start timing immediately.",
  },
  {
    id: 2,
    title: "Observe turbidity",
    instructions:
      "A cloudy layer (turbidity) = alkyl chloride (RCl) formed. 3° → immediate. 2° → turbid within 5 min. 1° → no turbidity at room temperature.",
  },
  {
    id: 3,
    title: "Classify the alcohol",
    instructions:
      "Immediate turbidity → 3° (tertiary). Turbid in 5 min → 2° (secondary). No turbidity → 1° (primary) or confirm with other tests.",
  },
];

// ─── Test tube ────────────────────────────────────────────────────────────────

function LucasTube({
  turbidity,
  label,
}: {
  turbidity: number; // 0-1
  label: string;
}) {
  const clearColor = `rgba(240, 248, 255, ${0.3 + turbidity * 0.4})`;
  const turbidColor = `rgba(220, 210, 180, ${turbidity * 0.8})`;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 40 130" width="46" height="145" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id={`lt-${label}`}>
            <path d="M8 5 L8 95 Q8 115 20 115 Q32 115 32 95 L32 5 Z" />
          </clipPath>
        </defs>
        <path d="M8 5 L8 95 Q8 115 20 115 Q32 115 32 95 L32 5"
          fill="rgba(200,220,255,0.06)" stroke="#334155" strokeWidth="1.5" />
        <rect x="8" y="30" width="24" height="87" fill={clearColor} clipPath={`url(#lt-${label})`} />
        {turbidity > 0.05 && (
          <rect x="8" y={100 - turbidity * 40} width="24" height={turbidity * 40}
            fill={turbidColor} clipPath={`url(#lt-${label})`} opacity={0.9} />
        )}
        <rect x="7" y="3" width="26" height="3" fill="#1E293B" rx="1" />
      </svg>
      <p className="text-slate-500 text-xs font-rajdhani text-center leading-tight">{label}</p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface LucasTestProps {
  onScoreUpdate?: (pts: number) => void;
}

export function LucasTest({ onScoreUpdate }: LucasTestProps) {
  const { currentMode, currentStep, nextStep, addScore, addObservation } =
    useExperimentStore();

  const [selectedAlcohol, setSelectedAlcohol] = useState<Alcohol | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [turbidity, setTurbidity] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [testsDone, setTestsDone] = useState<Set<string>>(new Set());
  const timerRef = { current: null as ReturnType<typeof setInterval> | null };

  function startTest() {
    if (!selectedAlcohol || isRunning) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(true);
    setElapsed(0);
    setTurbidity(0);
    setIsDone(false);

    if (currentMode === "Guided" && currentStep === 1) nextStep();

    const alcohol = selectedAlcohol;

    timerRef.current = setInterval(() => {
      setElapsed((t) => {
        const next = t + 0.5;

        if (alcohol.result === "none") {
          setTurbidity(0);
        } else {
          const progress = Math.min(1, next / alcohol.reactionTime);
          setTurbidity(progress);
        }

        if (next >= Math.min(alcohol.reactionTime * 1.2, 25)) {
          clearInterval(timerRef.current!);
          setIsRunning(false);
          setIsDone(true);

          if (!testsDone.has(alcohol.id)) {
            setTestsDone((prev) => new Set(Array.from(prev).concat(alcohol.id)));
            addScore(15);
            onScoreUpdate?.(15);
            const obs = alcohol.result === "immediate"
              ? `${alcohol.name} (${alcohol.type}): immediate turbidity — 3° alcohol.`
              : alcohol.result === "5min"
              ? `${alcohol.name} (${alcohol.type}): turbidity after ~5 min — 2° alcohol.`
              : `${alcohol.name} (${alcohol.type}): no turbidity — 1° alcohol.`;
            addObservation(obs);
          }

          if (currentMode === "Guided" && currentStep === 2) nextStep();
        }

        return next;
      });
    }, 500);
  }

  function handleReset() {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false);
    setElapsed(0);
    setTurbidity(0);
    setIsDone(false);
  }

  const resultLabel = isDone && selectedAlcohol
    ? selectedAlcohol.result === "immediate"
    ? "Turbidity immediately → 3° alcohol"
    : selectedAlcohol.result === "5min"
    ? "Turbid within 5 min → 2° alcohol"
    : "No turbidity → 1° alcohol"
    : "";

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
          <span className="text-amber-300 font-semibold">Lucas reagent</span> = ZnCl₂ + conc. HCl.
          R-OH + HCl → R-Cl + H₂O (turbidity from insoluble RCl).{" "}
          <span className="text-red-400">3° → immediate</span> (stable carbocation, SN1).{" "}
          <span className="text-amber-400">2° → 5 min</span>.{" "}
          <span className="text-slate-400">1° → no reaction</span> at RT.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: selector */}
        <div className="space-y-3">
          <p className="text-slate-400 text-xs font-orbitron tracking-wider">SELECT ALCOHOL</p>
          <div className="space-y-1.5">
            {ALCOHOLS.map((a) => (
              <button key={a.id}
                onClick={() => { setSelectedAlcohol(a); handleReset(); }}
                className={`w-full p-2.5 rounded border text-left text-xs font-rajdhani transition-all ${
                  selectedAlcohol?.id === a.id ? "border-2 text-white" : "border-border text-slate-300 hover:border-slate-500"
                }`}
                style={selectedAlcohol?.id === a.id ? { borderColor: a.color, backgroundColor: a.color + "15" } : undefined}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold">{a.formula}</span>
                    <span className="text-slate-500 ml-1">— {a.name}</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-xs flex-shrink-0 ${
                    a.type === "tertiary" ? "bg-red-900/30 text-red-400"
                    : a.type === "secondary" ? "bg-amber-900/30 text-amber-400"
                    : "bg-slate-800 text-slate-400"
                  }`}>
                    {a.type === "tertiary" ? "3°" : a.type === "secondary" ? "2°" : "1°"}
                  </span>
                </div>
                {testsDone.has(a.id) && <span className="text-green-400 text-xs mt-0.5 block">✓ tested</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Right: tube and result */}
        <div className="flex flex-col items-center gap-4">
          <LucasTube turbidity={turbidity} label={selectedAlcohol?.formula ?? "—"} />

          {/* Timer */}
          <div className="text-center">
            <div className={`font-orbitron text-2xl font-bold tabular-nums ${
              isRunning ? "text-amber-400" : isDone && turbidity > 0 ? "text-red-400" : "text-slate-600"
            }`}>
              {elapsed.toFixed(1)}s
            </div>
            {isDone && (
              <motion.p
                className={`text-sm font-rajdhani mt-1 font-semibold ${
                  turbidity > 0.8 ? "text-red-400" : turbidity > 0.1 ? "text-amber-400" : "text-slate-400"
                }`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              >
                {resultLabel}
              </motion.p>
            )}
          </div>

          <div className="flex gap-2">
            {selectedAlcohol && !isRunning && (
              <motion.button onClick={startTest} whileTap={{ scale: 0.96 }}
                className="px-4 py-2 bg-amber-800/50 hover:bg-amber-700/60 text-white text-sm font-rajdhani font-semibold border border-amber-600/40 rounded transition-all">
                Add to Lucas Reagent
              </motion.button>
            )}
            {(isRunning || isDone) && (
              <button onClick={handleReset} className="px-3 py-2 text-slate-400 hover:text-white text-xs font-rajdhani border border-border rounded transition-colors">
                New test
              </button>
            )}
          </div>

          {/* Detail card */}
          <AnimatePresence>
            {isDone && selectedAlcohol && (
              <motion.div className={`rounded border p-3 w-full ${
                selectedAlcohol.type === "tertiary" ? "border-red-600/40 bg-red-900/10"
                : selectedAlcohol.type === "secondary" ? "border-amber-600/40 bg-amber-900/10"
                : "border-slate-700/40 bg-slate-900/20"
              }`}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p className={`font-orbitron text-xs font-bold mb-1 ${
                  selectedAlcohol.type === "tertiary" ? "text-red-400"
                  : selectedAlcohol.type === "secondary" ? "text-amber-400"
                  : "text-slate-400"
                }`}>
                  {selectedAlcohol.type === "tertiary" ? "3° ALCOHOL — Immediate"
                  : selectedAlcohol.type === "secondary" ? "2° ALCOHOL — 5 min"
                  : "1° ALCOHOL — No reaction"}
                </p>
                <p className="text-white font-rajdhani text-sm">{selectedAlcohol.formula} ({selectedAlcohol.name})</p>
                <p className="text-slate-400 text-xs font-rajdhani mt-1">{selectedAlcohol.mechanism}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Summary table */}
      <div className="rounded border border-border overflow-hidden">
        <div className="px-3 py-2 bg-navy/30 border-b border-border">
          <p className="text-xs font-orbitron text-slate-400 tracking-wider">LUCAS TEST SUMMARY</p>
        </div>
        <table className="w-full text-xs font-rajdhani">
          <thead>
            <tr className="border-b border-border bg-navy/20">
              <th className="text-left px-3 py-1.5 text-slate-400">Alcohol type</th>
              <th className="text-left px-3 py-1.5 text-slate-400">Result</th>
              <th className="text-left px-3 py-1.5 text-slate-400">Mechanism</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="px-3 py-2 text-red-400 font-semibold">3° (tertiary)</td>
              <td className="px-3 py-2 text-white">Immediate turbidity</td>
              <td className="px-3 py-2 text-slate-400">SN1 — stable 3° carbocation</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-3 py-2 text-amber-400 font-semibold">2° (secondary)</td>
              <td className="px-3 py-2 text-white">Turbid within 5 min</td>
              <td className="px-3 py-2 text-slate-400">SN1 — 2° carbocation, slower</td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-slate-400 font-semibold">1° (primary)</td>
              <td className="px-3 py-2 text-white">No turbidity at RT</td>
              <td className="px-3 py-2 text-slate-400">SN2 only — no 1° carbocation</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
