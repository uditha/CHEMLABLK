"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";

// ─── Na₂S₂O₃ + HCl "disappearing cross" experiment ───────────────────────────
const R_GAS = 8.314;
const Ea = 50000; // J mol⁻¹
const TEMPERATURES = [20, 30, 40, 50, 60];

function rateAtTemp(T_celsius: number): number {
  const T_K = T_celsius + 273.15;
  return 0.01 * Math.exp(-Ea / (R_GAS * T_K));
}

function timeAtTemp(T_celsius: number): number {
  return 1 / rateAtTemp(T_celsius);
}

const GUIDED_STEPS = [
  {
    id: 0,
    title: "Set up the experiment",
    instructions:
      "Place a conical flask on a piece of paper with a black cross. Add Na₂S₂O₃ solution. Measure and record the initial temperature.",
  },
  {
    id: 1,
    title: "Add HCl and start timer",
    instructions:
      "Add excess HCl(aq) and immediately start the stopwatch. Look down through the flask at the cross.",
  },
  {
    id: 2,
    title: "Stop when cross disappears",
    instructions:
      "Stop the timer when the cross is no longer visible due to the sulphur precipitate. Record the time.",
  },
  {
    id: 3,
    title: "Repeat at different temperatures",
    instructions:
      "Repeat at 30, 40, 50, 60°C. Calculate rate = 1/t for each temperature.",
  },
  {
    id: 4,
    title: "Plot Arrhenius graph",
    instructions:
      "Plot ln(rate) vs 1/T (Kelvin). Gradient = −Ea/R → Ea ≈ 50 kJ mol⁻¹.",
  },
];

// ─── Cross view ───────────────────────────────────────────────────────────────

function CrossView({ opacity }: { opacity: number }) {
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <div
        className="absolute inset-0 rounded-full border-2 border-slate-600"
        style={{ backgroundColor: `rgba(160,160,120,${(1 - opacity) * 0.7})` }}
      />
      <span
        className="relative font-bold text-3xl select-none"
        style={{ color: `rgba(50,50,50,${opacity})`, filter: `blur(${(1 - opacity) * 3}px)` }}
      >
        ✕
      </span>
    </div>
  );
}

// ─── Arrhenius plot ───────────────────────────────────────────────────────────

