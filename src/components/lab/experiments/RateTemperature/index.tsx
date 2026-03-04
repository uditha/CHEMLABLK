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

// ─── Observations panel ───────────────────────────────────────────────────────

function ObservationsPanel({ results }: { results: { T: number; time: number }[] }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-orbitron text-slate-400 tracking-wider mb-2">TRIALS COMPLETED</p>
        <div className="flex gap-2 flex-wrap">
          {TEMPERATURES.map((T) => {
            const done = results.some((r) => r.T === T);
            return (
              <div key={T}
                className={`w-10 h-10 rounded border flex flex-col items-center justify-center text-xs font-rajdhani transition-all ${
                  done ? "border-teal/50 bg-teal/10 text-teal" : "border-border text-slate-600"
                }`}
              >
                <span>{T}°</span>
                {done && <span className="text-[9px]">✓</span>}
              </div>
            );
          })}
        </div>
      </div>
      {results.length > 0 && (
        <div>
          <p className="text-xs font-orbitron text-slate-400 tracking-wider mb-1">RESULTS LOG</p>
          <div className="space-y-1">
            {results.map((r) => (
              <div key={r.T} className="text-xs font-rajdhani text-slate-300 bg-navy/30 px-2 py-1 rounded">
                <span className="text-red-400">{r.T}°C</span>
                {" → "}
                <span className="text-white">{r.time.toFixed(1)} s</span>
                {" | rate = "}
                <span className="text-teal">{(1 / r.time).toFixed(5)} s⁻¹</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface RateTemperatureProps {
  onScoreUpdate?: (pts: number) => void;
}

export function RateTemperature({ onScoreUpdate }: RateTemperatureProps) {
  const { addScore, addObservation, setTotalSteps, setStep, score, completeMode, resetExperiment } =
    useExperimentStore();
  const { playSuccess } = useSoundEffects();
  const { data: session } = useSession();
  const startTimeRef = useRef(Date.now());

  const [showCompletion, setShowCompletion] = useState(false);
  const [selectedTemp, setSelectedTemp] = useState(20);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [crossOpacity, setCrossOpacity] = useState(1);
  const [isDone, setIsDone] = useState(false);
  const [results, setResults] = useState<{ T: number; time: number }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => { setTotalSteps(4); }, []);

  const targetTime = timeAtTemp(selectedTemp);
  const rate = 1 / targetTime;

  const startExperiment = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(true);
    setElapsed(0);
    setCrossOpacity(1);
    setIsDone(false);

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
            let updated: { T: number; time: number }[];
            if (existing >= 0) {
              const copy = [...prev];
              copy[existing] = { T: selectedTemp, time: target };
              updated = copy;
            } else {
              updated = [...prev, { T: selectedTemp, time: target }].sort((a, b) => a.T - b.T);
              // Score only on new trial
              addScore(15);
              onScoreUpdate?.(15);
              playSuccess();
            }
            return updated;
          });
        }

        return next;
      });
    }, 500);
  }, [selectedTemp, addObservation, addScore, onScoreUpdate, playSuccess]);

  function handleReset() {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false);
    setElapsed(0);
    setCrossOpacity(1);
    setIsDone(false);
  }

  async function handleComplete() {
    completeMode();
    setShowCompletion(true);
    if (session?.user?.role === "student") {
      await saveProgress({
        experimentSlug: "rate-temperature",
        score: score + (results.length >= 5 ? 25 : 0),
        maxScore: 100,
        timeSpentSeconds: Math.round((Date.now() - startTimeRef.current) / 1000),
      });
    }
  }

  function handleDoAgain() {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowCompletion(false);
    setSelectedTemp(20);
    setIsRunning(false);
    setElapsed(0);
    setCrossOpacity(1);
    setIsDone(false);
    setResults([]);
    startTimeRef.current = Date.now();
    resetExperiment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setTotalSteps(4);
  }

  // ── Experiment runner UI (reused across steps) ────────────────────────────
  const experimentRunner = (
    <div className="space-y-3">
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
  );

  // ── Results table ──────────────────────────────────────────────────────────
  const resultsTable = results.length > 0 ? (
    <div className="rounded border border-border overflow-hidden">
      <div className="px-3 py-2 bg-navy/30 border-b border-border">
        <p className="text-xs font-orbitron text-slate-400 tracking-wider">RESULTS TABLE</p>
      </div>
      <table className="w-full text-xs font-rajdhani">
        <thead>
          <tr className="border-b border-border bg-navy/20">
            <th className="text-left px-3 py-1.5 text-slate-400">T (°C)</th>
            <th className="text-right px-3 py-1.5 text-slate-400">T (K)</th>
            <th className="text-right px-3 py-1.5 text-slate-400">t (s)</th>
            <th className="text-right px-3 py-1.5 text-slate-400">1000/T</th>
            <th className="text-right px-3 py-1.5 text-slate-400">ln(rate)</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.T} className="border-b border-border/50">
              <td className="px-3 py-1.5 text-white">{r.T}</td>
              <td className="px-3 py-1.5 text-right text-slate-300">{r.T + 273}</td>
              <td className="px-3 py-1.5 text-right text-red-400">{r.time.toFixed(1)}</td>
              <td className="px-3 py-1.5 text-right text-white">{(1000 / (r.T + 273.15)).toFixed(3)}</td>
              <td className="px-3 py-1.5 text-right text-teal">{Math.log(1 / r.time).toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="text-center py-6 text-slate-500 text-sm font-rajdhani">
      Complete at least one trial to see results here.
    </div>
  );

  // ─── Steps ─────────────────────────────────────────────────────────────────
  const steps: StepDefinition[] = useMemo(() => [
    {
      id: "intro",
      title: "Introduction to Rate & Temperature",
      subtitle: "Understand the disappearing cross experiment",
      instructions: {
        procedure: [
          "Read the reaction: Na₂S₂O₃(aq) + H₂SO₄(aq) → S(s) + SO₂(g) + Na₂SO₄(aq) + H₂O(l)",
          "Understand why sulphur precipitate clouds the solution over time",
          "A black cross on paper beneath the flask disappears as turbidity increases",
          "The time for the cross to disappear is inversely proportional to the reaction rate",
          "We will vary temperature (20–60 °C) while keeping concentration constant",
        ],
        safetyNotes: [
          "H₂SO₄ is corrosive — wear eye protection and gloves",
          "Na₂S₂O₃ solutions produce SO₂ — work in a well-ventilated area",
          "Use a water bath to maintain a stable temperature",
          "Allow solutions to reach the set temperature before mixing",
        ],
        expectedObservations: [
          "Higher temperature → shorter time for cross to disappear → faster reaction",
          "Each 10 °C rise roughly doubles the reaction rate (rule of thumb)",
          "Rate = 1/t; plotting ln(rate) vs 1/T gives a straight line",
        ],
        tips: [
          "Always look vertically downward through the flask at the cross",
          "Stop the timer the instant the cross is no longer visible",
          "Repeat each trial twice and average for accuracy",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Arrhenius Equation</p>
          <div className="bg-navy/50 border border-teal/20 rounded p-3 font-mono text-center text-white text-sm">
            k = A·e<sup>−Ea/RT</sup>
          </div>
          <p>Taking the natural log: <span className="text-white font-semibold">ln k = ln A − Ea/RT</span></p>
          <p>Rearranging: <span className="text-white font-semibold">ln k = −(Ea/R) × (1/T) + ln A</span></p>
          <p>This is a straight-line equation with:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Gradient = <span className="text-red-400">−Ea / R</span></li>
            <li>y-intercept = <span className="text-teal">ln A</span></li>
            <li>x-axis = <span className="text-white">1/T (K⁻¹)</span></li>
            <li>y-axis = <span className="text-white">ln(rate) ≈ ln(1/t)</span></li>
          </ul>
          <p>Since rate ∝ 1/t, we can substitute ln(1/t) for ln k.</p>
          <p className="text-teal">For this reaction: Ea ≈ 50 kJ mol⁻¹</p>
        </div>
      ),
      quiz: {
        question: "In the disappearing cross experiment, what does a shorter time for the cross to disappear indicate?",
        options: [
          "A slower reaction rate",
          "A faster reaction rate",
          "Lower concentration of Na₂S₂O₃",
          "Higher activation energy",
        ],
        correctIndex: 1,
        explanation: "A shorter time means sulphur precipitates more quickly, so the solution clouds faster — indicating a faster reaction rate. Rate = 1/t, so smaller t gives larger rate.",
      },
      content: (
        <div className="space-y-4">
          <div className="bg-navy/40 border border-border rounded p-4 text-xs font-rajdhani">
            <p className="text-teal font-semibold mb-2">The Reaction</p>
            <div className="font-mono text-white text-center py-2 bg-navy/60 rounded border border-border">
              Na₂S₂O₃(aq) + H₂SO₄(aq) → S(s) + SO₂(g) + Na₂SO₄(aq) + H₂O(l)
            </div>
            <p className="text-slate-300 mt-2 leading-relaxed">
              Sulphur forms as a cloudy precipitate. A black cross on paper beneath the flask
              becomes invisible when enough sulphur has formed. Time for cross to disappear ∝ 1/rate.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-navy/30 border border-border rounded p-3 text-xs font-rajdhani">
              <p className="text-teal font-semibold mb-1">Independent Variable</p>
              <p className="text-slate-300">Temperature (20–60 °C)</p>
            </div>
            <div className="bg-navy/30 border border-border rounded p-3 text-xs font-rajdhani">
              <p className="text-teal font-semibold mb-1">Dependent Variable</p>
              <p className="text-slate-300">Time for cross to disappear (s)</p>
            </div>
            <div className="bg-navy/30 border border-border rounded p-3 text-xs font-rajdhani">
              <p className="text-slate-400 font-semibold mb-1">Control Variables</p>
              <p className="text-slate-300">Concentration of reagents, volume used</p>
            </div>
            <div className="bg-navy/30 border border-border rounded p-3 text-xs font-rajdhani">
              <p className="text-slate-400 font-semibold mb-1">Calculated</p>
              <p className="text-slate-300">Rate = 1/t, ln(rate), 1/T (K)</p>
            </div>
          </div>
          <p className="text-center text-slate-500 text-xs font-rajdhani">
            Proceed to the next step to run the experiments.
          </p>
        </div>
      ),
      canProceed: true,
    },
    {
      id: "run-experiments",
      title: "Run Experiments at Different Temperatures",
      subtitle: "Collect data for at least 3 temperatures",
      instructions: {
        procedure: [
          "Select a temperature from the buttons (20, 30, 40, 50, 60 °C)",
          "Click 'Start Experiment' — the timer begins as HCl is added",
          "Observe the cross fading as sulphur precipitates form",
          "The simulation stops automatically when the cross disappears",
          "Record the time and rate for each temperature",
          "Repeat for all 5 temperatures to get a complete dataset",
        ],
        expectedObservations: [
          "At 20°C the cross takes much longer to disappear",
          "At 60°C the cross disappears rapidly — much faster reaction",
          "Each temperature rise of ~10°C roughly halves the time",
          "Rate increases exponentially with temperature (not linearly)",
        ],
        tips: [
          "Complete at least 3 temperatures before moving to the next step",
          "Try all 5 temperatures for full marks and a complete Arrhenius plot",
          "You can switch temperature and run again at any time",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Why Does Temperature Affect Rate?</p>
          <p>Increasing temperature gives reactant particles more kinetic energy. This means:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>More frequent collisions between particles</li>
            <li>More collisions exceed the activation energy threshold</li>
            <li>Reaction rate increases exponentially</li>
          </ul>
          <div className="bg-navy/50 border border-teal/20 rounded p-3 space-y-1">
            <p className="text-white font-semibold">Maxwell–Boltzmann Distribution</p>
            <p>As T increases, the distribution shifts right — a much larger fraction of molecules have E ≥ Ea.</p>
          </div>
          <p>This exponential relationship is captured by the Arrhenius equation: k = Ae<sup>−Ea/RT</sup></p>
        </div>
      ),
      quiz: {
        question: "Why does the reaction rate increase exponentially (not linearly) with temperature?",
        options: [
          "Higher T increases particle size",
          "More particles exceed the activation energy threshold exponentially (Boltzmann factor)",
          "Higher T lowers the activation energy directly",
          "Higher T increases the concentration of reactants",
        ],
        correctIndex: 1,
        explanation: "The fraction of molecules with energy ≥ Ea is proportional to e^(−Ea/RT). This exponential term means rate increases exponentially with T. Activation energy itself does not change with temperature.",
      },
      content: experimentRunner,
      canProceed: results.length >= 3,
    },
    {
      id: "arrhenius-graph",
      title: "Plot the Arrhenius Graph",
      subtitle: "Analyse ln(rate) vs 1/T relationship",
      instructions: {
        procedure: [
          "Review the results table: confirm values for T (K), 1000/T, rate = 1/t, and ln(rate)",
          "The Arrhenius plot shows ln(rate) on y-axis and 1000/T on x-axis",
          "A straight line is drawn through the data points (best fit)",
          "The gradient of the line equals −Ea/R",
          "Calculate Ea: Ea = −gradient × R = −gradient × 8.314 J K⁻¹ mol⁻¹",
          "Run more temperatures if you want to improve the accuracy of Ea",
        ],
        expectedObservations: [
          "The graph should be a straight line with negative gradient",
          "Points at higher temperature (lower 1/T) have higher ln(rate)",
          "The calculated Ea should be close to 50 kJ mol⁻¹ for this reaction",
        ],
        tips: [
          "Always plot 1/T in K⁻¹ (not °C), so convert T first: T(K) = T(°C) + 273",
          "A scatter of points around the line is normal in real experiments",
          "More data points give a more reliable Ea value",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Interpreting the Arrhenius Plot</p>
          <div className="bg-navy/50 border border-teal/20 rounded p-3">
            <p className="text-white font-semibold mb-1">Gradient = −Ea / R</p>
            <p>So: <span className="text-teal">Ea = −gradient × 8.314</span></p>
          </div>
          <p>A steeper gradient means a larger Ea — the reaction is more temperature-sensitive.</p>
          <p>The y-intercept gives ln A, where A is the pre-exponential (frequency) factor — related to collision frequency and orientation.</p>
          <div className="bg-navy/40 border border-border rounded p-2">
            <p className="text-white font-semibold">Example calculation:</p>
            <p>If gradient = −6020 K (using 1/T in K⁻¹, not ×1000):</p>
            <p>Ea = 6020 × 8.314 = 50 050 J mol⁻¹ ≈ 50 kJ mol⁻¹</p>
          </div>
        </div>
      ),
      quiz: {
        question: "On an Arrhenius plot (ln k vs 1/T), what does a steeper negative gradient indicate?",
        options: [
          "A lower activation energy",
          "A faster reaction at all temperatures",
          "A higher activation energy",
          "A greater frequency factor A",
        ],
        correctIndex: 2,
        explanation: "The gradient equals −Ea/R. A steeper (more negative) gradient means a larger value of Ea/R, therefore a higher activation energy. Such reactions are more sensitive to temperature changes.",
      },
      content: (
        <div className="space-y-4">
          {resultsTable}
          {results.length >= 2 && (
            <div className="rounded border border-border overflow-hidden">
              <div className="px-3 py-2 bg-navy/30 border-b border-border">
                <p className="text-xs font-orbitron text-slate-400 tracking-wider">ARRHENIUS PLOT</p>
              </div>
              <div className="p-3">
                <ArrheniusPlot results={results} />
              </div>
            </div>
          )}
          {results.length < 2 && (
            <p className="text-slate-500 text-xs font-rajdhani text-center py-4">
              Arrhenius plot requires at least 2 data points. Go back and run more experiments.
            </p>
          )}
        </div>
      ),
      canProceed: results.length >= 3,
    },
    {
      id: "conclusions",
      title: "Calculate Ea & Draw Conclusions",
      subtitle: "Determine the activation energy from the gradient",
      instructions: {
        procedure: [
          "From the Arrhenius plot, read off two points on the best-fit line",
          "Calculate gradient = Δln(rate) / Δ(1000/T) — remember units are × 10⁻³ K⁻¹",
          "Convert: Ea = −gradient (in K) × 8.314 J K⁻¹ mol⁻¹ × 1000 (if x-axis is 1000/T)",
          "Compare your Ea with the literature value of ≈ 50 kJ mol⁻¹",
          "Write a conclusion explaining how temperature affects reaction rate using collision theory",
        ],
        expectedObservations: [
          "Ea ≈ 50 kJ mol⁻¹ for the Na₂S₂O₃ + H₂SO₄ reaction",
          "Increasing T from 20→60°C reduces reaction time significantly",
          "The relationship is exponential, not linear",
        ],
        tips: [
          "Express Ea in kJ mol⁻¹ in exam answers (divide J mol⁻¹ by 1000)",
          "State: 'Ea is the minimum energy required for a collision to result in reaction'",
          "Higher T → more molecules with E ≥ Ea → more successful collisions per second",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Exam-Ready Summary</p>
          <div className="space-y-2">
            <div className="bg-navy/50 border border-teal/20 rounded p-2">
              <p className="text-white font-semibold">Activation Energy (Ea)</p>
              <p>Minimum energy required for a collision to result in a chemical reaction. Only molecules with KE ≥ Ea react.</p>
            </div>
            <div className="bg-navy/50 border border-border rounded p-2">
              <p className="text-white font-semibold">Temperature Effect</p>
              <p>↑T → more molecules exceed Ea → ↑rate (exponentially, not linearly)</p>
            </div>
            <div className="bg-navy/50 border border-border rounded p-2">
              <p className="text-white font-semibold">Arrhenius Equation</p>
              <p>k = Ae<sup>−Ea/RT</sup> | ln k = ln A − Ea/RT | Gradient of ln k vs 1/T = −Ea/R</p>
            </div>
          </div>
        </div>
      ),
      quiz: {
        question: "If the Arrhenius plot gives a gradient of −6020 K (when x-axis is 1/T in K⁻¹), what is Ea in kJ mol⁻¹?",
        options: [
          "6020 kJ mol⁻¹",
          "50.1 kJ mol⁻¹",
          "722 kJ mol⁻¹",
          "0.72 kJ mol⁻¹",
        ],
        correctIndex: 1,
        explanation: "Ea = −gradient × R = 6020 K × 8.314 J K⁻¹ mol⁻¹ = 50,050 J mol⁻¹ ≈ 50.1 kJ mol⁻¹. Remember to divide by 1000 to convert J to kJ.",
      },
      content: (
        <div className="space-y-4">
          {results.length >= 2 && (
            <div className="rounded border border-border overflow-hidden">
              <div className="px-3 py-2 bg-navy/30 border-b border-border">
                <p className="text-xs font-orbitron text-slate-400 tracking-wider">ARRHENIUS PLOT — FINAL</p>
              </div>
              <div className="p-3">
                <ArrheniusPlot results={results} />
              </div>
            </div>
          )}
          <div className="bg-navy/40 border border-teal/20 rounded p-4 text-xs font-rajdhani space-y-2">
            <p className="text-teal font-semibold">Trials Completed: {results.length} / 5</p>
            <div className="grid grid-cols-5 gap-1">
              {TEMPERATURES.map((T) => {
                const r = results.find((x) => x.T === T);
                return (
                  <div key={T} className={`text-center p-1 rounded border text-xs ${r ? "border-teal/30 bg-teal/10" : "border-border text-slate-600"}`}>
                    <div className={r ? "text-teal" : "text-slate-600"}>{T}°C</div>
                    {r && <div className="text-white">{r.time.toFixed(0)}s</div>}
                    {!r && <div className="text-slate-600">—</div>}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-navy/30 border border-border rounded p-3 text-xs font-rajdhani space-y-1">
            <p className="text-slate-400 font-semibold">Conclusion Template (exam answer)</p>
            <p className="text-slate-300 leading-relaxed italic">
              "Increasing temperature increases the kinetic energy of particles, so a greater fraction
              of molecules have energy greater than or equal to the activation energy. This leads to
              more successful collisions per unit time and therefore a higher reaction rate. The
              relationship is exponential, described by the Arrhenius equation k = Ae<sup>−Ea/RT</sup>.
              The activation energy for this reaction is approximately 50 kJ mol⁻¹."
            </p>
          </div>
        </div>
      ),
      canProceed: true,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [results, selectedTemp, isRunning, elapsed, crossOpacity, isDone, targetTime, rate]);

  const persistentNotes = useMemo(
    () => <ObservationsPanel results={results} />,
    [results]
  );

  return (
    <>
      <StepWizard
        steps={steps}
        persistentNotes={persistentNotes}
        experimentTitle="Effect of Temperature on Reaction Rate"
        onComplete={handleComplete}
        onStepChange={setStep}
      />
      {showCompletion && (
        <CompletionOverlay
          experimentTitle="Effect of Temperature on Reaction Rate"
          score={score}
          maxScore={100}
          itemsTested={results.length}
          totalItems={5}
          timeSpentSeconds={Math.round((Date.now() - startTimeRef.current) / 1000)}
          onDoAgain={handleDoAgain}
        />
      )}
    </>
  );
}
