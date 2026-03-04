"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Compound {
  id: string;
  name: string;
  formula: string;
  type: "aldehyde" | "ketone" | "reducing-sugar" | "non-reducing-sugar";
  positive: boolean;
  description: string;
}

const COMPOUNDS: Compound[] = [
  {
    id: "methanal",
    name: "Methanal",
    formula: "HCHO",
    type: "aldehyde",
    positive: true,
    description: "Aldehyde — reduces Cu²⁺ to Cu₂O (brick-red precipitate).",
  },
  {
    id: "ethanal",
    name: "Ethanal (acetaldehyde)",
    formula: "CH₃CHO",
    type: "aldehyde",
    positive: true,
    description: "Aliphatic aldehyde — positive Fehling's test.",
  },
  {
    id: "glucose",
    name: "Glucose",
    formula: "C₆H₁₂O₆",
    type: "reducing-sugar",
    positive: true,
    description: "Reducing sugar with free aldehyde group — positive Fehling's.",
  },
  {
    id: "propanone",
    name: "Propanone (acetone)",
    formula: "CH₃COCH₃",
    type: "ketone",
    positive: false,
    description: "Ketone — cannot reduce Cu²⁺. Deep blue colour persists.",
  },
  {
    id: "sucrose",
    name: "Sucrose",
    formula: "C₁₂H₂₂O₁₁",
    type: "non-reducing-sugar",
    positive: false,
    description: "Non-reducing sugar — glycosidic bond blocks reducing end.",
  },
  {
    id: "benzaldehyde",
    name: "Benzaldehyde",
    formula: "C₆H₅CHO",
    type: "aldehyde",
    positive: false,
    description: "Aromatic aldehyde — does NOT give Fehling's test (negative). Aromatic aldehydes are less reactive.",
  },
];

const GUIDED_STEPS = [
  {
    id: 0,
    title: "Prepare Fehling's solution",
    instructions:
      "Mix equal volumes of Fehling's A (CuSO₄ solution) and Fehling's B (alkaline sodium potassium tartrate). The deep blue solution contains Cu²⁺ complexed with tartrate.",
  },
  {
    id: 1,
    title: "Add test compound & heat",
    instructions:
      "Add the test compound to Fehling's solution. Heat in a boiling water bath for 3–5 minutes. Watch for a colour change.",
  },
  {
    id: 2,
    title: "Observe the result",
    instructions:
      "Positive: Deep blue → brick-red precipitate (Cu₂O). Negative: Solution remains blue. Record observations for each compound.",
  },
  {
    id: 3,
    title: "Interpret results",
    instructions:
      "Aliphatic aldehydes and reducing sugars give positive Fehling's. Ketones and aromatic aldehydes give negative results. Equation: RCHO + 2Cu²⁺ + 4OH⁻ → RCOO⁻ + Cu₂O↓ + 2H₂O",
  },
];

// ─── Test tube SVG ────────────────────────────────────────────────────────────

