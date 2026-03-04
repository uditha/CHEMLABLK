"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";
import { StepWizard } from "../../StepWizard";
import { CompletionOverlay } from "../../CompletionOverlay";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useSession } from "next-auth/react";
import { saveProgress } from "@/lib/progress";
import type { StepDefinition } from "../../StepWizard";

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
    description: "Aromatic aldehyde — does NOT give Fehling's test. Aromatic aldehydes are less reactive.",
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
  const liquidColor = stage === "positive" ? "#C1440E" : color;
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

// ─── Observations Panel ───────────────────────────────────────────────────────

function ObservationsPanel({ observations, testsDone }: { observations: string[]; testsDone: string[] }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">OBSERVATIONS</p>
        {observations.length === 0 ? (
          <p className="text-slate-600 text-xs font-rajdhani">No observations recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {observations.map((obs, i) => (
              <div key={i} className="text-xs font-rajdhani text-slate-300 bg-navy/30 rounded p-2 border border-border/50">
                {obs}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">PROGRESS</p>
        <div className="flex gap-1 flex-wrap">
          {COMPOUNDS.map((c) => (
            <div
              key={c.id}
              className={`w-8 h-7 rounded flex items-center justify-center text-xs font-orbitron font-bold ${
                testsDone.includes(c.id)
                  ? c.positive ? "bg-orange-900/30 text-orange-400" : "bg-blue-900/30 text-blue-400"
                  : "bg-border/30 text-slate-700"
              }`}
              title={c.formula}
            >
              {testsDone.includes(c.id) ? "✓" : "·"}
            </div>
          ))}
        </div>
        <p className="text-slate-600 text-xs font-rajdhani mt-1">{testsDone.length}/{COMPOUNDS.length} tested</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface FehlingTestProps {
  onScoreUpdate?: (pts: number) => void;
}

export function FehlingTest({ onScoreUpdate }: FehlingTestProps) {
  const { addScore, addObservation, setTotalSteps, setStep, score, completeMode, currentMode, resetExperiment } =
    useExperimentStore();
  const { playSuccess } = useSoundEffects();
  const { data: session } = useSession();
  const startTimeRef = useRef(Date.now());
  const [showCompletion, setShowCompletion] = useState(false);

  const [reagentReady, setReagentReady] = useState(false);
  const [selectedCompound, setSelectedCompound] = useState<Compound | null>(null);
  const [added, setAdded] = useState(false);
  const [stage, setStage] = useState<"initial" | "heating" | "positive" | "negative">("initial");
  const [heatingPct, setHeatingPct] = useState(0);
  const [testsDone, setTestsDone] = useState<string[]>([]);
  const [observations, setObservationsLocal] = useState<string[]>([]);

  useEffect(() => { setTotalSteps(4); }, [setTotalSteps]);

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
          setObservationsLocal((prev) => [...prev, obs]);
          if (selectedCompound && !testsDone.includes(selectedCompound.id)) {
            setTestsDone((prev) => [...prev, selectedCompound.id]);
            playSuccess();
            addScore(15);
            onScoreUpdate?.(15);
          }
          return 100;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [stage, selectedCompound, addObservation, addScore, onScoreUpdate, testsDone, playSuccess]);

  function handlePrepare() { setReagentReady(true); }

  function handleAdd() {
    if (!selectedCompound || !reagentReady) return;
    setAdded(true);
    setStage("initial");
    setHeatingPct(0);
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

  function handleTestAnother() {
    handleReset();
    setSelectedCompound(null);
    setStep(1);
  }

  function handleComplete() {
    completeMode("fehlings-test", currentMode);
    setShowCompletion(true);
    if (session?.user?.role === "student") {
      const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      saveProgress({ slug: "fehlings-test", mode: currentMode, score, timeSpentSeconds }).catch(() => {});
    }
  }

  function handleDoAgain() {
    resetExperiment();
    handleReset();
    setSelectedCompound(null);
    setReagentReady(false);
    setTestsDone([]);
    setObservationsLocal([]);
    setStep(0);
    startTimeRef.current = Date.now();
    setShowCompletion(false);
  }

  const tubeColor = stage === "positive" ? "#C1440E" : "#1E4DB7";

  // ─── Step Definitions ──────────────────────────────────────────────────────

  const steps: StepDefinition[] = useMemo(() => [
    {
      id: "prepare",
      title: "Prepare Fehling's Solution",
      subtitle: "Mix equal volumes of Fehling's A and Fehling's B.",
      canProceed: reagentReady,
      instructions: {
        procedure: [
          "Take a clean test tube",
          "Add equal volumes (~2 cm³ each) of Fehling's Solution A (CuSO₄) and Fehling's Solution B (alkaline sodium potassium tartrate)",
          "Mix gently — a deep blue solution forms",
          "The tartrate complexes Cu²⁺ to keep it in solution at alkaline pH",
        ],
        safetyNotes: [
          "Fehling's B contains NaOH — avoid contact with skin and eyes",
          "Wear safety goggles and gloves throughout",
        ],
        expectedObservations: [
          "Deep blue solution forms immediately after mixing A and B",
          "The blue colour is due to the Cu²⁺–tartrate complex",
        ],
        tips: [
          "Fehling's solution must be freshly mixed before each test",
          "A pre-mixed solution may decompose — always mix A and B just before use",
        ],
      },
      quiz: {
        question: "What gives Fehling's solution its characteristic deep blue colour?",
        options: [
          "Free copper metal",
          "Cu²⁺ ions complexed with tartrate in alkaline solution",
          "Sodium potassium tartrate alone",
          "Iron(III) ions",
        ],
        correctIndex: 1,
        explanation: "The deep blue colour is from Cu²⁺ ions complexed with tartrate (from Fehling's B) in an alkaline medium. This complex is the oxidising agent in the test.",
      },
      content: (
        <div className="flex flex-col items-center justify-center h-full gap-5 p-4">
          <motion.button
            onClick={handlePrepare}
            disabled={reagentReady}
            whileTap={{ scale: 0.96 }}
            className={`px-8 py-4 rounded-lg text-sm font-rajdhani font-bold border-2 transition-all ${
              reagentReady
                ? "border-teal/50 text-teal bg-teal/10 cursor-default"
                : "border-blue-500/60 text-blue-200 bg-blue-900/20 hover:bg-blue-800/30 hover:border-blue-400"
            }`}
          >
            {reagentReady ? "✓ Fehling's Solution Ready" : "Mix Fehling's A + B"}
          </motion.button>
          {reagentReady && (
            <motion.p className="text-blue-300 text-sm font-rajdhani text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              Deep blue Cu²⁺–tartrate complex prepared.
            </motion.p>
          )}
        </div>
      ),
      theory: (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-orbitron text-blue-300/80 tracking-wider mb-2">THEORY</p>
            <p className="text-slate-300 text-xs font-rajdhani leading-relaxed">
              <span className="text-blue-300 font-semibold">Fehling&apos;s solution</span> is a deep blue alkaline solution of Cu²⁺ ions stabilised by tartrate ligands.
            </p>
            <p className="text-slate-300 text-xs font-rajdhani leading-relaxed mt-2">
              It acts as a mild <span className="text-teal font-semibold">oxidising agent</span> — able to oxidise aliphatic aldehydes and reducing sugars.
            </p>
          </div>
          <div>
            <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1">COMPONENTS</p>
            <p className="text-slate-400 text-xs font-rajdhani">A: CuSO₄ (aq)</p>
            <p className="text-slate-400 text-xs font-rajdhani">B: NaOH + Na/K tartrate (aq)</p>
          </div>
        </div>
      ),
    },

    {
      id: "select",
      title: "Select Test Compound",
      subtitle: "Choose an organic compound to test with Fehling's solution.",
      canProceed: selectedCompound !== null,
      instructions: {
        procedure: [
          "Choose a compound from the list",
          "Identify whether it is an aliphatic aldehyde, aromatic aldehyde, ketone, or sugar",
          "Predict your expected result before heating",
        ],
        tips: [
          "Aliphatic aldehydes (R-CHO) and reducing sugars should give a positive result",
          "Ketones (R-CO-R) and aromatic aldehydes are predicted to give negative",
          "Try all 6 compounds to build a complete reference table",
        ],
      },
      quiz: {
        question: "Which of the following gives a positive Fehling's test?",
        options: [
          "Propanone (acetone)",
          "Benzaldehyde",
          "Ethanal (acetaldehyde)",
          "Sucrose",
        ],
        correctIndex: 2,
        explanation: "Ethanal is an aliphatic aldehyde — it can reduce Cu²⁺ to Cu₂O. Propanone is a ketone, benzaldehyde is aromatic (less reactive), and sucrose is a non-reducing sugar.",
      },
      content: (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
          <div className="grid grid-cols-1 gap-2 w-full max-w-md">
            {COMPOUNDS.map((c) => (
              <button
                key={c.id}
                onClick={() => { setSelectedCompound(c); handleReset(); }}
                className={`p-3 rounded-lg border-2 text-left font-rajdhani transition-all ${
                  selectedCompound?.id === c.id
                    ? "border-blue-400/60 bg-blue-900/20 text-white"
                    : "border-border text-slate-300 hover:border-slate-500"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{c.formula} <span className="font-normal text-slate-400">— {c.name}</span></span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    c.type === "aldehyde" ? "bg-teal/20 text-teal" :
                    c.type === "reducing-sugar" ? "bg-green-900/30 text-green-400" :
                    "bg-red-900/30 text-red-400"
                  }`}>{c.type}</span>
                </div>
                {testsDone.includes(c.id) && <span className="text-green-400 text-xs">✓ tested</span>}
              </button>
            ))}
          </div>
        </div>
      ),
      theory: selectedCompound ? (
        <div>
          <p className="text-xs font-orbitron text-blue-300/80 tracking-wider mb-2">SELECTED</p>
          <p className="text-white text-sm font-rajdhani font-semibold">{selectedCompound.formula}</p>
          <p className="text-slate-400 text-xs font-rajdhani mt-1">{selectedCompound.name}</p>
          <p className="text-slate-500 text-xs font-rajdhani mt-2">{selectedCompound.description}</p>
        </div>
      ) : (
        <p className="text-slate-600 text-xs font-rajdhani">Select a compound to see details.</p>
      ),
    },

    {
      id: "heat",
      title: "Add Compound & Heat",
      subtitle: "Heat in a boiling water bath for 3–5 minutes.",
      canProceed: stage === "positive" || stage === "negative",
      instructions: {
        procedure: [
          "Add a few drops of the test compound to the Fehling's solution",
          "Place the test tube in a boiling water bath",
          "Heat for 3–5 minutes — watch for colour change",
          "Record the final colour of the solution",
        ],
        safetyNotes: [
          "Use tongs when handling hot test tubes from the water bath",
          "Do not direct the tube opening towards anyone",
          "Ensure the water bath is stable before heating",
        ],
        expectedObservations: [
          "Positive: deep blue → brick-red Cu₂O precipitate settles at bottom",
          "Negative: solution remains deep blue throughout",
        ],
        tips: [
          "Heat gently and evenly — this ensures consistent results",
          "The brick-red precipitate is Cu₂O (copper(I) oxide)",
        ],
      },
      quiz: {
        question: "What is the brick-red precipitate formed in a positive Fehling's test?",
        options: [
          "Copper(II) oxide (CuO)",
          "Copper metal (Cu)",
          "Copper(I) oxide (Cu₂O)",
          "Copper hydroxide Cu(OH)₂",
        ],
        correctIndex: 2,
        explanation: "Cu²⁺ is reduced to Cu⁺, forming copper(I) oxide (Cu₂O) — the characteristic brick-red precipitate of a positive Fehling's test.",
      },
      content: (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
          <FehlingTube stage={stage} color={tubeColor} />

          <div className="text-center space-y-1">
            {!added && (
              <p className="text-blue-300 text-xs font-rajdhani">Deep blue Cu²⁺ complex ready</p>
            )}
            {stage === "heating" && (
              <p className="text-orange-300 text-xs font-rajdhani animate-pulse">
                Heating in water bath… {heatingPct}%
              </p>
            )}
            {stage === "positive" && (
              <motion.p className="text-orange-400 font-semibold text-sm font-rajdhani" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                Brick-red Cu₂O formed!
              </motion.p>
            )}
            {stage === "negative" && (
              <motion.p className="text-blue-400 text-sm font-rajdhani" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                Deep blue — No reaction
              </motion.p>
            )}
          </div>

          {stage === "heating" && (
            <div className="w-full max-w-[160px]">
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <motion.div className="h-full bg-orange-500 rounded-full" style={{ width: `${heatingPct}%` }} />
              </div>
            </div>
          )}

          <div className="flex gap-2 flex-wrap justify-center">
            {selectedCompound && reagentReady && !added && (
              <motion.button
                onClick={handleAdd}
                whileTap={{ scale: 0.96 }}
                className="px-5 py-2.5 bg-blue-800/40 hover:bg-blue-700/50 text-blue-200 text-sm font-rajdhani font-semibold border border-blue-600/40 rounded-lg transition-all"
              >
                Add {selectedCompound.formula}
              </motion.button>
            )}
            {added && stage === "initial" && (
              <motion.button
                onClick={handleHeat}
                whileTap={{ scale: 0.96 }}
                className="px-5 py-2.5 bg-orange-800/40 hover:bg-orange-700/50 text-orange-200 text-sm font-rajdhani font-semibold border border-orange-600/40 rounded-lg transition-all"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                Heat (water bath)
              </motion.button>
            )}
          </div>
        </div>
      ),
      theory: (stage === "positive" || stage === "negative") && selectedCompound ? (
        <div>
          <AnimatePresence>
            <motion.div
              className={`rounded-lg border p-3 ${stage === "positive" ? "border-orange-700/30 bg-orange-900/10" : "border-blue-700/30 bg-blue-900/10"}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className={`font-orbitron text-xs font-bold mb-1 ${stage === "positive" ? "text-orange-400" : "text-blue-400"}`}>
                {stage === "positive" ? "POSITIVE — REDUCING COMPOUND" : "NEGATIVE — NON-REDUCING"}
              </p>
              <p className="text-white font-rajdhani text-xs">{selectedCompound.formula} ({selectedCompound.name})</p>
              <p className="text-slate-400 text-xs font-rajdhani mt-1">{selectedCompound.description}</p>
              {stage === "positive" && (
                <p className="text-slate-500 text-xs font-mono mt-2">
                  RCHO + 2Cu²⁺ + 4OH⁻ → RCOO⁻ + Cu₂O↓ + 2H₂O
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <p className="text-slate-600 text-xs font-rajdhani">Waiting for result…</p>
      ),
    },

    {
      id: "results",
      title: "Results & Summary",
      subtitle: "Review all tests. Try more compounds or complete the experiment.",
      canProceed: true,
      instructions: {
        procedure: [
          "Review the results table for all tested compounds",
          "Identify the pattern: which functional groups give positive results?",
          "Test remaining compounds for a complete data set",
          "Click Complete when you have finished all tests",
        ],
        tips: [
          "Aliphatic aldehydes (R-CHO) and reducing sugars → positive (brick-red Cu₂O)",
          "Ketones (R-CO-R) and aromatic aldehydes → negative (stays blue)",
          "This distinguishes aldehydes from ketones in the Sri Lankan A/L syllabus",
        ],
      },
      content: (
        <div className="flex flex-col h-full gap-3 p-4 overflow-y-auto">
          {testsDone.length > 0 ? (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-2 bg-navy/30 border-b border-border">
                <p className="text-xs font-orbitron text-slate-400 tracking-wider">RESULTS TABLE</p>
              </div>
              <table className="w-full text-xs font-rajdhani">
                <thead>
                  <tr className="border-b border-border bg-navy/20">
                    <th className="text-left px-3 py-2 text-slate-400">Compound</th>
                    <th className="text-left px-3 py-2 text-slate-400">Type</th>
                    <th className="text-left px-3 py-2 text-slate-400">Fehling&apos;s Result</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPOUNDS.filter((c) => testsDone.includes(c.id)).map((c) => (
                    <tr key={c.id} className="border-b border-border/50">
                      <td className="px-3 py-2 text-white">{c.formula}</td>
                      <td className="px-3 py-2 text-slate-400">{c.type}</td>
                      <td className="px-3 py-2">
                        <span className={c.positive ? "text-orange-400" : "text-blue-400"}>
                          {c.positive ? "Brick-red Cu₂O ppt" : "No change (blue)"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-600 text-sm font-rajdhani">No tests completed yet.</p>
            </div>
          )}
          <div className="flex justify-center">
            <button
              onClick={handleTestAnother}
              className="px-5 py-2 text-teal hover:text-white text-sm font-rajdhani font-semibold border border-teal/40 hover:bg-teal/10 rounded-lg transition-all"
            >
              Test Another Compound
            </button>
          </div>
        </div>
      ),
      theory: (
        <div className="space-y-2">
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">KEY TAKEAWAY</p>
          <p className="text-slate-300 text-xs font-rajdhani leading-relaxed">
            Brick-red Cu₂O → <span className="text-orange-400 font-semibold">aliphatic aldehyde or reducing sugar</span>.
          </p>
          <p className="text-slate-300 text-xs font-rajdhani leading-relaxed">
            No change (stays blue) → <span className="text-blue-400 font-semibold">ketone or aromatic aldehyde</span>.
          </p>
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1">EQUATION</p>
            <p className="text-slate-500 text-xs font-mono">RCHO + 2Cu²⁺ + 4OH⁻ → RCOO⁻ + Cu₂O↓ + 2H₂O</p>
          </div>
        </div>
      ),
    },
  ], [reagentReady, selectedCompound, added, stage, heatingPct, tubeColor, testsDone]);

  const persistentNotes = useMemo(() => (
    <ObservationsPanel observations={observations} testsDone={testsDone} />
  ), [observations, testsDone]);

  const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

  return (
    <>
      <StepWizard
        steps={steps}
        persistentNotes={persistentNotes}
        experimentTitle="Fehling's Test — Aldehydes & Reducing Sugars"
        onComplete={handleComplete}
      />
      {showCompletion && (
        <CompletionOverlay
          experimentTitle="Fehling's Test — Aldehydes & Reducing Sugars"
          score={score}
          maxScore={90}
          itemsTested={testsDone.length}
          totalItems={COMPOUNDS.length}
          timeSpentSeconds={timeSpentSeconds}
          onDoAgain={handleDoAgain}
        />
      )}
    </>
  );
}
