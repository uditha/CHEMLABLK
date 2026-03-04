"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";

// ─── Iodine Clock chemistry ───────────────────────────────────────────────────
//
// IO₃⁻ + 3 HSO₃⁻ → I⁻ + 3 SO₄²⁻ + 3 H⁺   (fast, consumes iodate)
// IO₃⁻ + 5 I⁻ + 6 H⁺ → 3 I₂ + 3 H₂O        (produces I₂)
// I₂ + HSO₃⁻ + H₂O → 2 I⁻ + SO₄²⁻ + 3 H⁺  (I₂ consumed until HSO₃⁻ gone)
// I₂ + starch → deep blue/black                (end point)
//
// The reaction time depends on concentration: t ∝ 1/[IO₃⁻]

interface TrialConfig {
  label: string;
  iodate: number; // relative concentration factor
  bisulfite: number;
  color: string;
  expectedTime: number; // seconds
}

const TRIALS: TrialConfig[] = [
  { label: "1× conc.", iodate: 1.0, bisulfite: 1.0, color: "#6366F1", expectedTime: 8 },
  { label: "0.75× conc.", iodate: 0.75, bisulfite: 1.0, color: "#8B5CF6", expectedTime: 11 },
  { label: "0.5× conc.", iodate: 0.5, bisulfite: 1.0, color: "#A78BFA", expectedTime: 17 },
  { label: "0.25× conc.", iodate: 0.25, bisulfite: 1.0, color: "#C4B5FD", expectedTime: 34 },
];

const GUIDED_STEPS = [
  {
    id: 0,
    title: "Prepare reagent solutions",
    instructions:
      "Prepare Solution A: KIO₃ in acidified water. Prepare Solution B: Na₂S₂O₃ (or NaHSO₃) with starch indicator. Keep solutions separate before mixing.",
  },
  {
    id: 1,
    title: "Select concentration & mix",
    instructions:
      "Select a concentration ratio, then click Mix to combine the two solutions. Start the timer the moment mixing begins. Watch carefully — the colour change is sudden!",
  },
  {
    id: 2,
    title: "Observe the clock reaction",
    instructions:
      "The colourless mixture appears to do nothing... then SUDDENLY it turns dark blue-black as I₂ reacts with starch. Record the time for each concentration.",
  },
  {
    id: 3,
    title: "Plot and analyse",
    instructions:
      "Plot 1/time vs [IO₃⁻] relative concentration. If the graph is linear through the origin, the reaction is first order with respect to IO₃⁻.",
  },
];

// ─── Beaker SVG ───────────────────────────────────────────────────────────────

function Beaker({
  solution,
  label,
  color,
  size = "sm",
}: {
  solution: string;
  label: string;
  color: string;
  size?: "sm" | "lg";
}) {
  const [w, h] = size === "lg" ? [80, 90] : [60, 70];

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id={`bc-${label}`}>
            <path d={`M5 10 L5 ${h - 15} Q5 ${h - 5} 15 ${h - 5} L${w - 15} ${h - 5} Q${w - 5} ${h - 5} ${w - 5} ${h - 15} L${w - 5} 10 Z`} />
          </clipPath>
        </defs>
        <path
          d={`M5 10 L5 ${h - 15} Q5 ${h - 5} 15 ${h - 5} L${w - 15} ${h - 5} Q${w - 5} ${h - 5} ${w - 5} ${h - 15} L${w - 5} 10`}
          fill="none"
          stroke="#334155"
          strokeWidth="1.5"
        />
        <line x1="5" y1="10" x2={w - 5} y2="10" stroke="#334155" strokeWidth="1.5" />
        <rect
          x="5"
          y="20"
          width={w - 10}
          height={h - 25}
          fill={color}
          clipPath={`url(#bc-${label})`}
          opacity={0.6}
        />
        {/* Pouring spout */}
        <path d={`M${w - 5} 10 Q${w} 8 ${w + 3} 5`} fill="none" stroke="#475569" strokeWidth="1.5" />
      </svg>
      <p className="text-xs font-rajdhani text-slate-400 text-center">{label}</p>
      <p className="text-xs font-orbitron text-white">{solution}</p>
    </div>
  );
}

// ─── Mixed flask ──────────────────────────────────────────────────────────────

