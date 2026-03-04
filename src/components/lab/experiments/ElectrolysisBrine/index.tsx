"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";

// ─── Electrolysis of Brine ────────────────────────────────────────────────────
// Cathode: 2H₂O + 2e⁻ → H₂↑ + 2OH⁻  (or 2H⁺ + 2e⁻ → H₂↑)
// Anode: 2Cl⁻ → Cl₂↑ + 2e⁻
// Electrolyte: NaCl(aq) — industrial chlor-alkali process

const GUIDED_STEPS = [
  {
    id: 0,
    title: "Prepare brine solution",
    instructions:
      "Prepare a saturated NaCl solution (brine). This is the starting material for the industrial chlor-alkali process. Use graphite or inert electrodes.",
  },
  {
    id: 1,
    title: "Connect and observe",
    instructions:
      "Pass current through the brine. Observe gas evolution at both electrodes. Collect gas samples for testing.",
  },
  {
    id: 2,
    title: "Test the gases",
    instructions:
      "At cathode: squeaky pop test (H₂). At anode: bleaches damp litmus paper (Cl₂). Also test the remaining solution — NaOH forms.",
  },
  {
    id: 3,
    title: "Identify products and ions',",
    instructions:
      "Anode: Cl⁻ ions oxidised → Cl₂. Cathode: H₂O (or H⁺) reduced → H₂. Na⁺ and OH⁻ remain in solution as NaOH.",
  },
];

interface GasBubble {
  id: number;
  x: number;
  y: number;
  electrode: "cathode" | "anode";
}

interface ElectrolysisBrineProps {
  onScoreUpdate?: (pts: number) => void;
}

