"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";
import { StepWizard } from "../../StepWizard";
import { CompletionOverlay } from "../../CompletionOverlay";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useSession } from "next-auth/react";
import { saveProgress } from "@/lib/progress";
import type { StepDefinition } from "../../StepWizard";

// ─── H₂O₂ decomposition with MnO₂ catalyst ───────────────────────────────────
// 2H₂O₂ → 2H₂O + O₂  (catalysed by MnO₂)

interface DataPoint { t: number; V: number; }

// ─── Gas syringe SVG ──────────────────────────────────────────────────────────

function GasSyringe({ volumePercent }: { volumePercent: number }) {
  const maxWidth = 140;
  const fill = (volumePercent / 100) * maxWidth;

  return (
    <svg viewBox="0 0 200 60" width="200" height="60" xmlns="http://www.w3.org/2000/svg">
      {/* Barrel */}
      <rect x="20" y="20" width={maxWidth} height="20" fill="#1E293B" stroke="#334155" strokeWidth="1" rx="2" />
      {/* O₂ gas */}
      <rect x="20" y="20" width={fill} height="20" fill="#60A5FA" opacity={0.5} rx="2" />
      {/* Plunger */}
      <rect x={20 + fill - 4} y="16" width="8" height="28" fill="#475569" rx="2" />
      {/* Handle */}
      <rect x={20 + fill + 4} y="22" width="25" height="16" fill="#334155" rx="2" />
      {/* Tip */}
      <path d="M20 25 L5 30 L20 35 Z" fill="#475569" />
      {/* Volume label */}
      <text x="90" y="35" fontSize="8" fill="#94A3B8" textAnchor="middle" fontFamily="monospace">
        {((volumePercent / 100) * 60).toFixed(0)} mL O₂
      </text>
    </svg>
  );
}

// ─── Volume-time chart ────────────────────────────────────────────────────────

function VolumeChart({ uncatalysed, catalysed }: { uncatalysed: DataPoint[]; catalysed: DataPoint[]; }) {
  if (uncatalysed.length < 2 && catalysed.length < 2) return null;

  const W = 300;
  const H = 120;
  const PAD = { top: 10, right: 10, bottom: 24, left: 36 };

  const allPoints = [...uncatalysed, ...catalysed];
  const maxT = Math.max(...allPoints.map((p) => p.t), 10);
  const maxV = 65;

  const toX = (t: number) => PAD.left + (t / maxT) * (W - PAD.left - PAD.right);
  const toY = (v: number) => H - PAD.bottom - (v / maxV) * (H - PAD.top - PAD.bottom);

  const makePath = (pts: DataPoint[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.t).toFixed(1)},${toY(p.V).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill="#0A0E1A" rx="4" />
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#475569" strokeWidth="1" />
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#475569" strokeWidth="1" />
      <text x={(W + PAD.left) / 2} y={H - 2} fontSize="7" fill="#64748B" textAnchor="middle">Time (s)</text>
      <text x={10} y={(H - PAD.bottom + PAD.top) / 2} fontSize="7" fill="#64748B" textAnchor="middle"
        transform={`rotate(-90, 10, ${(H - PAD.bottom + PAD.top) / 2})`}>V(O₂) mL</text>

      {[0, 20, 40, 60].map((v) => (
        <g key={v}>
          <line x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)} stroke="#1E293B" strokeWidth="0.5" />
          <text x={PAD.left - 3} y={toY(v) + 3} fontSize="5.5" fill="#475569" textAnchor="end">{v}</text>
        </g>
      ))}

      {uncatalysed.length >= 2 && (
        <path d={makePath(uncatalysed)} fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4,3" />
      )}
      {catalysed.length >= 2 && (
        <path d={makePath(catalysed)} fill="none" stroke="#0D7E6A" strokeWidth="1.5" />
      )}

      {/* Legend */}
      <line x1={W - 75} y1={PAD.top + 6} x2={W - 60} y2={PAD.top + 6} stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4,3" />
      <text x={W - 57} y={PAD.top + 9} fontSize="6" fill="#94A3B8">No catalyst</text>
      <line x1={W - 75} y1={PAD.top + 18} x2={W - 60} y2={PAD.top + 18} stroke="#0D7E6A" strokeWidth="1.5" />
      <text x={W - 57} y={PAD.top + 21} fontSize="6" fill="#0D7E6A">+ MnO₂</text>
    </svg>
  );
}

