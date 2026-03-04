"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";

// ─── Chemistry ────────────────────────────────────────────────────────────────
// Enthalpy of neutralisation (strong acid + strong base) ≈ −57.1 kJ mol⁻¹
// q = mcΔT (assume density = 1.00 g/mL, specific heat = 4.18 J g⁻¹ K⁻¹)
// ΔH_neut = −q / moles_water

const C_HEAT = 4.18; // J g⁻¹ K⁻¹
const ROOM_TEMP = 22; // °C starting temperature

interface Experiment {
  id: string;
  acid: string;
  base: string;
  label: string;
  expectedDH: number; // kJ mol⁻¹ (negative)
  color: string;
  note: string;
}

const EXPERIMENTS: Experiment[] = [
  {
    id: "hcl-naoh",
    acid: "HCl",
    base: "NaOH",
    label: "HCl + NaOH (Strong/Strong)",
    expectedDH: -57.1,
    color: "#EF4444",
    note: "This is the standard enthalpy of neutralisation: −57.1 kJ mol⁻¹",
  },
  {
    id: "hcl-koh",
    acid: "HCl",
    base: "KOH",
    label: "HCl + KOH (Strong/Strong)",
    expectedDH: -57.1,
    color: "#F97316",
    note: "Also −57.1 kJ mol⁻¹ — the same ion pair (H⁺ + OH⁻ → H₂O) regardless of the spectator ions.",
  },
  {
    id: "ch3cooh-naoh",
    acid: "CH₃COOH",
    base: "NaOH",
    label: "CH₃COOH + NaOH (Weak/Strong)",
    expectedDH: -55.2,
    color: "#A855F7",
    note: "Less exothermic than −57.1 kJ mol⁻¹ because some energy is used to ionise the weak acid first.",
  },
];

const GUIDED_STEPS = [
  {
    id: 0,
    title: "Record initial temperatures",
    instructions:
      "Measure and record the initial temperature of both the acid and base solutions. They should be at the same temperature (room temperature). Record T_initial.",
  },
  {
    id: 1,
    title: "Mix the solutions",
    instructions:
      "Pour the acid into the base in the polystyrene cup calorimeter. Stir continuously and record the temperature every 30 seconds for 3 minutes.",
  },
  {
    id: 2,
    title: "Record maximum temperature",
    instructions:
      "Note the maximum temperature reached (T_max). The temperature rise ΔT = T_max − T_initial.",
  },
  {
    id: 3,
    title: "Calculate ΔH",
    instructions:
      "Use q = mcΔT (m = total mass, c = 4.18 J/g/K). Then ΔH_neut = −q / moles of water formed.",
  },
];

// ─── Thermometer SVG ──────────────────────────────────────────────────────────

