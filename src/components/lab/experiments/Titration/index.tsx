"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TitrationConfig {
  title: string;
  acid: string;
  acidFull: string;
  base: string;
  baseFull: string;
  indicator: string;
  indicatorColorInitial: string;
  indicatorColorEndpoint: string;
  equivalencePointPH: number;
  curve: "strong-strong" | "weak-strong";
  concentration: number; // mol/L of NaOH in burette
  volumeInFlask: number; // mL
  concentrationInFlask: number; // mol/L of acid
  equation: string;
}

const TITRATION_CONFIGS: Record<string, TitrationConfig> = {
  "titration-hcl-naoh": {
    title: "HCl vs NaOH Titration",
    acid: "HCl",
    acidFull: "Hydrochloric acid",
    base: "NaOH",
    baseFull: "Sodium hydroxide",
    indicator: "Phenolphthalein",
    indicatorColorInitial: "#FFF9F9",
    indicatorColorEndpoint: "#FFB3D9",
    equivalencePointPH: 7.0,
    curve: "strong-strong",
    concentration: 0.1,
    volumeInFlask: 25.0,
    concentrationInFlask: 0.1,
    equation: "HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)",
  },
  "titration-ch3cooh-naoh": {
    title: "CH₃COOH vs NaOH Titration",
    acid: "CH₃COOH",
    acidFull: "Acetic acid (ethanoic acid)",
    base: "NaOH",
    baseFull: "Sodium hydroxide",
    indicator: "Phenolphthalein",
    indicatorColorInitial: "#FFF9F9",
    indicatorColorEndpoint: "#FFB3D9",
    equivalencePointPH: 8.7,
    curve: "weak-strong",
    concentration: 0.1,
    volumeInFlask: 25.0,
    concentrationInFlask: 0.1,
    equation: "CH₃COOH(aq) + NaOH(aq) → CH₃COONa(aq) + H₂O(l)",
  },
};

// ─── pH calculator ────────────────────────────────────────────────────────────

function calculatePH(
  config: TitrationConfig,
  volumeAdded: number
): number {
  const molesAcid = (config.concentrationInFlask * config.volumeInFlask) / 1000;
  const molesBase = (config.concentration * volumeAdded) / 1000;
  const totalVolume = (config.volumeInFlask + volumeAdded) / 1000; // L

  if (config.curve === "strong-strong") {
    if (molesBase < molesAcid) {
      const excessAcid = molesAcid - molesBase;
      const [H] = [excessAcid / totalVolume];
      return Math.max(0, -Math.log10(H));
    } else if (molesBase > molesAcid) {
      const excessBase = molesBase - molesAcid;
      const [OH] = [excessBase / totalVolume];
      const pOH = -Math.log10(OH);
      return Math.min(14, 14 - pOH);
    }
    return 7.0;
  } else {
    // weak acid (CH3COOH) + strong base (NaOH)
    const Ka = 1.8e-5;
    if (molesBase === 0) {
      const H = Math.sqrt(Ka * config.concentrationInFlask);
      return -Math.log10(H);
    } else if (molesBase < molesAcid) {
      // buffer region — Henderson-Hasselbalch
      const molesSalt = molesBase;
      const molesAcidLeft = molesAcid - molesBase;
      return -Math.log10(Ka) + Math.log10(molesSalt / molesAcidLeft);
    } else if (molesBase > molesAcid) {
      const excessBase = molesBase - molesAcid;
      const pOH = -Math.log10(excessBase / totalVolume);
      return 14 - pOH;
    }
    // equivalence point — hydrolysis of CH3COO-
    const Kb = (1e-14) / Ka;
    const c = molesAcid / totalVolume;
    const OH = Math.sqrt(Kb * c);
    const pOH = -Math.log10(OH);
    return 14 - pOH;
  }
}

// ─── Flask SVG ────────────────────────────────────────────────────────────────