function FehlingTube({
  stage,
  color,
}: {
  stage: "initial" | "heating" | "positive" | "negative";
  color: string;
}) {
  const liquidColor =
    stage === "positive" ? "#C1440E" : color;
  const precipitateHeight = stage === "positive" ? 28 : 0;

  return (
    <svg viewBox="0 0 60 180" width="75" height="200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="ft-clip">
          <path d="M15 10 L15 140 Q15 165 30 165 Q45 165 45 140 L45 10 Z" />
        </clipPath>
        <linearGradient id="cu2o-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C1440E" />
          <stop offset="100%" stopColor="#8B2500" />
        </linearGradient>
      </defs>

      {/* Tube */}
      <path
        d="M15 10 L15 140 Q15 165 30 165 Q45 165 45 140 L45 10"
        fill="rgba(200,220,255,0.06)"
        stroke="#334155"
        strokeWidth="1.5"
      />

      {/* Liquid */}
      <rect
        x="15"
        y="50"
        width="30"
        height="120"
        fill={liquidColor}
        clipPath="url(#ft-clip)"
        opacity={0.7}
        style={{ transition: "fill 2s ease" }}
      />

      {/* Cu₂O precipitate at bottom */}
      {precipitateHeight > 0 && (
        <rect
          x="15"
          y={165 - precipitateHeight}
          width="30"
          height={precipitateHeight}
          fill="url(#cu2o-grad)"
          clipPath="url(#ft-clip)"
          opacity={0.9}
        />
      )}

      {/* Bubbles (heating) */}
      {stage === "heating" && (
        <>
          {[22, 30, 38].map((x, i) => (
            <motion.circle
              key={i}
              cx={x}
              cy={140}
              r="2"
              fill="rgba(255,255,255,0.25)"
              animate={{ cy: [140, 90], opacity: [0.6, 0] }}
              transition={{ duration: 1, delay: i * 0.35, repeat: Infinity }}
            />
          ))}
        </>
      )}

      {/* Shine */}
      <path d="M20 10 L20 160" stroke="rgba(255,255,255,0.1)" strokeWidth="2" clipPath="url(#ft-clip)" />
      <rect x="13" y="8" width="34" height="4" fill="#1E293B" rx="2" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface FehlingTestProps {
  onScoreUpdate?: (pts: number) => void;
}

export function FehlingTest({ onScoreUpdate }: FehlingTestProps) {
  const { currentMode, currentStep, nextStep, addScore, addObservation } =
    useExperimentStore();

  const [reagentReady, setReagentReady] = useState(false);
  const [selectedCompound, setSelectedCompound] = useState<Compound | null>(null);
  const [added, setAdded] = useState(false);
  const [stage, setStage] = useState<"initial" | "heating" | "positive" | "negative">("initial");
  const [heatingPct, setHeatingPct] = useState(0);
  const [testsDone, setTestsDone] = useState<string[]>([]);

  // Heating simulation
  useEffect(() => {
    if (stage !== "heating") return;
    const interval = setInterval(() => {
      setHeatingPct((p) => {
        const next = p + 2;
        if (next >= 100) {
          clearInterval(interval);
          const result = selectedCompound?.positive ? "positive" : "negative";
          setStage(result);
          const obs = selectedCompound?.positive
            ? `${selectedCompound.formula}: Deep blue → brick-red Cu₂O precipitate. POSITIVE.`
            : `${selectedCompound?.formula}: Solution remains deep blue. NEGATIVE.`;
          addObservation(obs);
          if (selectedCompound && !testsDone.includes(selectedCompound.id)) {
            setTestsDone((prev) => [...prev, selectedCompound.id]);
            addScore(15);
            onScoreUpdate?.(15);
          }
          if (currentMode === "Guided" && currentStep === 2) nextStep();
          return 100;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [stage, selectedCompound, currentMode, currentStep, nextStep, addObservation, addScore, onScoreUpdate, testsDone]);

  function handlePrepare() {
    setReagentReady(true);
    if (currentMode === "Guided" && currentStep === 0) nextStep();
  }

  function handleAdd() {
    if (!selectedCompound || !reagentReady) return;
    setAdded(true);
    setStage("initial");
    setHeatingPct(0);
    if (currentMode === "Guided" && currentStep === 1) nextStep();
  }

  function handleHeat() {
    if (!added) return;
    setStage("heating");
    setHeatingPct(0);
  }

  function handleReset() {
    setAdded(false);
    setStage("initial");
    setHeatingPct(0);
  }

  const tubeColor =
    stage === "positive"
      ? "#C1440E"
      : stage === "negative" || stage === "initial" || stage === "heating"
      ? "#1E4DB7"
      : "#1E4DB7";

  return (
    <div className="space-y-4">
      {/* Guided step */}
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

      {/* Theory */}
      <div className="bg-navy/40 border border-border rounded p-3 text-xs font-rajdhani">
        <p className="text-slate-300 leading-relaxed">
          <span className="text-blue-300 font-semibold">Fehling's solution</span> (deep blue Cu²⁺) is
          reduced by <span className="text-teal">aliphatic aldehydes</span> and{" "}
          <span className="text-teal">reducing sugars</span> to give a{" "}
          <span className="text-orange-400 font-semibold">brick-red Cu₂O precipitate</span>.{" "}
          <span className="text-red-400">Ketones and aromatic aldehydes</span> do not react.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: controls */}
        <div className="space-y-4">
          <button
            onClick={handlePrepare}
            disabled={reagentReady}
            className={`px-4 py-2 text-xs font-rajdhani font-semibold rounded border transition-all ${
              reagentReady
                ? "border-teal/30 text-teal bg-teal/10 cursor-default"
                : "border-blue-500/50 text-blue-300 hover:bg-blue-900/20"
            }`}
          >
            {reagentReady ? "✓ Fehling's Solution Ready" : "Mix Fehling's A + B"}
          </button>

          <div>
            <p className="text-slate-400 text-xs font-orbitron tracking-wider mb-2">
              SELECT COMPOUND
            </p>
            <div className="space-y-1">
              {COMPOUNDS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCompound(c); handleReset(); }}
                  disabled={!reagentReady}
                  className={`
                    w-full p-2 rounded border text-left text-xs font-rajdhani transition-all
                    ${!reagentReady ? "opacity-40 cursor-not-allowed" : ""}
                    ${selectedCompound?.id === c.id
                      ? "border-blue-400/50 bg-blue-900/20 text-white"
                      : "border-border text-slate-300 hover:border-slate-500"}
                  `}
                >
                  <span className="font-semibold">{c.formula}</span>
                  {" — "}
                  <span>{c.name}</span>
                  <span
                    className={`ml-2 text-xs px-1 py-0.5 rounded ${
                      c.positive ? "bg-teal/20 text-teal" : "bg-red-900/30 text-red-400"
                    }`}
                  >
                    {c.type}
                  </span>
                  {testsDone.includes(c.id) && <span className="ml-1 text-green-400">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: tube */}
        <div className="flex flex-col items-center gap-3">
          <FehlingTube stage={stage} color={tubeColor} />

          {/* Status */}
          <div className="text-center space-y-1">
            {!reagentReady && (
              <p className="text-slate-600 text-xs font-rajdhani">Prepare Fehling's solution first</p>
            )}
            {reagentReady && !added && (
              <p className="text-blue-300 text-xs font-rajdhani">Deep blue Cu²⁺ complex ready</p>
            )}
            {stage === "heating" && (
              <p className="text-orange-300 text-xs font-rajdhani animate-pulse">
                Heating… {heatingPct}%
              </p>
            )}
            {stage === "positive" && (
              <motion.p
                className="text-orange-400 font-semibold text-sm font-rajdhani"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                🟤 Brick-red Cu₂O formed!
              </motion.p>
            )}
            {stage === "negative" && (
              <motion.p
                className="text-blue-400 text-sm font-rajdhani"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Deep blue — No reaction
              </motion.p>
            )}
          </div>

          {/* Heating progress */}
          {stage === "heating" && (
            <div className="w-full max-w-[140px]">
              <div className="h-1 bg-border rounded-full">
                <div
                  className="h-1 bg-orange-500 rounded-full transition-all"
                  style={{ width: `${heatingPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 flex-wrap justify-center">
            {selectedCompound && reagentReady && !added && (
              <motion.button
                onClick={handleAdd}
                whileTap={{ scale: 0.96 }}
                className="px-3 py-2 bg-blue-800/40 hover:bg-blue-700/50 text-blue-200 text-xs font-rajdhani border border-blue-600/40 rounded transition-all"
              >
                Add {selectedCompound.formula}
              </motion.button>
            )}
            {added && stage === "initial" && (
              <motion.button
                onClick={handleHeat}
                whileTap={{ scale: 0.96 }}
                className="px-3 py-2 bg-orange-800/40 hover:bg-orange-700/50 text-orange-200 text-xs font-rajdhani border border-orange-600/40 rounded transition-all"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                🔥 Heat (water bath)
              </motion.button>
            )}
            {added && (
              <button
                onClick={handleReset}
                className="px-3 py-2 text-slate-400 hover:text-white text-xs font-rajdhani border border-border rounded transition-colors"
              >
                New test
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Result detail */}
      <AnimatePresence>
        {(stage === "positive" || stage === "negative") && selectedCompound && (
          <motion.div
            className={`rounded border p-4 ${
              stage === "positive"
                ? "border-orange-700/30 bg-orange-900/10"
                : "border-blue-700/30 bg-blue-900/10"
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <p className={`font-orbitron text-sm font-bold mb-2 ${stage === "positive" ? "text-orange-400" : "text-blue-400"}`}>
              {stage === "positive" ? "POSITIVE — REDUCING COMPOUND" : "NEGATIVE — NON-REDUCING"}
            </p>
            <p className="text-white font-rajdhani text-sm">
              <strong>{selectedCompound.formula}</strong> ({selectedCompound.name})
            </p>
            <p className="text-slate-400 text-xs font-rajdhani mt-1">{selectedCompound.description}</p>
            {stage === "positive" && (
              <p className="text-slate-500 text-xs font-rajdhani mt-2">
                RCHO + 2Cu²⁺ + 4OH⁻ → RCOO⁻ + Cu₂O↓ + 2H₂O
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results table */}
      {testsDone.length > 0 && (
        <div className="rounded border border-border overflow-hidden">
          <div className="px-3 py-2 bg-navy/30 border-b border-border">
            <p className="text-xs font-orbitron text-slate-400 tracking-wider">RESULTS</p>
          </div>
          <table className="w-full text-xs font-rajdhani">
            <thead>
              <tr className="border-b border-border bg-navy/20">
                <th className="text-left px-3 py-1.5 text-slate-400">Compound</th>
                <th className="text-left px-3 py-1.5 text-slate-400">Type</th>
                <th className="text-left px-3 py-1.5 text-slate-400">Fehling's Result</th>
              </tr>
            </thead>
            <tbody>
              {COMPOUNDS.filter((c) => testsDone.includes(c.id)).map((c) => (
                <tr key={c.id} className="border-b border-border/50">
                  <td className="px-3 py-1.5 text-white">{c.formula}</td>
                  <td className="px-3 py-1.5 text-slate-400">{c.type}</td>
                  <td className="px-3 py-1.5">
                    <span className={c.positive ? "text-orange-400" : "text-blue-400"}>
                      {c.positive ? "🟤 Brick-red ppt" : "💙 No change (blue)"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
