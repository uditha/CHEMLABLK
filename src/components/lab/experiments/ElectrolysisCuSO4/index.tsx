"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";

// ─── Constants ────────────────────────────────────────────────────────────────
// Faraday's constant: F = 96485 C mol⁻¹
// Cu²⁺ + 2e⁻ → Cu  (at cathode)
// Cu → Cu²⁺ + 2e⁻  (at anode)
// m = (M × I × t) / (n × F)

const F = 96485; // C mol⁻¹
const M_CU = 63.55; // g/mol
const N_ELECTRONS = 2;

const GUIDED_STEPS = [
  {
    id: 0,
    title: "Set up the electrolysis cell",
    instructions:
      "Place two copper electrodes in CuSO₄ solution. Weigh both electrodes accurately before the experiment. Connect to a DC power supply.",
  },
  {
    id: 1,
    title: "Run the electrolysis",
    instructions:
      "Switch on the current (0.5 A). Observe: pink/orange copper deposits on the cathode; anode slowly dissolves. Run for several minutes.",
  },
  {
    id: 2,
    title: "Record current and time",
    instructions:
      "Note the current (A) and time (s). Calculate charge: Q = I × t (coulombs).",
  },
  {
    id: 3,
    title: "Weigh electrodes again",
    instructions:
      "Carefully remove electrodes, wash gently, dry, and weigh. The cathode gained mass; the anode lost the same mass.",
  },
  {
    id: 4,
    title: "Verify Faraday's First Law",
    instructions:
      "Calculate theoretical mass: m = (M × Q) / (n × F) = (63.55 × Q) / (2 × 96485). Compare with actual mass change.",
  },
];

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

interface ElectrolysisCuSO4Props {
  onScoreUpdate?: (pts: number) => void;
}

export function ElectrolysisCuSO4({ onScoreUpdate }: ElectrolysisCuSO4Props) {
  const { currentMode, currentStep, nextStep, addScore, addObservation } =
    useExperimentStore();

  const [current, setCurrent] = useState(0.5); // Amps
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [massData, setMassData] = useState<{ t: number; cathode: number; anode: number }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const calcMass = useCallback((t: number) => {
    const Q = current * t;
    return (M_CU * Q) / (N_ELECTRONS * F);
  }, [current]);

  function startElectrolysis() {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(true);
    setElapsed(0);
    setMassData([{ t: 0, cathode: 0, anode: 0 }]);
    setIsDone(false);

    if (currentMode === "Guided" && currentStep === 1) nextStep();

    timerRef.current = setInterval(() => {
      setElapsed((t) => {
        const next = t + 5;
        const m = calcMass(next);
        setMassData((prev) => [...prev, { t: next, cathode: m, anode: m }]);

        if (next >= 300) { // 5 minutes
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
          if (currentMode === "Guided" && currentStep === 2) nextStep();
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
      if (currentMode === "Guided" && currentStep === 3) nextStep();
    }
  }

  const Q = current * elapsed;
  const theoreticalMass = calcMass(elapsed);
  const cathodeColor = elapsed > 30 ? `rgba(200,100,0,${Math.min(1, elapsed / 150)})` : "#8B4513";

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
          <span className="text-teal font-semibold">Cathode (−):</span> Cu²⁺ + 2e⁻ → Cu (pink/orange deposit){" "}
          | <span className="text-red-400 font-semibold">Anode (+):</span> Cu → Cu²⁺ + 2e⁻ (dissolves).
          Net: Cu transfers from anode to cathode. Use Faraday's Law: <span className="text-amber-300">m = MIt/(nF)</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Electrolysis cell */}
        <div className="space-y-3">
          {/* Cell SVG */}
          <div className="bg-navy/30 border border-border rounded p-4 flex justify-center">
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

              {/* Wires and battery */}
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

              {/* Cu deposits on cathode (bubbles simulation) */}
              {isRunning && elapsed > 20 && [58, 62, 60].map((x, i) => (
                <motion.circle key={i} cx={x} cy={80 + i * 15} r="2.5" fill="#CD7F32" opacity={0.8}
                  animate={{ opacity: [0.8, 1, 0.8] }} transition={{ duration: 1, delay: i * 0.3, repeat: Infinity }} />
              ))}

              {/* Label */}
              <text x="100" y="125" fontSize="7" fill="#6DB6E8" textAnchor="middle" opacity={0.7}>CuSO₄(aq)</text>
            </svg>
          </div>

          {/* Controls */}
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
        </div>

        {/* Readings and calculation */}
        <div className="space-y-3">
          <div className="bg-navy/40 border border-border rounded p-3 text-xs font-rajdhani space-y-1.5">
            <p className="text-slate-400 font-orbitron text-xs tracking-wider mb-2">READINGS</p>
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

          {isDone && elapsed > 0 && (
            <motion.div className="bg-navy/40 border border-teal/30 rounded p-3"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-teal font-orbitron text-xs tracking-wider mb-2">FARADAY'S FIRST LAW</p>
              <p className="text-slate-300 text-xs font-rajdhani leading-relaxed">
                Mass deposited ∝ charge passed (Q = It).{" "}
                Double the current (at same time) → double the mass.{" "}
                Double the time (at same current) → double the mass.
              </p>
              <p className="text-white font-rajdhani text-sm mt-2">
                Mass deposited: <span className="text-orange-400 font-semibold">{(theoreticalMass * 1000).toFixed(2)} mg</span>
              </p>
              <p className="text-slate-500 text-xs font-rajdhani mt-1">
                (In real experiment, weigh electrodes before/after to verify)
              </p>
            </motion.div>
          )}

          {massData.length > 2 && (
            <div className="rounded border border-border overflow-hidden">
              <div className="px-3 py-2 bg-navy/30 border-b border-border">
                <p className="text-xs font-orbitron text-slate-400 tracking-wider">MASS vs TIME</p>
              </div>
              <div className="p-3">
                <MassChart data={massData} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