export function ElectrolysisBrine({ onScoreUpdate }: ElectrolysisBrineProps) {
  const { currentMode, currentStep, nextStep, addScore, addObservation } =
    useExperimentStore();

  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [h2Volume, setH2Volume] = useState(0);
  const [cl2Volume, setCl2Volume] = useState(0);
  const [testDone, setTestDone] = useState<string[]>([]);
  const [testedGas, setTestedGas] = useState<{ gas: string; result: string } | null>(null);
  const [litmusColor, setLitmusColor] = useState<"blue" | "bleached" | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startElectrolysis() {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(true);
    if (currentMode === "Guided" && currentStep === 1) nextStep();

    timerRef.current = setInterval(() => {
      setElapsed((t) => {
        const next = t + 1;
        setH2Volume((v) => Math.min(50, v + 0.5));
        setCl2Volume((v) => Math.min(50, v + 0.5));

        if (next >= 60) {
          clearInterval(timerRef.current!);
          setIsRunning(false);
          addObservation("Brine electrolysis: H₂ collected at cathode, Cl₂ at anode. NaOH forms in solution.");
          addScore(15);
          onScoreUpdate?.(15);
        }

        return next;
      });
    }, 300);
  }

  function handleTest(gas: "h2" | "cl2") {
    if (testDone.includes(gas)) return;
    setTestDone((prev) => [...prev, gas]);

    if (gas === "h2") {
      setTestedGas({ gas: "H₂ (cathode)", result: "Squeaky pop! — confirms hydrogen gas." });
      addObservation("H₂ test (cathode): squeaky pop confirms hydrogen.");
    } else {
      setTestedGas({ gas: "Cl₂ (anode)", result: "Damp litmus paper bleached/decolourised — confirms chlorine gas." });
      setLitmusColor("bleached");
      addObservation("Cl₂ test (anode): bleaches damp litmus paper — confirms chlorine.");
    }

    addScore(10);
    onScoreUpdate?.(10);
    if (currentMode === "Guided" && currentStep === 2) nextStep();
  }

  function handleTestSolution() {
    if (testDone.includes("naoh")) return;
    setTestDone((prev) => [...prev, "naoh"]);
    setTestedGas({ gas: "Remaining solution", result: "Red litmus turns blue — NaOH (alkaline) has formed." });
    addObservation("Solution after electrolysis: alkaline (NaOH). Red litmus → blue.");
    addScore(10);
    onScoreUpdate?.(10);
    if (currentMode === "Guided" && currentStep === 3) nextStep();
  }

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
          <span className="text-amber-300 font-semibold">Brine = NaCl(aq)</span>.{" "}
          <span className="text-teal">Cathode:</span> 2H₂O + 2e⁻ → H₂↑ + 2OH⁻.{" "}
          <span className="text-yellow-300">Anode:</span> 2Cl⁻ → Cl₂↑ + 2e⁻.{" "}
          Net: NaCl + H₂O → ½H₂ + ½Cl₂ + NaOH. This is the <span className="text-amber-300">chlor-alkali process</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cell diagram */}
        <div className="space-y-3">
          <div className="bg-navy/30 border border-border rounded p-4 flex justify-center">
            <svg viewBox="0 0 220 170" width="240" height="185" xmlns="http://www.w3.org/2000/svg">
              {/* Brine beaker */}
              <path d="M20 50 L20 150 Q20 165 40 165 L180 165 Q200 165 200 150 L200 50" fill="none" stroke="#334155" strokeWidth="2" />

              {/* Brine solution */}
              <rect x="21" y="85" width="178" height="79" fill="#B0C8E8" opacity={0.4} />

              {/* Cathode */}
              <rect x="55" y="40" width="10" height="120" fill="#475569" rx="2" />
              <text x="60" y="35" fontSize="8" fill="#60A5FA" textAnchor="middle">−</text>
              <text x="60" y="25" fontSize="6" fill="#94A3B8" textAnchor="middle">cathode</text>

              {/* Anode */}
              <rect x="155" y="40" width="10" height="120" fill="#475569" rx="2" />
              <text x="160" y="35" fontSize="8" fill="#EF4444" textAnchor="middle">+</text>
              <text x="160" y="25" fontSize="6" fill="#94A3B8" textAnchor="middle">anode</text>

              {/* H₂ bubbles at cathode */}
              {isRunning && [55, 60, 65].map((x, i) => (
                <motion.circle key={`h-${i}`} cx={x} cy={90} r="3" fill="rgba(200,230,255,0.5)"
                  animate={{ cy: [90, 60, 40], opacity: [0.6, 0.4, 0] }}
                  transition={{ duration: 1, delay: i * 0.3, repeat: Infinity }} />
              ))}

              {/* Cl₂ bubbles at anode */}
              {isRunning && [155, 160, 165].map((x, i) => (
                <motion.circle key={`c-${i}`} cx={x} cy={90} r="3" fill="rgba(180,220,100,0.4)"
                  animate={{ cy: [90, 60, 40], opacity: [0.6, 0.4, 0] }}
                  transition={{ duration: 0.9, delay: i * 0.25, repeat: Infinity }} />
              ))}

              {/* Gas labels */}
              {elapsed > 10 && (
                <>
                  <text x="60" y="58" fontSize="7" fill="#60A5FA" textAnchor="middle">H₂↑</text>
                  <text x="160" y="58" fontSize="7" fill="#BEF264" textAnchor="middle">Cl₂↑</text>
                </>
              )}

              {/* NaCl label */}
              <text x="110" y="135" fontSize="7" fill="#94A3B8" textAnchor="middle">NaCl(aq) → NaOH</text>

              {/* Wires */}
              <line x1="60" y1="40" x2="60" y2="20" stroke="#475569" strokeWidth="1.5" />
              <line x1="160" y1="40" x2="160" y2="20" stroke="#475569" strokeWidth="1.5" />
              <line x1="60" y1="20" x2="110" y2="20" stroke="#475569" strokeWidth="1.5" />
              <line x1="160" y1="20" x2="110" y2="20" stroke="#475569" strokeWidth="1.5" />
            </svg>
          </div>

          {/* Volume collected */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-900/20 border border-blue-700/30 rounded p-2 text-center">
              <p className="text-blue-300 text-xs font-orbitron">H₂ (cathode)</p>
              <p className="text-white font-orbitron text-lg">{h2Volume.toFixed(1)} mL</p>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded p-2 text-center">
              <p className="text-yellow-300 text-xs font-orbitron">Cl₂ (anode)</p>
              <p className="text-white font-orbitron text-lg">{cl2Volume.toFixed(1)} mL</p>
            </div>
          </div>

          <div className="flex gap-2">
            {!isRunning ? (
              <motion.button onClick={startElectrolysis} whileTap={{ scale: 0.96 }}
                className="px-4 py-2 bg-amber-800/50 hover:bg-amber-700/60 text-white text-sm font-rajdhani font-semibold border border-amber-600/40 rounded transition-all">
                Start Electrolysis
              </motion.button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-xs font-rajdhani">Running… {elapsed}s</span>
              </div>
            )}
          </div>
        </div>

        {/* Testing panel */}
        <div className="space-y-3">
          <p className="text-slate-400 text-xs font-orbitron tracking-wider">TEST THE PRODUCTS</p>

          {elapsed > 10 && (
            <div className="space-y-2">
              <button onClick={() => handleTest("h2")} disabled={testDone.includes("h2")}
                className={`w-full p-3 rounded border text-left text-xs font-rajdhani transition-all ${
                  testDone.includes("h2") ? "border-green-600/40 bg-green-900/20 text-green-400" : "border-blue-700/30 hover:border-blue-500/50 text-blue-300"
                }`}>
                <p className="font-semibold">Test H₂ (cathode) — Squeaky pop test</p>
                <p className="text-slate-400 mt-0.5">Hold a burning splint near the gas opening</p>
                {testDone.includes("h2") && <p className="text-green-400 mt-1">✓ POP! Hydrogen confirmed.</p>}
              </button>

              <button onClick={() => handleTest("cl2")} disabled={testDone.includes("cl2")}
                className={`w-full p-3 rounded border text-left text-xs font-rajdhani transition-all ${
                  testDone.includes("cl2") ? "border-yellow-600/40 bg-yellow-900/20 text-yellow-400" : "border-yellow-700/30 hover:border-yellow-500/50 text-yellow-300"
                }`}>
                <p className="font-semibold">Test Cl₂ (anode) — Litmus paper test</p>
                <p className="text-slate-400 mt-0.5">Hold damp blue litmus paper in the gas</p>
                {testDone.includes("cl2") && (
                  <p className="text-yellow-400 mt-1">
                    ✓ Damp litmus {litmusColor === "bleached" ? "BLEACHED" : "turns red then bleached"}. Chlorine confirmed.
                  </p>
                )}
              </button>

              <button onClick={handleTestSolution} disabled={testDone.includes("naoh")}
                className={`w-full p-3 rounded border text-left text-xs font-rajdhani transition-all ${
                  testDone.includes("naoh") ? "border-teal/40 bg-teal/10 text-teal" : "border-border hover:border-slate-500 text-slate-300"
                }`}>
                <p className="font-semibold">Test remaining solution — litmus</p>
                <p className="text-slate-400 mt-0.5">Add red litmus to the solution</p>
                {testDone.includes("naoh") && <p className="text-teal mt-1">✓ Red litmus → blue. NaOH is alkaline.</p>}
              </button>
            </div>
          )}

          {!elapsed && (
            <p className="text-slate-600 text-xs font-rajdhani">Start electrolysis first to collect gases for testing.</p>
          )}

          <AnimatePresence>
            {testedGas && (
              <motion.div className="bg-teal/10 border border-teal/30 rounded p-3"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p className="text-teal font-orbitron text-xs tracking-wider mb-1">TEST RESULT</p>
                <p className="text-white font-rajdhani text-sm font-semibold">{testedGas.gas}</p>
                <p className="text-slate-300 text-xs font-rajdhani mt-0.5">{testedGas.result}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Summary */}
          <div className="bg-navy/40 border border-border rounded p-3 text-xs font-rajdhani space-y-1">
            <p className="text-slate-400 font-orbitron text-xs tracking-wider mb-1">SUMMARY</p>
            {[
              { electrode: "Cathode (−)", ion: "H₂O/H⁺", product: "H₂ gas", color: "text-blue-300" },
              { electrode: "Anode (+)", ion: "Cl⁻", product: "Cl₂ gas", color: "text-yellow-300" },
              { electrode: "Solution", ion: "Na⁺ + OH⁻", product: "NaOH", color: "text-teal" },
            ].map((r) => (
              <div key={r.electrode} className="flex justify-between">
                <span className="text-slate-400">{r.electrode}:</span>
                <span className={r.color}>{r.ion} → {r.product}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
