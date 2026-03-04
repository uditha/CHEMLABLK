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

// ─── Types ────────────────────────────────────────────────────────────────────

interface TitrationConfig {
  title: string;
  acid: string; acidFull: string;
  base: string; baseFull: string;
  indicator: string;
  indicatorColorInitial: string;
  indicatorColorEndpoint: string;
  equivalencePointPH: number;
  curve: "strong-strong" | "weak-strong";
  concentration: number;
  volumeInFlask: number;
  concentrationInFlask: number;
  equation: string;
  slug: string;
}

const TITRATION_CONFIGS: Record<string, TitrationConfig> = {
  "titration-hcl-naoh": {
    title: "HCl vs NaOH Titration",
    acid: "HCl", acidFull: "Hydrochloric acid",
    base: "NaOH", baseFull: "Sodium hydroxide",
    indicator: "Phenolphthalein",
    indicatorColorInitial: "#FFF9F9",
    indicatorColorEndpoint: "#FFB3D9",
    equivalencePointPH: 7.0,
    curve: "strong-strong",
    concentration: 0.1, volumeInFlask: 25.0, concentrationInFlask: 0.1,
    equation: "HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)",
    slug: "titration-hcl-naoh",
  },
  "titration-ch3cooh-naoh": {
    title: "CH₃COOH vs NaOH Titration",
    acid: "CH₃COOH", acidFull: "Acetic acid (ethanoic acid)",
    base: "NaOH", baseFull: "Sodium hydroxide",
    indicator: "Phenolphthalein",
    indicatorColorInitial: "#FFF9F9",
    indicatorColorEndpoint: "#FFB3D9",
    equivalencePointPH: 8.7,
    curve: "weak-strong",
    concentration: 0.1, volumeInFlask: 25.0, concentrationInFlask: 0.1,
    equation: "CH₃COOH(aq) + NaOH(aq) → CH₃COONa(aq) + H₂O(l)",
    slug: "titration-ch3cooh-naoh",
  },
};

// ─── pH calculator ────────────────────────────────────────────────────────────

function calculatePH(config: TitrationConfig, volumeAdded: number): number {
  const molesAcid = (config.concentrationInFlask * config.volumeInFlask) / 1000;
  const molesBase = (config.concentration * volumeAdded) / 1000;
  const totalVolume = (config.volumeInFlask + volumeAdded) / 1000;

  if (config.curve === "strong-strong") {
    if (molesBase < molesAcid) {
      const excessAcid = molesAcid - molesBase;
      return Math.max(0, -Math.log10(excessAcid / totalVolume));
    } else if (molesBase > molesAcid) {
      const excessBase = molesBase - molesAcid;
      return Math.min(14, 14 - (-Math.log10(excessBase / totalVolume)));
    }
    return 7.0;
  } else {
    const Ka = 1.8e-5;
    if (molesBase === 0) return -Math.log10(Math.sqrt(Ka * config.concentrationInFlask));
    if (molesBase < molesAcid) {
      return -Math.log10(Ka) + Math.log10(molesBase / (molesAcid - molesBase));
    } else if (molesBase > molesAcid) {
      return 14 - (-Math.log10((molesBase - molesAcid) / totalVolume));
    }
    const Kb = 1e-14 / Ka;
    const c = molesAcid / totalVolume;
    return 14 - (-Math.log10(Math.sqrt(Kb * c)));
  }
}

// ─── Flask SVG ────────────────────────────────────────────────────────────────