function ArrheniusPlot({ results }: { results: { T: number; time: number }[] }) {
  if (results.length < 2) return null;

  const W = 300;
  const H = 120;
  const PAD = { top: 10, right: 10, bottom: 28, left: 38 };

  const points = results.map((r) => ({
    x: 1000 / (r.T + 273.15),
    y: Math.log(1 / r.time),
    T: r.T,
  }));

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs) - 0.05;
  const maxX = Math.max(...xs) + 0.05;
  const minY = Math.min(...ys) - 0.5;
  const maxY = Math.max(...ys) + 0.5;

  const toX = (x: number) => PAD.left + ((x - minX) / (maxX - minX)) * (W - PAD.left - PAD.right);
  const toY = (y: number) => H - PAD.bottom - ((y - minY) / (maxY - minY)) * (H - PAD.top - PAD.bottom);

  const n = points.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = xs.reduce((s, x) => s + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const Ea_calc = -slope * R_GAS * 1000;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" xmlns="http://www.w3.org/2000/svg">
        <rect width={W} height={H} fill="#0A0E1A" rx="4" />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#475569" strokeWidth="1" />
        <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#475569" strokeWidth="1" />
        <text x={(W + PAD.left) / 2} y={H - 2} fontSize="7" fill="#64748B" textAnchor="middle">1000/T (K⁻¹)</text>
        <text x={10} y={(H - PAD.bottom + PAD.top) / 2} fontSize="7" fill="#64748B" textAnchor="middle"
          transform={`rotate(-90, 10, ${(H - PAD.bottom + PAD.top) / 2})`}>ln(rate)</text>

        <line
          x1={toX(minX + 0.02)} y1={toY(slope * (minX + 0.02) + intercept)}
          x2={toX(maxX - 0.02)} y2={toY(slope * (maxX - 0.02) + intercept)}
          stroke="#0D7E6A" strokeWidth="1" strokeDasharray="4,3" opacity={0.7}
        />

        {points.map((p) => (
          <g key={p.T}>
            <circle cx={toX(p.x)} cy={toY(p.y)} r="4" fill="#EF4444" />
            <text x={toX(p.x) + 5} y={toY(p.y) - 4} fontSize="5.5" fill="#94A3B8">{p.T}°C</text>
          </g>
        ))}

        {[minY + 0.5, (minY + maxY) / 2, maxY - 0.5].map((y) => (
          <text key={y} x={PAD.left - 3} y={toY(y) + 3} fontSize="5.5" fill="#475569" textAnchor="end">
            {y.toFixed(1)}
          </text>
        ))}
      </svg>
      <p className="text-center text-xs font-rajdhani text-teal mt-1">
        Ea ≈ {(Ea_calc / 1000).toFixed(1)} kJ mol⁻¹ (gradient = −Ea/R)
      </p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface RateTemperatureProps {
  onScoreUpdate?: (pts: number) => void;
}

export function RateTemperature({ onScoreUpdate }: RateTemperatureProps) {
  const { currentMode, currentStep, nextStep, addScore, addObservation } =
    useExperimentStore();

  const [selectedTemp, setSelectedTemp] = useState(20);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [crossOpacity, setCrossOpacity] = useState(1);
  const [isDone, setIsDone] = useState(false);
  const [results, setResults] = useState<{ T: number; time: number }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const targetTime = timeAtTemp(selectedTemp);
  const rate = 1 / targetTime;

  const startExperiment = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(true);
    setElapsed(0);
    setCrossOpacity(1);
    setIsDone(false);

    if (currentMode === "Guided" && currentStep === 1) nextStep();

    const target = timeAtTemp(selectedTemp);

    timerRef.current = setInterval(() => {
      setElapsed((e) => {
        const next = +(e + 0.5).toFixed(1);
        const progress = next / target;
        setCrossOpacity(Math.max(0, 1 - progress));

        if (next >= target) {
          clearInterval(timerRef.current!);
          setIsRunning(false);
          setIsDone(true);
          setCrossOpacity(0);

          addObservation(
            `${selectedTemp}°C: cross disappears in ${target.toFixed(1)} s — rate = ${(1 / target).toFixed(5)} s⁻¹`
          );

          setResults((prev) => {
            const existing = prev.findIndex((r) => r.T === selectedTemp);
            if (existing >= 0) {
              const copy = [...prev];
              copy[existing] = { T: selectedTemp, time: target };
              return copy;
            }
            return [...prev, { T: selectedTemp, time: target }].sort((a, b) => a.T - b.T);
          });

          addScore(15);
          onScoreUpdate?.(15);
          if (currentMode === "Guided" && currentStep === 2) nextStep();
        }

        return next;
      });
    }, 500);
  }, [selectedTemp, currentMode, currentStep, nextStep, addObservation, addScore, onScoreUpdate]);

  function handleReset() {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false);
    setElapsed(0);
    setCrossOpacity(1);
    setIsDone(false);
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
          <span className="text-teal font-semibold">Reaction:</span>{" "}
          Na₂S₂O₃ + H₂SO₄ → sulphur (cloudy precipitate). Time for cross to disappear ∝ 1/rate.
          Higher T → shorter time → faster rate. Use Arrhenius: ln(rate) = ln(A) − Ea/RT.
        </p>
      </div>

      <div>
        <p className="text-slate-400 text-xs font-orbitron tracking-wider mb-2">SELECT TEMPERATURE</p>
        <div className="flex flex-wrap gap-2">
          {TEMPERATURES.map((T) => {
            const doneT = results.some((r) => r.T === T);
            return (
              <button key={T}
                onClick={() => { setSelectedTemp(T); handleReset(); }}
                className={`px-3 py-2 rounded border text-xs font-rajdhani font-medium transition-all ${
                  selectedTemp === T ? "border-red-500/50 bg-red-900/20 text-white"
                    : doneT ? "border-green-700/30 bg-green-900/10 text-green-400"
                    : "border-border text-slate-400 hover:border-slate-500"
                }`}
              >
                {T}°C {doneT && "✓"}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex flex-col items-center gap-3 p-4 bg-navy/30 border border-border rounded">
            <CrossView opacity={crossOpacity} />
            <div className="text-center">
              <div className={`font-orbitron text-3xl font-bold tabular-nums ${isRunning ? "text-red-400" : isDone ? "text-teal" : "text-slate-600"}`}>
                {elapsed.toFixed(1)}s
              </div>
              <div className="text-slate-500 text-xs font-rajdhani mt-0.5">
                {isDone ? `Complete! Rate = ${rate.toFixed(5)} s⁻¹` : isRunning ? "Running…" : `Expected ≈ ${targetTime.toFixed(0)} s`}
              </div>
            </div>
            <div className="flex gap-2">
              {!isRunning && (
                <motion.button onClick={startExperiment} whileTap={{ scale: 0.96 }}
                  className="px-4 py-2 bg-red-800/50 hover:bg-red-700/60 text-white text-sm font-rajdhani font-semibold border border-red-600/40 rounded transition-all">
                  Start Experiment
                </motion.button>
              )}
              {(isRunning || isDone) && (
                <button onClick={handleReset} className="px-3 py-2 text-slate-400 hover:text-white text-xs font-rajdhani border border-border rounded transition-colors">
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="bg-navy/40 border border-border rounded p-3 text-xs font-rajdhani space-y-1">
            <div className="flex justify-between"><span className="text-slate-400">T:</span><span className="text-red-400">{selectedTemp}°C ({selectedTemp + 273} K)</span></div>
            <div className="flex justify-between"><span className="text-slate-400">1000/T:</span><span className="text-white">{(1000 / (selectedTemp + 273.15)).toFixed(3)} K⁻¹</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Expected t:</span><span className="text-white">{targetTime.toFixed(1)} s</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Rate (1/t):</span><span className="text-teal">{rate.toFixed(5)} s⁻¹</span></div>
            <div className="flex justify-between"><span className="text-slate-400">ln(rate):</span><span className="text-white">{Math.log(rate).toFixed(3)}</span></div>
          </div>
        </div>

        <div className="space-y-3">
          {results.length > 0 && (
            <>
              <div className="rounded border border-border overflow-hidden">
                <div className="px-3 py-2 bg-navy/30 border-b border-border">
                  <p className="text-xs font-orbitron text-slate-400 tracking-wider">RESULTS</p>
                </div>
                <table className="w-full text-xs font-rajdhani">
                  <thead>
                    <tr className="border-b border-border bg-navy/20">
                      <th className="text-left px-3 py-1.5 text-slate-400">T (°C)</th>
                      <th className="text-right px-3 py-1.5 text-slate-400">t (s)</th>
                      <th className="text-right px-3 py-1.5 text-slate-400">Rate</th>
                      <th className="text-right px-3 py-1.5 text-slate-400">ln(rate)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.T} className="border-b border-border/50">
                        <td className="px-3 py-1.5 text-white">{r.T}</td>
                        <td className="px-3 py-1.5 text-right text-red-400">{r.time.toFixed(1)}</td>
                        <td className="px-3 py-1.5 text-right text-teal">{(1 / r.time).toFixed(5)}</td>
                        <td className="px-3 py-1.5 text-right text-white">{Math.log(1 / r.time).toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {results.length >= 3 && (
                <div className="rounded border border-border overflow-hidden">
                  <div className="px-3 py-2 bg-navy/30 border-b border-border">
                    <p className="text-xs font-orbitron text-slate-400 tracking-wider">ARRHENIUS PLOT</p>
                  </div>
                  <div className="p-3">
                    <ArrheniusPlot results={results} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
