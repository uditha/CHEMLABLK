"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
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
  type: "aldehyde" | "ketone";
  description: string;
  color: string;
}

const COMPOUNDS: Compound[] = [
  { id: "methanal", name: "Methanal (formaldehyde)", formula: "HCHO", type: "aldehyde", description: "Simplest aldehyde. Very strong reducing agent.", color: "#FFF8DC" },
  { id: "ethanal", name: "Ethanal (acetaldehyde)", formula: "CH₃CHO", type: "aldehyde", description: "Aldehyde — R-CHO group present. Reduces Tollens' reagent.", color: "#FFF8DC" },
  { id: "benzaldehyde", name: "Benzaldehyde", formula: "C₆H₅CHO", type: "aldehyde", description: "Aromatic aldehyde with pleasant almond smell.", color: "#FFFACD" },
  { id: "propanone", name: "Propanone (acetone)", formula: "CH₃COCH₃", type: "ketone", description: "Ketone — no aldehyde H. Cannot reduce Ag⁺. No mirror forms.", color: "#F0F8FF" },
  { id: "cyclohexanone", name: "Cyclohexanone", formula: "C₆H₁₀O", type: "ketone", description: "Cyclic ketone. No reactive aldehyde hydrogen.", color: "#F0F8FF" },
];

// ─── Test Tube SVG ───────────────────────────────────────────────────────────

function TestTube({ liquidColor, hasMirror, isHeating, mirrorProgress }: {
  liquidColor: string; hasMirror: boolean; isHeating: boolean; mirrorProgress: number;
}) {
  return (
    <div className="relative">
      <svg viewBox="0 0 60 180" width="90" height="230" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="tt-clip"><path d="M15 10 L15 140 Q15 165 30 165 Q45 165 45 140 L45 10 Z" /></clipPath>
          <radialGradient id="mirror-grad" cx="30%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#E8E8E8" /><stop offset="50%" stopColor="#C0C0C0" /><stop offset="100%" stopColor="#808080" />
          </radialGradient>
        </defs>
        <path d="M15 10 L15 140 Q15 165 30 165 Q45 165 45 140 L45 10" fill="rgba(200,220,255,0.08)" stroke="#334155" strokeWidth="1.5" />
        <rect x="15" y="60" width="30" height="110" fill={liquidColor} clipPath="url(#tt-clip)" opacity={0.6} />
        {hasMirror && (
          <>
            <rect x="15" y={60 + (1 - mirrorProgress) * 80} width="4" height={mirrorProgress * 80} fill="url(#mirror-grad)" clipPath="url(#tt-clip)" opacity={0.9} />
            <rect x="41" y={60 + (1 - mirrorProgress) * 80} width="4" height={mirrorProgress * 80} fill="url(#mirror-grad)" clipPath="url(#tt-clip)" opacity={0.9} />
          </>
        )}
        <path d="M20 10 L20 160" stroke="rgba(255,255,255,0.15)" strokeWidth="2" clipPath="url(#tt-clip)" />
        <rect x="13" y="8" width="34" height="4" fill="#1E293B" rx="2" />
        {isHeating && [22, 30, 38].map((x, i) => (
          <motion.circle key={i} cx={x} cy="130" r="2" fill="rgba(255,255,255,0.3)"
            animate={{ cy: [130, 90, 70], opacity: [0.5, 0.5, 0] }}
            transition={{ duration: 1.2, delay: i * 0.4, repeat: Infinity }} />
        ))}
      </svg>
      {isHeating && (
        <div className="absolute inset-0 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 80%, rgba(255,160,50,0.15), transparent 70%)" }} />
      )}
    </div>
  );
}

// ─── Observations Panel (right side persistent) ──────────────────────────────

