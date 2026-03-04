"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";
import { StepWizard } from "../../StepWizard";
import { CompletionOverlay } from "../../CompletionOverlay";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useSession } from "next-auth/react";
import { saveProgress } from "@/lib/progress";
import type { StepDefinition } from "../../StepWizard";

// ─── Chemistry ────────────────────────────────────────────────────────────────
// ΔH_neut (strong/strong) ≈ −57.1 kJ mol⁻¹
// q = mcΔT ; ΔH = −q / n(water)

const C_HEAT = 4.18; // J g⁻¹ K⁻¹
const ROOM_TEMP = 22; // °C

interface Experiment {
  id: string; acid: string; base: string; label: string;
  expectedDH: number; color: string; note: string;
}

const EXPERIMENTS: Experiment[] = [
  { id: "hcl-naoh", acid: "HCl", base: "NaOH", label: "HCl + NaOH (Strong/Strong)", expectedDH: -57.1, color: "#EF4444", note: "Standard enthalpy of neutralisation: −57.1 kJ mol⁻¹" },
  { id: "hcl-koh", acid: "HCl", base: "KOH", label: "HCl + KOH (Strong/Strong)", expectedDH: -57.1, color: "#F97316", note: "Same result: −57.1 kJ mol⁻¹ — same ion pair H⁺ + OH⁻ → H₂O, regardless of spectator ions." },
  { id: "ch3cooh-naoh", acid: "CH₃COOH", base: "NaOH", label: "CH₃COOH + NaOH (Weak/Strong)", expectedDH: -55.2, color: "#A855F7", note: "Less exothermic than −57.1: energy used to ionise the weak acid first." },
];

// ─── Thermometer SVG ──────────────────────────────────────────────────────────

function Thermometer({ temp }: { temp: number }) {
  const fill = Math.min(100, Math.max(0, ((temp - 10) / 40) * 100));
  return (
    <svg viewBox="0 0 30 120" width="30" height="120" xmlns="http://www.w3.org/2000/svg">
      <defs><clipPath id="therm-clip"><rect x="10" y="10" width="10" height="90" rx="5" /></clipPath></defs>
      <rect x="10" y="10" width="10" height="90" fill="#1E293B" rx="5" stroke="#334155" strokeWidth="1" />
      <rect x="10" y={10 + 90 * (1 - fill / 100)} width="10" height={90 * (fill / 100)} fill="#EF4444" clipPath="url(#therm-clip)" />
      <circle cx="15" cy="106" r="8" fill="#EF4444" />
      {[20, 30, 40, 50].map((t) => {
        const y = 10 + 90 * (1 - (t - 10) / 40);
        return <g key={t}><line x1="20" y1={y} x2="24" y2={y} stroke="#475569" strokeWidth="0.5" /><text x="26" y={y + 3} fontSize="5" fill="#475569">{t}°</text></g>;
      })}
    </svg>
  );
}

// ─── Temperature graph ────────────────────────────────────────────────────────

function TempGraph({ points }: { points: { t: number; T: number }[] }) {
  if (points.length < 2) return null;
  const W = 300; const H = 100;
  const PAD = { top: 8, right: 12, bottom: 24, left: 34 };
  const maxT = Math.max(...points.map((p) => p.t), 5);
  const minTemp = Math.min(...points.map((p) => p.T)) - 2;
  const maxTemp = Math.max(...points.map((p) => p.T)) + 2;
  const toX = (t: number) => PAD.left + (t / maxT) * (W - PAD.left - PAD.right);
  const toY = (T: number) => H - PAD.bottom - ((T - minTemp) / (maxTemp - minTemp)) * (H - PAD.top - PAD.bottom);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.t).toFixed(1)},${toY(p.T).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill="#0A0E1A" rx="4" />
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#475569" strokeWidth="1" />
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#475569" strokeWidth="1" />
      <text x={(W + PAD.left) / 2} y={H - 2} fontSize="7" fill="#64748B" textAnchor="middle">Time (s)</text>
      <text x={8} y={(H - PAD.bottom + PAD.top) / 2} fontSize="7" fill="#64748B" textAnchor="middle"
        transform={`rotate(-90, 8, ${(H - PAD.bottom + PAD.top) / 2})`}>T (°C)</text>
      {[minTemp + 1, (minTemp + maxTemp) / 2, maxTemp - 1].map((T) => (
        <text key={T} x={PAD.left - 2} y={toY(T) + 3} fontSize="5.5" fill="#475569" textAnchor="end">{T.toFixed(0)}</text>
      ))}
      <path d={path} fill="none" stroke="#EF4444" strokeWidth="1.5" />
      {points.length > 2 && (() => {
        const maxPt = points.reduce((a, b) => (a.T > b.T ? a : b));
        return <line x1={PAD.left} y1={toY(maxPt.T)} x2={W - PAD.right} y2={toY(maxPt.T)} stroke="#0D7E6A" strokeWidth="0.75" strokeDasharray="3,2" opacity={0.7} />;
      })()}
    </svg>
  );
}

