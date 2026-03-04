"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";
import { StepWizard } from "../../StepWizard";
import { CompletionOverlay } from "../../CompletionOverlay";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useSession } from "next-auth/react";
import { saveProgress } from "@/lib/progress";
import type { StepDefinition } from "../../StepWizard";

// ─── Constants ────────────────────────────────────────────────────────────────
// Cu²⁺ + 2e⁻ → Cu (cathode)
// Cu → Cu²⁺ + 2e⁻ (anode)
// m = (M × I × t) / (n × F)

const F_CONST = 96485; // C mol⁻¹
const M_CU = 63.55; // g/mol
const N_ELECTRONS = 2;

// ─── Mass chart ───────────────────────────────────────────────────────────────

function MassChart({ data }: { data: { t: number; cathode: number; anode: number }[] }) {
  if (data.length < 2) return null;

  const W = 280;
  const H = 100;
  const PAD = { top: 10, right: 10, bottom: 24, left: 36 };

  const maxT = Math.max(...data.map((d) => d.t), 5);
  const maxM = Math.max(...data.map((d) => d.cathode)) * 1.2;

  const toX = (t: number) => PAD.left + (t / maxT) * (W - PAD.left - PAD.right);
  const toY = (m: number) => H - PAD.bottom - (m / maxM) * (H - PAD.top - PAD.bottom);

  const cathodePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(d.t).toFixed(1)},${toY(d.cathode).toFixed(1)}`).join(" ");
  const anodePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(d.t).toFixed(1)},${toY(d.anode).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill="#0A0E1A" rx="4" />
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#475569" strokeWidth="1" />
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#475569" strokeWidth="1" />
      <text x={(W + PAD.left) / 2} y={H - 2} fontSize="7" fill="#64748B" textAnchor="middle">Time (s)</text>
      <text x={10} y={(H + PAD.top) / 2} fontSize="7" fill="#64748B" textAnchor="middle"
        transform={`rotate(-90, 10, ${(H + PAD.top) / 2})`}>Mass change (g)</text>

      <path d={cathodePath} fill="none" stroke="#F97316" strokeWidth="1.5" />
      <path d={anodePath} fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4,3" />

      <circle cx={W - 65} cy={PAD.top + 6} r="3" fill="#F97316" />
      <text x={W - 60} y={PAD.top + 9} fontSize="6" fill="#F97316">Cathode (gain)</text>
      <circle cx={W - 65} cy={PAD.top + 18} r="3" fill="#94A3B8" />
      <text x={W - 60} y={PAD.top + 21} fontSize="6" fill="#94A3B8">Anode (loss)</text>
    </svg>
  );
}

// ─── Electrolysis cell SVG ────────────────────────────────────────────────────

function ElectrolysisCell({
  current,
  elapsed,
  isRunning,
}: {
  current: number;
  elapsed: number;
  isRunning: boolean;
}) {
  const cathodeColor = elapsed > 30 ? `rgba(200,100,0,${Math.min(1, elapsed / 150)})` : "#8B4513";
  return (
    <svg viewBox="0 0 200 160" width="220" height="175" xmlns="http://www.w3.org/2000/svg">
      {/* Beaker */}
      <path d="M20 40 L20 140 Q20 155 40 155 L160 155 Q180 155 180 140 L180 40" fill="none" stroke="#334155" strokeWidth="2" />
      <line x1="20" y1="40" x2="180" y2="40" stroke="#334155" strokeWidth="2" />
      {/* CuSO₄ solution */}
      <rect x="21" y="70" width="158" height="84" fill="#6DB6E8" opacity={0.4} />
      {/* Cathode (left) */}
      <rect x="55" y="30" width="12" height="120" fill="#8B4513" rx="2" />
      {isRunning && elapsed > 10 && (
        <rect x="55" y="30" width="12" height={Math.min(120, (elapsed / 300) * 60 + 30)} fill={cathodeColor} rx="2" opacity={0.8} />
      )}
      <text x="61" y="25" fontSize="8" fill="#F97316" textAnchor="middle">−</text>
      <text x="61" y="18" fontSize="6" fill="#94A3B8" textAnchor="middle">cathode</text>
      {/* Anode (right) */}
      <rect x="133" y="30" width="12" height={Math.max(30, 120 - (elapsed / 300) * 40)} fill="#8B4513" rx="2" />
      <text x="139" y="25" fontSize="8" fill="#EF4444" textAnchor="middle">+</text>
      <text x="139" y="18" fontSize="6" fill="#94A3B8" textAnchor="middle">anode</text>
      {/* Wires */}
      <line x1="61" y1="30" x2="61" y2="10" stroke="#475569" strokeWidth="1.5" />
      <line x1="139" y1="30" x2="139" y2="10" stroke="#475569" strokeWidth="1.5" />
      <line x1="61" y1="10" x2="100" y2="10" stroke="#475569" strokeWidth="1.5" />
      <line x1="139" y1="10" x2="100" y2="10" stroke="#475569" strokeWidth="1.5" />
      {/* Battery indicator */}
      {isRunning && (
        <>
          <rect x="92" y="5" width="16" height="10" fill="#334155" rx="2" />
          <text x="100" y="13" fontSize="6" fill="#0D7E6A" textAnchor="middle">{current}A</text>
        </>
      )}
      {/* Cu deposits on cathode */}
      {isRunning && elapsed > 20 && [58, 62, 60].map((x, i) => (
        <motion.circle key={i} cx={x} cy={80 + i * 15} r="2.5" fill="#CD7F32" opacity={0.8}
          animate={{ opacity: [0.8, 1, 0.8] }} transition={{ duration: 1, delay: i * 0.3, repeat: Infinity }} />
      ))}
      <text x="100" y="125" fontSize="7" fill="#6DB6E8" textAnchor="middle" opacity={0.7}>CuSO₄(aq)</text>
    </svg>
  );
}

// ─── Observations panel ───────────────────────────────────────────────────────

function ObservationsPanel({
  elapsed,
  current,
  theoreticalMass,
  isDone,
}: {
  elapsed: number;
  current: number;
  theoreticalMass: number;
  isDone: boolean;
}) {
  const Q = current * elapsed;
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-orbitron text-slate-400 tracking-wider mb-2">LIVE READINGS</p>
        <div className="space-y-1 text-xs font-rajdhani">
          <div className="flex justify-between"><span className="text-slate-400">Current (I):</span><span className="text-teal">{current} A</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Time (t):</span><span className="text-white">{elapsed} s</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Charge Q=It:</span><span className="text-amber-300">{Q.toFixed(1)} C</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Mass deposited:</span><span className="text-orange-400">{(theoreticalMass * 1000).toFixed(2)} mg</span></div>
        </div>
      </div>
      {isDone && (
        <div className="bg-teal/10 border border-teal/20 rounded p-2 text-xs font-rajdhani">
          <p className="text-teal font-semibold">Experiment Complete</p>
          <p className="text-slate-300">Total charge: {Q.toFixed(1)} C</p>
          <p className="text-orange-400">Cu deposited: {(theoreticalMass * 1000).toFixed(2)} mg</p>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface ElectrolysisCuSO4Props {
  onScoreUpdate?: (pts: number) => void;
}

export function ElectrolysisCuSO4({ onScoreUpdate }: ElectrolysisCuSO4Props) {
  const { addScore, addObservation, setTotalSteps, setStep, score, completeMode, resetExperiment, currentMode } =
    useExperimentStore();
  const { playSuccess } = useSoundEffects();
  const { data: session } = useSession();
  const startTimeRef = useRef(Date.now());

  const [showCompletion, setShowCompletion] = useState(false);
  const [current, setCurrent] = useState(0.5); // Amps
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [massData, setMassData] = useState<{ t: number; cathode: number; anode: number }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => { setTotalSteps(4); }, []);

  const calcMass = useCallback((t: number) => {
    const Q = current * t;
    return (M_CU * Q) / (N_ELECTRONS * F_CONST);
  }, [current]);

  function startElectrolysis() {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(true);
    setElapsed(0);
    setMassData([{ t: 0, cathode: 0, anode: 0 }]);
    setIsDone(false);

    timerRef.current = setInterval(() => {
      setElapsed((t) => {
        const next = t + 5;
        const m = calcMass(next);
        setMassData((prev) => [...prev, { t: next, cathode: m, anode: m }]);

        if (next >= 300) {
          clearInterval(timerRef.current!);
          setIsRunning(false);
          setIsDone(true);
          const Q = current * next;
          const m_final = calcMass(next);
          addObservation(
            `Electrolysis of CuSO₄: I=${current}A, t=${next}s, Q=${Q.toFixed(1)}C. Mass deposited: ${(m_final * 1000).toFixed(1)} mg.`
          );
          addScore(25);
          onScoreUpdate?.(25);
          playSuccess();
        }

        return next;
      });
    }, 300);
  }

  function stopElectrolysis() {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false);
    if (elapsed > 0) {
      setIsDone(true);
      const Q = current * elapsed;
      const m_final = calcMass(elapsed);
      addObservation(
        `Electrolysis of CuSO₄ (stopped): I=${current}A, t=${elapsed}s, Q=${Q.toFixed(1)}C. Mass deposited: ${(m_final * 1000).toFixed(1)} mg.`
      );
      addScore(25);
      onScoreUpdate?.(25);
      playSuccess();
    }
  }

  function handleComplete() {
    completeMode("electrolysis-cuso4", currentMode);
    setShowCompletion(true);
    if (session?.user?.role === "student") {
      const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      saveProgress({
        slug: "electrolysis-cuso4",
        mode: currentMode,
        score: Math.min(score, 100),
        timeSpentSeconds,
      }).catch(() => {});
    }
  }

  function handleDoAgain() {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowCompletion(false);
    setCurrent(0.5);
    setElapsed(0);
    setIsRunning(false);
    setIsDone(false);
    setMassData([]);
    startTimeRef.current = Date.now();
    resetExperiment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setTotalSteps(4);
  }

  const Q = current * elapsed;
  const theoreticalMass = calcMass(elapsed);

  // ─── Shared cell UI ──────────────────────────────────────────────────────
  const cellUI = (
    <div className="space-y-3">
      <div className="bg-navy/30 border border-border rounded p-4 flex justify-center">
        <ElectrolysisCell current={current} elapsed={elapsed} isRunning={isRunning} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-3 text-xs font-rajdhani">
          <label className="text-slate-400">Current (A):</label>
          <div className="flex gap-1">
            {[0.25, 0.5, 1.0, 2.0].map((I) => (
              <button key={I} onClick={() => setCurrent(I)} disabled={isRunning}
                className={`px-2 py-1 rounded border text-xs transition-all ${current === I ? "border-teal bg-teal/20 text-teal" : "border-border text-slate-400 hover:border-slate-500"}`}>
                {I}A
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          {!isRunning ? (
            <motion.button onClick={startElectrolysis} whileTap={{ scale: 0.96 }}
              className="px-4 py-2 bg-orange-800/50 hover:bg-orange-700/60 text-white text-sm font-rajdhani font-semibold border border-orange-600/40 rounded transition-all">
              Start Electrolysis
            </motion.button>
          ) : (
            <button onClick={stopElectrolysis}
              className="px-4 py-2 bg-red-800/50 hover:bg-red-700/60 text-white text-sm font-rajdhani border border-red-600/40 rounded transition-all">
              Stop
            </button>
          )}
        </div>
      </div>

      <div className="bg-navy/40 border border-border rounded p-3 text-xs font-rajdhani space-y-1.5">
        <p className="text-slate-400 font-orbitron text-xs tracking-wider mb-1">LIVE READINGS</p>
        <div className="flex justify-between"><span className="text-slate-400">Current (I):</span><span className="text-teal">{current} A</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Time (t):</span><span className="text-white">{elapsed} s</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Charge Q = It:</span><span className="text-amber-300 font-semibold">{Q.toFixed(1)} C</span></div>
        <div className="flex justify-between font-semibold">
          <span className="text-slate-300">Mass deposited:</span>
          <span className="text-orange-400">{(theoreticalMass * 1000).toFixed(2)} mg</span>
        </div>
      </div>
    </div>
  );

  // ─── Steps ─────────────────────────────────────────────────────────────────
  const steps: StepDefinition[] = useMemo(() => [
    {
      id: "intro",
      title: "Introduction to Electrolysis of CuSO₄",
      subtitle: "Faraday's Laws and electrode reactions",
      instructions: {
        procedure: [
          "Set up two copper electrodes (cathode − and anode +) in CuSO₄(aq)",
          "Weigh both electrodes accurately before the experiment",
          "Connect to a DC power supply and ammeter",
          "Record initial mass, current setting, and start time",
          "Run electrolysis for a measured time (at least 300 s for significant results)",
          "After stopping, wash and dry electrodes, then reweigh both",
        ],
        safetyNotes: [
          "CuSO₄ is toxic and irritating to eyes and skin — wear gloves and goggles",
          "Keep DC voltage low (≤ 6 V) to avoid overheating",
          "Never touch bare wires during electrolysis",
          "Dispose of CuSO₄ solution as chemical waste",
        ],
        expectedObservations: [
          "Cathode (−): pink/orange copper metal deposits on surface",
          "Anode (+): copper electrode slowly dissolves (shrinks)",
          "Solution remains blue — [Cu²⁺] stays approximately constant",
          "Mass gained at cathode ≈ mass lost at anode",
        ],
        tips: [
          "Use a new, polished copper electrode for cathode — easier to see deposits",
          "Keep current constant throughout (use a rheostat if needed)",
          "Weigh to 4 decimal places (e.g., 0.1234 g) for accurate results",
          "Gently wash electrodes with distilled water before drying and weighing",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Electrode Reactions</p>
          <div className="space-y-2">
            <div className="bg-navy/50 border border-orange-500/20 rounded p-2">
              <p className="text-orange-400 font-semibold">Cathode (−) — Reduction</p>
              <p className="font-mono text-white">Cu²⁺(aq) + 2e⁻ → Cu(s)</p>
              <p className="text-slate-400 mt-1">Cu²⁺ ions from solution are reduced. Pink copper deposits on cathode.</p>
            </div>
            <div className="bg-navy/50 border border-red-500/20 rounded p-2">
              <p className="text-red-400 font-semibold">Anode (+) — Oxidation</p>
              <p className="font-mono text-white">Cu(s) → Cu²⁺(aq) + 2e⁻</p>
              <p className="text-slate-400 mt-1">Copper from anode oxidises and dissolves into solution. Anode shrinks.</p>
            </div>
          </div>
          <p>Net effect: copper transfers from anode to cathode. [Cu²⁺] in solution stays constant.</p>
        </div>
      ),
      quiz: {
        question: "During electrolysis of CuSO₄ with copper electrodes, what happens to the concentration of Cu²⁺ in solution?",
        options: [
          "It increases as copper dissolves from the anode",
          "It decreases as copper is deposited on the cathode",
          "It stays approximately constant — anode dissolves at the same rate as cathode deposits",
          "It increases because the solution becomes more concentrated",
        ],
        correctIndex: 2,
        explanation: "With copper electrodes: cathode deposits Cu at the same rate as the anode dissolves Cu. Each mole of Cu²⁺ reduced at cathode is replaced by one mole from the anode. So [Cu²⁺] remains approximately constant and the solution stays blue.",
      },
      content: (
        <div className="space-y-4">
          <div className="bg-navy/40 border border-border rounded p-4 text-xs font-rajdhani">
            <p className="text-teal font-semibold mb-2">The Cell</p>
            <div className="font-mono text-center py-2 bg-navy/60 rounded border border-border space-y-1">
              <p><span className="text-orange-400">Cathode (−):</span> Cu²⁺(aq) + 2e⁻ → Cu(s)</p>
              <p><span className="text-red-400">Anode (+):</span> Cu(s) → Cu²⁺(aq) + 2e⁻</p>
            </div>
          </div>
          <div className="bg-navy/40 border border-teal/20 rounded p-4 text-xs font-rajdhani">
            <p className="text-teal font-semibold mb-2">Faraday&apos;s First Law</p>
            <p className="text-slate-300">The mass of substance deposited (or dissolved) at an electrode is proportional to the quantity of charge passed.</p>
            <div className="font-mono text-white text-center py-2 mt-2 bg-navy/60 rounded border border-border text-sm">
              m = (M × I × t) / (n × F)
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-slate-400">
              <p><span className="text-white">m</span> = mass (g)</p>
              <p><span className="text-white">M</span> = molar mass = 63.55 g/mol</p>
              <p><span className="text-white">I</span> = current (A)</p>
              <p><span className="text-white">t</span> = time (s)</p>
              <p><span className="text-white">n</span> = electrons = 2 (for Cu²⁺)</p>
              <p><span className="text-white">F</span> = 96485 C/mol</p>
            </div>
          </div>
          <p className="text-center text-slate-500 text-xs font-rajdhani">
            Proceed to run the electrolysis experiment.
          </p>
        </div>
      ),
      canProceed: true,
    },
    {
      id: "run-electrolysis",
      title: "Run the Electrolysis",
      subtitle: "Select current and observe electrode changes",
      instructions: {
        procedure: [
          "Select the current from the options (0.25 A, 0.5 A, 1.0 A, or 2.0 A)",
          "Click 'Start Electrolysis' to begin passing current",
          "Observe the cathode darkening as copper deposits build up",
          "Observe the anode shrinking as copper dissolves",
          "The simulation runs for 300 s — click 'Stop' to end early",
          "Note: changing current while running is disabled to keep I constant",
        ],
        expectedObservations: [
          "Higher current → faster copper deposition (more coulombs per second)",
          "Cathode gains orange/pink colour as Cu builds up",
          "Anode visibly shrinks from the bottom upwards",
          "The blue colour of the solution is maintained throughout",
        ],
        tips: [
          "Try 0.5 A first (standard school experiment value)",
          "After completing, try a different current to see how mass scales with I",
          "In a real lab, run for at least 300–600 s to get a measurable mass change",
          "Always keep I constant — a varying current gives unpredictable results",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Faraday&apos;s Second Law</p>
          <p>When the same charge is passed through different electrolytes, the masses deposited are proportional to the molar mass divided by the number of electrons transferred (equivalent mass).</p>
          <div className="bg-navy/50 border border-teal/20 rounded p-2">
            <p className="text-white font-semibold">Equivalent mass = M / n</p>
            <p>For Cu: 63.55 / 2 = 31.78 g/equivalent</p>
            <p>For Ag: 107.87 / 1 = 107.87 g/equivalent</p>
            <p>Same charge → more Ag deposited than Cu</p>
          </div>
          <p>One faraday (96485 C) deposits one mole of electrons worth of substance: 31.78 g of Cu, or 107.87 g of Ag.</p>
        </div>
      ),
      quiz: {
        question: "If the current is doubled while keeping time the same, what happens to the mass of copper deposited?",
        options: [
          "Mass stays the same — only time matters",
          "Mass doubles — charge Q = It is doubled",
          "Mass halves — higher current disturbs deposition",
          "Mass quadruples — relationship is exponential",
        ],
        correctIndex: 1,
        explanation: "From Faraday's Law: m = MIt/(nF). Mass is directly proportional to both I and t. Doubling I doubles Q = It, which doubles the mass deposited. This is a linear (not exponential) relationship.",
      },
      content: cellUI,
      canProceed: isDone && elapsed > 0,
    },
    {
      id: "faraday-law",
      title: "Apply Faraday's First Law",
      subtitle: "Calculate and verify the theoretical mass",
      instructions: {
        procedure: [
          "From your readings, note Q = I × t (charge in coulombs)",
          "Apply m = (M × Q) / (n × F) = (63.55 × Q) / (2 × 96485)",
          "This gives the theoretical mass deposited on the cathode",
          "In a real experiment, weigh electrodes to compare with actual mass",
          "Study the mass vs time graph — it should be a straight line (linear)",
          "Verify: doubling Q doubles m (Faraday's First Law)",
        ],
        expectedObservations: [
          "Mass-time graph is a straight line through the origin",
          "Steeper gradient = higher current = faster deposition",
          "Cathode mass gain = anode mass loss (conservation of mass)",
          "Calculated mass matches weighed mass (within experimental error)",
        ],
        tips: [
          "Faraday's First Law: m ∝ Q (mass deposited proportional to charge passed)",
          "Gradient of m vs t graph = (M × I) / (n × F) = constant at fixed I",
          "Always show your calculation clearly in exam: state formula, substitute, calculate",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Worked Example</p>
          <div className="bg-navy/50 border border-teal/20 rounded p-3 space-y-1 font-mono text-xs">
            <p className="text-white">Given: I = 0.5 A, t = 300 s</p>
            <p>Q = I × t = 0.5 × 300 = <span className="text-amber-300">150 C</span></p>
            <p>m = (M × Q) / (n × F)</p>
            <p>m = (63.55 × 150) / (2 × 96485)</p>
            <p>m = 9532.5 / 192970</p>
            <p>m = <span className="text-orange-400">0.04941 g = 49.41 mg</span></p>
          </div>
          <p>This is the theoretical mass. In practice, small losses occur due to poor adhesion of Cu to cathode or side reactions.</p>
          <p className="text-teal">% efficiency = (actual mass / theoretical mass) × 100</p>
        </div>
      ),
      quiz: {
        question: "The mass vs time graph for electrolysis of CuSO₄ at constant current is:",
        options: [
          "A curve (exponential) — rate slows as Cu²⁺ is depleted",
          "A horizontal line — mass doesn't change with time",
          "A straight line through the origin — mass ∝ time at constant I",
          "An S-curve — slow start, fast middle, slow end",
        ],
        correctIndex: 2,
        explanation: "At constant current I, charge Q = It increases linearly with time. Since m ∝ Q (Faraday's Law), mass also increases linearly with time. With copper electrodes, [Cu²⁺] stays constant (anode replenishes it), so the rate doesn't slow down — giving a straight line graph.",
      },
      content: (
        <div className="space-y-4">
          <div className="bg-navy/40 border border-border rounded p-3 text-xs font-rajdhani space-y-1.5">
            <p className="text-slate-400 font-orbitron text-xs tracking-wider mb-2">FARADAY CALCULATION</p>
            <div className="flex justify-between"><span className="text-slate-400">Current (I):</span><span className="text-teal">{current} A</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Time (t):</span><span className="text-white">{elapsed} s</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Charge Q = It:</span><span className="text-amber-300 font-semibold">{Q.toFixed(1)} C</span></div>
            <div className="h-px bg-border my-1" />
            <div className="flex justify-between"><span className="text-slate-400">M (Cu):</span><span className="text-white">63.55 g/mol</span></div>
            <div className="flex justify-between"><span className="text-slate-400">n (electrons):</span><span className="text-white">2</span></div>
            <div className="flex justify-between"><span className="text-slate-400">F:</span><span className="text-white">96485 C/mol</span></div>
            <div className="h-px bg-border my-1" />
            <div className="flex justify-between font-semibold">
              <span className="text-slate-300">m = MQ/(nF):</span>
              <span className="text-orange-400">{(theoreticalMass * 1000).toFixed(2)} mg</span>
            </div>
          </div>

          {massData.length > 2 && (
            <div className="rounded border border-border overflow-hidden">
              <div className="px-3 py-2 bg-navy/30 border-b border-border">
                <p className="text-xs font-orbitron text-slate-400 tracking-wider">MASS vs TIME GRAPH</p>
              </div>
              <div className="p-3">
                <MassChart data={massData} />
                <p className="text-slate-500 text-xs font-rajdhani mt-1 text-center">
                  Straight line confirms m ∝ Q ∝ t (Faraday&apos;s First Law)
                </p>
              </div>
            </div>
          )}

          <AnimatePresence>
            {isDone && elapsed > 0 && (
              <motion.div className="bg-navy/40 border border-teal/30 rounded p-3"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <p className="text-teal font-orbitron text-xs tracking-wider mb-2">FARADAY&apos;S FIRST LAW VERIFIED</p>
                <p className="text-slate-300 text-xs font-rajdhani leading-relaxed">
                  Mass deposited ∝ charge passed (Q = It).
                  Double the current at same time → double the mass.
                  Double the time at same current → double the mass.
                </p>
                <p className="text-white font-rajdhani text-sm mt-2">
                  Mass deposited: <span className="text-orange-400 font-semibold">{(theoreticalMass * 1000).toFixed(2)} mg</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ),
      canProceed: isDone,
    },
    {
      id: "conclusions",
      title: "Conclusions & Applications",
      subtitle: "Electroplating, Faraday's Laws, exam summary",
      instructions: {
        procedure: [
          "Write up the electrode half-equations for cathode and anode",
          "State Faraday's First Law in words and as an equation",
          "Calculate the theoretical mass from your recorded I, t values",
          "Describe what you observed at each electrode",
          "Explain one industrial application of this electrochemical process",
        ],
        expectedObservations: [
          "Cathode gained orange copper deposit — mass increased",
          "Anode dissolved — mass decreased by the same amount",
          "Solution colour remained blue throughout",
          "Calculated mass matches the Faraday equation prediction",
        ],
        tips: [
          "In exam: always write half-equations with electrons explicitly shown",
          "State: 'anode dissolves — mass lost; cathode deposits — mass gained'",
          "Don't forget to include state symbols: Cu²⁺(aq), Cu(s), e⁻",
          "Electroplating application: coating steel with copper/nickel for corrosion resistance",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Industrial Applications</p>
          <div className="space-y-2">
            <div className="bg-navy/50 border border-teal/20 rounded p-2">
              <p className="text-white font-semibold">Electroplating</p>
              <p>Coating cheaper metals with Cu, Ni, Cr for decoration, corrosion resistance, or electrical conductivity. Same principle — controlled current and time gives precise thickness.</p>
            </div>
            <div className="bg-navy/50 border border-border rounded p-2">
              <p className="text-white font-semibold">Copper Refining</p>
              <p>Impure copper as anode. Pure copper as cathode. Cu deposits selectively (impurities fall as anode sludge). Used in industrial copper production.</p>
            </div>
            <div className="bg-navy/50 border border-border rounded p-2">
              <p className="text-white font-semibold">Faraday Constant (F)</p>
              <p>F = 96485 C mol⁻¹ = charge of one mole of electrons. One of the fundamental constants of electrochemistry.</p>
            </div>
          </div>
        </div>
      ),
      quiz: {
        question: "In the electrolysis of CuSO₄ with copper electrodes, the solution remains blue throughout. Why?",
        options: [
          "No Cu²⁺ is removed from solution",
          "Cu²⁺ deposited at cathode is replaced by Cu²⁺ from dissolving anode, so concentration stays constant",
          "The blue colour is from SO₄²⁻ not Cu²⁺",
          "CuSO₄ is produced faster than it is consumed",
        ],
        correctIndex: 1,
        explanation: "At the cathode, Cu²⁺ is removed from solution. At the anode, Cu dissolves, releasing Cu²⁺ back into solution at the same rate. The rates are equal (same Q), so [Cu²⁺] remains constant and the solution stays blue throughout.",
      },
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs font-rajdhani">
            <div className="bg-navy/40 border border-orange-500/20 rounded p-3">
              <p className="text-orange-400 font-semibold mb-2">Cathode (−)</p>
              <p className="font-mono text-white">Cu²⁺ + 2e⁻ → Cu</p>
              <p className="text-slate-400 mt-1">Reduction</p>
              <p className="text-orange-400">Mass gain: {(theoreticalMass * 1000).toFixed(2)} mg</p>
            </div>
            <div className="bg-navy/40 border border-red-500/20 rounded p-3">
              <p className="text-red-400 font-semibold mb-2">Anode (+)</p>
              <p className="font-mono text-white">Cu → Cu²⁺ + 2e⁻</p>
              <p className="text-slate-400 mt-1">Oxidation</p>
              <p className="text-red-400">Mass loss: {(theoreticalMass * 1000).toFixed(2)} mg</p>
            </div>
          </div>

          <div className="bg-navy/40 border border-teal/20 rounded p-3 text-xs font-rajdhani">
            <p className="text-teal font-semibold mb-2">Your Results</p>
            <div className="space-y-1">
              <div className="flex justify-between"><span className="text-slate-400">Current:</span><span className="text-white">{current} A</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Time:</span><span className="text-white">{elapsed} s</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Charge:</span><span className="text-amber-300">{Q.toFixed(1)} C</span></div>
              <div className="flex justify-between font-semibold"><span className="text-slate-300">Mass deposited:</span><span className="text-orange-400">{(theoreticalMass * 1000).toFixed(2)} mg</span></div>
            </div>
          </div>

          <div className="bg-navy/30 border border-border rounded p-3 text-xs font-rajdhani space-y-1">
            <p className="text-slate-400 font-semibold">Exam Answer Template</p>
            <p className="text-slate-300 leading-relaxed italic">
              "At the cathode, Cu²⁺ ions are reduced: Cu²⁺(aq) + 2e⁻ → Cu(s). Pink/orange copper metal
              deposits on the electrode surface and the cathode gains mass. At the anode, copper is oxidised:
              Cu(s) → Cu²⁺(aq) + 2e⁻. The anode dissolves and loses mass. The solution remains blue because
              Cu²⁺ removed at the cathode is replenished by the dissolving anode. By Faraday&apos;s First Law,
              m = MIt/(nF) = 63.55 × {current} × {elapsed} / (2 × 96485) = {(theoreticalMass * 1000).toFixed(2)} mg."
            </p>
          </div>
        </div>
      ),
      canProceed: true,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [current, elapsed, isRunning, isDone, massData, Q, theoreticalMass]);

  const persistentNotes = useMemo(
    () => (
      <ObservationsPanel
        elapsed={elapsed}
        current={current}
        theoreticalMass={theoreticalMass}
        isDone={isDone}
      />
    ),
    [elapsed, current, theoreticalMass, isDone]
  );

  return (
    <>
      <StepWizard
        steps={steps}
        persistentNotes={persistentNotes}
        experimentTitle="Electrolysis of Copper Sulphate Solution"
        onComplete={handleComplete}
      />
      {showCompletion && (
        <CompletionOverlay
          experimentTitle="Electrolysis of Copper Sulphate Solution"
          score={score}
          maxScore={100}
          itemsTested={isDone ? 1 : 0}
          totalItems={1}
          timeSpentSeconds={Math.round((Date.now() - startTimeRef.current) / 1000)}
          onDoAgain={handleDoAgain}
        />
      )}
    </>
  );
}
