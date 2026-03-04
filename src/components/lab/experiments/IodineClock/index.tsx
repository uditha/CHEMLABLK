"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";
import { StepWizard } from "../../StepWizard";
import { CompletionOverlay } from "../../CompletionOverlay";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useSession } from "next-auth/react";
import { saveProgress } from "@/lib/progress";
import type { StepDefinition } from "../../StepWizard";

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
  iodate: number;
  bisulfite: number;
  color: string;
  expectedTime: number;
}

const TRIALS: TrialConfig[] = [
  { label: "1× conc.", iodate: 1.0, bisulfite: 1.0, color: "#6366F1", expectedTime: 8 },
  { label: "0.75× conc.", iodate: 0.75, bisulfite: 1.0, color: "#8B5CF6", expectedTime: 11 },
  { label: "0.5× conc.", iodate: 0.5, bisulfite: 1.0, color: "#A78BFA", expectedTime: 17 },
  { label: "0.25× conc.", iodate: 0.25, bisulfite: 1.0, color: "#C4B5FD", expectedTime: 34 },
];

// ─── Beaker SVG ───────────────────────────────────────────────────────────────

function Beaker({ solution, label, color, size = "sm" }: {
  solution: string; label: string; color: string; size?: "sm" | "lg";
}) {
  const [w, h] = size === "lg" ? [80, 90] : [60, 70];
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id={`bc-${label}`}>
            <path d={`M5 10 L5 ${h - 15} Q5 ${h - 5} 15 ${h - 5} L${w - 15} ${h - 5} Q${w - 5} ${h - 5} ${w - 5} ${h - 15} L${w - 5} 10 Z`} />
          </clipPath>
        </defs>
        <path
          d={`M5 10 L5 ${h - 15} Q5 ${h - 5} 15 ${h - 5} L${w - 15} ${h - 5} Q${w - 5} ${h - 5} ${w - 5} ${h - 15} L${w - 5} 10`}
          fill="none" stroke="#334155" strokeWidth="1.5"
        />
        <line x1="5" y1="10" x2={w - 5} y2="10" stroke="#334155" strokeWidth="1.5" />
        <rect x="5" y="20" width={w - 10} height={h - 25} fill={color} clipPath={`url(#bc-${label})`} opacity={0.6} />
        <path d={`M${w - 5} 10 Q${w} 8 ${w + 3} 5`} fill="none" stroke="#475569" strokeWidth="1.5" />
      </svg>
      <p className="text-xs font-rajdhani text-slate-400 text-center">{label}</p>
      <p className="text-xs font-orbitron text-white">{solution}</p>
    </div>
  );
}

// ─── Mixed flask ──────────────────────────────────────────────────────────────

function MixedFlask({ isTurned, progress, hasColorChanged }: {
  isTurned: boolean; progress: number; hasColorChanged: boolean;
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
      <path d="M35 5 L35 55 L5 110 Q2 125 18 128 L82 128 Q98 125 95 110 L65 55 L65 5 Z"
        fill="none" stroke="#475569" strokeWidth="2" />
      {isTurned && (
        <rect x="0" y="20" width="100" height="120"
          fill={hasColorChanged ? "url(#dark-grad)" : color}
          clipPath="url(#mf-clip)" opacity={hasColorChanged ? 1 : 0.7} />
      )}
      <rect x="34" y="0" width="32" height="6" fill="#1A2540" rx="2" />
    </svg>
  );
}

// ─── Rate data chart ──────────────────────────────────────────────────────────