function ObservationsPanel({ observations, testsDone }: { observations: string[]; testsDone: string[] }) {
  return (
    <div className="space-y-3">
      {/* Observations log */}
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

      {/* Progress */}
      <div>
        <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">PROGRESS</p>
        <div className="flex gap-1">
          {COMPOUNDS.map((c) => (
            <div
              key={c.id}
              className={`w-7 h-7 rounded flex items-center justify-center text-xs font-orbitron font-bold ${
                testsDone.includes(c.id)
                  ? c.type === "aldehyde" ? "bg-teal/20 text-teal" : "bg-red-900/30 text-red-400"
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

interface TollensTestProps {
  onScoreUpdate?: (pts: number) => void;
}

export function TollensTest({ onScoreUpdate }: TollensTestProps) {
  const { addScore, addObservation, setTotalSteps, setStep, score, completeMode, currentMode, resetExperiment } = useExperimentStore();
  const { playSuccess } = useSoundEffects();
  const { data: session } = useSession();
  const startTimeRef = useRef(Date.now());
  const [showCompletion, setShowCompletion] = useState(false);

  const [selectedCompound, setSelectedCompound] = useState<Compound | null>(null);
  const [reagentReady, setReagentReady] = useState(false);
  const [added, setAdded] = useState(false);
  const [isHeating, setIsHeating] = useState(false);
  const [heatingProgress, setHeatingProgress] = useState(0);
  const [resultShown, setResultShown] = useState(false);
  const [testsDone, setTestsDone] = useState<string[]>([]);
  const [observations, setObservationsLocal] = useState<string[]>([]);

  const isAldehyde = selectedCompound?.type === "aldehyde";
  const mirrorProgress = isAldehyde && resultShown ? heatingProgress : 0;

  useEffect(() => { setTotalSteps(4); }, [setTotalSteps]);

  // Heating effect
  useEffect(() => {
    if (!isHeating) return;
    const interval = setInterval(() => {
      setHeatingProgress((p) => {
        const next = p + 0.02;
        if (next >= 1) {
          clearInterval(interval);
          setIsHeating(false);
          setResultShown(true);
          const obs = isAldehyde
            ? `${selectedCompound?.formula}: Silver mirror formed. Aldehyde confirmed.`
            : `${selectedCompound?.formula}: No change. Ketone — does NOT reduce Ag⁺.`;
          addObservation(obs);
          setObservationsLocal((prev) => [...prev, obs]);
          if (selectedCompound && !testsDone.includes(selectedCompound.id)) {
            setTestsDone((prev) => [...prev, selectedCompound.id]);
            playSuccess();
            addScore(15);
            onScoreUpdate?.(15);
          }
          return 1;
        }
        return next;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [isHeating, isAldehyde, selectedCompound, addObservation, addScore, onScoreUpdate, testsDone, playSuccess]);

  function handlePrepareReagent() { setReagentReady(true); }

  function handleAddCompound() {
    if (!selectedCompound || !reagentReady) return;
    setAdded(true); setResultShown(false); setHeatingProgress(0);
  }

  function handleHeat() {
    if (!added) return;
    setIsHeating(true); setResultShown(false); setHeatingProgress(0);
  }

  function handleReset() {
    setAdded(false); setIsHeating(false); setHeatingProgress(0); setResultShown(false);
  }

  function handleTestAnother() {
    handleReset();
    setSelectedCompound(null);
    setStep(1);
  }

  function handleComplete() {
    completeMode("tollens-test", currentMode);
    setShowCompletion(true);

    if (session?.user?.role === "student") {
      const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      saveProgress({
        slug: "tollens-test",
        mode: currentMode,
        score,
        timeSpentSeconds,
      }).catch(() => {});
    }
  }

  function handleDoAgain() {
    resetExperiment();
    handleReset();
    setSelectedCompound(null);
    setStep(0);
    startTimeRef.current = Date.now();
    setShowCompletion(false);
  }

  const liquidColor = added && selectedCompound ? selectedCompound.color : "#F0F0F0";

  // ─── Step Definitions ──────────────────────────────────────────────────────

  const steps: StepDefinition[] = useMemo(() => [
    {
      id: "prepare",
      title: "Prepare Tollens' Reagent",
      subtitle: "Add dilute NaOH to AgNO₃, then NH₃ until precipitate dissolves.",
      canProceed: reagentReady,
      instructions: {
        procedure: [
          "Add 2 cm³ of 0.1 M AgNO₃ solution to a clean test tube",
          "Add a few drops of dilute NaOH — a brown precipitate of Ag₂O forms",
          "Add dilute NH₃ dropwise, shaking after each drop",
          "Continue until the brown precipitate just dissolves to give a clear, colourless solution",
        ],
        safetyNotes: [
          "Silver nitrate stains skin — wear gloves",
          "Do NOT store unused Tollens' reagent — it can form explosive silver fulminate",
          "Dispose of all waste promptly after the experiment",
        ],
        expectedObservations: [
          "Brown precipitate (Ag₂O) forms initially with NaOH",
          "Precipitate dissolves in excess NH₃ to give clear [Ag(NH₃)₂]⁺ solution",
        ],
        tips: [
          "Add NH₃ drop-by-drop — do not use excess",
          "The reagent must be freshly prepared for each test",
        ],
      },
      quiz: {
        question: "What is Tollens' reagent?",
        options: [
          "A solution of Cu²⁺ in NaOH",
          "Ammoniacal silver nitrate [Ag(NH₃)₂]⁺",
          "Acidified potassium permanganate",
          "Fehling's solution",
        ],
        correctIndex: 1,
        explanation: "Tollens' reagent is [Ag(NH₃)₂]⁺ — silver nitrate with ammonia. Aldehydes reduce Ag⁺ to Ag⁰, forming a silver mirror.",
      },
      content: (
        <div className="flex flex-col items-center justify-center h-full gap-5 p-4">
          <motion.button
            onClick={handlePrepareReagent}
            disabled={reagentReady}
            whileTap={{ scale: 0.96 }}
            className={`px-8 py-4 rounded-lg text-sm font-rajdhani font-bold border-2 transition-all ${
              reagentReady
                ? "border-teal/50 text-teal bg-teal/10 cursor-default"
                : "border-amber-500/60 text-amber-200 bg-amber-900/20 hover:bg-amber-800/30 hover:border-amber-400"
            }`}
          >
            {reagentReady ? "✓ Tollens' Reagent Ready" : "Prepare Tollens' Reagent"}
          </motion.button>
          {reagentReady && (
            <motion.p className="text-teal text-sm font-rajdhani text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              Clear colourless [Ag(NH₃)₂]⁺ solution prepared.
            </motion.p>
          )}
        </div>
      ),
      theory: (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-orbitron text-amber-300/80 tracking-wider mb-2">THEORY</p>
            <p className="text-slate-300 text-xs font-rajdhani leading-relaxed">
              <span className="text-amber-300 font-semibold">Tollens&apos; reagent</span> = [Ag(NH₃)₂]⁺ (ammoniacal silver nitrate).
            </p>
            <p className="text-slate-300 text-xs font-rajdhani leading-relaxed mt-2">
              <span className="text-teal font-semibold">Aldehydes</span> reduce Ag⁺ → Ag⁰ (silver mirror).
            </p>
            <p className="text-slate-300 text-xs font-rajdhani leading-relaxed mt-1">
              <span className="text-red-400 font-semibold">Ketones</span> cannot — no aldehyde hydrogen.
            </p>
          </div>
          <div>
            <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1">EQUATION</p>
            <p className="text-slate-400 text-xs font-mono leading-relaxed">
              RCHO + 2Ag⁺ + 2OH⁻ → RCOO⁻ + 2Ag↓ + H₂O
            </p>
          </div>
        </div>
      ),
    },

    {
      id: "select",
      title: "Select Compound",
      subtitle: "Choose an organic compound to test.",
      canProceed: selectedCompound !== null,
      instructions: {
        procedure: [
          "Select an organic compound from the list",
          "Note whether it is an aldehyde (R-CHO) or ketone (R-CO-R)",
          "Predict the expected result before testing",
        ],
        tips: [
          "Aldehydes have a hydrogen bonded to the carbonyl carbon — this makes them reducible",
          "Ketones lack this hydrogen — they cannot reduce Ag⁺",
        ],
      },
      quiz: {
        question: "Which type of compound gives a silver mirror with Tollens' reagent?",
        options: ["Ketones", "Aldehydes", "Carboxylic acids", "Alcohols"],
        correctIndex: 1,
        explanation: "Aldehydes (R-CHO) have a hydrogen on the carbonyl carbon and can reduce Ag⁺ to metallic silver. Ketones cannot.",
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
                    ? "border-amber-400/60 bg-amber-900/20 text-white"
                    : "border-border text-slate-300 hover:border-slate-500"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{c.formula} <span className="font-normal text-slate-400">— {c.name}</span></span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.type === "aldehyde" ? "bg-teal/20 text-teal" : "bg-red-900/30 text-red-400"}`}>{c.type}</span>
                </div>
                {testsDone.includes(c.id) && <span className="text-green-400 text-xs">✓ tested</span>}
              </button>
            ))}
          </div>
        </div>
      ),
      theory: selectedCompound ? (
        <div>
          <p className="text-xs font-orbitron text-amber-300/80 tracking-wider mb-2">SELECTED</p>
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
      title: "Heat & Observe",
      subtitle: "Warm at 60°C. Do NOT boil.",
      canProceed: resultShown,
      instructions: {
        procedure: [
          "Add the selected compound to the test tube containing Tollens' reagent",
          "Place the test tube in a warm water bath at ~60°C",
          "Heat gently for 5-10 minutes — do NOT boil",
          "Observe the inner walls of the test tube carefully",
        ],
        safetyNotes: [
          "Do NOT heat above 60°C — boiling can cause splattering",
          "Use a water bath, not a direct flame",
        ],
        expectedObservations: [
          "Aldehyde: shiny silver mirror deposits on the test tube walls",
          "Ketone: no change — solution remains clear",
        ],
        tips: [
          "A clean test tube gives a better silver mirror",
          "The mirror forms gradually — be patient",
        ],
      },
      quiz: {
        question: "Why do ketones NOT give a silver mirror with Tollens' reagent?",
        options: [
          "They are too reactive",
          "They lack the aldehyde hydrogen needed to reduce Ag⁺",
          "They form a precipitate instead",
          "The test tube must be cold",
        ],
        correctIndex: 1,
        explanation: "Ketones have no H on the carbonyl carbon (R-CO-R'). Only aldehydes (R-CHO) can reduce Ag⁺ to Ag⁰.",
      },
      content: (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
          <TestTube liquidColor={liquidColor} hasMirror={resultShown && isAldehyde} isHeating={isHeating} mirrorProgress={mirrorProgress} />

          <div className="text-center space-y-2">
            {!added && <p className="text-amber-300 text-sm font-rajdhani">{selectedCompound?.formula} — add to test tube</p>}
            {added && !isHeating && !resultShown && <p className="text-blue-300 text-sm font-rajdhani">{selectedCompound?.formula} added — heat now</p>}
            {isHeating && (
              <div className="space-y-2">
                <p className="text-orange-300 text-sm font-rajdhani animate-pulse">Heating at 60°C…</p>
                <div className="w-40 h-1.5 bg-border rounded-full overflow-hidden mx-auto">
                  <motion.div className="h-full bg-orange-400 rounded-full" style={{ width: `${heatingProgress * 100}%` }} />
                </div>
              </div>
            )}
            {resultShown && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`text-base font-rajdhani font-bold ${isAldehyde ? "text-gray-200" : "text-red-400"}`}>
                {isAldehyde ? "Silver mirror formed!" : "No change — Ketone"}
              </motion.p>
            )}
          </div>

          <div className="flex gap-3">
            {selectedCompound && !added && (
              <motion.button onClick={handleAddCompound} whileTap={{ scale: 0.96 }}
                className="px-5 py-2.5 bg-amber-800/40 hover:bg-amber-700/50 text-amber-200 text-sm font-rajdhani font-semibold border border-amber-600/40 rounded-lg transition-all">
                Add {selectedCompound.formula}
              </motion.button>
            )}
            {added && !isHeating && !resultShown && (
              <motion.button onClick={handleHeat} whileTap={{ scale: 0.96 }}
                className="px-5 py-2.5 bg-orange-800/40 hover:bg-orange-700/50 text-orange-200 text-sm font-rajdhani font-semibold border border-orange-600/40 rounded-lg transition-all"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                Heat (60°C water bath)
              </motion.button>
            )}
          </div>
        </div>
      ),
      theory: resultShown && selectedCompound ? (
        <div className={`rounded-lg border p-3 ${isAldehyde ? "border-gray-500/30 bg-gray-900/20" : "border-red-700/30 bg-red-900/10"}`}>
          <p className={`font-orbitron text-xs font-bold mb-1 ${isAldehyde ? "text-gray-300" : "text-red-400"}`}>
            {isAldehyde ? "POSITIVE" : "NEGATIVE"}
          </p>
          <p className="text-white font-rajdhani text-xs">{selectedCompound.formula} ({selectedCompound.name})</p>
          <p className="text-slate-400 text-xs font-rajdhani mt-1">{selectedCompound.description}</p>
          {isAldehyde && <p className="text-slate-500 text-xs font-mono mt-2">RCHO + 2[Ag(NH₃)₂]⁺ + 3OH⁻ → RCOO⁻ + 2Ag↓ + 4NH₃ + 2H₂O</p>}
        </div>
      ) : (
        <p className="text-slate-600 text-xs font-rajdhani">Waiting for result…</p>
      ),
    },

    {
      id: "results",
      title: "Results Summary",
      subtitle: "Review all tests. Try more compounds.",
      canProceed: true,
      instructions: {
        procedure: [
          "Review the results table for all tested compounds",
          "Compare aldehyde vs ketone results",
          "Test remaining compounds to complete the experiment",
        ],
        tips: [
          "Notice the pattern: all aldehydes give a silver mirror, all ketones do not",
          "This test is specific for the -CHO group",
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
                    <th className="text-left px-3 py-2 text-slate-400">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPOUNDS.filter((c) => testsDone.includes(c.id)).map((c) => (
                    <tr key={c.id} className="border-b border-border/50">
                      <td className="px-3 py-2 text-white">{c.formula}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${c.type === "aldehyde" ? "bg-teal/20 text-teal" : "bg-red-900/30 text-red-400"}`}>{c.type}</span>
                      </td>
                      <td className={`px-3 py-2 ${c.type === "aldehyde" ? "text-gray-300" : "text-red-400"}`}>
                        {c.type === "aldehyde" ? "Silver mirror" : "No change"}
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
            <button onClick={handleTestAnother}
              className="px-5 py-2 text-teal hover:text-white text-sm font-rajdhani font-semibold border border-teal/40 hover:bg-teal/10 rounded-lg transition-all">
              Test Another Compound
            </button>
          </div>
        </div>
      ),
      theory: (
        <div>
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">KEY TAKEAWAY</p>
          <p className="text-slate-300 text-xs font-rajdhani leading-relaxed">
            Silver mirror → <span className="text-teal font-semibold">aldehyde</span> (R-CHO).
          </p>
          <p className="text-slate-300 text-xs font-rajdhani leading-relaxed mt-1">
            No change → <span className="text-red-400 font-semibold">ketone</span> (R-CO-R).
          </p>
        </div>
      ),
    },
  ], [reagentReady, selectedCompound, added, isHeating, heatingProgress, resultShown, isAldehyde, mirrorProgress, liquidColor, testsDone]);

  // Persistent notes: observations panel
  const persistentNotes = useMemo(() => (
    <ObservationsPanel observations={observations} testsDone={testsDone} />
  ), [observations, testsDone]);

  const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

  return (
    <>
      <StepWizard
        steps={steps}
        persistentNotes={persistentNotes}
        experimentTitle="Tollens' Test — Aldehyde vs Ketone"
        onComplete={handleComplete}
      />
      {showCompletion && (
        <CompletionOverlay
          experimentTitle="Tollens' Test — Aldehyde vs Ketone"
          score={score}
          maxScore={100}
          itemsTested={testsDone.length}
          totalItems={COMPOUNDS.length}
          timeSpentSeconds={timeSpentSeconds}
          onDoAgain={handleDoAgain}
        />
      )}
    </>
  );
}
