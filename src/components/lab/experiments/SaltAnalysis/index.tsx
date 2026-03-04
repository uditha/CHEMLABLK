"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface IonData {
  id: string;
  symbol: string;
  name: string;
  solutionColor: string;
  naoh: {
    precipitate: string;
    color: string;
    excessNaOH: string;
    excessColor: string | null; // null = same as initial precipitate (insoluble)
    description: string;
  };
  nh3: {
    precipitate: string;
    color: string;
    excessNH3: string;
    excessColor: string | null;
    description: string;
  };
  identificationKey: string;
}

const IONS: IonData[] = [
  {
    id: "cu2",
    symbol: "Cu²⁺",
    name: "Copper(II)",
    solutionColor: "#47B5E6",
    naoh: {
      precipitate: "Cu(OH)₂↓",
      color: "#5B9BD5",
      excessNaOH: "Insoluble in excess NaOH",
      excessColor: null,
      description: "Pale blue precipitate forms and remains insoluble in excess NaOH.",
    },
    nh3: {
      precipitate: "Cu(OH)₂↓",
      color: "#5B9BD5",
      excessNH3: "[Cu(NH₃)₄]²⁺ — deep Schweizer's blue",
      excessColor: "#1565C0",
      description: "Pale blue precipitate dissolves in excess NH₃ → deep navy/royal blue solution.",
    },
    identificationKey: "Pale blue ppt with NaOH; dissolves in excess NH₃ to give deep blue",
  },
  {
    id: "zn2",
    symbol: "Zn²⁺",
    name: "Zinc(II)",
    solutionColor: "#E8E8E8",
    naoh: {
      precipitate: "Zn(OH)₂↓",
      color: "#EEEEEE",
      excessNaOH: "[Zn(OH)₄]²⁻ — dissolves (colourless)",
      excessColor: "#F0F8FF",
      description: "White precipitate forms, dissolves in excess NaOH (amphoteric).",
    },
    nh3: {
      precipitate: "Zn(OH)₂↓",
      color: "#EEEEEE",
      excessNH3: "[Zn(NH₃)₄]²⁺ — dissolves (colourless)",
      excessColor: "#F8F8FF",
      description: "White precipitate dissolves in excess NH₃ to give colourless solution.",
    },
    identificationKey: "White ppt dissolves in both excess NaOH and excess NH₃",
  },
  {
    id: "fe3",
    symbol: "Fe³⁺",
    name: "Iron(III)",
    solutionColor: "#D4A84B",
    naoh: {
      precipitate: "Fe(OH)₃↓",
      color: "#B7410E",
      excessNaOH: "Insoluble in excess NaOH",
      excessColor: null,
      description: "Rust-brown/reddish-brown precipitate — insoluble in excess NaOH.",
    },
    nh3: {
      precipitate: "Fe(OH)₃↓",
      color: "#B7410E",
      excessNH3: "Insoluble in excess NH₃",
      excessColor: null,
      description: "Rust-brown precipitate — also insoluble in excess NH₃.",
    },
    identificationKey: "Rust-brown ppt with NaOH or NH₃; insoluble in excess of either",
  },
  {
    id: "ni2",
    symbol: "Ni²⁺",
    name: "Nickel(II)",
    solutionColor: "#6CBF7F",
    naoh: {
      precipitate: "Ni(OH)₂↓",
      color: "#4CAF50",
      excessNaOH: "Insoluble in excess NaOH",
      excessColor: null,
      description: "Apple-green precipitate — insoluble in excess NaOH.",
    },
    nh3: {
      precipitate: "Ni(OH)₂↓",
      color: "#4CAF50",
      excessNH3: "[Ni(NH₃)₆]²⁺ — blue/violet solution",
      excessColor: "#673AB7",
      description: "Apple-green precipitate dissolves in excess NH₃ to give blue-violet solution.",
    },
    identificationKey: "Apple-green ppt with NaOH; dissolves in excess NH₃ to blue-violet",
  },
  {
    id: "cr3",
    symbol: "Cr³⁺",
    name: "Chromium(III)",
    solutionColor: "#7CB9E8",
    naoh: {
      precipitate: "Cr(OH)₃↓",
      color: "#808000",
      excessNaOH: "[Cr(OH)₄]⁻ — dissolves (dark green)",
      excessColor: "#2E7D32",
      description: "Grey-green precipitate dissolves in excess NaOH (amphoteric) to dark green.",
    },
    nh3: {
      precipitate: "Cr(OH)₃↓",
      color: "#808000",
      excessNH3: "Insoluble in excess NH₃",
      excessColor: null,
      description: "Grey-green precipitate — insoluble in excess NH₃ (unlike NaOH).",
    },
    identificationKey: "Grey-green ppt; dissolves in excess NaOH (not NH₃)",
  },
];