function MixedFlask({
  isTurned,
  progress,
  hasColorChanged,
}: {
  isTurned: boolean;
  progress: number; // 0..1
  hasColorChanged: boolean;
}) {
  const color = hasColorChanged
    ? "#1A1040"
    : isTurned
    ? `rgba(200,210,240,${0.4 + progress * 0.2})`
    : "transparent";

  return (
    <svg viewBox="0 0 100 130" width="100" height="130" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="mf-clip">
          <path d="M35 5 L35 55 L5 110 Q2 125 18 128 L82 128 Q98 125 95 110 L65 55 L65 5 Z" />
        </clipPath>
        {hasColorChanged && (
          <radialGradient id="dark-grad" cx="50%" cy="60%" r="50%">
            <stop offset="0%" stopColor="#2D1B69" />
            <stop offset="100%" stopColor="#0A0520" />
          </radialGradient>
        )}
      </defs>
      <path
        d="M35 5 L35 55 L5 110 Q2 125 18 128 L82 128 Q98 125 95 110 L65 55 L65 5 Z"
        fill="none"
        stroke="#475569"
        strokeWidth="2"
      />
      {isTurned && (
        <rect
          x="0"
          y="20"
          width="100"
          height="120"
          fill={hasColorChanged ? "url(#dark-grad)" : color}
          clipPath="url(#mf-clip)"
          opacity={hasColorChanged ? 1 : 0.7}
        />
      )}
      {/* Neck */}
      <rect x="34" y="0" width="32" height="6" fill="#1A2540" rx="2" />
    </svg>
  );
}

// ─── Rate data chart ──────────────────────────────────────────────────────────