function Thermometer({ temp }: { temp: number }) {
  const fill = Math.min(100, Math.max(0, ((temp - 10) / 40) * 100));

  return (
    <svg viewBox="0 0 30 120" width="30" height="120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="therm-clip">
          <rect x="10" y="10" width="10" height="90" rx="5" />
        </clipPath>
      </defs>
      <rect x="10" y="10" width="10" height="90" fill="#1E293B" rx="5" stroke="#334155" strokeWidth="1" />
      <rect
        x="10"
        y={10 + 90 * (1 - fill / 100)}
        width="10"
        height={90 * (fill / 100)}
        fill="#EF4444"
        clipPath="url(#therm-clip)"
      />
      <circle cx="15" cy="106" r="8" fill="#EF4444" />
      {[20, 30, 40, 50].map((t) => {
        const y = 10 + 90 * (1 - (t - 10) / 40);
        return (
          <g key={t}>
            <line x1="20" y1={y} x2="24" y2={y} stroke="#475569" strokeWidth="0.5" />
            <text x="26" y={y + 3} fontSize="5" fill="#475569">{t}°</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Temperature graph ────────────────────────────────────────────────────────

function TempGraph({ points }: { points: { t: number; T: number }[] }) {
  if (points.length < 2) return null;

  const W = 300;
  const H = 100;
  const PAD = { top: 8, right: 12, bottom: 24, left: 34 };

  const maxT = Math.max(...points.map((p) => p.t), 5);
  const minTemp = Math.min(...points.map((p) => p.T)) - 2;
  const maxTemp = Math.max(...points.map((p) => p.T)) + 2;

  const toX = (t: number) => PAD.left + (t / maxT) * (W - PAD.left - PAD.right);
  const toY = (T: number) =>
    H - PAD.bottom - ((T - minTemp) / (maxTemp - minTemp)) * (H - PAD.top - PAD.bottom);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.t).toFixed(1)},${toY(p.T).toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill="#0A0E1A" rx="4" />
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#475569" strokeWidth="1" />
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#475569" strokeWidth="1" />

      {/* Axis labels */}
      <text x={(W + PAD.left) / 2} y={H - 2} fontSize="7" fill="#64748B" textAnchor="middle">Time (s)</text>
      <text x={8} y={(H - PAD.bottom + PAD.top) / 2} fontSize="7" fill="#64748B" textAnchor="middle"
        transform={`rotate(-90, 8, ${(H - PAD.bottom + PAD.top) / 2})`}>T (°C)</text>

      {/* Temp labels */}
      {[minTemp + 1, (minTemp + maxTemp) / 2, maxTemp - 1].map((T) => (
        <text key={T} x={PAD.left - 2} y={toY(T) + 3} fontSize="5.5" fill="#475569" textAnchor="end">
          {T.toFixed(0)}
        </text>
      ))}

      <path d={path} fill="none" stroke="#EF4444" strokeWidth="1.5" />

      {/* Max temp line */}
      {points.length > 2 && (() => {
        const maxPt = points.reduce((a, b) => (a.T > b.T ? a : b));
        return (
          <line
            x1={PAD.left}
            y1={toY(maxPt.T)}
            x2={W - PAD.right}
            y2={toY(maxPt.T)}
            stroke="#0D7E6A"
            strokeWidth="0.75"
            strokeDasharray="3,2"
            opacity={0.7}
          />
        );
      })()}
    </svg>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface EnthalpyNeutralisationProps {
  onScoreUpdate?: (pts: number) => void;
}

export function EnthalpyNeutralisation({ onScoreUpdate }: EnthalpyNeutralisationProps) {
  const { currentMode, currentStep, nextStep, addScore, addObservation } =
    useExperimentStore();

  const [selectedExp, setSelectedExp] = useState<Experiment>(EXPERIMENTS[0]);
  const [isMixed, setIsMixed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [currentTemp, setCurrentTemp] = useState(ROOM_TEMP);
  const [maxTemp, setMaxTemp] = useState(ROOM_TEMP);
  const [tempPoints, setTempPoints] = useState<{ t: number; T: number }[]>([]);
  const [resultShown, setResultShown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Volume and concentration settings
  const volAcid = 25; // mL
  const volBase = 25; // mL
  const concAcid = 1.0; // mol/L
  const totalVol = volAcid + volBase; // 50 mL
  const totalMass = totalVol; // g (density = 1.0)
  const molesWater = (concAcid * volAcid) / 1000; // mol

  // Temperature simulation
  useEffect(() => {
    if (!isMixed) return;
    const maxRise = Math.abs(selectedExp.expectedDH * 1000 * molesWater) / (totalMass * C_HEAT);
    const peakTime = 30; // seconds to reach peak

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
          if (currentMode === "Guided" && currentStep === 2) nextStep();
          addObservation(
            `${selectedExp.label}: T_initial = ${ROOM_TEMP}°C, T_max = ${T.toFixed(1)}°C, ΔT = ${(T - ROOM_TEMP).toFixed(1)}°C`
          );
        }

        if (t >= 120) {
          clearInterval(timerRef.current!);
          setResultShown(true);
          addScore(20);
          onScoreUpdate?.(20);
        }

        return t;
      });
    }, 250);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isMixed, selectedExp, molesWater, totalMass, currentMode, currentStep, nextStep, addObservation, addScore, onScoreUpdate]);

  function handleMix() {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsMixed(true);
    setElapsed(0);
    setCurrentTemp(ROOM_TEMP);
    setMaxTemp(ROOM_TEMP);
    setTempPoints([{ t: 0, T: ROOM_TEMP }]);
    setResultShown(false);
    if (currentMode === "Guided" && currentStep === 1) nextStep();
  }

  function handleReset() {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsMixed(false);
    setElapsed(0);
    setCurrentTemp(ROOM_TEMP);
    setMaxTemp(ROOM_TEMP);
    setTempPoints([]);
    setResultShown(false);
  }

  // Calculation
  const deltaT = maxTemp - ROOM_TEMP;
  const q = (totalMass * C_HEAT * deltaT) / 1000; // kJ
  const deltaH = -q / molesWater; // kJ/mol

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

      {/* Experiment selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {EXPERIMENTS.map((exp) => (
          <button
            key={exp.id}
            onClick={() => { setSelectedExp(exp); handleReset(); }}
            className={`p-3 rounded border text-left transition-all ${
              selectedExp.id === exp.id
                ? "border-red-500/50 bg-red-900/20"
                : "border-border hover:border-slate-500"
            }`}
          >
            <div
              className="w-3 h-3 rounded-full mb-1"
              style={{ backgroundColor: exp.color }}
            />
            <p className="text-white text-xs font-rajdhani font-semibold">{exp.acid} + {exp.base}</p>
            <p className="text-slate-500 text-xs font-rajdhani">
              {exp.id.includes("weak") || exp.id.includes("ch3") ? "Weak/Strong" : "Strong/Strong"}
            </p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Apparatus */}
        <div className="space-y-3">
          <div className="bg-navy/40 border border-border rounded p-4">
            <p className="text-slate-400 text-xs font-orbitron tracking-wider mb-3">CALORIMETER</p>
            <div className="flex items-center justify-around">
              {/* Two cups becoming one */}
              {!isMixed ? (
                <>
                  <div className="text-center">
                    <div
                      className="w-14 h-16 rounded-b-lg border border-border flex items-end justify-center pb-2"
                      style={{ background: "linear-gradient(to bottom, #1E293B, #112)" }}
                    >
                      <span className="text-xs font-rajdhani text-slate-400">{volAcid} mL</span>
                    </div>
                    <p className="text-xs text-slate-500 font-rajdhani mt-1">{selectedExp.acid}</p>
                  </div>
                  <span className="text-slate-500 text-xl">+</span>
                  <div className="text-center">
                    <div
                      className="w-14 h-16 rounded-b-lg border border-border flex items-end justify-center pb-2"
                      style={{ background: "linear-gradient(to bottom, #1E293B, #112)" }}
                    >
                      <span className="text-xs font-rajdhani text-slate-400">{volBase} mL</span>
                    </div>
                    <p className="text-xs text-slate-500 font-rajdhani mt-1">{selectedExp.base}</p>
                  </div>
                </>
              ) : (
                <div className="text-center w-full">
                  <div
                    className="w-20 h-20 rounded-b-2xl border-2 mx-auto flex items-end justify-center pb-2 relative"
                    style={{
                      borderColor: selectedExp.color + "60",
                      background: `linear-gradient(to top, ${selectedExp.color}30, #1A2540)`,
                    }}
                  >
                    <Thermometer temp={currentTemp} />
                    <div className="absolute bottom-2 right-2 text-right">
                      <span className="font-orbitron text-sm font-bold" style={{ color: selectedExp.color }}>
                        {currentTemp.toFixed(1)}°C
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 font-rajdhani mt-1">
                    {selectedExp.acid} + {selectedExp.base}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Readings */}
          <div className="bg-navy/40 border border-border rounded p-3 space-y-2 text-xs font-rajdhani">
            <div className="flex justify-between">
              <span className="text-slate-400">T_initial:</span>
              <span className="text-white">{ROOM_TEMP.toFixed(1)} °C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">T_current:</span>
              <span style={{ color: selectedExp.color }}>{currentTemp.toFixed(1)} °C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">T_max:</span>
              <span className="text-white font-semibold">{maxTemp.toFixed(1)} °C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">ΔT:</span>
              <span className="text-teal font-semibold">{(maxTemp - ROOM_TEMP).toFixed(1)} °C</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            {!isMixed ? (
              <motion.button
                onClick={handleMix}
                whileTap={{ scale: 0.96 }}
                className="px-4 py-2 bg-red-800/50 hover:bg-red-700/60 text-white text-sm font-rajdhani font-semibold border border-red-600/40 rounded transition-all"
              >
                Mix Solutions
              </motion.button>
            ) : (
              <button
                onClick={handleReset}
                className="px-3 py-2 text-slate-400 hover:text-white text-xs font-rajdhani border border-border rounded transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Graph and results */}
        <div className="space-y-3">
          <div className="rounded border border-border overflow-hidden">
            <div className="px-3 py-2 bg-navy/30 border-b border-border">
              <p className="text-xs font-orbitron text-slate-400 tracking-wider">TEMPERATURE vs TIME</p>
            </div>
            <div className="p-2">
              <TempGraph points={tempPoints} />
            </div>
          </div>
        </div>
      </div>

      {/* Calculation */}
      <AnimatePresence>
        {isMixed && maxTemp > ROOM_TEMP + 0.5 && (
          <motion.div
            className="bg-navy/40 border border-teal/30 rounded p-4 space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-teal font-orbitron text-xs tracking-wider mb-3">CALCULATION</p>
            <div className="space-y-2 font-rajdhani text-sm">
              <div>
                <p className="text-slate-300">q = m × c × ΔT</p>
                <p className="text-slate-300">
                  q = {totalMass} g × {C_HEAT} J g⁻¹ K⁻¹ × {deltaT.toFixed(1)} K
                </p>
                <p className="text-white">q = <span className="text-teal">{(q * 1000).toFixed(0)} J = {q.toFixed(2)} kJ</span></p>
              </div>
              <div>
                <p className="text-slate-300">Moles of water = {concAcid} × {volAcid / 1000} = {molesWater.toFixed(4)} mol</p>
              </div>
              <div>
                <p className="text-slate-300">ΔH_neut = −q / n = −{q.toFixed(2)} / {molesWater.toFixed(4)}</p>
                <p className="text-white text-base font-semibold">
                  ΔH_neut = <span className="text-red-400">{deltaH.toFixed(1)} kJ mol⁻¹</span>
                </p>
              </div>
              <div className="p-2 bg-slate-900/50 border border-border rounded mt-2">
                <p className="text-slate-400 text-xs">
                  Expected: <span className="text-white">{selectedExp.expectedDH} kJ mol⁻¹</span>
                  {" · "}
                  Error: {Math.abs(((deltaH - selectedExp.expectedDH) / selectedExp.expectedDH) * 100).toFixed(1)}%
                </p>
                <p className="text-slate-500 text-xs mt-1">{selectedExp.note}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
