"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";

// ─── H₂O₂ decomposition with MnO₂ catalyst ───────────────────────────────────
// 2H₂O₂ → 2H₂O + O₂  (catalysed by MnO₂)
// Rate constants: uncatalysed ≈ 0.001 s⁻¹, catalysed ≈ 0.05 s⁻¹

const GUIDED_STEPS = [
  {
    id: 0,
    title: "Prepare the apparatus",
    instructions:
      "Set up a gas collection system: conical flask with H₂O₂, connected via a delivery tube to an upturned measuring cylinder filled with water.",
  },
  {
    id: 1,
    title: "Control experiment (no catalyst)",
    instructions:
      "Add H₂O₂ alone. Record the volume of O₂ collected every 30 seconds. You will notice the rate is very slow.",
  },
  {
    id: 2,
    title: "Catalysed experiment",
    instructions:
      "Add MnO₂ powder to a fresh H₂O₂ solution. Watch the vigorous bubbling! Record O₂ volume every 10 seconds.",
  },
  {
    id: 3,
    title: "Weigh the catalyst",
    instructions:
      "After the reaction, filter and weigh the MnO₂. It should have the same mass as before — the catalyst is not consumed.",
  },
  {
    id: 4,
    title: "Compare and conclude",
    instructions:
      "Plot both curves on the same axes. Both produce the same total volume of O₂ (same H₂O₂ amount) but the catalysed reaction is much faster.",
  },
];

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

function VolumeChart({
  uncatalysed,
  catalysed,
}: {
  uncatalysed: DataPoint[];
  catalysed: DataPoint[];
}) {
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

// ─── Main ─────────────────────────────────────────────────────────────────────

interface RateCatalystProps {
  onScoreUpdate?: (pts: number) => void;
}

export function RateCatalyst({ onScoreUpdate }: RateCatalystProps) {
  const { currentMode, currentStep, nextStep, addScore, addObservation } =
    useExperimentStore();

  const [experiment, setExperiment] = useState<"none" | "uncatalysed" | "catalysed">("none");
  const [uncatalysedData, setUncatalysedData] = useState<DataPoint[]>([]);
  const [catalysedData, setCatalysedData] = useState<DataPoint[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [mn02Mass, setMnO2Mass] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MAX_VOLUME = 60; // mL O₂ total

  function startExperiment(type: "uncatalysed" | "catalysed") {
    if (timerRef.current) clearInterval(timerRef.current);
    setExperiment(type);
    setElapsed(0);
    setCurrentVolume(0);
    setIsRunning(true);
    setIsDone(false);
    if (type === "catalysed") setMnO2Mass(null);

    const k = type === "catalysed" ? 0.05 : 0.003; // rate constant

    if (currentMode === "Guided") {
      if (type === "uncatalysed" && currentStep === 1) nextStep();
      if (type === "catalysed" && currentStep === 2) nextStep();
    }

    timerRef.current = setInterval(() => {
      setElapsed((t) => {
        const next = +(t + 1).toFixed(0);
        // First-order kinetics: V(t) = Vmax × (1 − exp(−k×t))
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
            addObservation(`With MnO₂: 60 mL O₂ collected in ${next} s. MnO₂ mass unchanged (${mass} g).`);
          } else {
            addObservation(`No catalyst: 60 mL O₂ collected in ${next} s. Rate is much slower.`);
          }

          addScore(20);
          onScoreUpdate?.(20);
          return next;
        }

        return next;
      });
    }, 300);
  }

  function handleReset() {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false);
    setIsDone(false);
    setElapsed(0);
    setCurrentVolume(0);
  }

  const volPercent = (currentVolume / MAX_VOLUME) * 100;

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
          <span className="text-teal font-semibold">Reaction:</span>{" "}
          2H₂O₂(aq) → 2H₂O(l) + O₂(g). MnO₂ acts as a <span className="text-amber-300 font-semibold">heterogeneous catalyst</span> — it is not consumed. The activation energy is lowered, increasing the rate dramatically.
        </p>
      </div>

      {/* Apparatus */}
      <div className="bg-navy/30 border border-border rounded p-4">
        <p className="text-slate-400 text-xs font-orbitron tracking-wider mb-3">APPARATUS</p>
        <div className="flex items-center gap-4">
          {/* Flask */}
          <div className="flex flex-col items-center gap-1">
            <svg viewBox="0 0 80 100" width="80" height="100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <clipPath id="rc-flask">
                  <path d="M28 10 L28 50 L5 85 Q2 95 15 97 L65 97 Q78 95 75 85 L52 50 L52 10 Z" />
                </clipPath>
              </defs>
              <path d="M28 10 L28 50 L5 85 Q2 95 15 97 L65 97 Q78 95 75 85 L52 50 L52 10"
                fill="none" stroke="#334155" strokeWidth="1.5" />
              <rect x="0" y="40" width="80" height="60" fill="#6DB6E8" clipPath="url(#rc-flask)" opacity={0.4} />
              {/* Bubbles when catalysed */}
              {experiment === "catalysed" && isRunning && [20, 35, 50].map((x, i) => (
                <motion.circle key={i} cx={x} cy={80} r="3" fill="rgba(200,240,255,0.4)"
                  animate={{ cy: [80, 50, 30], opacity: [0.6, 0.4, 0] }}
                  transition={{ duration: 0.8, delay: i * 0.25, repeat: Infinity }} />
              ))}
              {/* MnO₂ powder */}
              {experiment === "catalysed" && (
                <ellipse cx="40" cy="90" rx="15" ry="4" fill="#2D2D2D" opacity={0.8} />
              )}
              <rect x="27" y="5" width="26" height="6" fill="#1E293B" rx="2" />
            </svg>
            <p className="text-slate-500 text-xs font-rajdhani">H₂O₂</p>
          </div>

          {/* Tube → syringe */}
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

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <motion.button
          onClick={() => { handleReset(); startExperiment("uncatalysed"); }}
          disabled={isRunning}
          whileTap={{ scale: 0.96 }}
          className="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/60 disabled:opacity-40 text-slate-200 text-sm font-rajdhani border border-slate-600/40 rounded transition-all"
        >
          Run without catalyst
        </motion.button>
        <motion.button
          onClick={() => { handleReset(); startExperiment("catalysed"); }}
          disabled={isRunning}
          whileTap={{ scale: 0.96 }}
          className="px-4 py-2 bg-teal/20 hover:bg-teal/30 disabled:opacity-40 text-teal text-sm font-rajdhani font-semibold border border-teal/40 rounded transition-all"
        >
          + Add MnO₂ catalyst
        </motion.button>
        {(isRunning || isDone) && (
          <button onClick={handleReset} className="px-3 py-2 text-slate-400 hover:text-white text-xs font-rajdhani border border-border rounded transition-colors">
            Reset
          </button>
        )}
      </div>

      {/* MnO₂ mass result */}
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

      {/* Chart */}
      {(uncatalysedData.length > 1 || catalysedData.length > 1) && (
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
      )}

      {/* Comparison */}
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
    </div>
  );
}