function RateChart({ results }: { results: { trial: TrialConfig; time: number }[] }) {
  const W = 260;
  const H = 120;
  const PAD = { top: 10, right: 20, bottom: 28, left: 36 };

  if (results.length < 2) return null;

  const maxConc = 1.1;
  const maxRate = Math.max(...results.map((r) => 1 / r.time)) * 1.2;

  const toX = (c: number) =>
    PAD.left + (c / maxConc) * (W - PAD.left - PAD.right);
  const toY = (r: number) =>
    H - PAD.bottom - (r / maxRate) * (H - PAD.top - PAD.bottom);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill="#0A0E1A" rx="4" />

      {/* Axes */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#475569" strokeWidth="1" />
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#475569" strokeWidth="1" />

      {/* Axis labels */}
      <text x={(W + PAD.left) / 2} y={H - 3} fontSize="7" fill="#64748B" textAnchor="middle">
        [IO₃⁻] relative concentration
      </text>
      <text
        x={10}
        y={(H - PAD.bottom + PAD.top) / 2}
        fontSize="7"
        fill="#64748B"
        textAnchor="middle"
        transform={`rotate(-90, 10, ${(H - PAD.bottom + PAD.top) / 2})`}
      >
        Rate (1/t)
      </text>

      {/* Points */}
      {results.map((r) => (
        <circle
          key={r.trial.label}
          cx={toX(r.trial.iodate)}
          cy={toY(1 / r.time)}
          r="4"
          fill={r.trial.color}
        />
      ))}

      {/* Best-fit line */}
      {results.length >= 2 && (() => {
        const xs = results.map((r) => r.trial.iodate);
        const ys = results.map((r) => 1 / r.time);
        const xMean = xs.reduce((a, b) => a + b, 0) / xs.length;
        const yMean = ys.reduce((a, b) => a + b, 0) / ys.length;
        const slope =
          xs.reduce((s, x, i) => s + (x - xMean) * (ys[i] - yMean), 0) /
          xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
        const intercept = yMean - slope * xMean;
        const x0 = 0;
        const x1 = maxConc;
        return (
          <line
            x1={toX(x0)}
            y1={toY(slope * x0 + intercept)}
            x2={toX(x1)}
            y2={toY(slope * x1 + intercept)}
            stroke="#0D7E6A"
            strokeWidth="1"
            strokeDasharray="4,3"
            opacity={0.8}
          />
        );
      })()}

      {/* Legend */}
      {results.map((r, i) => (
        <g key={r.trial.label}>
          <circle cx={W - 60} cy={PAD.top + 8 + i * 14} r="3" fill={r.trial.color} />
          <text x={W - 54} y={PAD.top + 11 + i * 14} fontSize="6" fill="#94A3B8">
            {r.trial.label} t={r.time.toFixed(1)}s
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface IodineClockProps {
  onScoreUpdate?: (pts: number) => void;
}

export function IodineClock({ onScoreUpdate }: IodineClockProps) {
  const { currentMode, currentStep, nextStep, addScore, addObservation, lang } =
    useExperimentStore();

  const [selectedTrial, setSelectedTrial] = useState(0);
  const [isMixed, setIsMixed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [colorChanged, setColorChanged] = useState(false);
  const [results, setResults] = useState<{ trial: TrialConfig; time: number }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const trial = TRIALS[selectedTrial];

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  useEffect(() => {
    if (isMixed && !colorChanged) {
      timerRef.current = setInterval(() => {
        setElapsed((e) => {
          const next = e + 0.1;
          if (next >= trial.expectedTime) {
            setColorChanged(true);
            clearInterval(timerRef.current!);
            addObservation(
              `${trial.label}: Colour change after ${trial.expectedTime.toFixed(1)} s. Solution turns dark blue-black.`
            );
            if (currentMode === "Guided" && currentStep === 2) nextStep();
            setResults((prev) => {
              const existing = prev.findIndex((r) => r.trial.label === trial.label);
              if (existing >= 0) {
                const copy = [...prev];
                copy[existing] = { trial, time: trial.expectedTime };
                return copy;
              }
              return [...prev, { trial, time: trial.expectedTime }];
            });
            return trial.expectedTime;
          }
          return next;
        });
      }, 100);
    }
    return clearTimer;
  }, [isMixed, colorChanged, trial, currentMode, currentStep, nextStep, addObservation, clearTimer]);

  function handleMix() {
    setIsMixed(true);
    setElapsed(0);
    setColorChanged(false);
    if (currentMode === "Guided" && currentStep === 1) nextStep();
  }

  function handleReset() {
    clearTimer();
    setIsMixed(false);
    setElapsed(0);
    setColorChanged(false);
  }

  function handleNewTrial() {
    handleReset();
    setSelectedTrial((i) => (i + 1) % TRIALS.length);
  }

  function handleRecordResult() {
    addScore(20);
    onScoreUpdate?.(20);
    if (results.length >= TRIALS.length - 1 && currentMode === "Guided" && currentStep === 3) {
      nextStep();
    }
  }

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

      {/* Chemistry note */}
      <div className="bg-navy/40 border border-border rounded p-3 text-xs font-rajdhani space-y-1">
        <p className="text-slate-300">
          <span className="text-teal font-semibold">Key chemistry:</span> The thiosulfate/bisulfite
          consumes I₂ as fast as it forms. Once it is exhausted, free I₂ reacts with starch →{" "}
          <span className="text-indigo-300 font-semibold">sudden dark blue-black</span> colour.
        </p>
        <p className="text-slate-400">
          Reactions: IO₃⁻ + 5 I⁻ + 6 H⁺ → 3 I₂ + 3 H₂O — then I₂ + starch → deep blue
        </p>
      </div>

      {/* Concentration selector */}
      <div>
        <p className="text-slate-400 text-xs font-orbitron tracking-wider mb-2">
          SELECT CONCENTRATION
        </p>
        <div className="grid grid-cols-4 gap-2">
          {TRIALS.map((t, i) => (
            <button
              key={t.label}
              onClick={() => { setSelectedTrial(i); handleReset(); }}
              className={`p-2 rounded border text-xs font-rajdhani font-medium transition-all ${
                selectedTrial === i
                  ? "border-indigo-500/60 bg-indigo-900/30 text-white"
                  : "border-border text-slate-400 hover:border-slate-500"
              }`}
            >
              <div
                className="w-4 h-4 rounded-full mx-auto mb-1"
                style={{ backgroundColor: t.color, opacity: 0.8 }}
              />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Apparatus */}
      <div className="flex items-end justify-around gap-4 py-4">
        {/* Solution A */}
        <Beaker solution="Sol. A" label="KIO₃ (iodate)" color="#93C5FD" />

        {/* Arrow */}
        {!isMixed && (
          <div className="text-slate-500 text-2xl flex-shrink-0">→</div>
        )}

        {/* Mixed flask or mixing animation */}
        <div className="flex flex-col items-center gap-2">
          <MixedFlask
            isTurned={isMixed}
            progress={colorChanged ? 1 : elapsed / trial.expectedTime}
            hasColorChanged={colorChanged}
          />
          <p className="text-xs font-rajdhani text-slate-400">
            {isMixed
              ? colorChanged
                ? "REACTED"
                : "Mixing…"
              : "Mix here"}
          </p>
        </div>

        {/* Arrow */}
        {!isMixed && (
          <div className="text-slate-500 text-2xl flex-shrink-0">←</div>
        )}

        {/* Solution B */}
        <Beaker solution="Sol. B" label="NaHSO₃ + starch" color="#BBF7D0" />
      </div>

      {/* Timer */}
      <div className="flex items-center justify-center gap-6">
        <div className="text-center">
          <div
            className={`font-orbitron text-4xl font-bold tabular-nums transition-colors ${
              colorChanged ? "text-indigo-400" : isMixed ? "text-teal" : "text-slate-600"
            }`}
          >
            {elapsed.toFixed(1)}s
          </div>
          <div className="text-slate-500 text-xs font-rajdhani mt-1">
            {colorChanged
              ? "Reaction time"
              : isMixed
              ? "Timing…"
              : "Ready"}
          </div>
        </div>

        <AnimatePresence>
          {colorChanged && (
            <motion.div
              className="bg-indigo-900/40 border border-indigo-500/50 rounded p-3 text-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring" }}
            >
              <p className="text-indigo-300 font-orbitron text-sm font-bold">COLOUR CHANGE!</p>
              <p className="text-slate-300 text-xs font-rajdhani mt-1">
                Colourless → dark blue-black
              </p>
              <p className="text-white font-orbitron text-lg mt-1">
                t = {trial.expectedTime.toFixed(1)} s
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        {!isMixed && (
          <motion.button
            onClick={handleMix}
            whileTap={{ scale: 0.96 }}
            className="px-4 py-2 bg-blue-700/50 hover:bg-blue-600/60 text-white text-sm font-rajdhani font-semibold border border-blue-500/40 rounded transition-all"
          >
            Mix Solutions
          </motion.button>
        )}

        {colorChanged && (
          <>
            <motion.button
              onClick={handleRecordResult}
              className="px-3 py-2 bg-teal/20 hover:bg-teal/30 text-teal text-xs font-rajdhani border border-teal/30 rounded transition-all"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              ✓ Record Result
            </motion.button>
            <motion.button
              onClick={handleNewTrial}
              className="px-3 py-2 bg-indigo-800/30 hover:bg-indigo-700/40 text-indigo-300 text-xs font-rajdhani border border-indigo-600/40 rounded transition-all"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              New Trial →
            </motion.button>
          </>
        )}

        {isMixed && !colorChanged && (
          <button
            onClick={handleReset}
            className="px-3 py-2 text-slate-400 hover:text-white text-xs font-rajdhani border border-border rounded transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Results table */}
      {results.length > 0 && (
        <div className="rounded border border-border overflow-hidden">
          <div className="px-3 py-2 bg-navy/30 border-b border-border">
            <p className="text-xs font-orbitron text-slate-400 tracking-wider">
              RESULTS TABLE
            </p>
          </div>
          <table className="w-full text-xs font-rajdhani">
            <thead>
              <tr className="border-b border-border bg-navy/20">
                <th className="text-left px-3 py-1.5 text-slate-400">Trial</th>
                <th className="text-right px-3 py-1.5 text-slate-400">[IO₃⁻] factor</th>
                <th className="text-right px-3 py-1.5 text-slate-400">Time (s)</th>
                <th className="text-right px-3 py-1.5 text-slate-400">Rate (1/t)</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.trial.label} className="border-b border-border/50">
                  <td className="px-3 py-1.5 text-white">{r.trial.label}</td>
                  <td className="px-3 py-1.5 text-right text-white">{r.trial.iodate.toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right text-teal">{r.time.toFixed(1)}</td>
                  <td className="px-3 py-1.5 text-right text-indigo-300">
                    {(1 / r.time).toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rate chart */}
      {results.length >= 2 && (
        <div className="rounded border border-border overflow-hidden">
          <div className="px-3 py-2 bg-navy/30 border-b border-border">
            <p className="text-xs font-orbitron text-slate-400 tracking-wider">
              RATE vs CONCENTRATION
            </p>
          </div>
          <div className="p-3">
            <RateChart results={results} />
            <p className="text-slate-500 text-xs font-rajdhani mt-2 text-center">
              Linear graph through origin → first-order in [IO₃⁻]
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
