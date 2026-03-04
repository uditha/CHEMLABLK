"use client";

import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";
import { StepWizard } from "../../StepWizard";
import { CompletionOverlay } from "../../CompletionOverlay";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useSession } from "next-auth/react";
import { saveProgress } from "@/lib/progress";
import type { StepDefinition } from "../../StepWizard";

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
    excessColor: string | null;
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

type Reagent = "none" | "naoh-drop" | "naoh-excess" | "nh3-drop" | "nh3-excess";

// ─── Test Tube SVG ────────────────────────────────────────────────────────────

function AnalysisTube({ baseColor, precipColor, hasPrecip, label }: {
  baseColor: string; precipColor: string | null; hasPrecip: boolean; label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 40 120" width="44" height="130" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id={`at-${label}`}>
            <path d="M8 5 L8 90 Q8 110 20 110 Q32 110 32 90 L32 5 Z" />
          </clipPath>
        </defs>
        <path d="M8 5 L8 90 Q8 110 20 110 Q32 110 32 90 L32 5"
          fill="rgba(200,220,255,0.06)" stroke="#334155" strokeWidth="1.2" />
        <rect x="8" y="30" width="24" height="82" fill={baseColor} clipPath={`url(#at-${label})`} opacity={0.65} />
        {hasPrecip && precipColor && (
          <rect x="8" y="90" width="24" height="22" fill={precipColor} clipPath={`url(#at-${label})`} opacity={0.85} />
        )}
        <rect x="7" y="3" width="26" height="3" fill="#1E293B" rx="1" />
      </svg>
      <p className="text-slate-500 text-xs font-rajdhani text-center leading-tight">{label}</p>
    </div>
  );
}

// ─── Observations Panel ───────────────────────────────────────────────────────