function Flask({
  color,
  fillPercent,
  hasDroplet,
}: {
  color: string;
  fillPercent: number;
  hasDroplet: boolean;
}) {
  const fillY = 120 - fillPercent * 80;

  return (
    <svg viewBox="0 0 120 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="flask-clip">
          <path d="M45 10 L45 60 L10 130 Q5 145 20 150 L100 150 Q115 145 110 130 L75 60 L75 10 Z" />
        </clipPath>
      </defs>
      {/* Flask body */}
      <path
        d="M45 10 L45 60 L10 130 Q5 145 20 150 L100 150 Q115 145 110 130 L75 60 L75 10 Z"
        fill="none"
        stroke="#334155"
        strokeWidth="2"
      />
      {/* Liquid */}
      <rect
        x="0"
        y={fillY}
        width="120"
        height="200"
        fill={color}
        clipPath="url(#flask-clip)"
        opacity={0.7}
      />
      {/* Neck */}
      <rect x="44" y="4" width="32" height="8" fill="#1A2540" rx="2" />
      {/* Droplet falling */}
      <AnimatePresence>
        {hasDroplet && (
          <motion.ellipse
            cx="60"
            cy="0"
            rx="4"
            ry="6"
            fill="#93C5FD"
            initial={{ cy: -10, opacity: 1 }}
            animate={{ cy: 8, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </AnimatePresence>
    </svg>
  );
}

// ─── Burette SVG ──────────────────────────────────────────────────────────────

function Burette({ level, isDropping }: { level: number; isDropping: boolean }) {
  const fillHeight = (level / 50) * 140;

  return (
    <svg viewBox="0 0 40 180" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="burette-clip">
          <rect x="10" y="10" width="20" height="140" />
        </clipPath>
      </defs>
      {/* Burette body */}
      <rect x="10" y="10" width="20" height="140" fill="none" stroke="#334155" strokeWidth="1.5" rx="1" />
      {/* NaOH solution */}
      <rect
        x="10"
        y={10 + (140 - fillHeight)}
        width="20"
        height={fillHeight}
        fill="#93C5FD"
        opacity={0.6}
        clipPath="url(#burette-clip)"
      />
      {/* Scale markings */}
      {[0, 10, 20, 30, 40, 50].map((ml) => (
        <g key={ml}>
          <line x1="30" y1={10 + (ml / 50) * 140} x2="35" y2={10 + (ml / 50) * 140} stroke="#475569" strokeWidth="0.5" />
          <text x="37" y={10 + (ml / 50) * 140 + 3} fontSize="5" fill="#475569" fontFamily="monospace">
            {ml}
          </text>
        </g>
      ))}
      {/* Stopcock */}
      <rect x="16" y="150" width="8" height="6" fill="#475569" rx="1" />
      {/* Tip */}
      <line x1="20" y1="156" x2="20" y2="168" stroke="#334155" strokeWidth="2" />
      {/* Drop */}
      <AnimatePresence>
        {isDropping && (
          <motion.ellipse
            cx="20"
            cy="168"
            rx="2.5"
            ry="4"
            fill="#93C5FD"
            initial={{ cy: 168, scaleY: 0.5 }}
            animate={{ cy: 175, scaleY: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, repeat: Infinity }}
          />
        )}
      </AnimatePresence>
    </svg>
  );
}

// ─── Titration curve chart ─────────────────────────────────────────────────────

function TitrationCurve({
  config,
  currentVolume,
}: {
  config: TitrationConfig;
  currentVolume: number;
}) {
  const W = 280;
  const H = 120;
  const PAD = { top: 10, right: 10, bottom: 24, left: 32 };
  const maxVol = 50;

  const points = Array.from({ length: 51 }, (_, i) => i).map((vol) => {
    const ph = calculatePH(config, vol);
    const x = PAD.left + (vol / maxVol) * (W - PAD.left - PAD.right);
    const y = PAD.top + ((14 - ph) / 14) * (H - PAD.top - PAD.bottom);
    return { x, y, vol, ph };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const currentPH = calculatePH(config, currentVolume);
  const cx =
    PAD.left + (currentVolume / maxVol) * (W - PAD.left - PAD.right);
  const cy =
    PAD.top + ((14 - currentPH) / 14) * (H - PAD.top - PAD.bottom);

  // Equivalence point
  const eqVol =
    (config.concentrationInFlask * config.volumeInFlask) / config.concentration;
  const eqX = PAD.left + (eqVol / maxVol) * (W - PAD.left - PAD.right);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <rect width={W} height={H} fill="#0A0E1A" rx="4" />

      {/* Grid lines */}
      {[0, 2, 4, 7, 10, 12, 14].map((ph) => {
        const y = PAD.top + ((14 - ph) / 14) * (H - PAD.top - PAD.bottom);
        return (
          <g key={ph}>
            <line
              x1={PAD.left}
              y1={y}
              x2={W - PAD.right}
              y2={y}
              stroke="#1E293B"
              strokeWidth="0.5"
            />
            <text x={PAD.left - 3} y={y + 3} fontSize="6" fill="#475569" textAnchor="end">
              {ph}
            </text>
          </g>
        );
      })}

      {/* Equivalence point vertical */}
      <line
        x1={eqX}
        y1={PAD.top}
        x2={eqX}
        y2={H - PAD.bottom}
        stroke="#0D7E6A"
        strokeWidth="0.75"
        strokeDasharray="3,2"
        opacity={0.6}
      />
      <text x={eqX + 2} y={PAD.top + 6} fontSize="5" fill="#0D7E6A">
        eq.pt
      </text>

      {/* Axes */}
      <line
        x1={PAD.left}
        y1={PAD.top}
        x2={PAD.left}
        y2={H - PAD.bottom}
        stroke="#475569"
        strokeWidth="1"
      />
      <line
        x1={PAD.left}
        y1={H - PAD.bottom}
        x2={W - PAD.right}
        y2={H - PAD.bottom}
        stroke="#475569"
        strokeWidth="1"
      />

      {/* Axis labels */}
      <text
        x={PAD.left - 16}
        y={(H - PAD.bottom + PAD.top) / 2}
        fontSize="7"
        fill="#64748B"
        textAnchor="middle"
        transform={`rotate(-90, ${PAD.left - 16}, ${(H - PAD.bottom + PAD.top) / 2})`}
      >
        pH
      </text>
      <text x={(W + PAD.left) / 2} y={H - 2} fontSize="7" fill="#64748B" textAnchor="middle">
        Vol NaOH added (mL)
      </text>

      {/* Curve */}
      <path d={path} fill="none" stroke="#4F6BEF" strokeWidth="1.5" />

      {/* Current point */}
      <circle cx={cx} cy={cy} r="3.5" fill="#0D7E6A" stroke="#0A0E1A" strokeWidth="1" />

      {/* pH label */}
      <text x={cx + 5} y={cy - 5} fontSize="6" fill="#0D7E6A">
        pH {currentPH.toFixed(1)}
      </text>
    </svg>
  );
}

// ─── Main Titration component ──────────────────────────────────────────────────

const GUIDED_STEPS = [
  {
    id: 0,
    title: "Fill the burette",
    instructions:
      "Fill the burette with NaOH solution to the 0.00 mL mark. Ensure no air bubbles are present in the tip.",
  },
  {
    id: 1,
    title: "Prepare the flask",
    instructions:
      "Pipette 25.0 mL of the acid solution into a conical flask. Add 2–3 drops of phenolphthalein indicator. The solution should be colourless.",
  },
  {
    id: 2,
    title: "Rough titration",
    instructions:
      'Add NaOH quickly until the pink colour just persists. Note the volume. This is your rough titre — use it to find the approximate endpoint.',
  },
  {
    id: 3,
    title: "Accurate titration",
    instructions:
      "Refill the burette. Add NaOH dropwise as you approach the endpoint. Stop when one drop causes a permanent pale pink colour.",
  },
  {
    id: 4,
    title: "Calculate the result",
    instructions:
      "Record the titre volume. Use n = cV to calculate moles of NaOH used. Since the mole ratio is 1:1, moles of acid = moles of NaOH.",
  },
];

interface TitrationProps {
  onScoreUpdate?: (pts: number) => void;
}

export function Titration({ onScoreUpdate }: TitrationProps) {
  const { currentExperimentSlug, currentMode, currentStep, nextStep, lang, addScore, addObservation } =
    useExperimentStore();

  const config =
    TITRATION_CONFIGS[currentExperimentSlug ?? "titration-hcl-naoh"] ??
    TITRATION_CONFIGS["titration-hcl-naoh"];

  const [volumeAdded, setVolumeAdded] = useState(0); // mL
  const [isDropping, setIsDropping] = useState(false);
  const [dropSpeed, setDropSpeed] = useState<"slow" | "fast">("slow");
  const [endpointReached, setEndpointReached] = useState(false);
  const [hasObserved, setHasObserved] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const equivalenceVol =
    (config.concentrationInFlask * config.volumeInFlask) / config.concentration;
  const currentPH = calculatePH(config, volumeAdded);
  const bureteLevel = Math.max(0, 50 - volumeAdded);

  // Flask color based on pH
  const getFlaskColor = () => {
    if (currentPH >= config.equivalencePointPH + 0.5) {
      return config.indicatorColorEndpoint;
    }
    if (currentPH >= config.equivalencePointPH - 0.5) {
      // transition
      const t = (currentPH - (config.equivalencePointPH - 0.5));
      const r = Math.round(255 + (255 - 255) * t);
      const g = Math.round(249 - (249 - 179) * t);
      const b = Math.round(249 - (249 - 217) * t);
      return `rgb(${r},${g},${b})`;
    }
    return config.indicatorColorInitial;
  };

  const flaskColor = getFlaskColor();
  const atEndpoint = currentPH >= config.equivalencePointPH + 0.3 && !endpointReached;

  useEffect(() => {
    if (atEndpoint && !endpointReached) {
      setEndpointReached(true);
      setIsDropping(false);
      addObservation(
        `Endpoint reached at ${volumeAdded.toFixed(1)} mL. Solution turns pale pink. pH = ${currentPH.toFixed(1)}`
      );
      if (currentMode === "Guided" && currentStep === 3) {
        nextStep();
      }
    }
  }, [atEndpoint, endpointReached, volumeAdded, currentPH, currentMode, currentStep, nextStep, addObservation]);

  const startDrop = useCallback(() => {
    if (endpointReached || volumeAdded >= 50) return;
    setIsDropping(true);
    const increment = dropSpeed === "fast" ? 0.5 : 0.1;
    intervalRef.current = setInterval(() => {
      setVolumeAdded((v) => {
        const next = Math.min(v + increment, 50);
        return next;
      });
    }, 200);
  }, [dropSpeed, endpointReached, volumeAdded]);

  const stopDrop = useCallback(() => {
    setIsDropping(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function handleReset() {
    setVolumeAdded(0);
    setIsDropping(false);
    setEndpointReached(false);
    setHasObserved(false);
    setShowCalc(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function handleObserve() {
    setHasObserved(true);
    addScore(15);
    onScoreUpdate?.(15);
    addObservation(
      `Observed: ${config.indicatorColorEndpoint === "#FFB3D9" ? "Colourless → pale pink" : "colour change at endpoint"}`
    );
  }

  const titre = endpointReached ? volumeAdded : equivalenceVol;
  const molesUsed = (config.concentration * titre) / 1000;
  const calcConc = (molesUsed / (config.volumeInFlask / 1000)).toFixed(4);

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

      {/* Equation */}
      <div className="bg-navy/40 border border-border rounded p-2 text-center">
        <p className="text-slate-300 font-rajdhani text-sm">{config.equation}</p>
      </div>

      {/* Apparatus */}
      <div className="grid grid-cols-3 gap-4 items-end">
        {/* Burette */}
        <div className="flex flex-col items-center">
          <p className="text-slate-500 text-xs font-rajdhani mb-2">Burette (NaOH)</p>
          <div className="h-48 w-12">
            <Burette level={bureteLevel} isDropping={isDropping} />
          </div>
          <div className="mt-2 text-center">
            <span className="font-orbitron text-sm text-white">{volumeAdded.toFixed(1)}</span>
            <span className="text-slate-500 text-xs font-rajdhani ml-1">mL added</span>
          </div>
        </div>

        {/* Flask */}
        <div className="flex flex-col items-center">
          <p className="text-slate-500 text-xs font-rajdhani mb-2">
            Conical Flask ({config.acid})
          </p>
          <div className="h-40 w-28">
            <Flask color={flaskColor} fillPercent={0.55} hasDroplet={isDropping} />
          </div>
          <div className="mt-2 text-center">
            <span
              className="text-xs font-rajdhani font-semibold"
              style={{
                color: currentPH < 6 ? "#F87171" : currentPH > 8 ? "#86EFAC" : "#FCD34D",
              }}
            >
              pH {currentPH.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Info panel */}
        <div className="space-y-3">
          <div className="bg-navy/40 border border-border rounded p-3 text-xs font-rajdhani space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Acid in flask:</span>
              <span className="text-white">{config.volumeInFlask} mL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Concentration:</span>
              <span className="text-white">{config.concentrationInFlask} mol/L</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">NaOH conc.:</span>
              <span className="text-white">{config.concentration} mol/L</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Eq. point vol:</span>
              <span className="text-teal">{equivalenceVol.toFixed(1)} mL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Indicator:</span>
              <span className="text-white">{config.indicator}</span>
            </div>
          </div>

          {endpointReached && (
            <motion.div
              className="bg-pink-900/30 border border-pink-600/40 rounded p-2 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <p className="text-pink-300 text-xs font-orbitron">ENDPOINT REACHED</p>
              <p className="text-white text-xs font-rajdhani mt-1">
                Titre: {volumeAdded.toFixed(2)} mL
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1 bg-navy/40 border border-border rounded p-1">
          <button
            onClick={() => setDropSpeed("slow")}
            className={`px-2 py-1 rounded text-xs font-rajdhani transition-all ${
              dropSpeed === "slow" ? "bg-teal/30 text-teal" : "text-slate-400"
            }`}
          >
            Drop by drop
          </button>
          <button
            onClick={() => setDropSpeed("fast")}
            className={`px-2 py-1 rounded text-xs font-rajdhani transition-all ${
              dropSpeed === "fast" ? "bg-blue-600/30 text-blue-300" : "text-slate-400"
            }`}
          >
            Fast add
          </button>
        </div>

        <button
          onMouseDown={startDrop}
          onMouseUp={stopDrop}
          onMouseLeave={stopDrop}
          onTouchStart={startDrop}
          onTouchEnd={stopDrop}
          disabled={endpointReached || volumeAdded >= 50}
          className="
            px-4 py-2 bg-blue-700/50 hover:bg-blue-600/60 disabled:opacity-40
            text-white text-xs font-rajdhani font-semibold border border-blue-500/50
            rounded transition-all select-none
          "
        >
          Hold to add NaOH
        </button>

        {endpointReached && !hasObserved && (
          <motion.button
            onClick={handleObserve}
            className="px-3 py-2 bg-pink-800/50 hover:bg-pink-700/60 text-pink-200 text-xs font-rajdhani border border-pink-600/40 rounded transition-all"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            ✓ Record Observation
          </motion.button>
        )}

        {endpointReached && (
          <motion.button
            onClick={() => setShowCalc(!showCalc)}
            className="px-3 py-2 bg-teal/20 hover:bg-teal/30 text-teal text-xs font-rajdhani border border-teal/30 rounded transition-all"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {showCalc ? "Hide" : "Show"} Calculation
          </motion.button>
        )}

        <button
          onClick={handleReset}
          className="px-3 py-2 text-slate-400 hover:text-white text-xs font-rajdhani border border-border rounded transition-colors ml-auto"
        >
          Reset
        </button>
      </div>

      {/* Titration curve */}
      <div className="rounded border border-border overflow-hidden">
        <div className="px-3 py-2 bg-navy/30 border-b border-border">
          <p className="text-xs font-orbitron text-slate-400 tracking-wider">TITRATION CURVE</p>
        </div>
        <div className="p-3">
          <TitrationCurve config={config} currentVolume={volumeAdded} />
        </div>
      </div>

      {/* Calculation */}
      <AnimatePresence>
        {showCalc && endpointReached && (
          <motion.div
            className="bg-navy/40 border border-teal/30 rounded p-4 space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <p className="text-teal font-orbitron text-xs tracking-wider mb-3">CALCULATION</p>
            <div className="space-y-2 font-rajdhani text-sm">
              <div className="flex gap-2">
                <span className="text-slate-400 w-8">1.</span>
                <div>
                  <p className="text-white">Titre volume = <span className="text-teal">{volumeAdded.toFixed(2)} mL</span></p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400 w-8">2.</span>
                <div>
                  <p className="text-slate-300">n(NaOH) = c × V = {config.concentration} × {(volumeAdded / 1000).toFixed(5)} L</p>
                  <p className="text-white">= <span className="text-teal">{molesUsed.toFixed(5)} mol</span></p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400 w-8">3.</span>
                <div>
                  <p className="text-slate-300">Mole ratio 1:1 ∴ n({config.acid}) = {molesUsed.toFixed(5)} mol</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400 w-8">4.</span>
                <div>
                  <p className="text-slate-300">
                    c({config.acid}) = n/V = {molesUsed.toFixed(5)}/{(config.volumeInFlask / 1000).toFixed(3)} L
                  </p>
                  <p className="text-white text-base font-semibold">
                    = <span className="text-teal">{calcConc} mol L⁻¹</span>
                  </p>
                </div>
              </div>
              {config.curve === "weak-strong" && (
                <div className="mt-3 p-2 bg-amber-900/20 border border-amber-700/30 rounded text-xs text-amber-300 font-rajdhani">
                  Note: The equivalence point is above pH 7 (pH ≈ {config.equivalencePointPH}) because
                  CH₃COO⁻ is a weak base that partially hydrolyses in water.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