function RateChart({ results }: { results: { trial: TrialConfig; time: number }[] }) {
  const W = 260; const H = 120;
  const PAD = { top: 10, right: 20, bottom: 28, left: 36 };
  if (results.length < 2) return null;
  const maxConc = 1.1;
  const maxRate = Math.max(...results.map((r) => 1 / r.time)) * 1.2;
  const toX = (c: number) => PAD.left + (c / maxConc) * (W - PAD.left - PAD.right);
  const toY = (r: number) => H - PAD.bottom - (r / maxRate) * (H - PAD.top - PAD.bottom);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill="#0A0E1A" rx="4" />
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#475569" strokeWidth="1" />
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#475569" strokeWidth="1" />
      <text x={(W + PAD.left) / 2} y={H - 3} fontSize="7" fill="#64748B" textAnchor="middle">[IO₃⁻] relative concentration</text>
      <text x={10} y={(H - PAD.bottom + PAD.top) / 2} fontSize="7" fill="#64748B" textAnchor="middle"
        transform={`rotate(-90, 10, ${(H - PAD.bottom + PAD.top) / 2})`}>Rate (1/t)</text>
      {results.map((r) => (
        <circle key={r.trial.label} cx={toX(r.trial.iodate)} cy={toY(1 / r.time)} r="4" fill={r.trial.color} />
      ))}
      {results.length >= 2 && (() => {
        const xs = results.map((r) => r.trial.iodate);
        const ys = results.map((r) => 1 / r.time);
        const xMean = xs.reduce((a, b) => a + b, 0) / xs.length;
        const yMean = ys.reduce((a, b) => a + b, 0) / ys.length;
        const slope = xs.reduce((s, x, i) => s + (x - xMean) * (ys[i] - yMean), 0) /
          xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
        const intercept = yMean - slope * xMean;
        return (
          <line x1={toX(0)} y1={toY(intercept)} x2={toX(maxConc)} y2={toY(slope * maxConc + intercept)}
            stroke="#0D7E6A" strokeWidth="1" strokeDasharray="4,3" opacity={0.8} />
        );
      })()}
      {results.map((r, i) => (
        <g key={r.trial.label}>
          <circle cx={W - 60} cy={PAD.top + 8 + i * 14} r="3" fill={r.trial.color} />
          <text x={W - 54} y={PAD.top + 11 + i * 14} fontSize="6" fill="#94A3B8">{r.trial.label} t={r.time.toFixed(1)}s</text>
        </g>
      ))}
    </svg>
  );
}

// ─── Observations Panel ───────────────────────────────────────────────────────