function ObservationsPanel({ observations, testsDone }: { observations: string[]; testsDone: Set<string> }) {
  return (
    <div className="space-y-3">
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
      <div>
        <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1">TESTS DONE</p>
        <p className="text-slate-600 text-xs font-rajdhani">{testsDone.size} reagent actions recorded</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface SaltAnalysisProps {
  onScoreUpdate?: (pts: number) => void;
}

export function SaltAnalysis({ onScoreUpdate }: SaltAnalysisProps) {
  const { addScore, addObservation, setTotalSteps, setStep, score, completeMode, currentMode, resetExperiment } =
    useExperimentStore();
  const { playSuccess } = useSoundEffects();
  const { data: session } = useSession();
  const startTimeRef = useRef(Date.now());
  const [showCompletion, setShowCompletion] = useState(false);

  const [selectedIon, setSelectedIon] = useState<IonData | null>(null);
  const [reagent, setReagent] = useState<Reagent>("none");
  const [unknownIon] = useState<IonData>(IONS[Math.floor(Math.random() * IONS.length)]);
  const isExamMode = currentMode === "Exam";
  const [examAnswer, setExamAnswer] = useState<string>("");
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [testsDone, setTestsDone] = useState<Set<string>>(new Set());
  const [observations, setObservationsLocal] = useState<string[]>([]);
  const [naohTested, setNaohTested] = useState(false);
  const [nh3Tested, setNh3Tested] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => { setTotalSteps(4); }, []);

  const displayIon = isExamMode ? unknownIon : selectedIon;

  function handleReagent(r: Reagent) {
    setReagent(r);
    if (!displayIon) return;

    let obs = "";
    if (r === "naoh-drop") {
      obs = `${displayIon.symbol} + NaOH(aq): ${displayIon.naoh.precipitate} — ${displayIon.naoh.description.split(".")[0]}`;
      setNaohTested(true);
    } else if (r === "naoh-excess") {
      obs = `${displayIon.symbol} + excess NaOH: ${displayIon.naoh.excessNaOH}`;
      setNaohTested(true);
    } else if (r === "nh3-drop") {
      obs = `${displayIon.symbol} + NH₃(aq): ${displayIon.nh3.precipitate} — ${displayIon.nh3.description.split(".")[0]}`;
      setNh3Tested(true);
    } else if (r === "nh3-excess") {
      obs = `${displayIon.symbol} + excess NH₃: ${displayIon.nh3.excessNH3}`;
      setNh3Tested(true);
    }

    if (obs) {
      addObservation(obs);
      setObservationsLocal((prev) => [...prev, obs]);
      if (!testsDone.has(`${displayIon.id}-${r}`)) {
        setTestsDone((prev) => new Set(Array.from(prev).concat(`${displayIon.id}-${r}`)));
        playSuccess();
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
  }

  function handleComplete() {
    completeMode("salt-analysis-d-block", currentMode);
    setShowCompletion(true);
    if (session?.user?.role === "student") {
      const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      saveProgress({ slug: "salt-analysis-d-block", mode: currentMode, score, timeSpentSeconds }).catch(() => {});
    }
  }

  function handleDoAgain() {
    resetExperiment();
    setSelectedIon(null);
    setReagent("none");
    setExamAnswer("");
    setExamSubmitted(false);
    setTestsDone(new Set());
    setObservationsLocal([]);
    setNaohTested(false);
    setNh3Tested(false);
    setStep(0);
    startTimeRef.current = Date.now();
    setShowCompletion(false);
  }

  // Tube data helpers
  const naohTube = (() => {
    if (!displayIon || (reagent !== "naoh-drop" && reagent !== "naoh-excess")) {
      return { base: displayIon?.solutionColor ?? "#CCDDEE", precip: null, hasPrecip: false };
    }
    if (reagent === "naoh-drop") return { base: displayIon.solutionColor, precip: displayIon.naoh.color, hasPrecip: true };
    if (displayIon.naoh.excessColor) return { base: displayIon.naoh.excessColor, precip: null, hasPrecip: false };
    return { base: displayIon.solutionColor, precip: displayIon.naoh.color, hasPrecip: true };
  })();

  const nh3Tube = (() => {
    if (!displayIon || (reagent !== "nh3-drop" && reagent !== "nh3-excess")) {
      return { base: displayIon?.solutionColor ?? "#CCDDEE", precip: null, hasPrecip: false };
    }
    if (reagent === "nh3-drop") return { base: displayIon.solutionColor, precip: displayIon.nh3.color, hasPrecip: true };
    if (displayIon.nh3.excessColor) return { base: displayIon.nh3.excessColor, precip: null, hasPrecip: false };
    return { base: displayIon.solutionColor, precip: displayIon.nh3.color, hasPrecip: true };
  })();

  const referenceTable = (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-3 py-2 bg-navy/30 border-b border-border">
        <p className="text-xs font-orbitron text-slate-400 tracking-wider">REFERENCE TABLE</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-rajdhani min-w-[480px]">
          <thead>
            <tr className="border-b border-border bg-navy/20">
              <th className="text-left px-2 py-1.5 text-slate-400">Ion</th>
              <th className="text-left px-2 py-1.5 text-slate-400">+ NaOH drops</th>
              <th className="text-left px-2 py-1.5 text-slate-400">+ excess NaOH</th>
              <th className="text-left px-2 py-1.5 text-slate-400">+ NH₃ drops</th>
              <th className="text-left px-2 py-1.5 text-slate-400">+ excess NH₃</th>
            </tr>
          </thead>
          <tbody>
            {IONS.map((ion) => (
              <tr key={ion.id} className="border-b border-border/50">
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ion.solutionColor }} />
                    <span className="text-white font-bold">{ion.symbol}</span>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-slate-300">{ion.naoh.precipitate}</td>
                <td className="px-2 py-1.5 text-slate-300">{ion.naoh.excessNaOH.split("—")[0].trim()}</td>
                <td className="px-2 py-1.5 text-slate-300">{ion.nh3.precipitate}</td>
                <td className="px-2 py-1.5 text-slate-300">{ion.nh3.excessNH3.split("—")[0].trim()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── Step Definitions ──────────────────────────────────────────────────────

  const steps: StepDefinition[] = useMemo(() => [
    {
      id: "select",
      title: isExamMode ? "Unknown Ion — Exam" : "Select Ion to Study",
      subtitle: isExamMode ? "Identify the unknown d-block metal ion by testing with reagents." : "Choose a d-block metal ion to investigate.",
      canProceed: isExamMode ? true : selectedIon !== null,
      instructions: {
        procedure: isExamMode
          ? [
              "You have an unknown d-block metal ion solution",
              "Test it with NaOH and NH₃ in the following steps",
              "Record all observations carefully",
              "Use the reference table to identify the ion",
            ]
          : [
              "Select a d-block metal ion from the list",
              "Observe the colour of the solution",
              "Predict what precipitate will form with NaOH and NH₃",
              "Test all five ions to build a complete data set",
            ],
        tips: [
          "The colour of the initial solution can give a first clue",
          "Focus on whether the precipitate dissolves in excess reagent",
        ],
      },
      quiz: {
        question: "Which d-block ion gives an apple-green precipitate with NaOH?",
        options: ["Cu²⁺", "Cr³⁺", "Ni²⁺", "Fe³⁺"],
        correctIndex: 2,
        explanation: "Ni²⁺ forms a characteristic apple-green precipitate of Ni(OH)₂ with NaOH. This ppt dissolves in excess NH₃ to give a blue-violet complex.",
      },
      content: (
        <div className="flex flex-col h-full gap-3 p-4">
          {isExamMode ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-4">
              <div className="bg-red-900/20 border border-red-700/40 rounded-lg p-4 max-w-sm w-full">
                <p className="text-red-300 font-orbitron text-xs tracking-wider mb-2">EXAM MODE</p>
                <p className="text-white font-rajdhani text-sm">
                  An unknown d-block metal ion solution is provided. Use NaOH and NH₃ tests to identify it.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-white/20" style={{ backgroundColor: unknownIon.solutionColor, opacity: 0.8 }} />
                <div>
                  <p className="text-white font-rajdhani text-sm">Unknown solution</p>
                  <p className="text-slate-500 text-xs font-rajdhani">Colour: see above</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-slate-400 text-xs font-orbitron tracking-wider mb-2">SELECT ION TO TEST</p>
              {IONS.map((ion) => (
                <button key={ion.id}
                  onClick={() => { setSelectedIon(ion); setReagent("none"); setNaohTested(false); setNh3Tested(false); }}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    selectedIon?.id === ion.id ? "border-opacity-100" : "border-border hover:border-slate-500"
                  }`}
                  style={{
                    borderColor: selectedIon?.id === ion.id ? ion.solutionColor : undefined,
                    backgroundColor: selectedIon?.id === ion.id ? ion.solutionColor + "15" : undefined,
                  }}>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: ion.solutionColor, opacity: 0.85 }} />
                    <div>
                      <p className="text-white font-orbitron text-sm font-bold">{ion.symbol}</p>
                      <p className="text-slate-400 text-xs font-rajdhani">{ion.name}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ),
      theory: (
        <div className="space-y-2">
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">D-BLOCK IONS</p>
          <p className="text-slate-300 text-xs font-rajdhani leading-relaxed">
            Most d-block metal ions form <span className="text-teal font-semibold">coloured precipitates</span> when treated with NaOH or NH₃.
          </p>
          <p className="text-slate-400 text-xs font-rajdhani leading-relaxed mt-1">
            Some precipitates dissolve in excess reagent — this <span className="text-amber-300">solubility behaviour</span> is the key to identification.
          </p>
        </div>
      ),
    },

    {
      id: "naoh",
      title: "Test with NaOH",
      subtitle: "Add dilute NaOH dropwise, then add in excess.",
      canProceed: naohTested,
      instructions: {
        procedure: [
          "Take a small sample of the metal ion solution in a test tube",
          "Add dilute NaOH dropwise — observe the precipitate that forms",
          "Note the colour of the precipitate",
          "Continue adding NaOH (in excess) — does the precipitate dissolve?",
        ],
        safetyNotes: [
          "NaOH is corrosive — avoid skin and eye contact",
          "Wear gloves and safety goggles",
        ],
        expectedObservations: [
          "A coloured hydroxide precipitate forms on adding drops",
          "Some precipitates dissolve in excess (amphoteric behaviour)",
          "Others remain insoluble",
        ],
        tips: [
          "Amphoteric hydroxides (Zn(OH)₂, Cr(OH)₃, Al(OH)₃) dissolve in excess NaOH",
          "Cu²⁺, Fe³⁺, Ni²⁺ form insoluble hydroxides",
        ],
      },
      quiz: {
        question: "Zn(OH)₂ dissolves in excess NaOH. Why?",
        options: [
          "Zinc is a good reducing agent",
          "Zinc hydroxide is amphoteric — reacts with excess base",
          "The temperature increases the solubility",
          "Zinc forms a complex with chloride ions",
        ],
        correctIndex: 1,
        explanation: "Zn(OH)₂ is amphoteric — it can act as an acid with base: Zn(OH)₂ + 2OH⁻ → [Zn(OH)₄]²⁻. This is a key distinguishing property of zinc in the A/L syllabus.",
      },
      content: (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
          {displayIon ? (
            <>
              <div className="flex items-end justify-center gap-6">
                <AnalysisTube baseColor={displayIon.solutionColor} precipColor={null} hasPrecip={false} label="Original" />
                <AnalysisTube baseColor={naohTube.base} precipColor={naohTube.precip} hasPrecip={naohTube.hasPrecip} label="+ NaOH" />
              </div>

              <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                {(["naoh-drop", "naoh-excess"] as Reagent[]).map((r) => (
                  <button key={r} onClick={() => handleReagent(r)}
                    className={`px-3 py-2.5 rounded-lg border text-xs font-rajdhani font-semibold transition-all ${
                      reagent === r ? "border-teal/50 bg-teal/20 text-teal" : "border-border text-slate-300 hover:border-slate-500"
                    }`}>
                    {r === "naoh-drop" ? "Add NaOH (drops)" : "Add excess NaOH"}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {(reagent === "naoh-drop" || reagent === "naoh-excess") && (
                  <motion.div className="bg-navy/40 border border-border rounded-lg p-3 w-full max-w-xs text-xs font-rajdhani"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <p className="text-white font-semibold mb-1">Observation:</p>
                    <p className="text-slate-300">{displayIon.naoh.precipitate} — {displayIon.naoh.description.split(".")[0]}</p>
                    {reagent === "naoh-excess" && (
                      <p className="text-slate-400 mt-1">Excess: {displayIon.naoh.excessNaOH}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <p className="text-slate-600 font-rajdhani">Go back and select an ion first.</p>
          )}
        </div>
      ),
      theory: displayIon ? (
        <div className="space-y-2">
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1">WITH NaOH</p>
          <p className="text-white text-sm font-rajdhani font-semibold">{displayIon.symbol}</p>
          <p className="text-slate-300 text-xs font-rajdhani">Drop: {displayIon.naoh.precipitate}</p>
          <p className="text-slate-400 text-xs font-rajdhani">{displayIon.naoh.description}</p>
        </div>
      ) : (
        <p className="text-slate-600 text-xs font-rajdhani">Select an ion to see theory.</p>
      ),
    },

    {
      id: "nh3",
      title: "Test with NH₃",
      subtitle: "Repeat with a fresh sample — add dilute NH₃, then excess.",
      canProceed: nh3Tested,
      instructions: {
        procedure: [
          "Take a fresh sample of the metal ion solution in a clean test tube",
          "Add dilute aqueous ammonia (NH₃) dropwise",
          "Note the colour of the precipitate — compare with the NaOH result",
          "Continue adding NH₃ in excess — observe if the precipitate dissolves",
        ],
        safetyNotes: [
          "Ammonia has a pungent smell — work in a fume cupboard",
          "Avoid direct inhalation",
        ],
        expectedObservations: [
          "Similar precipitate to NaOH initially",
          "Key difference: Cu²⁺ and Ni²⁺ dissolve in excess NH₃ (complex ion formation)",
          "Cr³⁺ does NOT dissolve in excess NH₃ (unlike with excess NaOH)",
        ],
        tips: [
          "The key distinction between NaOH and NH₃ behaviour identifies the ion",
          "Cr³⁺ dissolves in excess NaOH but NOT excess NH₃ — this is diagnostic",
        ],
      },
      quiz: {
        question: "Cu(OH)₂ dissolves in excess NH₃ to give a deep blue solution. What is this solution?",
        options: [
          "CuO in water",
          "Cu(NO₃)₂",
          "[Cu(NH₃)₄]²⁺ — tetraamminecopper(II)",
          "Cu₂O complex",
        ],
        correctIndex: 2,
        explanation: "[Cu(NH₃)₄]²⁺ is tetraamminecopper(II) — a deep blue square planar complex. It is also called Schweizer's reagent and can dissolve cellulose.",
      },
      content: (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
          {displayIon ? (
            <>
              <div className="flex items-end justify-center gap-6">
                <AnalysisTube baseColor={displayIon.solutionColor} precipColor={null} hasPrecip={false} label="Original" />
                <AnalysisTube baseColor={nh3Tube.base} precipColor={nh3Tube.precip} hasPrecip={nh3Tube.hasPrecip} label="+ NH₃" />
              </div>

              <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                {(["nh3-drop", "nh3-excess"] as Reagent[]).map((r) => (
                  <button key={r} onClick={() => handleReagent(r)}
                    className={`px-3 py-2.5 rounded-lg border text-xs font-rajdhani font-semibold transition-all ${
                      reagent === r ? "border-teal/50 bg-teal/20 text-teal" : "border-border text-slate-300 hover:border-slate-500"
                    }`}>
                    {r === "nh3-drop" ? "Add NH₃ (drops)" : "Add excess NH₃"}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {(reagent === "nh3-drop" || reagent === "nh3-excess") && (
                  <motion.div className="bg-navy/40 border border-border rounded-lg p-3 w-full max-w-xs text-xs font-rajdhani"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <p className="text-white font-semibold mb-1">Observation:</p>
                    <p className="text-slate-300">{displayIon.nh3.precipitate} — {displayIon.nh3.description.split(".")[0]}</p>
                    {reagent === "nh3-excess" && (
                      <p className="text-slate-400 mt-1">Excess: {displayIon.nh3.excessNH3}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <p className="text-slate-600 font-rajdhani">Go back and select an ion first.</p>
          )}
        </div>
      ),
      theory: displayIon ? (
        <div className="space-y-2">
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1">WITH NH₃</p>
          <p className="text-white text-sm font-rajdhani font-semibold">{displayIon.symbol}</p>
          <p className="text-slate-300 text-xs font-rajdhani">Drop: {displayIon.nh3.precipitate}</p>
          <p className="text-slate-400 text-xs font-rajdhani">{displayIon.nh3.description}</p>
          {naohTested && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-xs text-amber-300 font-rajdhani font-semibold">Key difference from NaOH:</p>
              <p className="text-xs text-slate-400 font-rajdhani">
                NaOH excess: {displayIon.naoh.excessNaOH.split("—")[0].trim()}
              </p>
              <p className="text-xs text-slate-400 font-rajdhani">
                NH₃ excess: {displayIon.nh3.excessNH3.split("—")[0].trim()}
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-slate-600 text-xs font-rajdhani">Select an ion to see theory.</p>
      ),
    },

    {
      id: "conclude",
      title: "Identify & Conclude",
      subtitle: "Use the reference table to identify the ion.",
      canProceed: true,
      instructions: {
        procedure: [
          "Review your observations from both NaOH and NH₃ tests",
          "Use the reference table to match the pattern",
          isExamMode ? "Submit your identification of the unknown ion" : "Test remaining ions to complete the data set",
          "Understand the identification key for each ion",
        ],
        tips: [
          "Focus on two key differences: (1) colour of precipitate, (2) solubility in excess",
          "The combination of NaOH and NH₃ behaviour uniquely identifies each ion",
        ],
      },
      content: (
        <div className="flex flex-col h-full gap-3 p-4 overflow-y-auto">
          {referenceTable}

          {isExamMode && !examSubmitted && naohTested && nh3Tested && (
            <motion.div className="border border-red-700/40 rounded-lg p-3"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-white font-rajdhani text-sm font-semibold mb-2">Identify the unknown ion:</p>
              <div className="grid grid-cols-1 gap-2 mb-3">
                {IONS.map((ion) => (
                  <button key={ion.id}
                    onClick={() => setExamAnswer(ion.id)}
                    className={`p-2 rounded-lg border text-sm font-rajdhani transition-all flex items-center gap-2 ${
                      examAnswer === ion.id ? "border-teal bg-teal/20 text-teal" : "border-border text-slate-300 hover:border-slate-500"
                    }`}>
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: ion.solutionColor }} />
                    {ion.symbol} — {ion.name}
                  </button>
                ))}
              </div>
              <button onClick={handleExamSubmit} disabled={!examAnswer}
                className="w-full bg-red-800/50 hover:bg-red-700/60 disabled:opacity-40 text-white font-orbitron text-xs tracking-wider py-2 rounded-lg border border-red-600/50 transition-all">
                SUBMIT IDENTIFICATION
              </button>
            </motion.div>
          )}

          {examSubmitted && (
            <motion.div
              className={`rounded-lg border p-4 ${examAnswer === unknownIon.id ? "border-green-500/40 bg-green-900/20" : "border-red-500/40 bg-red-900/20"}`}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <p className={`font-orbitron text-sm font-bold mb-2 ${examAnswer === unknownIon.id ? "text-green-400" : "text-red-400"}`}>
                {examAnswer === unknownIon.id ? "✓ CORRECT!" : "✗ INCORRECT"}
              </p>
              <p className="text-white font-rajdhani text-sm">
                Unknown ion: <strong style={{ color: unknownIon.solutionColor }}>{unknownIon.symbol} — {unknownIon.name}</strong>
              </p>
              <p className="text-slate-400 text-xs font-rajdhani mt-1">{unknownIon.identificationKey}</p>
            </motion.div>
          )}

          {!isExamMode && displayIon && (
            <div className="bg-teal/5 border border-teal/20 rounded-lg p-3 text-xs font-rajdhani">
              <p className="text-teal font-semibold mb-1">Identification key for {displayIon.symbol}:</p>
              <p className="text-slate-300">{displayIon.identificationKey}</p>
            </div>
          )}
        </div>
      ),
      theory: (
        <div className="space-y-2">
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1">IDENTIFICATION STRATEGY</p>
          <div className="space-y-1.5 text-xs font-rajdhani">
            {IONS.map((ion) => (
              <div key={ion.id} className="flex gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: ion.solutionColor }} />
                <div>
                  <span className="text-white font-semibold">{ion.symbol}:</span>
                  <span className="text-slate-400 ml-1">{ion.identificationKey}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ], [isExamMode, selectedIon, naohTested, nh3Tested, reagent, displayIon, naohTube, nh3Tube, examAnswer, examSubmitted, unknownIon, referenceTable]);

  const persistentNotes = useMemo(() => (
    <ObservationsPanel observations={observations} testsDone={testsDone} />
  ), [observations, testsDone]);

  const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

  return (
    <>
      <StepWizard
        steps={steps}
        persistentNotes={persistentNotes}
        experimentTitle="Salt Analysis — d-Block Metal Ions"
        onComplete={handleComplete}
      />
      {showCompletion && (
        <CompletionOverlay
          experimentTitle="Salt Analysis — d-Block Metal Ions"
          score={score}
          maxScore={100}
          itemsTested={testsDone.size}
          totalItems={IONS.length * 4}
          timeSpentSeconds={timeSpentSeconds}
          onDoAgain={handleDoAgain}
        />
      )}
    </>
  );
}