// ─── Flask SVG ────────────────────────────────────────────────────────────────

function ReactionFlask({ hasCatalyst, isRunning }: { hasCatalyst: boolean; isRunning: boolean }) {
  return (
    <svg viewBox="0 0 80 100" width="80" height="100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="rc-flask">
          <path d="M28 10 L28 50 L5 85 Q2 95 15 97 L65 97 Q78 95 75 85 L52 50 L52 10 Z" />
        </clipPath>
      </defs>
      <path d="M28 10 L28 50 L5 85 Q2 95 15 97 L65 97 Q78 95 75 85 L52 50 L52 10"
        fill="none" stroke="#334155" strokeWidth="1.5" />
      <rect x="0" y="40" width="80" height="60" fill="#6DB6E8" clipPath="url(#rc-flask)" opacity={0.4} />
      {hasCatalyst && isRunning && [20, 35, 50].map((x, i) => (
        <motion.circle key={i} cx={x} cy={80} r="3" fill="rgba(200,240,255,0.4)"
          animate={{ cy: [80, 50, 30], opacity: [0.6, 0.4, 0] }}
          transition={{ duration: 0.8, delay: i * 0.25, repeat: Infinity }} />
      ))}
      {hasCatalyst && (
        <ellipse cx="40" cy="90" rx="15" ry="4" fill="#2D2D2D" opacity={0.8} />
      )}
      <rect x="27" y="5" width="26" height="6" fill="#1E293B" rx="2" />
    </svg>
  );
}

// ─── Observations panel ───────────────────────────────────────────────────────