function Flask({ color, fillPercent, hasDroplet }: { color: string; fillPercent: number; hasDroplet: boolean }) {
  const fillY = 120 - fillPercent * 80;
  return (
    <svg viewBox="0 0 120 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="flask-clip">
          <path d="M45 10 L45 60 L10 130 Q5 145 20 150 L100 150 Q115 145 110 130 L75 60 L75 10 Z" />
        </clipPath>
      </defs>
      <path d="M45 10 L45 60 L10 130 Q5 145 20 150 L100 150 Q115 145 110 130 L75 60 L75 10 Z"
        fill="none" stroke="#334155" strokeWidth="2" />
      <rect x="0" y={fillY} width="120" height="200" fill={color} clipPath="url(#flask-clip)" opacity={0.7} />
      <rect x="44" y="4" width="32" height="8" fill="#1A2540" rx="2" />
      <AnimatePresence>
        {hasDroplet && (
          <motion.ellipse cx="60" cy="0" rx="4" ry="6" fill="#93C5FD"
            initial={{ cy: -10, opacity: 1 }} animate={{ cy: 8, opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.4 }} />
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
        <clipPath id="burette-clip"><rect x="10" y="10" width="20" height="140" /></clipPath>
      </defs>
      <rect x="10" y="10" width="20" height="140" fill="none" stroke="#334155" strokeWidth="1.5" rx="1" />
      <rect x="10" y={10 + (140 - fillHeight)} width="20" height={fillHeight} fill="#93C5FD" opacity={0.6} clipPath="url(#burette-clip)" />
      {[0, 10, 20, 30, 40, 50].map((ml) => (
        <g key={ml}>
          <line x1="30" y1={10 + (ml / 50) * 140} x2="35" y2={10 + (ml / 50) * 140} stroke="#475569" strokeWidth="0.5" />
          <text x="37" y={10 + (ml / 50) * 140 + 3} fontSize="5" fill="#475569" fontFamily="monospace">{ml}</text>
        </g>
      ))}
      <rect x="16" y="150" width="8" height="6" fill="#475569" rx="1" />
      <line x1="20" y1="156" x2="20" y2="168" stroke="#334155" strokeWidth="2" />
      <AnimatePresence>
        {isDropping && (
          <motion.ellipse cx="20" cy="168" rx="2.5" ry="4" fill="#93C5FD"
            initial={{ cy: 168, scaleY: 0.5 }} animate={{ cy: 175, scaleY: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.35, repeat: Infinity }} />
        )}
      </AnimatePresence>
    </svg>
  );
}

// ─── Titration curve chart ─────────────────────────────────────────────────────

function TitrationCurve({ config, currentVolume }: { config: TitrationConfig; currentVolume: number }) {
  const W = 280; const H = 120;
  const PAD = { top: 10, right: 10, bottom: 24, left: 32 };
  const maxVol = 50;
  const points = Array.from({ length: 51 }, (_, i) => i).map((vol) => {
    const ph = calculatePH(config, vol);
    const x = PAD.left + (vol / maxVol) * (W - PAD.left - PAD.right);
    const y = PAD.top + ((14 - ph) / 14) * (H - PAD.top - PAD.bottom);
    return { x, y, vol, ph };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const currentPH = calculatePH(config, currentVolume);
  const cx = PAD.left + (currentVolume / maxVol) * (W - PAD.left - PAD.right);
  const cy = PAD.top + ((14 - currentPH) / 14) * (H - PAD.top - PAD.bottom);
  const eqVol = (config.concentrationInFlask * config.volumeInFlask) / config.concentration;
  const eqX = PAD.left + (eqVol / maxVol) * (W - PAD.left - PAD.right);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill="#0A0E1A" rx="4" />
      {[0, 2, 4, 7, 10, 12, 14].map((ph) => {
        const y = PAD.top + ((14 - ph) / 14) * (H - PAD.top - PAD.bottom);
        return (
          <g key={ph}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#1E293B" strokeWidth="0.5" />
            <text x={PAD.left - 3} y={y + 3} fontSize="6" fill="#475569" textAnchor="end">{ph}</text>
          </g>
        );
      })}
      <line x1={eqX} y1={PAD.top} x2={eqX} y2={H - PAD.bottom} stroke="#0D7E6A" strokeWidth="0.75" strokeDasharray="3,2" opacity={0.6} />
      <text x={eqX + 2} y={PAD.top + 6} fontSize="5" fill="#0D7E6A">eq.pt</text>
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#475569" strokeWidth="1" />
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#475569" strokeWidth="1" />
      <text x={PAD.left - 16} y={(H - PAD.bottom + PAD.top) / 2} fontSize="7" fill="#64748B" textAnchor="middle"
        transform={`rotate(-90, ${PAD.left - 16}, ${(H - PAD.bottom + PAD.top) / 2})`}>pH</text>
      <text x={(W + PAD.left) / 2} y={H - 2} fontSize="7" fill="#64748B" textAnchor="middle">Vol NaOH added (mL)</text>
      <path d={path} fill="none" stroke="#4F6BEF" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r="3.5" fill="#0D7E6A" stroke="#0A0E1A" strokeWidth="1" />
      <text x={cx + 5} y={cy - 5} fontSize="6" fill="#0D7E6A">pH {currentPH.toFixed(1)}</text>
    </svg>
  );
}

// ─── Observations Panel ───────────────────────────────────────────────────────

function ObservationsPanel({ observations, volumeAdded, endpointReached, currentPH }: {
  observations: string[]; volumeAdded: number; endpointReached: boolean; currentPH: number;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">READINGS</p>
        <div className="space-y-1 text-xs font-rajdhani">
          <div className="flex justify-between">
            <span className="text-slate-400">Vol. added:</span>
            <span className="text-white">{volumeAdded.toFixed(1)} mL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Current pH:</span>
            <span className={currentPH < 6 ? "text-red-400" : currentPH > 8 ? "text-green-400" : "text-yellow-400"}>
              {currentPH.toFixed(2)}
            </span>
          </div>
          {endpointReached && (
            <div className="flex justify-between">
              <span className="text-teal">Titre:</span>
              <span className="text-teal font-semibold">{volumeAdded.toFixed(2)} mL</span>
            </div>
          )}
        </div>
      </div>
      <div>
        <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">OBSERVATIONS</p>
        {observations.length === 0 ? (
          <p className="text-slate-600 text-xs font-rajdhani">No observations yet.</p>
        ) : (
          <div className="space-y-1.5">
            {observations.map((obs, i) => (
              <div key={i} className="text-xs font-rajdhani text-slate-300 bg-navy/30 rounded p-2 border border-border/50">{obs}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Titration component ──────────────────────────────────────────────────

interface TitrationProps {
  onScoreUpdate?: (pts: number) => void;
}

export function Titration({ onScoreUpdate }: TitrationProps) {
  const { currentExperimentSlug, addScore, addObservation, setTotalSteps, setStep, score, completeMode, currentMode, resetExperiment } =
    useExperimentStore();
  const { playSuccess } = useSoundEffects();
  const { data: session } = useSession();
  const startTimeRef = useRef(Date.now());
  const [showCompletion, setShowCompletion] = useState(false);

  const config = TITRATION_CONFIGS[currentExperimentSlug ?? "titration-hcl-naoh"] ?? TITRATION_CONFIGS["titration-hcl-naoh"];

  const [volumeAdded, setVolumeAdded] = useState(0);
  const [isDropping, setIsDropping] = useState(false);
  const [dropSpeed, setDropSpeed] = useState<"slow" | "fast">("slow");
  const [endpointReached, setEndpointReached] = useState(false);
  const [observations, setObservationsLocal] = useState<string[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => { setTotalSteps(4); }, []);

  const equivalenceVol = (config.concentrationInFlask * config.volumeInFlask) / config.concentration;
  const currentPH = calculatePH(config, volumeAdded);
  const bureteLevel = Math.max(0, 50 - volumeAdded);

  const getFlaskColor = () => {
    if (currentPH >= config.equivalencePointPH + 0.5) return config.indicatorColorEndpoint;
    if (currentPH >= config.equivalencePointPH - 0.5) {
      const t = currentPH - (config.equivalencePointPH - 0.5);
      return `rgb(255,${Math.round(249 - (249 - 179) * t)},${Math.round(249 - (249 - 217) * t)})`;
    }
    return config.indicatorColorInitial;
  };

  const flaskColor = getFlaskColor();
  const atEndpoint = currentPH >= config.equivalencePointPH + 0.3 && !endpointReached;

  useEffect(() => {
    if (atEndpoint && !endpointReached) {
      setEndpointReached(true);
      setIsDropping(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      const obs = `Endpoint at ${volumeAdded.toFixed(1)} mL — colourless → pale pink. pH = ${currentPH.toFixed(1)}`;
      addObservation(obs);
      setObservationsLocal((prev) => [...prev, obs]);
      playSuccess();
      addScore(20);
      onScoreUpdate?.(20);
    }
  }, [atEndpoint, endpointReached, volumeAdded, currentPH, addObservation, addScore, onScoreUpdate, playSuccess]);

  const startDrop = useCallback(() => {
    if (endpointReached || volumeAdded >= 50) return;
    setIsDropping(true);
    const increment = dropSpeed === "fast" ? 0.5 : 0.1;
    intervalRef.current = setInterval(() => {
      setVolumeAdded((v) => Math.min(v + increment, 50));
    }, 200);
  }, [dropSpeed, endpointReached, volumeAdded]);

  const stopDrop = useCallback(() => {
    setIsDropping(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, []);

  function handleReset() {
    setVolumeAdded(0);
    setIsDropping(false);
    setEndpointReached(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function handleComplete() {
    completeMode(config.slug, currentMode);
    setShowCompletion(true);
    if (session?.user?.role === "student") {
      const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      saveProgress({ slug: config.slug, mode: currentMode, score, timeSpentSeconds }).catch(() => {});
    }
  }

  function handleDoAgain() {
    resetExperiment();
    handleReset();
    setObservationsLocal([]);
    setStep(0);
    startTimeRef.current = Date.now();
    setShowCompletion(false);
  }

  const titre = endpointReached ? volumeAdded : equivalenceVol;
  const molesUsed = (config.concentration * titre) / 1000;
  const calcConc = (molesUsed / (config.volumeInFlask / 1000)).toFixed(4);

  const isWeakStrong = config.curve === "weak-strong";

  // ─── Step Definitions ──────────────────────────────────────────────────────

  const steps: StepDefinition[] = useMemo(() => [
    {
      id: "setup",
      title: "Set Up Apparatus",
      subtitle: "Fill the burette with NaOH and prepare the conical flask.",
      canProceed: true,
      instructions: {
        procedure: [
          "Rinse the burette with NaOH solution, then fill to the 0.00 mL mark",
          "Ensure there are no air bubbles in the burette tip",
          `Pipette exactly ${config.volumeInFlask} mL of ${config.acid} into a clean conical flask`,
          `Add 2–3 drops of ${config.indicator} indicator`,
        ],
        safetyNotes: [
          "Both acid and base are corrosive — wear gloves and goggles",
          "Rinse spillages immediately with water",
        ],
        expectedObservations: [
          `Flask should be colourless (${config.indicatorColorInitial === "#FFF9F9" ? "phenolphthalein is colourless in acid" : "colourless"})`,
          "Burette should be filled and bubble-free",
        ],
        tips: [
          "Use a white tile under the flask to see the colour change clearly",
          "Label which is acid and which is base to avoid confusion",
        ],
      },
      quiz: {
        question: `Why is ${config.indicator} used in this titration?`,
        options: [
          "It speeds up the reaction",
          "It shows a colour change near the equivalence point pH",
          "It prevents the solution from overheating",
          "It neutralises excess acid",
        ],
        correctIndex: 1,
        explanation: `Phenolphthalein changes from colourless to pink at pH ~8.2–10. For ${isWeakStrong ? "weak acid + strong base (equivalence ~pH 8.7)" : "strong acid + strong base (equivalence pH 7)"}, this makes it a suitable indicator.`,
      },
      content: (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col items-center gap-2">
              <p className="text-slate-400 text-xs font-rajdhani">Burette (NaOH)</p>
              <div className="h-48 w-12"><Burette level={bureteLevel} isDropping={false} /></div>
              <p className="text-slate-500 text-xs font-rajdhani">0.00 mL</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-slate-400 text-xs font-rajdhani">Flask ({config.acid})</p>
              <div className="h-40 w-28"><Flask color={flaskColor} fillPercent={0.55} hasDroplet={false} /></div>
              <p className="text-slate-500 text-xs font-rajdhani">{config.indicator} added</p>
            </div>
          </div>
          <div className="bg-navy/40 border border-border rounded-lg p-3 text-xs font-rajdhani space-y-1 w-full max-w-xs">
            <div className="flex justify-between"><span className="text-slate-400">Acid concentration:</span><span className="text-white">{config.concentrationInFlask} mol/L</span></div>
            <div className="flex justify-between"><span className="text-slate-400">NaOH concentration:</span><span className="text-white">{config.concentration} mol/L</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Equivalence vol.:</span><span className="text-teal">{equivalenceVol.toFixed(1)} mL</span></div>
          </div>
        </div>
      ),
      theory: (
        <div className="space-y-2">
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1">EQUATION</p>
          <p className="text-teal text-xs font-mono">{config.equation}</p>
          <p className="text-slate-400 text-xs font-rajdhani mt-2">Mole ratio: 1:1 (acid:base)</p>
          {isWeakStrong && (
            <div className="mt-2 p-2 bg-amber-900/20 border border-amber-700/30 rounded text-xs font-rajdhani text-amber-300">
              Weak acid: equivalence point at pH ≈ {config.equivalencePointPH} (above 7) due to hydrolysis of CH₃COO⁻
            </div>
          )}
        </div>
      ),
    },

    {
      id: "rough",
      title: "Rough Titration",
      subtitle: "Add NaOH quickly to find the approximate endpoint.",
      canProceed: volumeAdded > 0,
      instructions: {
        procedure: [
          "Use 'Fast add' mode to add NaOH quickly",
          "Stop when the pink colour just appears and persists",
          "Note the approximate titre volume — this is your rough titre",
          "Reset for the accurate titration",
        ],
        tips: [
          "The rough titre tells you approximately where the endpoint is",
          "You'll slow down near this point in the accurate titration",
        ],
        expectedObservations: ["The solution changes from colourless to pale pink at the endpoint"],
      },
      quiz: {
        question: "Why do we do a rough titration first?",
        options: [
          "To use up excess acid",
          "To find the approximate endpoint volume before doing accurate titre",
          "To warm up the solution",
          "To check the indicator is working",
        ],
        correctIndex: 1,
        explanation: "The rough titre gives an approximate endpoint. In subsequent accurate titrations, you add NaOH quickly up to ~1 mL before the endpoint, then add drop by drop to find the exact endpoint — minimising overshoot.",
      },
      content: (
        <div className="flex flex-col gap-4 p-4 h-full">
          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="flex flex-col items-center gap-2">
              <p className="text-slate-400 text-xs font-rajdhani">Burette</p>
              <div className="h-48 w-12"><Burette level={bureteLevel} isDropping={isDropping} /></div>
              <div className="text-center">
                <span className="font-orbitron text-sm text-white">{volumeAdded.toFixed(1)}</span>
                <span className="text-slate-500 text-xs font-rajdhani ml-1">mL added</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-slate-400 text-xs font-rajdhani">Flask</p>
              <div className="h-40 w-28"><Flask color={flaskColor} fillPercent={0.55} hasDroplet={isDropping} /></div>
              <span className={`text-xs font-rajdhani font-semibold ${currentPH < 6 ? "text-red-400" : currentPH > 8 ? "text-green-400" : "text-yellow-400"}`}>
                pH {currentPH.toFixed(1)}
              </span>
            </div>
          </div>

          {endpointReached && (
            <motion.div className="bg-pink-900/30 border border-pink-600/40 rounded-lg p-3 text-center"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <p className="text-pink-300 font-orbitron text-xs tracking-wider">ENDPOINT REACHED</p>
              <p className="text-white text-sm font-rajdhani mt-1">Rough titre: {volumeAdded.toFixed(1)} mL</p>
            </motion.div>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-1 bg-navy/40 border border-border rounded p-1">
              <button onClick={() => setDropSpeed("slow")}
                className={`px-2 py-1 rounded text-xs font-rajdhani transition-all ${dropSpeed === "slow" ? "bg-teal/30 text-teal" : "text-slate-400"}`}>
                Drop by drop
              </button>
              <button onClick={() => setDropSpeed("fast")}
                className={`px-2 py-1 rounded text-xs font-rajdhani transition-all ${dropSpeed === "fast" ? "bg-blue-600/30 text-blue-300" : "text-slate-400"}`}>
                Fast add
              </button>
            </div>
            <button onMouseDown={startDrop} onMouseUp={stopDrop} onMouseLeave={stopDrop} onTouchStart={startDrop} onTouchEnd={stopDrop}
              disabled={endpointReached || volumeAdded >= 50}
              className="px-4 py-2 bg-blue-700/50 hover:bg-blue-600/60 disabled:opacity-40 text-white text-xs font-rajdhani font-semibold border border-blue-500/50 rounded transition-all select-none">
              Hold to add NaOH
            </button>
            <button onClick={handleReset} className="px-3 py-2 text-slate-400 hover:text-white text-xs font-rajdhani border border-border rounded transition-colors">
              Reset
            </button>
          </div>
        </div>
      ),
      theory: (
        <div className="space-y-2">
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1">TITRATION TECHNIQUE</p>
          <p className="text-slate-300 text-xs font-rajdhani leading-relaxed">
            Add NaOH in excess to get the rough titre. Note the volume — this guides the accurate titration.
          </p>
          <p className="text-slate-400 text-xs font-rajdhani mt-1">
            Aim for at least 3 concordant titres (within 0.10 mL of each other) in real lab work.
          </p>
        </div>
      ),
    },

    {
      id: "accurate",
      title: "Accurate Titration",
      subtitle: "Add NaOH dropwise near the endpoint for a precise titre.",
      canProceed: endpointReached,
      instructions: {
        procedure: [
          "Reset the burette to 0.00 mL",
          "Add NaOH quickly up to ~1 mL before the expected endpoint",
          "Switch to 'Drop by drop' — add one drop at a time",
          "Stop when ONE drop causes a permanent pale pink colour (persists for 30 s)",
          "Record the exact titre volume",
        ],
        safetyNotes: [
          "Hold the flask and swirl continuously near the endpoint",
          "The colour change is fast — go slowly to avoid overshoot",
        ],
        expectedObservations: [
          "Colourless → pale pink that persists (endpoint)",
          "Note: a deep pink means you overshot — repeat",
        ],
        tips: [
          "A 'half-drop' technique: open stopcock briefly to add less than one full drop",
          "Rinse the sides of the flask with distilled water — does not affect the result",
        ],
      },
      quiz: {
        question: "The endpoint of a phenolphthalein titration is marked by which colour change?",
        options: [
          "Pink → colourless",
          "Colourless → pale pink (persists for ≥30 s)",
          "Yellow → red",
          "Blue → green",
        ],
        correctIndex: 1,
        explanation: "Phenolphthalein is colourless in acid and turns pink in base (pH > 8.2). The endpoint is one half-drop of NaOH that causes a permanent pale pink — not a deep pink which indicates overshoot.",
      },
      content: (
        <div className="flex flex-col gap-4 p-4 h-full">
          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="flex flex-col items-center gap-2">
              <p className="text-slate-400 text-xs font-rajdhani">Burette</p>
              <div className="h-48 w-12"><Burette level={bureteLevel} isDropping={isDropping} /></div>
              <span className="font-orbitron text-sm text-white">{volumeAdded.toFixed(2)} mL</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-slate-400 text-xs font-rajdhani">Flask</p>
              <div className="h-40 w-28"><Flask color={flaskColor} fillPercent={0.55} hasDroplet={isDropping} /></div>
              <span className={`text-xs font-rajdhani font-semibold ${currentPH < 6 ? "text-red-400" : currentPH > 8 ? "text-green-400" : "text-yellow-400"}`}>
                pH {currentPH.toFixed(1)}
              </span>
            </div>
          </div>

          {endpointReached && (
            <motion.div className="bg-pink-900/30 border border-pink-600/40 rounded-lg p-3 text-center"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <p className="text-pink-300 font-orbitron text-xs tracking-wider">ENDPOINT REACHED</p>
              <p className="text-white font-rajdhani">Titre = <span className="text-teal font-bold">{volumeAdded.toFixed(2)} mL</span></p>
            </motion.div>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-1 bg-navy/40 border border-border rounded p-1">
              <button onClick={() => setDropSpeed("slow")} className={`px-2 py-1 rounded text-xs font-rajdhani ${dropSpeed === "slow" ? "bg-teal/30 text-teal" : "text-slate-400"}`}>Drop by drop</button>
              <button onClick={() => setDropSpeed("fast")} className={`px-2 py-1 rounded text-xs font-rajdhani ${dropSpeed === "fast" ? "bg-blue-600/30 text-blue-300" : "text-slate-400"}`}>Fast add</button>
            </div>
            <button onMouseDown={startDrop} onMouseUp={stopDrop} onMouseLeave={stopDrop} onTouchStart={startDrop} onTouchEnd={stopDrop}
              disabled={endpointReached || volumeAdded >= 50}
              className="px-4 py-2 bg-blue-700/50 hover:bg-blue-600/60 disabled:opacity-40 text-white text-xs font-rajdhani font-semibold border border-blue-500/50 rounded transition-all select-none">
              Hold to add NaOH
            </button>
            <button onClick={handleReset} className="px-3 py-2 text-slate-400 hover:text-white text-xs font-rajdhani border border-border rounded transition-colors">Reset</button>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-3 py-2 bg-navy/30 border-b border-border">
              <p className="text-xs font-orbitron text-slate-400 tracking-wider">TITRATION CURVE</p>
            </div>
            <div className="p-3"><TitrationCurve config={config} currentVolume={volumeAdded} /></div>
          </div>
        </div>
      ),
      theory: (
        <div className="space-y-2">
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1">pH AT ENDPOINT</p>
          <p className="text-white text-xs font-rajdhani">Current pH: <span className="text-teal">{currentPH.toFixed(2)}</span></p>
          <p className="text-slate-400 text-xs font-rajdhani">Equivalence pH: {config.equivalencePointPH}</p>
          {isWeakStrong && (
            <p className="text-amber-300 text-xs font-rajdhani mt-1">
              Weak acid equivalence at pH &gt; 7 due to CH₃COO⁻ hydrolysis
            </p>
          )}
        </div>
      ),
    },

    {
      id: "calculate",
      title: "Calculate the Result",
      subtitle: "Use n = cV to find the concentration of the acid.",
      canProceed: true,
      instructions: {
        procedure: [
          "Step 1: Record the mean titre volume from concordant results",
          "Step 2: Calculate moles of NaOH: n = c × V",
          "Step 3: Use mole ratio (1:1) to find moles of acid",
          "Step 4: Calculate concentration: c = n/V",
        ],
        tips: [
          "Always use the volume in dm³ (÷ 1000 to convert from mL)",
          "Report concentration to 3 significant figures",
        ],
      },
      content: (
        <div className="flex flex-col h-full gap-3 p-4 overflow-y-auto">
          <div className="bg-navy/40 border border-teal/30 rounded-lg p-4 space-y-2">
            <p className="text-teal font-orbitron text-xs tracking-wider mb-3">CALCULATION</p>
            <div className="space-y-2 font-rajdhani text-sm">
              <div className="flex gap-2">
                <span className="text-slate-400 w-6">1.</span>
                <p className="text-white">Titre = <span className="text-teal">{titre.toFixed(2)} mL</span></p>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400 w-6">2.</span>
                <div>
                  <p className="text-slate-300">n(NaOH) = {config.concentration} × {(titre / 1000).toFixed(5)} L</p>
                  <p className="text-white">= <span className="text-teal">{molesUsed.toFixed(5)} mol</span></p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400 w-6">3.</span>
                <p className="text-slate-300">Mole ratio 1:1 ∴ n({config.acid}) = {molesUsed.toFixed(5)} mol</p>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400 w-6">4.</span>
                <div>
                  <p className="text-slate-300">c({config.acid}) = {molesUsed.toFixed(5)} / {(config.volumeInFlask / 1000).toFixed(3)} L</p>
                  <p className="text-white text-base font-semibold">= <span className="text-teal">{calcConc} mol L⁻¹</span></p>
                </div>
              </div>
              {isWeakStrong && (
                <div className="mt-2 p-2 bg-amber-900/20 border border-amber-700/30 rounded text-xs text-amber-300">
                  Note: Equivalence pH ≈ {config.equivalencePointPH} (above 7) because CH₃COO⁻ partially hydrolyses in water.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-3 py-2 bg-navy/30 border-b border-border">
              <p className="text-xs font-orbitron text-slate-400 tracking-wider">TITRATION CURVE</p>
            </div>
            <div className="p-3"><TitrationCurve config={config} currentVolume={volumeAdded} /></div>
          </div>
        </div>
      ),
      theory: (
        <div className="space-y-2">
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1">KEY FORMULA</p>
          <p className="text-slate-300 text-xs font-mono">n = c × V (mol = mol/L × L)</p>
          <p className="text-slate-400 text-xs font-rajdhani mt-1">At equivalence: n(acid) = n(base) for 1:1 ratio</p>
          <p className="text-slate-400 text-xs font-mono mt-1">c(acid) = n / V_acid</p>
        </div>
      ),
    },
  ], [config, volumeAdded, isDropping, endpointReached, flaskColor, bureteLevel, currentPH, titre, molesUsed, calcConc, equivalenceVol, isWeakStrong, dropSpeed]);

  const persistentNotes = useMemo(() => (
    <ObservationsPanel observations={observations} volumeAdded={volumeAdded} endpointReached={endpointReached} currentPH={currentPH} />
  ), [observations, volumeAdded, endpointReached, currentPH]);

  const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

  return (
    <>
      <StepWizard
        steps={steps}
        persistentNotes={persistentNotes}
        experimentTitle={config.title}
        onComplete={handleComplete}
      />
      {showCompletion && (
        <CompletionOverlay
          experimentTitle={config.title}
          score={score}
          maxScore={60}
          itemsTested={endpointReached ? 1 : 0}
          totalItems={1}
          timeSpentSeconds={timeSpentSeconds}
          onDoAgain={handleDoAgain}
        />
      )}
    </>
  );
}