function ObservationsPanel({ results }: { results: { trial: TrialConfig; time: number }[] }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">RESULTS LOG</p>
        {results.length === 0 ? (
          <p className="text-slate-600 text-xs font-rajdhani">No trials completed yet.</p>
        ) : (
          <div className="space-y-1.5">
            {results.map((r, i) => (
              <div key={i} className="text-xs font-rajdhani text-slate-300 bg-navy/30 rounded p-2 border border-border/50">
                <span className="font-semibold text-indigo-300">{r.trial.label}</span>: t = {r.time.toFixed(1)} s,
                rate = {(1 / r.time).toFixed(4)} s⁻¹
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">PROGRESS</p>
        <div className="flex gap-1">
          {TRIALS.map((t) => {
            const done = results.some((r) => r.trial.label === t.label);
            return (
              <div key={t.label}
                className={`w-7 h-7 rounded flex items-center justify-center text-xs font-orbitron font-bold ${done ? "bg-indigo-900/30 text-indigo-300" : "bg-border/30 text-slate-700"}`}
                title={t.label}>
                {done ? "✓" : "·"}
              </div>
            );
          })}
        </div>
        <p className="text-slate-600 text-xs font-rajdhani mt-1">{results.length}/{TRIALS.length} trials done</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface IodineClockProps {
  onScoreUpdate?: (pts: number) => void;
}

export function IodineClock({ onScoreUpdate }: IodineClockProps) {
  const { addScore, addObservation, setTotalSteps, setStep, score, completeMode, currentMode, resetExperiment } =
    useExperimentStore();
  const { playSuccess } = useSoundEffects();
  const { data: session } = useSession();
  const startTimeRef = useRef(Date.now());
  const [showCompletion, setShowCompletion] = useState(false);

  const [selectedTrial, setSelectedTrial] = useState(0);
  const [isMixed, setIsMixed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [colorChanged, setColorChanged] = useState(false);
  const [results, setResults] = useState<{ trial: TrialConfig; time: number }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setTotalSteps(4); }, [setTotalSteps]);

  const trial = TRIALS[selectedTrial];

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => { return clearTimer; }, [clearTimer]);

  useEffect(() => {
    if (isMixed && !colorChanged) {
      timerRef.current = setInterval(() => {
        setElapsed((e) => {
          const next = e + 0.1;
          if (next >= trial.expectedTime) {
            setColorChanged(true);
            clearInterval(timerRef.current!);
            addObservation(`${trial.label}: Colour change after ${trial.expectedTime.toFixed(1)} s. Dark blue-black.`);
            setResults((prev) => {
              const existing = prev.findIndex((r) => r.trial.label === trial.label);
              if (existing >= 0) {
                const copy = [...prev];
                copy[existing] = { trial, time: trial.expectedTime };
                return copy;
              }
              const updated = [...prev, { trial, time: trial.expectedTime }];
              playSuccess();
              addScore(20);
              onScoreUpdate?.(20);
              return updated;
            });
            return trial.expectedTime;
          }
          return next;
        });
      }, 100);
    }
    return clearTimer;
  }, [isMixed, colorChanged, trial, addObservation, addScore, onScoreUpdate, clearTimer, playSuccess]);

  function handleMix() {
    setIsMixed(true);
    setElapsed(0);
    setColorChanged(false);
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

  function handleComplete() {
    completeMode("iodine-clock-reaction", currentMode);
    setShowCompletion(true);
    if (session?.user?.role === "student") {
      const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      saveProgress({ slug: "iodine-clock-reaction", mode: currentMode, score, timeSpentSeconds }).catch(() => {});
    }
  }

  function handleDoAgain() {
    resetExperiment();
    handleReset();
    setSelectedTrial(0);
    setResults([]);
    setStep(0);
    startTimeRef.current = Date.now();
    setShowCompletion(false);
  }

  // ─── Step Definitions ──────────────────────────────────────────────────────

  const steps: StepDefinition[] = useMemo(() => [
    {
      id: "prepare",
      title: "Prepare Reagent Solutions",
      subtitle: "Set up Solution A (KIO₃) and Solution B (NaHSO₃ + starch).",
      canProceed: true,
      instructions: {
        procedure: [
          "Prepare Solution A: dissolve KIO₃ in acidified water (dilute H₂SO₄)",
          "Prepare Solution B: dissolve NaHSO₃ (sodium bisulfite) in water, add starch indicator",
          "Keep both solutions separate in labelled beakers",
          "Measure exact volumes using graduated pipettes for accuracy",
        ],
        safetyNotes: [
          "Dilute H₂SO₄ is corrosive — wear gloves and eye protection",
          "Work in a well-ventilated area",
        ],
        expectedObservations: [
          "Solution A: clear, colourless",
          "Solution B: clear, colourless (starch is present but invisible)",
        ],
        tips: [
          "Use freshly prepared solutions for best results",
          "Keep solutions at room temperature for consistent timing",
        ],
      },
      quiz: {
        question: "What is the role of the starch in Solution B?",
        options: [
          "It acts as an acid catalyst",
          "It reacts with iodate directly",
          "It forms a deep blue complex with I₂ to mark the endpoint",
          "It speeds up the thiosulfate reaction",
        ],
        correctIndex: 2,
        explanation: "Starch forms an intense blue-black complex with I₂. As long as bisulfite is present, I₂ is consumed before it can react with starch. When bisulfite is exhausted, I₂ accumulates and instantly turns the starch dark blue-black — this is the 'clock' moment.",
      },
      content: (
        <div className="flex flex-col items-center justify-center h-full gap-6 p-4">
          <div className="flex items-end justify-center gap-8">
            <Beaker solution="Sol. A" label="KIO₃ (iodate)" color="#93C5FD" size="lg" />
            <Beaker solution="Sol. B" label="NaHSO₃ + starch" color="#BBF7D0" size="lg" />
          </div>
          <p className="text-slate-400 text-sm font-rajdhani text-center max-w-xs">
            Keep solutions separate. The reaction only begins when they are mixed.
          </p>
        </div>
      ),
      theory: (
        <div className="space-y-3">
          <p className="text-xs font-orbitron text-indigo-300/80 tracking-wider mb-2">MECHANISM</p>
          <p className="text-slate-300 text-xs font-rajdhani leading-relaxed">
            Two competing reactions occur simultaneously:
          </p>
          <div className="space-y-1 text-xs font-mono text-slate-400">
            <p>IO₃⁻ + 5I⁻ + 6H⁺ → 3I₂ + 3H₂O</p>
            <p>I₂ + HSO₃⁻ + H₂O → 2I⁻ + SO₄²⁻ + 3H⁺</p>
          </div>
          <p className="text-slate-300 text-xs font-rajdhani leading-relaxed mt-1">
            I₂ is consumed as fast as it forms — until HSO₃⁻ is used up. Then I₂ accumulates and reacts with starch → <span className="text-indigo-300 font-semibold">sudden blue-black</span>.
          </p>
        </div>
      ),
    },

    {
      id: "mix",
      title: "Select Concentration & Mix",
      subtitle: "Choose an iodate concentration, then mix the solutions.",
      canProceed: colorChanged,
      instructions: {
        procedure: [
          "Select a concentration of KIO₃ from the four options",
          "Click 'Mix Solutions' to combine A and B — start timing immediately",
          "Watch the flask — the solution will appear to do nothing for a while",
          "Record the time when the sudden colour change occurs",
        ],
        expectedObservations: [
          "Higher [IO₃⁻] → shorter reaction time (more iodate to drive reaction)",
          "Lower [IO₃⁻] → longer reaction time",
          "The colour change is SUDDEN, not gradual — this is the clock effect",
        ],
        tips: [
          "Do not stir after mixing — observe without disturbance",
          "The clock reaction is sensitive to temperature — keep conditions consistent",
        ],
      },
      quiz: {
        question: "If you double the concentration of IO₃⁻, what happens to the reaction time?",
        options: [
          "It doubles",
          "It halves",
          "It stays the same",
          "It quadruples",
        ],
        correctIndex: 1,
        explanation: "Rate ∝ [IO₃⁻], so doubling the concentration doubles the rate and halves the reaction time (t ∝ 1/[IO₃⁻]). This is first-order behaviour with respect to iodate.",
      },
      content: (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
          {/* Concentration selector */}
          <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
            {TRIALS.map((t, i) => (
              <button key={t.label}
                onClick={() => { setSelectedTrial(i); handleReset(); }}
                disabled={isMixed}
                className={`p-2 rounded border text-xs font-rajdhani font-medium transition-all ${
                  selectedTrial === i
                    ? "border-indigo-500/60 bg-indigo-900/30 text-white"
                    : "border-border text-slate-400 hover:border-slate-500"
                } ${isMixed ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="w-4 h-4 rounded-full mx-auto mb-1" style={{ backgroundColor: t.color, opacity: 0.8 }} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Apparatus */}
          <div className="flex items-end justify-center gap-4">
            <Beaker solution="Sol. A" label="KIO₃" color="#93C5FD" />
            <div className="flex flex-col items-center gap-2">
              <MixedFlask isTurned={isMixed} progress={colorChanged ? 1 : elapsed / trial.expectedTime} hasColorChanged={colorChanged} />
              <p className="text-xs font-rajdhani text-slate-400">
                {isMixed ? (colorChanged ? "REACTED" : "Mixing…") : "Mix here"}
              </p>
            </div>
            <Beaker solution="Sol. B" label="NaHSO₃" color="#BBF7D0" />
          </div>

          {/* Timer */}
          <div className="text-center">
            <div className={`font-orbitron text-4xl font-bold tabular-nums transition-colors ${
              colorChanged ? "text-indigo-400" : isMixed ? "text-teal animate-pulse" : "text-slate-600"
            }`}>
              {elapsed.toFixed(1)}s
            </div>
          </div>

          <AnimatePresence>
            {colorChanged && (
              <motion.div className="bg-indigo-900/40 border border-indigo-500/50 rounded-lg p-3 text-center w-full max-w-xs"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring" }}>
                <p className="text-indigo-300 font-orbitron text-sm font-bold">COLOUR CHANGE!</p>
                <p className="text-white font-orbitron text-lg">t = {trial.expectedTime.toFixed(1)} s</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2 flex-wrap justify-center">
            {!isMixed && (
              <motion.button onClick={handleMix} whileTap={{ scale: 0.96 }}
                className="px-5 py-2.5 bg-blue-700/50 hover:bg-blue-600/60 text-white text-sm font-rajdhani font-semibold border border-blue-500/40 rounded-lg transition-all">
                Mix Solutions
              </motion.button>
            )}
            {colorChanged && (
              <motion.button onClick={handleNewTrial}
                className="px-4 py-2 bg-indigo-800/30 hover:bg-indigo-700/40 text-indigo-300 text-sm font-rajdhani border border-indigo-600/40 rounded-lg transition-all"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                Try Next Concentration →
              </motion.button>
            )}
            {isMixed && !colorChanged && (
              <button onClick={handleReset} className="px-4 py-2 text-slate-400 hover:text-white text-sm font-rajdhani border border-border rounded-lg transition-colors">
                Reset
              </button>
            )}
          </div>
        </div>
      ),
      theory: (
        <div className="space-y-2">
          <p className="text-xs font-orbitron text-indigo-300/80 tracking-wider mb-1">CURRENT TRIAL</p>
          <p className="text-white text-sm font-rajdhani font-semibold">{trial.label}</p>
          <p className="text-slate-400 text-xs font-rajdhani">[IO₃⁻] factor: {trial.iodate}</p>
          <p className="text-slate-400 text-xs font-rajdhani">Expected time: ~{trial.expectedTime} s</p>
          {colorChanged && (
            <motion.div className="mt-2 pt-2 border-t border-border/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-indigo-300 text-xs font-rajdhani font-semibold">Rate = 1/t = {(1 / trial.expectedTime).toFixed(4)} s⁻¹</p>
            </motion.div>
          )}
        </div>
      ),
    },

    {
      id: "analyse",
      title: "Analyse Results",
      subtitle: "Build the results table. Try all four concentrations.",
      canProceed: results.length >= 1,
      instructions: {
        procedure: [
          "Review the results table — compare time and rate for each concentration",
          "Test additional concentrations using the previous step",
          "Notice how rate (1/t) changes with concentration",
        ],
        tips: [
          "Rate ∝ [IO₃⁻] means the reaction is first-order in iodate",
          "A plot of 1/t vs [IO₃⁻] should give a straight line through the origin",
        ],
      },
      content: (
        <div className="flex flex-col h-full gap-3 p-4 overflow-y-auto">
          {results.length > 0 ? (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-2 bg-navy/30 border-b border-border">
                <p className="text-xs font-orbitron text-slate-400 tracking-wider">RESULTS TABLE</p>
              </div>
              <table className="w-full text-xs font-rajdhani">
                <thead>
                  <tr className="border-b border-border bg-navy/20">
                    <th className="text-left px-3 py-2 text-slate-400">Trial</th>
                    <th className="text-right px-3 py-2 text-slate-400">[IO₃⁻]</th>
                    <th className="text-right px-3 py-2 text-slate-400">Time (s)</th>
                    <th className="text-right px-3 py-2 text-slate-400">Rate (1/t)</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.trial.label} className="border-b border-border/50">
                      <td className="px-3 py-2 text-white">{r.trial.label}</td>
                      <td className="px-3 py-2 text-right text-white">{r.trial.iodate.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right text-teal">{r.time.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right text-indigo-300">{(1 / r.time).toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-600 text-sm font-rajdhani">Complete at least one trial first.</p>
            </div>
          )}
          <button onClick={() => setStep(1)}
            className="px-4 py-2 text-indigo-300 hover:text-white text-sm font-rajdhani font-semibold border border-indigo-600/40 hover:bg-indigo-900/20 rounded-lg transition-all self-center">
            Run Another Trial
          </button>
        </div>
      ),
      theory: (
        <div className="space-y-2">
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1">ORDER OF REACTION</p>
          <p className="text-slate-300 text-xs font-rajdhani leading-relaxed">
            If rate (1/t) is proportional to [IO₃⁻], the reaction is <span className="text-teal font-semibold">first order</span> in iodate.
          </p>
          <p className="text-slate-400 text-xs font-mono mt-1">Rate = k[IO₃⁻]</p>
          <p className="text-slate-500 text-xs font-rajdhani mt-2">
            A linear graph of 1/t vs [IO₃⁻] through the origin confirms first-order kinetics.
          </p>
        </div>
      ),
    },

    {
      id: "graph",
      title: "Rate vs Concentration Graph",
      subtitle: "Plot 1/t against [IO₃⁻] to determine the order of reaction.",
      canProceed: true,
      instructions: {
        procedure: [
          "Plot rate (1/t) on the y-axis against [IO₃⁻] on the x-axis",
          "Draw the best-fit line through the data points",
          "Check if the line passes through the origin",
          "The gradient of the line = rate constant k",
        ],
        tips: [
          "A straight line through the origin → first-order in [IO₃⁻]",
          "This is a key part of the A/L practical assessment — understand what the graph shows",
        ],
      },
      content: (
        <div className="flex flex-col h-full gap-3 p-4 overflow-y-auto">
          {results.length >= 2 ? (
            <>
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-3 py-2 bg-navy/30 border-b border-border">
                  <p className="text-xs font-orbitron text-slate-400 tracking-wider">RATE vs [IO₃⁻] GRAPH</p>
                </div>
                <div className="p-3">
                  <RateChart results={results} />
                  <p className="text-slate-500 text-xs font-rajdhani mt-2 text-center">
                    Linear graph through origin → first-order in [IO₃⁻]
                  </p>
                </div>
              </div>
              <div className="bg-teal/5 border border-teal/20 rounded-lg p-3 text-xs font-rajdhani text-slate-300">
                <p className="font-semibold text-teal mb-1">Conclusion:</p>
                <p>Rate (1/t) increases linearly with [IO₃⁻] → the reaction is <span className="text-teal font-semibold">first order</span> with respect to iodate ions.</p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <p className="text-slate-500 text-sm font-rajdhani">Complete at least 2 trials to see the graph.</p>
              <button onClick={() => setStep(1)}
                className="px-4 py-2 text-indigo-300 text-sm font-rajdhani border border-indigo-600/40 hover:bg-indigo-900/20 rounded-lg transition-all">
                Run More Trials →
              </button>
            </div>
          )}
        </div>
      ),
      theory: (
        <div className="space-y-2">
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1">KEY TAKEAWAY</p>
          <p className="text-slate-300 text-xs font-rajdhani leading-relaxed">
            The iodine clock reaction demonstrates that reaction rate is proportional to reactant concentration.
          </p>
          <p className="text-slate-400 text-xs font-mono">Rate = k[IO₃⁻]¹</p>
          <p className="text-slate-500 text-xs font-rajdhani mt-2">
            This is the basis for determining reaction order experimentally — a core A/L Chemistry practical skill.
          </p>
        </div>
      ),
    },
  ], [selectedTrial, isMixed, elapsed, colorChanged, results, trial]);

  const persistentNotes = useMemo(() => (
    <ObservationsPanel results={results} />
  ), [results]);

  const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

  return (
    <>
      <StepWizard
        steps={steps}
        persistentNotes={persistentNotes}
        experimentTitle="Iodine Clock Reaction — Effect of Concentration on Rate"
        onComplete={handleComplete}
      />
      {showCompletion && (
        <CompletionOverlay
          experimentTitle="Iodine Clock Reaction — Effect of Concentration on Rate"
          score={score}
          maxScore={80}
          itemsTested={results.length}
          totalItems={TRIALS.length}
          timeSpentSeconds={timeSpentSeconds}
          onDoAgain={handleDoAgain}
        />
      )}
    </>
  );
}