const GUIDED_STEPS = [
  {
    id: 0,
    title: "Identify the unknown ion",
    instructions: "You have an unknown d-block metal ion solution. We will test it with NaOH and NH₃ to identify the ion.",
  },
  {
    id: 1,
    title: "Add NaOH dropwise",
    instructions: "Add dilute NaOH dropwise to the metal ion solution. Observe the colour of any precipitate that forms.",
  },
  {
    id: 2,
    title: "Add excess NaOH",
    instructions: "Continue adding NaOH until it is in excess. Does the precipitate dissolve or remain?",
  },
  {
    id: 3,
    title: "Test with NH₃",
    instructions: "Repeat with a fresh sample — add dilute NH₃, then excess. Compare the behaviour.",
  },
  {
    id: 4,
    title: "Conclude and identify",
    instructions: "Compare your observations with the reference table to identify the metal ion.",
  },
];

type Reagent = "none" | "naoh-drop" | "naoh-excess" | "nh3-drop" | "nh3-excess";

// ─── Test Tube ────────────────────────────────────────────────────────────────

function AnalysisTube({
  baseColor,
  precipColor,
  hasPrecip,
  label,
}: {
  baseColor: string;
  precipColor: string | null;
  hasPrecip: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 40 120" width="44" height="130" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id={`at-${label}`}>
            <path d="M8 5 L8 90 Q8 110 20 110 Q32 110 32 90 L32 5 Z" />
          </clipPath>
        </defs>
        <path
          d="M8 5 L8 90 Q8 110 20 110 Q32 110 32 90 L32 5"
          fill="rgba(200,220,255,0.06)"
          stroke="#334155"
          strokeWidth="1.2"
        />
        {/* Liquid */}
        <rect x="8" y="30" width="24" height="82" fill={baseColor} clipPath={`url(#at-${label})`} opacity={0.65} />
        {/* Precipitate */}
        {hasPrecip && precipColor && (
          <rect x="8" y="90" width="24" height="22" fill={precipColor} clipPath={`url(#at-${label})`} opacity={0.85} />
        )}
        <rect x="7" y="3" width="26" height="3" fill="#1E293B" rx="1" />
      </svg>
      <p className="text-slate-500 text-xs font-rajdhani text-center leading-tight">{label}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface SaltAnalysisProps {
  onScoreUpdate?: (pts: number) => void;
}

export function SaltAnalysis({ onScoreUpdate }: SaltAnalysisProps) {
  const { currentMode, currentStep, nextStep, addScore, addObservation, lang } =
    useExperimentStore();

  const [selectedIon, setSelectedIon] = useState<IonData | null>(null);
  const [reagent, setReagent] = useState<Reagent>("none");
  const [unknownIon] = useState<IonData>(IONS[Math.floor(Math.random() * IONS.length)]);
  const [isExamMode] = useState(currentMode === "Exam");
  const [examAnswer, setExamAnswer] = useState<string>("");
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [testsDone, setTestsDone] = useState<Set<string>>(new Set());

  const displayIon = isExamMode ? unknownIon : selectedIon;

  function handleReagent(r: Reagent) {
    setReagent(r);
    if (!displayIon) return;

    let obs = "";
    if (r === "naoh-drop") {
      obs = `${displayIon.symbol} + NaOH(aq): ${displayIon.naoh.precipitate} — ${displayIon.naoh.description.split(".")[0]}`;
      if (currentMode === "Guided" && currentStep === 1) nextStep();
    } else if (r === "naoh-excess") {
      obs = `${displayIon.symbol} + excess NaOH: ${displayIon.naoh.excessNaOH}`;
      if (currentMode === "Guided" && currentStep === 2) nextStep();
    } else if (r === "nh3-drop") {
      obs = `${displayIon.symbol} + NH₃(aq): ${displayIon.nh3.precipitate} — ${displayIon.nh3.description.split(".")[0]}`;
      if (currentMode === "Guided" && currentStep === 3) nextStep();
    } else if (r === "nh3-excess") {
      obs = `${displayIon.symbol} + excess NH₃: ${displayIon.nh3.excessNH3}`;
    }

    if (obs) {
      addObservation(obs);
      if (!isExamMode && displayIon && !testsDone.has(`${displayIon.id}-${r}`)) {
        setTestsDone((prev) => new Set(Array.from(prev).concat(`${displayIon.id}-${r}`)));
        addScore(8);
        onScoreUpdate?.(8);
      }
    }
  }

  function handleExamSubmit() {
    setExamSubmitted(true);
    if (examAnswer === unknownIon.id) {
      addScore(30);
      onScoreUpdate?.(30);
    }
    if (currentMode === "Guided" && currentStep === 4) nextStep();
  }

  // Determine tube colors based on reagent
  const getNaOHTubeData = () => {
    if (!displayIon || reagent === "none" || (reagent !== "naoh-drop" && reagent !== "naoh-excess")) {
      return { base: displayIon?.solutionColor ?? "#CCDDEE", precip: null, hasPrecip: false };
    }
    if (reagent === "naoh-drop") {
      return { base: displayIon.solutionColor, precip: displayIon.naoh.color, hasPrecip: true };
    }
    // naoh-excess
    if (displayIon.naoh.excessColor) {
      return { base: displayIon.naoh.excessColor, precip: null, hasPrecip: false };
    }
    return { base: displayIon.solutionColor, precip: displayIon.naoh.color, hasPrecip: true };
  };

  const getNH3TubeData = () => {
    if (!displayIon || (reagent !== "nh3-drop" && reagent !== "nh3-excess")) {
      return { base: displayIon?.solutionColor ?? "#CCDDEE", precip: null, hasPrecip: false };
    }
    if (reagent === "nh3-drop") {
      return { base: displayIon.solutionColor, precip: displayIon.nh3.color, hasPrecip: true };
    }
    // nh3-excess
    if (displayIon.nh3.excessColor) {
      return { base: displayIon.nh3.excessColor, precip: null, hasPrecip: false };
    }
    return { base: displayIon.solutionColor, precip: displayIon.nh3.color, hasPrecip: true };
  };

  const naohTube = getNaOHTubeData();
  const nh3Tube = getNH3TubeData();

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: ion selector */}
        {!isExamMode && (
          <div>
            <p className="text-slate-400 text-xs font-orbitron tracking-wider mb-2">
              SELECT ION TO TEST
            </p>
            <div className="space-y-1.5">
              {IONS.map((ion) => (
                <button
                  key={ion.id}
                  onClick={() => { setSelectedIon(ion); setReagent("none"); }}
                  className={`
                    w-full p-3 rounded border text-left transition-all
                    ${selectedIon?.id === ion.id
                      ? "border-2"
                      : "border-border hover:border-slate-500"}
                  `}
                  style={{
                    borderColor: selectedIon?.id === ion.id ? ion.solutionColor : undefined,
                    backgroundColor: selectedIon?.id === ion.id ? ion.solutionColor + "15" : undefined,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ion.solutionColor, opacity: 0.8 }}
                    />
                    <div>
                      <p className="text-white font-orbitron text-sm font-bold">{ion.symbol}</p>
                      <p className="text-slate-400 text-xs font-rajdhani">{ion.name}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Exam mode: unknown */}
        {isExamMode && (
          <div className="space-y-3">
            <div className="bg-red-900/20 border border-red-700/40 rounded p-3">
              <p className="text-red-300 font-orbitron text-xs tracking-wider mb-1">EXAM MODE</p>
              <p className="text-white font-rajdhani text-sm">
                Unknown d-block metal ion solution. Run tests with NaOH and NH₃ to identify it.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full"
                style={{ backgroundColor: unknownIon.solutionColor, opacity: 0.8 }}
              />
              <p className="text-slate-300 font-rajdhani text-sm">Unknown solution</p>
            </div>
          </div>
        )}

        {/* Right: test tubes and controls */}
        <div className="space-y-4">
          {/* Tubes display */}
          {displayIon && (
            <div className="flex items-end justify-around gap-2">
              {/* Original */}
              <AnalysisTube
                baseColor={displayIon.solutionColor}
                precipColor={null}
                hasPrecip={false}
                label="Original"
              />
              {/* NaOH tube */}
              <AnalysisTube
                baseColor={naohTube.base}
                precipColor={naohTube.precip}
                hasPrecip={naohTube.hasPrecip}
                label="+ NaOH"
              />
              {/* NH₃ tube */}
              <AnalysisTube
                baseColor={nh3Tube.base}
                precipColor={nh3Tube.precip}
                hasPrecip={nh3Tube.hasPrecip}
                label="+ NH₃"
              />
            </div>
          )}

          {/* Reagent buttons */}
          {displayIon && (
            <div className="grid grid-cols-2 gap-2">
              {(["naoh-drop", "naoh-excess", "nh3-drop", "nh3-excess"] as Reagent[]).map((r) => (
                <button
                  key={r}
                  onClick={() => handleReagent(r)}
                  className={`
                    px-2 py-1.5 rounded border text-xs font-rajdhani transition-all
                    ${reagent === r
                      ? "border-teal/50 bg-teal/20 text-teal"
                      : "border-border text-slate-300 hover:border-slate-500"}
                  `}
                >
                  {r === "naoh-drop" && "Add NaOH (drops)"}
                  {r === "naoh-excess" && "Add excess NaOH"}
                  {r === "nh3-drop" && "Add NH₃ (drops)"}
                  {r === "nh3-excess" && "Add excess NH₃"}
                </button>
              ))}
            </div>
          )}

          {!displayIon && (
            <div className="flex items-center justify-center h-32 text-slate-600 text-sm font-rajdhani">
              {isExamMode ? "Use the buttons above to test" : "Select an ion to begin"}
            </div>
          )}
        </div>
      </div>

      {/* Observation display */}
      <AnimatePresence>
        {displayIon && reagent !== "none" && (
          <motion.div
            className="bg-navy/40 border border-border rounded p-3 space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-slate-400 text-xs font-orbitron tracking-wider">OBSERVATIONS</p>
            {(reagent === "naoh-drop" || reagent === "naoh-excess") && (
              <div className="text-sm font-rajdhani">
                <p className="text-white font-semibold">With NaOH (aq):</p>
                <p className="text-slate-300 text-xs mt-0.5">
                  Drops: {displayIon.naoh.precipitate} —{" "}
                  <span style={{ color: displayIon.naoh.color }}>
                    {displayIon.naoh.description.split(".")[0]}
                  </span>
                </p>
                {reagent === "naoh-excess" && (
                  <p className="text-slate-300 text-xs mt-0.5">
                    Excess: {displayIon.naoh.excessNaOH}
                  </p>
                )}
              </div>
            )}
            {(reagent === "nh3-drop" || reagent === "nh3-excess") && (
              <div className="text-sm font-rajdhani">
                <p className="text-white font-semibold">With NH₃ (aq):</p>
                <p className="text-slate-300 text-xs mt-0.5">
                  Drops: {displayIon.nh3.precipitate} —{" "}
                  <span style={{ color: displayIon.nh3.color }}>
                    {displayIon.nh3.description.split(".")[0]}
                  </span>
                </p>
                {reagent === "nh3-excess" && (
                  <p className="text-slate-300 text-xs mt-0.5">
                    Excess: {displayIon.nh3.excessNH3}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exam answer */}
      {isExamMode && reagent !== "none" && !examSubmitted && (
        <motion.div
          className="border border-red-700/40 rounded p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-white font-rajdhani text-sm font-semibold mb-2">Identify the ion:</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {IONS.map((ion) => (
              <button
                key={ion.id}
                onClick={() => setExamAnswer(ion.id)}
                className={`p-2 rounded border text-sm font-rajdhani transition-all flex items-center gap-2 ${
                  examAnswer === ion.id
                    ? "border-teal bg-teal/20 text-teal"
                    : "border-border text-slate-300 hover:border-slate-500"
                }`}
              >
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: ion.solutionColor }} />
                {ion.symbol} — {ion.name}
              </button>
            ))}
          </div>
          <button
            onClick={handleExamSubmit}
            disabled={!examAnswer}
            className="w-full bg-red-800/50 hover:bg-red-700/60 disabled:opacity-40 text-white font-orbitron text-xs tracking-wider py-2 rounded border border-red-600/50 transition-all"
          >
            SUBMIT IDENTIFICATION
          </button>
        </motion.div>
      )}

      {examSubmitted && (
        <motion.div
          className={`rounded border p-4 ${
            examAnswer === unknownIon.id
              ? "border-green-500/40 bg-green-900/20"
              : "border-red-500/40 bg-red-900/20"
          }`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <p className={`font-orbitron text-sm font-bold mb-2 ${examAnswer === unknownIon.id ? "text-green-400" : "text-red-400"}`}>
            {examAnswer === unknownIon.id ? "✓ CORRECT!" : "✗ INCORRECT"}
          </p>
          <p className="text-white font-rajdhani text-sm">
            The unknown ion was:{" "}
            <strong style={{ color: unknownIon.solutionColor }}>
              {unknownIon.symbol} — {unknownIon.name}
            </strong>
          </p>
          <p className="text-slate-400 text-xs font-rajdhani mt-1">{unknownIon.identificationKey}</p>
        </motion.div>
      )}

      {/* Reference table */}
      <div className="rounded border border-border overflow-hidden">
        <div className="px-3 py-2 bg-navy/30 border-b border-border flex items-center gap-2">
          <p className="text-xs font-orbitron text-slate-400 tracking-wider">REFERENCE TABLE</p>
          <span className="text-slate-600 text-xs font-rajdhani">d-block metal ions</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-rajdhani min-w-[500px]">
            <thead>
              <tr className="border-b border-border bg-navy/20">
                <th className="text-left px-3 py-1.5 text-slate-400">Ion</th>
                <th className="text-left px-3 py-1.5 text-slate-400">+ NaOH (drops)</th>
                <th className="text-left px-3 py-1.5 text-slate-400">+ excess NaOH</th>
                <th className="text-left px-3 py-1.5 text-slate-400">+ NH₃ (drops)</th>
                <th className="text-left px-3 py-1.5 text-slate-400">+ excess NH₃</th>
              </tr>
            </thead>
            <tbody>
              {IONS.map((ion) => (
                <tr key={ion.id} className="border-b border-border/50">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ion.solutionColor }} />
                      <span className="text-white font-bold">{ion.symbol}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-300" style={{ color: ion.naoh.color }}>
                    {ion.naoh.precipitate}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {ion.naoh.excessNaOH.split("—")[0].trim()}
                  </td>
                  <td className="px-3 py-2 text-slate-300" style={{ color: ion.nh3.color }}>
                    {ion.nh3.precipitate}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {ion.nh3.excessNH3.split("—")[0].trim()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