// ─── Observations Panel ───────────────────────────────────────────────────────

function ObservationsPanel({ observations, results }: {
  observations: string[];
  results: { exp: Experiment; deltaH: number }[];
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">OBSERVATIONS</p>
        {observations.length === 0 ? (
          <p className="text-slate-600 text-xs font-rajdhani">No experiments run yet.</p>
        ) : (
          <div className="space-y-1.5">
            {observations.map((obs, i) => (
              <div key={i} className="text-xs font-rajdhani text-slate-300 bg-navy/30 rounded p-2 border border-border/50">{obs}</div>
            ))}
          </div>
        )}
      </div>
      {results.length > 0 && (
        <div>
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1">RESULTS</p>
          {results.map((r, i) => (
            <div key={i} className="flex justify-between text-xs font-rajdhani py-0.5">
              <span className="text-slate-400">{r.exp.acid} + {r.exp.base}:</span>
              <span style={{ color: r.exp.color }}>{r.deltaH.toFixed(1)} kJ/mol</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface EnthalpyNeutralisationProps {
  onScoreUpdate?: (pts: number) => void;
}

export function EnthalpyNeutralisation({ onScoreUpdate }: EnthalpyNeutralisationProps) {
  const { addScore, addObservation, setTotalSteps, setStep, score, completeMode, currentMode, resetExperiment } =
    useExperimentStore();
  const { playSuccess } = useSoundEffects();
  const { data: session } = useSession();
  const startTimeRef = useRef(Date.now());
  const [showCompletion, setShowCompletion] = useState(false);

  const [selectedExp, setSelectedExp] = useState<Experiment>(EXPERIMENTS[0]);
  const [isMixed, setIsMixed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [currentTemp, setCurrentTemp] = useState(ROOM_TEMP);
  const [maxTemp, setMaxTemp] = useState(ROOM_TEMP);
  const [tempPoints, setTempPoints] = useState<{ t: number; T: number }[]>([]);
  const [resultShown, setResultShown] = useState(false);
  const [observations, setObservationsLocal] = useState<string[]>([]);
  const [experimentResults, setExperimentResults] = useState<{ exp: Experiment; deltaH: number }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => { setTotalSteps(4); }, []);

  const volAcid = 25; const volBase = 25;
  const concAcid = 1.0; const totalVol = volAcid + volBase;
  const totalMass = totalVol;
  const molesWater = (concAcid * volAcid) / 1000;

  useEffect(() => {
    if (!isMixed) return;
    const maxRise = Math.abs(selectedExp.expectedDH * 1000 * molesWater) / (totalMass * C_HEAT);
    const peakTime = 30;

    timerRef.current = setInterval(() => {
      setElapsed((e) => {
        const t = e + 1;
        let T: number;
        if (t <= peakTime) {
          T = ROOM_TEMP + maxRise * Math.sin((t / peakTime) * (Math.PI / 2));
        } else {
          T = ROOM_TEMP + maxRise * Math.exp(-0.01 * (t - peakTime));
        }
        T = Math.round(T * 10) / 10;
        setCurrentTemp(T);
        setMaxTemp((prev) => Math.max(prev, T));
        setTempPoints((prev) => [...prev, { t, T }]);

        if (t === peakTime) {
          const obs = `${selectedExp.label}: T_initial = ${ROOM_TEMP}°C, T_max = ${T.toFixed(1)}°C, ΔT = ${(T - ROOM_TEMP).toFixed(1)}°C`;
          addObservation(obs);
          setObservationsLocal((prev) => [...prev, obs]);
        }

        if (t >= 120) {
          clearInterval(timerRef.current!);
          setResultShown(true);
          playSuccess();
          addScore(20);
          onScoreUpdate?.(20);
        }
        return t;
      });
    }, 250);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isMixed, selectedExp, molesWater, totalMass, addObservation, addScore, onScoreUpdate, playSuccess]);

  function handleMix() {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsMixed(true); setElapsed(0);
    setCurrentTemp(ROOM_TEMP); setMaxTemp(ROOM_TEMP);
    setTempPoints([{ t: 0, T: ROOM_TEMP }]);
    setResultShown(false);
  }

  function handleReset() {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsMixed(false); setElapsed(0);
    setCurrentTemp(ROOM_TEMP); setMaxTemp(ROOM_TEMP);
    setTempPoints([]); setResultShown(false);
  }

  const deltaT = maxTemp - ROOM_TEMP;
  const q = (totalMass * C_HEAT * deltaT) / 1000; // kJ
  const deltaH = maxTemp > ROOM_TEMP ? -q / molesWater : 0;

  function handleRecordResult() {
    if (deltaH !== 0) {
      setExperimentResults((prev) => {
        const existing = prev.findIndex((r) => r.exp.id === selectedExp.id);
        if (existing >= 0) return prev;
        return [...prev, { exp: selectedExp, deltaH }];
      });
    }
  }

  function handleComplete() {
    completeMode("enthalpy-neutralisation", currentMode);
    setShowCompletion(true);
    if (session?.user?.role === "student") {
      const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      saveProgress({ slug: "enthalpy-neutralisation", mode: currentMode, score, timeSpentSeconds }).catch(() => {});
    }
  }

  function handleDoAgain() {
    resetExperiment();
    handleReset();
    setSelectedExp(EXPERIMENTS[0]);
    setObservationsLocal([]);
    setExperimentResults([]);
    setStep(0);
    startTimeRef.current = Date.now();
    setShowCompletion(false);
  }

  // ─── Step Definitions ──────────────────────────────────────────────────────

  const steps: StepDefinition[] = useMemo(() => [
    {
      id: "setup",
      title: "Select Experiment & Measure T_initial",
      subtitle: "Choose an acid-base pair and record the initial temperature.",
      canProceed: true,
      instructions: {
        procedure: [
          `Measure ${volAcid} mL of the acid and ${volBase} mL of the base using a measuring cylinder`,
          "Place both in a polystyrene foam cup calorimeter (acts as insulator)",
          "Measure the initial temperature of both — they should be equal (room temperature)",
          "Record T_initial = room temperature",
        ],
        safetyNotes: [
          "NaOH is corrosive — wear gloves and eye protection",
          "Hydrochloric acid is corrosive — handle with care",
        ],
        expectedObservations: [
          "Both solutions should be at the same temperature (thermal equilibrium with surroundings)",
          "T_initial ≈ room temperature",
        ],
        tips: [
          "A polystyrene cup minimises heat loss to the surroundings",
          "Using equal volumes (25 mL + 25 mL) simplifies the calculation",
        ],
      },
      quiz: {
        question: "Why is a polystyrene foam cup used as a calorimeter?",
        options: [
          "It is a good conductor of heat",
          "It reacts with the acid to release heat",
          "It is a good insulator, minimising heat loss to surroundings",
          "It measures temperature automatically",
        ],
        correctIndex: 2,
        explanation: "Polystyrene has low thermal conductivity — it insulates the reaction mixture and minimises heat loss. This makes q = mcΔT a better approximation of the actual heat released.",
      },
      content: (
        <div className="flex flex-col gap-4 p-4 h-full">
          <p className="text-slate-400 text-xs font-orbitron tracking-wider">SELECT EXPERIMENT</p>
          <div className="grid grid-cols-1 gap-2">
            {EXPERIMENTS.map((exp) => (
              <button key={exp.id}
                onClick={() => { setSelectedExp(exp); handleReset(); }}
                className={`p-3 rounded-lg border-2 text-left transition-all ${selectedExp.id === exp.id ? "border-opacity-100" : "border-border hover:border-slate-500"}`}
                style={{ borderColor: selectedExp.id === exp.id ? exp.color : undefined, backgroundColor: selectedExp.id === exp.id ? exp.color + "15" : undefined }}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: exp.color }} />
                  <div>
                    <p className="text-white text-xs font-rajdhani font-semibold">{exp.label}</p>
                    <p className="text-slate-500 text-xs font-rajdhani">Expected ΔH: {exp.expectedDH} kJ mol⁻¹</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="bg-navy/40 border border-border rounded-lg p-3 text-xs font-rajdhani">
            <div className="flex justify-between"><span className="text-slate-400">T_initial:</span><span className="text-white">{ROOM_TEMP}°C</span></div>
            <div className="flex justify-between mt-1"><span className="text-slate-400">Volume each:</span><span className="text-white">{volAcid} mL</span></div>
            <div className="flex justify-between mt-1"><span className="text-slate-400">Concentration:</span><span className="text-white">{concAcid} mol/L</span></div>
          </div>
        </div>
      ),
      theory: (
        <div className="space-y-2">
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1">FORMULA</p>
          <p className="text-slate-300 text-xs font-mono">q = m × c × ΔT</p>
          <p className="text-slate-400 text-xs font-rajdhani mt-1">m = total mass (g), c = 4.18 J g⁻¹ K⁻¹</p>
          <p className="text-slate-300 text-xs font-mono mt-1">ΔH_neut = −q / n(water)</p>
        </div>
      ),
    },

    {
      id: "mix",
      title: "Mix Solutions & Record Temperature",
      subtitle: "Pour acid into base. Stir and record T every 30 seconds.",
      canProceed: isMixed,
      instructions: {
        procedure: [
          "Pour the acid solution into the base in the polystyrene calorimeter",
          "Stir continuously with a thermometer or glass rod",
          "Record the temperature every 30 seconds",
          "Continue until temperature starts to fall (cooling phase)",
        ],
        expectedObservations: [
          "Temperature rises sharply after mixing — exothermic reaction",
          "Temperature reaches a maximum (T_max), then slowly decreases",
        ],
        tips: [
          "Keep a lid on the calorimeter during measurement to reduce heat loss",
          "Stir gently but continuously for even heating",
        ],
      },
      quiz: {
        question: "Why does the temperature fall after reaching T_max?",
        options: [
          "The reaction reverses",
          "Heat loss to the surroundings — calorimeter is not perfectly insulating",
          "The acid evaporates",
          "A second reaction occurs",
        ],
        correctIndex: 1,
        explanation: "After T_max, heat is gradually lost to the surroundings through the calorimeter walls. Real calorimeters are not perfectly insulating — the cooling graph helps you extrapolate to find the true T_max in accurate experiments.",
      },
      content: (
        <div className="flex flex-col gap-4 p-4 h-full">
          <div className="flex items-center justify-around">
            {!isMixed ? (
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="w-14 h-16 rounded-b-lg border border-border flex items-end justify-center pb-2 bg-navy/40">
                    <span className="text-xs font-rajdhani text-slate-400">{volAcid} mL</span>
                  </div>
                  <p className="text-xs text-slate-500 font-rajdhani mt-1">{selectedExp.acid}</p>
                </div>
                <span className="text-slate-500 text-xl">+</span>
                <div className="text-center">
                  <div className="w-14 h-16 rounded-b-lg border border-border flex items-end justify-center pb-2 bg-navy/40">
                    <span className="text-xs font-rajdhani text-slate-400">{volBase} mL</span>
                  </div>
                  <p className="text-xs text-slate-500 font-rajdhani mt-1">{selectedExp.base}</p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-24 h-24 rounded-b-2xl border-2 mx-auto flex items-end justify-center pb-2 relative"
                  style={{ borderColor: selectedExp.color + "60", background: `linear-gradient(to top, ${selectedExp.color}30, #1A2540)` }}>
                  <Thermometer temp={currentTemp} />
                  <div className="absolute bottom-2 right-2">
                    <span className="font-orbitron text-sm font-bold" style={{ color: selectedExp.color }}>{currentTemp.toFixed(1)}°C</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 font-rajdhani mt-1">{selectedExp.acid} + {selectedExp.base}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-rajdhani bg-navy/40 rounded-lg p-3 border border-border">
            <div><span className="text-slate-400">T_initial:</span> <span className="text-white">{ROOM_TEMP}°C</span></div>
            <div><span className="text-slate-400">T_current:</span> <span style={{ color: selectedExp.color }}>{currentTemp.toFixed(1)}°C</span></div>
            <div><span className="text-slate-400">T_max:</span> <span className="text-white font-semibold">{maxTemp.toFixed(1)}°C</span></div>
            <div><span className="text-slate-400">ΔT:</span> <span className="text-teal font-semibold">{deltaT.toFixed(1)}°C</span></div>
          </div>

          {!isMixed ? (
            <motion.button onClick={handleMix} whileTap={{ scale: 0.96 }}
              className="px-5 py-3 bg-red-800/50 hover:bg-red-700/60 text-white text-sm font-rajdhani font-semibold border border-red-600/40 rounded-lg transition-all self-center">
              Mix Solutions
            </motion.button>
          ) : (
            <button onClick={handleReset}
              className="px-4 py-2 text-slate-400 hover:text-white text-xs font-rajdhani border border-border rounded-lg transition-colors self-center">
              Reset
            </button>
          )}
        </div>
      ),
      theory: (
        <div className="space-y-2">
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1">CURRENT EXPERIMENT</p>
          <p className="text-white text-sm font-rajdhani font-semibold" style={{ color: selectedExp.color }}>{selectedExp.label}</p>
          <p className="text-slate-400 text-xs font-rajdhani">Expected ΔH: {selectedExp.expectedDH} kJ mol⁻¹</p>
          {isMixed && deltaT > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-xs font-mono text-teal mt-2">ΔT = {deltaT.toFixed(1)} K</p>
            </motion.div>
          )}
        </div>
      ),
    },

    {
      id: "tmax",
      title: "Record T_max & Calculate q",
      subtitle: "Find the maximum temperature and calculate the heat released.",
      canProceed: isMixed && maxTemp > ROOM_TEMP + 0.5,
      instructions: {
        procedure: [
          "Identify T_max from the temperature-time graph",
          "Calculate ΔT = T_max − T_initial",
          "Calculate q = m × c × ΔT (use total mass = 50 g)",
          "ΔH is negative (exothermic) — heat released by reaction",
        ],
        tips: [
          "In real experiments, extrapolate the cooling line to t_mix to find the true T_max",
          "ΔH_neut is always negative — neutralisation is exothermic",
        ],
      },
      content: (
        <div className="flex flex-col gap-3 p-4 h-full overflow-y-auto">
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-3 py-2 bg-navy/30 border-b border-border">
              <p className="text-xs font-orbitron text-slate-400 tracking-wider">TEMPERATURE vs TIME</p>
            </div>
            <div className="p-2"><TempGraph points={tempPoints} /></div>
          </div>

          {maxTemp > ROOM_TEMP + 0.5 && (
            <AnimatePresence>
              <motion.div className="bg-navy/40 border border-teal/30 rounded-lg p-4 space-y-2 text-sm font-rajdhani"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <p className="text-teal font-orbitron text-xs tracking-wider mb-2">CALCULATION</p>
                <p className="text-slate-300">q = {totalMass} × {C_HEAT} × {deltaT.toFixed(1)}</p>
                <p className="text-white">q = <span className="text-teal">{(q * 1000).toFixed(0)} J = {q.toFixed(3)} kJ</span></p>
                <p className="text-slate-400 text-xs mt-1">n(water) = {concAcid} × {volAcid / 1000} = {molesWater.toFixed(4)} mol</p>
                <button onClick={handleRecordResult}
                  className="mt-2 px-4 py-2 bg-teal/20 hover:bg-teal/30 text-teal text-xs font-orbitron border border-teal/30 rounded-lg transition-all">
                  Record Result
                </button>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      ),
      theory: (
        <div className="space-y-2">
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1">KEY VALUES</p>
          <div className="text-xs font-rajdhani space-y-1">
            <div className="flex justify-between"><span className="text-slate-400">T_initial:</span><span className="text-white">{ROOM_TEMP}°C</span></div>
            <div className="flex justify-between"><span className="text-slate-400">T_max:</span><span className="text-white font-semibold">{maxTemp.toFixed(1)}°C</span></div>
            <div className="flex justify-between"><span className="text-teal">ΔT:</span><span className="text-teal font-semibold">{deltaT.toFixed(1)}°C</span></div>
          </div>
          {maxTemp > ROOM_TEMP + 0.5 && (
            <p className="text-xs font-mono text-slate-400 mt-2">q = {totalMass} × {C_HEAT} × {deltaT.toFixed(1)} = {(q * 1000).toFixed(1)} J</p>
          )}
        </div>
      ),
    },

    {
      id: "calculate",
      title: "Calculate ΔH_neutralisation",
      subtitle: "Calculate the enthalpy of neutralisation and compare with theory.",
      canProceed: true,
      instructions: {
        procedure: [
          "ΔH_neut = −q / n(water)",
          "Compare your result with the theoretical value",
          "Try the weak acid experiment to see the difference",
        ],
        tips: [
          "Strong/strong: ΔH ≈ −57.1 kJ mol⁻¹ (always, regardless of spectator ions)",
          "Weak/strong: ΔH less negative (energy consumed ionising the weak acid)",
        ],
      },
      content: (
        <div className="flex flex-col gap-3 p-4 h-full overflow-y-auto">
          {maxTemp > ROOM_TEMP + 0.5 ? (
            <div className="bg-navy/40 border border-teal/30 rounded-lg p-4 space-y-2">
              <p className="text-teal font-orbitron text-xs tracking-wider mb-3">FULL CALCULATION</p>
              <div className="space-y-2 font-rajdhani text-sm">
                <div><p className="text-slate-300">ΔT = T_max − T_initial = {maxTemp.toFixed(1)} − {ROOM_TEMP} = {deltaT.toFixed(1)} °C</p></div>
                <div><p className="text-slate-300">q = m × c × ΔT = {totalMass} × {C_HEAT} × {deltaT.toFixed(1)} = {(q * 1000).toFixed(0)} J = {q.toFixed(3)} kJ</p></div>
                <div><p className="text-slate-300">n(H₂O) = {concAcid} × {(volAcid / 1000).toFixed(3)} = {molesWater.toFixed(4)} mol</p></div>
                <div>
                  <p className="text-slate-300">ΔH_neut = −q / n = −{q.toFixed(3)} / {molesWater.toFixed(4)}</p>
                  <p className="text-white text-lg font-bold">= <span className="text-red-400">{deltaH.toFixed(1)} kJ mol⁻¹</span></p>
                </div>
                <div className="p-2 bg-slate-900/50 border border-border rounded text-xs">
                  <p className="text-slate-400">Expected: <span className="text-white">{selectedExp.expectedDH} kJ mol⁻¹</span>
                    {" · "} Error: {Math.abs(((deltaH - selectedExp.expectedDH) / selectedExp.expectedDH) * 100).toFixed(1)}%</p>
                  <p className="text-slate-500 mt-1">{selectedExp.note}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-600 text-sm font-rajdhani">Run the mixing experiment first.</p>
            </div>
          )}

          {experimentResults.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-2 bg-navy/30 border-b border-border">
                <p className="text-xs font-orbitron text-slate-400 tracking-wider">COMPARISON TABLE</p>
              </div>
              <table className="w-full text-xs font-rajdhani">
                <thead>
                  <tr className="border-b border-border bg-navy/20">
                    <th className="text-left px-3 py-2 text-slate-400">Experiment</th>
                    <th className="px-3 py-2 text-slate-400">ΔH (kJ/mol)</th>
                    <th className="px-3 py-2 text-slate-400">Expected</th>
                  </tr>
                </thead>
                <tbody>
                  {experimentResults.map((r, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="px-3 py-2 text-white">{r.exp.acid} + {r.exp.base}</td>
                      <td className="px-3 py-2 text-center" style={{ color: r.exp.color }}>{r.deltaH.toFixed(1)}</td>
                      <td className="px-3 py-2 text-center text-slate-400">{r.exp.expectedDH}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button onClick={() => setStep(0)}
            className="px-4 py-2 text-teal text-sm font-rajdhani border border-teal/40 hover:bg-teal/10 rounded-lg transition-all self-center">
            Try Another Experiment
          </button>
        </div>
      ),
      theory: (
        <div className="space-y-2">
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1">KEY TAKEAWAY</p>
          <p className="text-slate-300 text-xs font-rajdhani leading-relaxed">
            Strong/strong: ΔH ≈ <span className="text-red-400 font-semibold">−57.1 kJ mol⁻¹</span> always — same ionic equation H⁺ + OH⁻ → H₂O.
          </p>
          <p className="text-slate-300 text-xs font-rajdhani leading-relaxed mt-1">
            Weak acid: <span className="text-purple-400 font-semibold">less negative</span> because energy is consumed ionising the weak acid.
          </p>
        </div>
      ),
    },
  ], [selectedExp, isMixed, elapsed, currentTemp, maxTemp, tempPoints, resultShown, deltaT, q, deltaH, experimentResults, volAcid, volBase, concAcid, totalMass, molesWater]);

  const persistentNotes = useMemo(() => (
    <ObservationsPanel observations={observations} results={experimentResults} />
  ), [observations, experimentResults]);

  const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

  return (
    <>
      <StepWizard
        steps={steps}
        persistentNotes={persistentNotes}
        experimentTitle="Enthalpy of Neutralisation"
        onComplete={handleComplete}
      />
      {showCompletion && (
        <CompletionOverlay
          experimentTitle="Enthalpy of Neutralisation"
          score={score}
          maxScore={60}
          itemsTested={experimentResults.length}
          totalItems={EXPERIMENTS.length}
          timeSpentSeconds={timeSpentSeconds}
          onDoAgain={handleDoAgain}
        />
      )}
    </>
  );
}