function ObservationsPanel({
  uncatalysedDone,
  catalysedDone,
  uncatalysedData,
  catalysedData,
  mn02Mass,
}: {
  uncatalysedDone: boolean;
  catalysedDone: boolean;
  uncatalysedData: DataPoint[];
  catalysedData: DataPoint[];
  mn02Mass: number | null;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-orbitron text-slate-400 tracking-wider mb-2">EXPERIMENTS</p>
        <div className="space-y-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded border text-xs font-rajdhani ${
            uncatalysedDone ? "border-teal/40 bg-teal/5 text-teal" : "border-border text-slate-500"
          }`}>
            <span>{uncatalysedDone ? "✓" : "○"}</span>
            <span>No catalyst</span>
            {uncatalysedDone && uncatalysedData.length > 0 && (
              <span className="ml-auto text-white">{uncatalysedData[uncatalysedData.length - 1]?.t}s</span>
            )}
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded border text-xs font-rajdhani ${
            catalysedDone ? "border-teal/40 bg-teal/5 text-teal" : "border-border text-slate-500"
          }`}>
            <span>{catalysedDone ? "✓" : "○"}</span>
            <span>+ MnO₂ catalyst</span>
            {catalysedDone && catalysedData.length > 0 && (
              <span className="ml-auto text-white">{catalysedData[catalysedData.length - 1]?.t}s</span>
            )}
          </div>
        </div>
      </div>
      {mn02Mass !== null && (
        <div className="text-xs font-rajdhani bg-navy/30 px-2 py-2 rounded border border-teal/20">
          <p className="text-teal font-semibold">MnO₂ Mass Check</p>
          <p className="text-slate-300">Before: 0.50 g → After: {mn02Mass} g</p>
          <p className="text-green-400">Unchanged — true catalyst</p>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface RateCatalystProps {
  onScoreUpdate?: (pts: number) => void;
}

export function RateCatalyst({ onScoreUpdate }: RateCatalystProps) {
  const { addScore, addObservation, setTotalSteps, setStep, score, completeMode, resetExperiment } =
    useExperimentStore();
  const { playSuccess } = useSoundEffects();
  const { data: session } = useSession();
  const startTimeRef = useRef(Date.now());

  const [showCompletion, setShowCompletion] = useState(false);
  const [experiment, setExperiment] = useState<"none" | "uncatalysed" | "catalysed">("none");
  const [uncatalysedData, setUncatalysedData] = useState<DataPoint[]>([]);
  const [catalysedData, setCatalysedData] = useState<DataPoint[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [mn02Mass, setMnO2Mass] = useState<number | null>(null);
  const [uncatalysedDone, setUncatalysedDone] = useState(false);
  const [catalysedDone, setCatalysedDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MAX_VOLUME = 60; // mL O₂ total

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => { setTotalSteps(4); }, []);

  const startExperiment = useCallback((type: "uncatalysed" | "catalysed") => {
    if (timerRef.current) clearInterval(timerRef.current);
    setExperiment(type);
    setElapsed(0);
    setCurrentVolume(0);
    setIsRunning(true);
    setIsDone(false);
    if (type === "catalysed") setMnO2Mass(null);

    const k = type === "catalysed" ? 0.05 : 0.003;

    timerRef.current = setInterval(() => {
      setElapsed((t) => {
        const next = +(t + 1).toFixed(0);
        const V = Math.min(MAX_VOLUME * (1 - Math.exp(-k * next)), MAX_VOLUME);
        setCurrentVolume(V);

        const pt = { t: next, V };
        if (type === "uncatalysed") {
          setUncatalysedData((prev) => [...prev, pt]);
        } else {
          setCatalysedData((prev) => [...prev, pt]);
        }

        const done = V >= MAX_VOLUME * 0.98;
        if (done || next >= (type === "catalysed" ? 120 : 600)) {
          clearInterval(timerRef.current!);
          setIsRunning(false);
          setIsDone(true);

          if (type === "catalysed") {
            const mass = +(0.5 + Math.random() * 0.01).toFixed(2);
            setMnO2Mass(mass);
            setCatalysedDone(true);
            addObservation(`With MnO₂: 60 mL O₂ collected in ${next} s. MnO₂ mass unchanged (${mass} g).`);
          } else {
            setUncatalysedDone(true);
            addObservation(`No catalyst: 60 mL O₂ collected in ${next} s. Rate is much slower.`);
          }

          addScore(20);
          onScoreUpdate?.(20);
          playSuccess();
          return next;
        }

        return next;
      });
    }, 300);
  }, [addObservation, addScore, onScoreUpdate, playSuccess]);

  function handleReset() {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false);
    setIsDone(false);
    setElapsed(0);
    setCurrentVolume(0);
  }

  async function handleComplete() {
    completeMode();
    setShowCompletion(true);
    if (session?.user?.role === "student") {
      await saveProgress({
        experimentSlug: "rate-catalyst",
        score,
        maxScore: 80,
        timeSpentSeconds: Math.round((Date.now() - startTimeRef.current) / 1000),
      });
    }
  }

  function handleDoAgain() {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowCompletion(false);
    setExperiment("none");
    setUncatalysedData([]);
    setCatalysedData([]);
    setElapsed(0);
    setCurrentVolume(0);
    setIsRunning(false);
    setIsDone(false);
    setMnO2Mass(null);
    setUncatalysedDone(false);
    setCatalysedDone(false);
    startTimeRef.current = Date.now();
    resetExperiment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setTotalSteps(4);
  }

  const volPercent = (currentVolume / MAX_VOLUME) * 100;

  // ── Shared apparatus UI ──────────────────────────────────────────────────
  function makeApparatusUI(allowedTypes: ("uncatalysed" | "catalysed")[]) {
    return (
      <div className="space-y-3">
        <div className="bg-navy/30 border border-border rounded p-4">
          <p className="text-slate-400 text-xs font-orbitron tracking-wider mb-3">APPARATUS</p>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <ReactionFlask hasCatalyst={experiment === "catalysed"} isRunning={isRunning} />
              <p className="text-slate-500 text-xs font-rajdhani">
                {experiment === "catalysed" ? "H₂O₂ + MnO₂" : "H₂O₂"}
              </p>
            </div>
            <div className="flex-1 space-y-2">
              <GasSyringe volumePercent={isRunning || isDone ? volPercent : 0} />
              <div className="flex items-center gap-4 text-xs font-rajdhani">
                <div>
                  <span className="text-slate-400">Time: </span>
                  <span className={`font-orbitron font-bold ${isRunning ? "text-teal" : "text-white"}`}>{elapsed}s</span>
                </div>
                <div>
                  <span className="text-slate-400">O₂: </span>
                  <span className="text-blue-400 font-semibold">{currentVolume.toFixed(1)} mL</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {allowedTypes.includes("uncatalysed") && (
            <motion.button
              onClick={() => { handleReset(); startExperiment("uncatalysed"); }}
              disabled={isRunning}
              whileTap={{ scale: 0.96 }}
              className="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/60 disabled:opacity-40 text-slate-200 text-sm font-rajdhani border border-slate-600/40 rounded transition-all"
            >
              Run without catalyst {uncatalysedDone && "✓"}
            </motion.button>
          )}
          {allowedTypes.includes("catalysed") && (
            <motion.button
              onClick={() => { handleReset(); startExperiment("catalysed"); }}
              disabled={isRunning}
              whileTap={{ scale: 0.96 }}
              className="px-4 py-2 bg-teal/20 hover:bg-teal/30 disabled:opacity-40 text-teal text-sm font-rajdhani font-semibold border border-teal/40 rounded transition-all"
            >
              + Add MnO₂ catalyst {catalysedDone && "✓"}
            </motion.button>
          )}
          {(isRunning || isDone) && (
            <button onClick={handleReset} className="px-3 py-2 text-slate-400 hover:text-white text-xs font-rajdhani border border-border rounded transition-colors">
              Reset
            </button>
          )}
        </div>

        {mn02Mass !== null && (
          <motion.div className="bg-teal/10 border border-teal/30 rounded p-3"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-teal font-orbitron text-xs tracking-wider mb-1">CATALYST MASS</p>
            <p className="text-white font-rajdhani text-sm">
              MnO₂ mass before: 0.50 g · After: {mn02Mass} g
            </p>
            <p className="text-slate-300 text-xs font-rajdhani mt-1">
              Mass is unchanged — MnO₂ is a true catalyst (not consumed in reaction).
            </p>
          </motion.div>
        )}
      </div>
    );
  }

  // ─── Steps ─────────────────────────────────────────────────────────────────
  const steps: StepDefinition[] = useMemo(() => [
    {
      id: "intro",
      title: "Introduction to Catalysis",
      subtitle: "How catalysts affect reaction rate",
      instructions: {
        procedure: [
          "Read the reaction: 2H₂O₂(aq) → 2H₂O(l) + O₂(g)",
          "Hydrogen peroxide decomposes slowly at room temperature",
          "MnO₂ (manganese dioxide) acts as a heterogeneous catalyst",
          "The catalyst lowers the activation energy without being consumed",
          "We will measure the volume of O₂ collected over time for both cases",
        ],
        safetyNotes: [
          "H₂O₂ (≥20%) is corrosive — avoid skin contact, wear gloves",
          "The catalysed reaction produces O₂ rapidly — work in open area",
          "MnO₂ is an irritant — avoid inhaling the powder",
          "Keep away from flammable materials (O₂ supports combustion)",
        ],
        expectedObservations: [
          "Without catalyst: very slow and steady O₂ production",
          "With MnO₂: vigorous bubbling, rapid O₂ collection",
          "Same total O₂ volume both cases (same amount of H₂O₂)",
          "MnO₂ mass unchanged after reaction — it is regenerated",
        ],
        tips: [
          "A catalyst provides an alternative reaction pathway with lower Ea",
          "The catalyst does NOT change the overall enthalpy change (ΔH)",
          "The catalyst does NOT appear in the balanced equation",
          "Heterogeneous = different phase from reactants (solid in liquid here)",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">What is a Catalyst?</p>
          <p>A catalyst increases reaction rate by providing an alternative pathway with a <span className="text-red-400">lower activation energy (Ea)</span>. It is not consumed.</p>
          <div className="bg-navy/50 border border-teal/20 rounded p-2 space-y-1">
            <p className="text-white font-semibold">Effect on Energy Profile</p>
            <p>• Ea of uncatalysed path: high (slow rate)</p>
            <p>• Ea of catalysed path: lower (faster rate)</p>
            <p>• ΔH remains unchanged</p>
          </div>
          <p>Using the Arrhenius equation: k = Ae<sup>−Ea/RT</sup> — a lower Ea gives a much larger k (rate constant), hence faster rate.</p>
          <div className="bg-navy/40 border border-border rounded p-2">
            <p className="text-white font-semibold">Heterogeneous vs Homogeneous</p>
            <p><span className="text-teal">Heterogeneous:</span> catalyst in different phase (MnO₂ solid in liquid H₂O₂)</p>
            <p><span className="text-amber-300">Homogeneous:</span> catalyst in same phase as reactants</p>
          </div>
        </div>
      ),
      quiz: {
        question: "How does a catalyst increase the rate of a reaction?",
        options: [
          "It increases the concentration of reactants",
          "It increases the temperature of the system",
          "It provides an alternative pathway with a lower activation energy",
          "It changes the enthalpy of the reaction",
        ],
        correctIndex: 2,
        explanation: "A catalyst provides an alternative reaction pathway with a lower activation energy. More molecules then have energy ≥ Ea, so more successful collisions occur per unit time. The catalyst is not consumed and ΔH is unchanged.",
      },
      content: (
        <div className="space-y-4">
          <div className="bg-navy/40 border border-border rounded p-4 text-xs font-rajdhani">
            <p className="text-teal font-semibold mb-2">The Reaction</p>
            <div className="font-mono text-white text-center py-2 bg-navy/60 rounded border border-border">
              2H₂O₂(aq) <span className="text-amber-300">→<sup>MnO₂</sup></span> 2H₂O(l) + O₂(g)
            </div>
            <p className="text-slate-300 mt-2 leading-relaxed">
              Hydrogen peroxide decomposes to water and oxygen gas. Without catalyst this is very slow;
              MnO₂ dramatically accelerates the reaction without being consumed.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-navy/30 border border-slate-700/40 rounded p-3 text-xs font-rajdhani">
              <p className="text-slate-400 font-semibold mb-2">Without MnO₂</p>
              <div className="space-y-1 text-slate-300">
                <p>• Very slow decomposition</p>
                <p>• High activation energy</p>
                <p>• Few molecules with E ≥ Ea</p>
              </div>
            </div>
            <div className="bg-navy/30 border border-teal/30 rounded p-3 text-xs font-rajdhani">
              <p className="text-teal font-semibold mb-2">With MnO₂</p>
              <div className="space-y-1 text-slate-300">
                <p>• Vigorous reaction</p>
                <p>• Lower activation energy</p>
                <p>• Many more molecules with E ≥ Ea</p>
              </div>
            </div>
          </div>
          <p className="text-center text-slate-500 text-xs font-rajdhani">
            Proceed to run the control experiment (no catalyst).
          </p>
        </div>
      ),
      canProceed: true,
    },
    {
      id: "uncatalysed",
      title: "Control Experiment — No Catalyst",
      subtitle: "Measure the baseline rate without MnO₂",
      instructions: {
        procedure: [
          "Set up the flask with H₂O₂ solution only (no catalyst)",
          "Connect the delivery tube to the gas syringe",
          "Click 'Run without catalyst' to start collecting O₂",
          "Observe the slow rate of gas production",
          "Wait for the experiment to complete (collection slows to near zero)",
          "Record the final time taken to collect 60 mL O₂",
        ],
        expectedObservations: [
          "Very slow steady production of O₂",
          "Takes several hundred seconds to collect 60 mL",
          "No vigorous bubbling — reaction barely visible",
          "Volume-time curve rises slowly (concave down shape)",
        ],
        tips: [
          "This is the control — all other variables same as the catalysed run",
          "The volume-time curve flattens as H₂O₂ concentration decreases",
          "Rate = gradient of V-t graph — steeper = faster",
          "Note the initial rate (steepest part at t = 0)",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">First-Order Kinetics</p>
          <p>The decomposition of H₂O₂ follows first-order kinetics:</p>
          <div className="bg-navy/50 border border-teal/20 rounded p-2 font-mono text-center text-white">
            V(t) = V<sub>max</sub> × (1 − e<sup>−kt</sup>)
          </div>
          <p>Where k is the rate constant. Without catalyst, k ≈ 0.003 s⁻¹ (very small).</p>
          <p>The V-t curve has a characteristic shape: steep at first (high [H₂O₂]) then levels off (as [H₂O₂] decreases).</p>
          <p className="text-slate-400">Initial rate = gradient at t = 0 = k × V<sub>max</sub></p>
        </div>
      ),
      quiz: {
        question: "Why does the rate of O₂ production decrease over time in this experiment?",
        options: [
          "The temperature drops during the reaction",
          "The concentration of H₂O₂ decreases as it is consumed",
          "The catalyst is used up",
          "O₂ inhibits the reaction",
        ],
        correctIndex: 1,
        explanation: "As H₂O₂ is consumed, its concentration falls. Since rate ∝ [H₂O₂] (first-order), the rate of O₂ production decreases over time. The V-t curve flattens as the reaction approaches completion.",
      },
      content: makeApparatusUI(["uncatalysed"]),
      canProceed: uncatalysedDone,
    },
    {
      id: "catalysed",
      title: "Catalysed Experiment — Add MnO₂",
      subtitle: "Observe the dramatic rate increase",
      instructions: {
        procedure: [
          "Prepare a fresh H₂O₂ solution (same concentration as control)",
          "Add MnO₂ powder to the flask",
          "Click '+ Add MnO₂ catalyst' — observe the vigorous bubbling!",
          "Collect O₂ in the gas syringe — note how much faster it fills",
          "After completion, compare the time with the control experiment",
          "After the reaction, the MnO₂ mass will be shown — record it",
        ],
        expectedObservations: [
          "Immediate vigorous effervescence when MnO₂ is added",
          "Gas syringe fills rapidly — much shorter time than control",
          "Same final volume of O₂ (same amount of H₂O₂ used)",
          "MnO₂ mass after reaction = mass before — catalyst unchanged",
        ],
        tips: [
          "The MnO₂ provides a surface for the reaction to proceed on (heterogeneous catalysis)",
          "Adsorption of H₂O₂ onto MnO₂ surface weakens the O-O bond",
          "After the reaction, MnO₂ can be filtered out and reused",
          "The same effect can be shown with liver extract (catalase enzyme)",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Mechanism of Heterogeneous Catalysis</p>
          <div className="space-y-1">
            <p><span className="text-amber-300 font-semibold">1. Adsorption:</span> H₂O₂ molecules adsorb onto MnO₂ surface</p>
            <p><span className="text-amber-300 font-semibold">2. Weakening:</span> O-O bonds weaken at active sites on surface</p>
            <p><span className="text-amber-300 font-semibold">3. Reaction:</span> Decomposition occurs with lower Ea</p>
            <p><span className="text-amber-300 font-semibold">4. Desorption:</span> H₂O and O₂ leave the surface, freeing active sites</p>
          </div>
          <p>With MnO₂: k ≈ 0.05 s⁻¹ — about 17× faster than uncatalysed (k ≈ 0.003 s⁻¹).</p>
          <p>From Arrhenius: a lower Ea of just ~10 kJ mol⁻¹ would account for this speed increase at room temperature.</p>
        </div>
      ),
      quiz: {
        question: "After the catalysed H₂O₂ decomposition is complete, what is found when the MnO₂ is filtered and weighed?",
        options: [
          "MnO₂ mass has decreased — it was partially consumed",
          "MnO₂ mass is unchanged — it was regenerated",
          "MnO₂ has dissolved into the solution",
          "MnO₂ has converted to Mn²⁺ ions",
        ],
        correctIndex: 1,
        explanation: "A true catalyst is not consumed in the overall reaction. MnO₂ participates in intermediate steps but is regenerated, so its mass before and after the reaction is the same. This is a key property distinguishing catalysts from reagents.",
      },
      content: makeApparatusUI(["uncatalysed", "catalysed"]),
      canProceed: catalysedDone,
    },
    {
      id: "compare",
      title: "Compare Graphs & Draw Conclusions",
      subtitle: "Analyse the role of a catalyst",
      instructions: {
        procedure: [
          "Study the volume-time graph showing both curves on the same axes",
          "Identify: initial gradient (rate), final volume, shape of curve",
          "Compare the time taken to collect the same volume of O₂",
          "Explain why both curves reach the same final volume",
          "State the properties of MnO₂ as a catalyst (not consumed, unchanged mass)",
          "Write a conclusion linking activation energy to the rate increase",
        ],
        expectedObservations: [
          "Catalysed curve reaches 60 mL much sooner than uncatalysed",
          "Both curves reach the same final volume of O₂",
          "Initial gradient of catalysed curve is much steeper",
          "MnO₂ mass unchanged — confirmed as a true catalyst",
        ],
        tips: [
          "Both final volumes are equal because same moles of H₂O₂ were used in both",
          "A catalyst cannot increase the equilibrium yield — only the rate",
          "In exam: 'same final volume shows same amount of O₂ produced'",
          "Always state: 'catalyst not consumed/regenerated at end of reaction'",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Exam-Ready Summary</p>
          <div className="space-y-2">
            <div className="bg-navy/50 border border-teal/20 rounded p-2">
              <p className="text-white font-semibold">Effect on Rate</p>
              <p>MnO₂ lowers Ea → more molecules have E ≥ Ea → more successful collisions per second → faster rate.</p>
            </div>
            <div className="bg-navy/50 border border-border rounded p-2">
              <p className="text-white font-semibold">Effect on Yield</p>
              <p>None. Catalyst does not shift equilibrium position — same total O₂ produced.</p>
            </div>
            <div className="bg-navy/50 border border-border rounded p-2">
              <p className="text-white font-semibold">Properties of Catalyst</p>
              <p>• Provides alternative pathway with lower Ea<br />
              • Not consumed — regenerated at end<br />
              • Mass unchanged before and after<br />
              • Does not change ΔH or equilibrium constant K</p>
            </div>
          </div>
        </div>
      ),
      quiz: {
        question: "In the V-t graph for H₂O₂ decomposition, why do both curves (with and without MnO₂) reach the same final volume?",
        options: [
          "The catalyst produces extra O₂",
          "The same amount (moles) of H₂O₂ was used in both experiments",
          "MnO₂ reacts with water to produce O₂",
          "The final volume depends on temperature, which is the same",
        ],
        correctIndex: 1,
        explanation: "The total volume of O₂ produced depends only on the moles of H₂O₂ present (from the stoichiometry: 2H₂O₂ → O₂). Since the same amount of H₂O₂ was used in both experiments, the same total volume of O₂ is produced. The catalyst only affects how quickly this happens.",
      },
      content: (
        <div className="space-y-4">
          {(uncatalysedData.length > 1 || catalysedData.length > 1) ? (
            <div className="rounded border border-border overflow-hidden">
              <div className="px-3 py-2 bg-navy/30 border-b border-border">
                <p className="text-xs font-orbitron text-slate-400 tracking-wider">VOLUME OF O₂ vs TIME</p>
              </div>
              <div className="p-3">
                <VolumeChart uncatalysed={uncatalysedData} catalysed={catalysedData} />
                <p className="text-slate-500 text-xs font-rajdhani mt-2 text-center">
                  Both curves reach the same final volume — same amount of O₂. Catalyst only increases rate.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-slate-500 text-sm font-rajdhani">
              Complete the experiments in steps 2 & 3 to see the comparison graph.
            </div>
          )}

          {uncatalysedData.length > 10 && catalysedData.length > 10 && (
            <div className="bg-navy/40 border border-teal/20 rounded p-3">
              <p className="text-teal font-orbitron text-xs tracking-wider mb-2">COMPARISON</p>
              <div className="grid grid-cols-2 gap-4 text-xs font-rajdhani">
                <div>
                  <p className="text-slate-400 font-semibold mb-1">No catalyst</p>
                  <p className="text-white">Time for 60 mL: ~{uncatalysedData[uncatalysedData.length - 1]?.t ?? "—"} s</p>
                  <p className="text-slate-400">Very slow reaction</p>
                </div>
                <div>
                  <p className="text-teal font-semibold mb-1">With MnO₂</p>
                  <p className="text-white">Time for 60 mL: ~{catalysedData[catalysedData.length - 1]?.t ?? "—"} s</p>
                  <p className="text-teal">Much faster reaction!</p>
                </div>
              </div>
              <p className="text-slate-500 text-xs font-rajdhani mt-2">
                Catalyst lowers activation energy (Ea) → more molecules have sufficient energy → rate increases.
              </p>
            </div>
          )}

          {mn02Mass !== null && (
            <div className="bg-teal/10 border border-teal/30 rounded p-3 text-xs font-rajdhani">
              <p className="text-teal font-orbitron tracking-wider mb-1">CATALYST MASS VERIFICATION</p>
              <p className="text-white">MnO₂ before: 0.50 g · After: {mn02Mass} g</p>
              <p className="text-green-400 mt-1">Mass unchanged — MnO₂ is a true catalyst (regenerated, not consumed).</p>
            </div>
          )}
        </div>
      ),
      canProceed: true,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [uncatalysedDone, catalysedDone, uncatalysedData, catalysedData, mn02Mass, isRunning, isDone, elapsed, currentVolume, experiment, volPercent]);

  const persistentNotes = useMemo(
    () => (
      <ObservationsPanel
        uncatalysedDone={uncatalysedDone}
        catalysedDone={catalysedDone}
        uncatalysedData={uncatalysedData}
        catalysedData={catalysedData}
        mn02Mass={mn02Mass}
      />
    ),
    [uncatalysedDone, catalysedDone, uncatalysedData, catalysedData, mn02Mass]
  );

  return (
    <>
      <StepWizard
        steps={steps}
        persistentNotes={persistentNotes}
        experimentTitle="Effect of Catalyst on Reaction Rate"
        onComplete={handleComplete}
        onStepChange={setStep}
      />
      {showCompletion && (
        <CompletionOverlay
          experimentTitle="Effect of Catalyst on Reaction Rate"
          score={score}
          maxScore={80}
          itemsTested={[uncatalysedDone, catalysedDone].filter(Boolean).length}
          totalItems={2}
          timeSpentSeconds={Math.round((Date.now() - startTimeRef.current) / 1000)}
          onDoAgain={handleDoAgain}
        />
      )}
    </>
  );
}
