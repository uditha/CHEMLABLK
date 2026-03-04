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

type IonId = "cu2" | "zn2";
type Reagent = "naoh-drop" | "naoh-excess" | "nh3-drop" | "nh3-excess";

interface TestResult {
  ion: IonId; reagent: Reagent;
  precipitate: string; color: string;
  dissolves: boolean; finalColor: string;
  description: string;
}

const RESULTS: Record<IonId, Record<Reagent, TestResult>> = {
  cu2: {
    "naoh-drop": { ion: "cu2", reagent: "naoh-drop", precipitate: "Cu(OH)₂↓", color: "#6DB6E8", dissolves: false, finalColor: "#6DB6E8", description: "Pale blue precipitate of copper(II) hydroxide forms." },
    "naoh-excess": { ion: "cu2", reagent: "naoh-excess", precipitate: "Cu(OH)₂↓ (insoluble)", color: "#6DB6E8", dissolves: false, finalColor: "#6DB6E8", description: "Precipitate does NOT dissolve in excess NaOH — Cu(OH)₂ is not amphoteric." },
    "nh3-drop": { ion: "cu2", reagent: "nh3-drop", precipitate: "Cu(OH)₂↓", color: "#6DB6E8", dissolves: false, finalColor: "#6DB6E8", description: "Pale blue Cu(OH)₂ precipitate forms." },
    "nh3-excess": { ion: "cu2", reagent: "nh3-excess", precipitate: "Cu(OH)₂ dissolves", color: "#0D47A1", dissolves: true, finalColor: "#0D47A1", description: "Precipitate dissolves in excess NH₃ to form deep blue [Cu(NH₃)₄]²⁺ — Schweizer's reagent." },
  },
  zn2: {
    "naoh-drop": { ion: "zn2", reagent: "naoh-drop", precipitate: "Zn(OH)₂↓", color: "#EEEEEE", dissolves: false, finalColor: "#EEEEEE", description: "White gelatinous precipitate of zinc hydroxide forms." },
    "naoh-excess": { ion: "zn2", reagent: "naoh-excess", precipitate: "Zn(OH)₂ dissolves", color: "#E8F4FD", dissolves: true, finalColor: "#E8F4FD", description: "Precipitate dissolves in excess NaOH (amphoteric): Zn(OH)₂ + 2OH⁻ → [Zn(OH)₄]²⁻" },
    "nh3-drop": { ion: "zn2", reagent: "nh3-drop", precipitate: "Zn(OH)₂↓", color: "#EEEEEE", dissolves: false, finalColor: "#EEEEEE", description: "White Zn(OH)₂ precipitate forms." },
    "nh3-excess": { ion: "zn2", reagent: "nh3-excess", precipitate: "Zn(OH)₂ dissolves", color: "#F0F8FF", dissolves: true, finalColor: "#F0F8FF", description: "Dissolves in excess NH₃ to give colourless [Zn(NH₃)₄]²⁺ complex." },
  },
};

// ─── Test tube SVG ────────────────────────────────────────────────────────────

function TestTube({ solutionColor, precipColor, hasPrecip, label }: {
  solutionColor: string; precipColor: string | null; hasPrecip: boolean; label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 44 130" width="50" height="140" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id={`cz-${label}`}>
            <path d="M10 8 L10 100 Q10 120 22 120 Q34 120 34 100 L34 8 Z" />
          </clipPath>
        </defs>
        <path d="M10 8 L10 100 Q10 120 22 120 Q34 120 34 100 L34 8"
          fill="rgba(200,220,255,0.06)" stroke="#334155" strokeWidth="1.5" />
        <rect x="10" y="40" width="24" height="82" fill={solutionColor} clipPath={`url(#cz-${label})`} opacity={0.65} />
        {hasPrecip && precipColor && (
          <rect x="10" y="100" width="24" height="22" fill={precipColor} clipPath={`url(#cz-${label})`} opacity={0.85} />
        )}
        <rect x="9" y="6" width="26" height="4" fill="#1E293B" rx="1.5" />
      </svg>
      <p className="text-slate-500 text-xs font-rajdhani text-center">{label}</p>
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
          <p className="text-slate-600 text-xs font-rajdhani">No tests performed yet.</p>
        ) : (
          <div className="space-y-1.5">
            {observations.map((obs, i) => (
              <div key={i} className="text-xs font-rajdhani text-slate-300 bg-navy/30 rounded p-2 border border-border/50">{obs}</div>
            ))}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1">TESTS COMPLETE</p>
        <p className="text-slate-600 text-xs font-rajdhani">{testsDone.size} / 8 combinations tested</p>
        <div className="grid grid-cols-4 gap-0.5 mt-1">
          {(["cu2", "zn2"] as IonId[]).flatMap((ion) =>
            (["naoh-drop", "naoh-excess", "nh3-drop", "nh3-excess"] as Reagent[]).map((r) => (
              <div key={`${ion}-${r}`}
                className={`h-2 rounded-sm ${testsDone.has(`${ion}-${r}`) ? "bg-teal" : "bg-border/30"}`}
                title={`${ion} ${r}`} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface CuZnNaOHProps {
  onScoreUpdate?: (pts: number) => void;
}

export function CuZnNaOH({ onScoreUpdate }: CuZnNaOHProps) {
  const { addScore, addObservation, setTotalSteps, setStep, score, completeMode, currentMode, resetExperiment } =
    useExperimentStore();
  const { playSuccess } = useSoundEffects();
  const { data: session } = useSession();
  const startTimeRef = useRef(Date.now());
  const [showCompletion, setShowCompletion] = useState(false);

  const [selectedIon, setSelectedIon] = useState<IonId | null>(null);
  const [reagent, setReagent] = useState<Reagent | null>(null);
  const [testsDone, setTestsDone] = useState<Set<string>>(new Set());
  const [observations, setObservationsLocal] = useState<string[]>([]);
  const [naohDone, setNaohDone] = useState(false);
  const [nh3Done, setNh3Done] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => { setTotalSteps(4); }, []);

  const result = selectedIon && reagent ? RESULTS[selectedIon][reagent] : null;

  function handleTest(ion: IonId, r: Reagent) {
    setSelectedIon(ion);
    setReagent(r);
    const key = `${ion}-${r}`;
    if (!testsDone.has(key)) {
      setTestsDone((prev) => new Set(Array.from(prev).concat(key)));
      const res = RESULTS[ion][r];
      const obs = `${ion === "cu2" ? "Cu²⁺" : "Zn²⁺"} + ${r.replace(/-/g, " ")}: ${res.description}`;
      addObservation(obs);
      setObservationsLocal((prev) => [...prev, obs]);
      playSuccess();
      addScore(10);
      onScoreUpdate?.(10);
    }
    if (r.startsWith("naoh")) setNaohDone(true);
    if (r.startsWith("nh3")) setNh3Done(true);
  }

  const cuTube = {
    solution: selectedIon === "cu2" && reagent ? (result?.dissolves ? result.finalColor : "#6DB6E8") : "#6DB6E8",
    precip: selectedIon === "cu2" && reagent && !result?.dissolves ? result?.color ?? null : null,
    hasPrecip: selectedIon === "cu2" && !!reagent && !!result && !result.dissolves,
  };

  const znTube = {
    solution: selectedIon === "zn2" && reagent ? (result?.dissolves ? result.finalColor : "#F0F0F0") : "#F0F0F0",
    precip: selectedIon === "zn2" && reagent && !result?.dissolves ? result?.color ?? null : null,
    hasPrecip: selectedIon === "zn2" && !!reagent && !!result && !result.dissolves,
  };

  function handleComplete() {
    completeMode("cu2-zn2-naoh-nh3", currentMode);
    setShowCompletion(true);
    if (session?.user?.role === "student") {
      const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      saveProgress({ slug: "cu2-zn2-naoh-nh3", mode: currentMode, score, timeSpentSeconds }).catch(() => {});
    }
  }

  function handleDoAgain() {
    resetExperiment();
    setSelectedIon(null);
    setReagent(null);
    setTestsDone(new Set());
    setObservationsLocal([]);
    setNaohDone(false);
    setNh3Done(false);
    setStep(0);
    startTimeRef.current = Date.now();
    setShowCompletion(false);
  }

  const testGrid = (reagents: Reagent[]) => (
    <table className="w-full text-xs font-rajdhani">
      <thead>
        <tr className="border-b border-border">
          <th className="text-left px-3 py-2 text-slate-400">Reagent</th>
          <th className="px-3 py-2 text-blue-300">Cu²⁺</th>
          <th className="px-3 py-2 text-slate-300">Zn²⁺</th>
        </tr>
      </thead>
      <tbody>
        {reagents.map((r) => (
          <tr key={r} className="border-b border-border/50">
            <td className="px-3 py-2 text-slate-400 font-semibold">
              {r === "naoh-drop" && "NaOH (drops)"}
              {r === "naoh-excess" && "Excess NaOH"}
              {r === "nh3-drop" && "NH₃ (drops)"}
              {r === "nh3-excess" && "Excess NH₃"}
            </td>
            {(["cu2", "zn2"] as IonId[]).map((ion) => {
              const done = testsDone.has(`${ion}-${r}`);
              const res = RESULTS[ion][r];
              return (
                <td key={ion} className="px-3 py-2 text-center">
                  <button onClick={() => handleTest(ion, r)}
                    className={`px-2 py-1.5 rounded-lg border text-xs transition-all ${
                      selectedIon === ion && reagent === r
                        ? "border-teal/50 bg-teal/20 text-teal"
                        : done
                        ? "border-green-700/30 bg-green-900/10 text-green-400"
                        : "border-border hover:border-slate-500 text-slate-300"
                    }`}>
                    {done
                      ? <span style={{ color: res.color }}>{res.dissolves ? "✓ dissolves" : `● ${res.precipitate.split("↓")[0].trim()}`}</span>
                      : "Test →"}
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );

  // ─── Step Definitions ──────────────────────────────────────────────────────

  const steps: StepDefinition[] = useMemo(() => [
    {
      id: "prepare",
      title: "Prepare Ion Solutions",
      subtitle: "Set up dilute CuSO₄ and ZnSO₄ solutions in separate test tubes.",
      canProceed: true,
      instructions: {
        procedure: [
          "Prepare dilute CuSO₄ solution (~0.1 M) — observe the pale blue colour",
          "Prepare dilute ZnSO₄ solution (~0.1 M) — nearly colourless",
          "Label test tubes clearly: Cu²⁺ and Zn²⁺",
          "This experiment distinguishes Cu²⁺ from Zn²⁺ using NaOH and NH₃",
        ],
        tips: [
          "The blue colour of Cu²⁺ solution is a first clue to its identity",
          "Zn²⁺ solutions are colourless — the precipitate colour is the key observation",
        ],
      },
      quiz: {
        question: "What colour is a dilute CuSO₄ solution?",
        options: ["Colourless", "Pale blue", "Green", "Yellow"],
        correctIndex: 1,
        explanation: "Cu²⁺ ions absorb red/orange light and transmit blue light. This gives CuSO₄ solutions their characteristic pale blue colour due to the [Cu(H₂O)₆]²⁺ complex.",
      },
      content: (
        <div className="flex flex-col items-center justify-center h-full gap-6 p-4">
          <div className="flex items-end justify-center gap-12">
            <TestTube solutionColor="#6DB6E8" precipColor={null} hasPrecip={false} label="Cu²⁺ (CuSO₄)" />
            <TestTube solutionColor="#F0F0F0" precipColor={null} hasPrecip={false} label="Zn²⁺ (ZnSO₄)" />
          </div>
          <p className="text-slate-400 text-sm font-rajdhani text-center max-w-xs">
            Cu²⁺ solution is pale blue; Zn²⁺ is nearly colourless. Both will be tested with NaOH and NH₃.
          </p>
        </div>
      ),
      theory: (
        <div className="space-y-2">
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">OBJECTIVE</p>
          <p className="text-slate-300 text-xs font-rajdhani leading-relaxed">
            Both Cu²⁺ and Zn²⁺ form precipitates with NaOH and NH₃. The key differences are:
          </p>
          <ul className="space-y-1 text-xs font-rajdhani text-slate-400 list-disc list-inside">
            <li>Solubility in <span className="text-teal">excess NaOH</span></li>
            <li>Colour of complex in <span className="text-indigo-300">excess NH₃</span></li>
          </ul>
        </div>
      ),
    },

    {
      id: "naoh",
      title: "Test with NaOH",
      subtitle: "Add NaOH dropwise and then in excess to both ion solutions.",
      canProceed: naohDone,
      instructions: {
        procedure: [
          "Add dilute NaOH dropwise to the Cu²⁺ solution — record the precipitate colour",
          "Add dilute NaOH dropwise to the Zn²⁺ solution — record the precipitate colour",
          "Continue adding NaOH in excess to both — observe if the precipitate dissolves",
          "Record the key difference: Zn(OH)₂ dissolves (amphoteric), Cu(OH)₂ does not",
        ],
        safetyNotes: [
          "NaOH is corrosive — wear gloves and goggles",
          "Add dropwise using a pipette for controlled addition",
        ],
        expectedObservations: [
          "Cu²⁺ + NaOH: pale blue Cu(OH)₂ precipitate — insoluble in excess",
          "Zn²⁺ + NaOH: white Zn(OH)₂ precipitate — dissolves in excess (amphoteric)",
        ],
        tips: [
          "Amphoteric Zn(OH)₂ reacts with excess OH⁻: Zn(OH)₂ + 2OH⁻ → [Zn(OH)₄]²⁻",
          "Cu(OH)₂ is NOT amphoteric — it remains as a precipitate",
        ],
      },
      quiz: {
        question: "What happens when excess NaOH is added to Zn(OH)₂?",
        options: [
          "It remains as a white precipitate",
          "It turns blue",
          "It dissolves to form [Zn(OH)₄]²⁻",
          "It reacts to form ZnO",
        ],
        correctIndex: 2,
        explanation: "Zn(OH)₂ is amphoteric — it can act as an acid with excess base: Zn(OH)₂ + 2OH⁻ → [Zn(OH)₄]²⁻ (tetrahydroxozincate). This is a key distinction from Cu(OH)₂.",
      },
      content: (
        <div className="flex flex-col gap-4 p-4 h-full">
          <div className="flex items-end justify-center gap-8">
            <TestTube solutionColor={cuTube.solution} precipColor={cuTube.precip} hasPrecip={cuTube.hasPrecip} label="Cu²⁺" />
            <TestTube solutionColor={znTube.solution} precipColor={znTube.precip} hasPrecip={znTube.hasPrecip} label="Zn²⁺" />
          </div>

          {testGrid(["naoh-drop", "naoh-excess"])}

          <AnimatePresence>
            {result && (reagent === "naoh-drop" || reagent === "naoh-excess") && (
              <motion.div className="bg-navy/40 border border-border rounded-lg p-3 text-xs font-rajdhani"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <p className="text-white font-semibold mb-1">{selectedIon === "cu2" ? "Cu²⁺" : "Zn²⁺"} + {reagent?.replace(/-/g, " ")}</p>
                <p className="text-slate-300">{result.description}</p>
                {result.dissolves && <p className="text-teal mt-1">✓ Precipitate dissolves → complex ion forms</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ),
      theory: (
        <div className="space-y-2">
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1">WITH NaOH</p>
          <div className="space-y-2 text-xs font-rajdhani">
            <div>
              <p className="text-blue-300 font-semibold">Cu²⁺:</p>
              <p className="text-slate-400">Cu(OH)₂ — pale blue, insoluble in excess</p>
            </div>
            <div>
              <p className="text-slate-200 font-semibold">Zn²⁺:</p>
              <p className="text-slate-400">Zn(OH)₂ — white, dissolves in excess</p>
              <p className="text-teal text-xs font-mono mt-0.5">Zn(OH)₂ + 2OH⁻ → [Zn(OH)₄]²⁻</p>
            </div>
          </div>
        </div>
      ),
    },

    {
      id: "nh3",
      title: "Test with NH₃",
      subtitle: "Repeat with fresh samples — add dilute NH₃, then excess.",
      canProceed: nh3Done,
      instructions: {
        procedure: [
          "Use fresh samples of Cu²⁺ and Zn²⁺ solutions",
          "Add dilute NH₃ dropwise to both — observe the precipitate",
          "Continue adding NH₃ in excess — observe which dissolves and note colour",
          "Record the crucial difference: Cu²⁺ gives deep blue complex with excess NH₃",
        ],
        expectedObservations: [
          "Cu²⁺ + excess NH₃: deep blue [Cu(NH₃)₄]²⁺ (tetraamminecopper)",
          "Zn²⁺ + excess NH₃: colourless [Zn(NH₃)₄]²⁺ (tetraamminezinc)",
        ],
        tips: [
          "The deep blue colour of [Cu(NH₃)₄]²⁺ is unmistakable — this is Schweizer's reagent",
          "Both Cu²⁺ and Zn²⁺ form complex ions with excess NH₃ — but very different colours",
        ],
      },
      quiz: {
        question: "What is the name of the deep blue complex formed when Cu(OH)₂ dissolves in excess NH₃?",
        options: [
          "Copper(II) hydroxide",
          "Tetraamminecopper(II) — [Cu(NH₃)₄]²⁺",
          "Copper(II) nitrate",
          "Hexaamminecopper(II)",
        ],
        correctIndex: 1,
        explanation: "[Cu(NH₃)₄]²⁺ is tetraamminecopper(II) — a square planar complex with intense deep blue colour. It is called Schweizer's reagent and can dissolve cotton (cellulose).",
      },
      content: (
        <div className="flex flex-col gap-4 p-4 h-full">
          <div className="flex items-end justify-center gap-8">
            <TestTube solutionColor={cuTube.solution} precipColor={cuTube.precip} hasPrecip={cuTube.hasPrecip} label="Cu²⁺" />
            <TestTube solutionColor={znTube.solution} precipColor={znTube.precip} hasPrecip={znTube.hasPrecip} label="Zn²⁺" />
          </div>

          {testGrid(["nh3-drop", "nh3-excess"])}

          <AnimatePresence>
            {result && (reagent === "nh3-drop" || reagent === "nh3-excess") && (
              <motion.div className="bg-navy/40 border border-border rounded-lg p-3 text-xs font-rajdhani"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <p className="text-white font-semibold mb-1">{selectedIon === "cu2" ? "Cu²⁺" : "Zn²⁺"} + {reagent?.replace(/-/g, " ")}</p>
                <p className="text-slate-300">{result.description}</p>
                {result.dissolves && <p className="text-teal mt-1">✓ Precipitate dissolves → complex ion forms</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ),
      theory: (
        <div className="space-y-2">
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1">WITH NH₃</p>
          <div className="space-y-2 text-xs font-rajdhani">
            <div>
              <p className="text-blue-300 font-semibold">Cu²⁺:</p>
              <p className="text-slate-400">Excess NH₃: deep blue [Cu(NH₃)₄]²⁺</p>
            </div>
            <div>
              <p className="text-slate-200 font-semibold">Zn²⁺:</p>
              <p className="text-slate-400">Excess NH₃: colourless [Zn(NH₃)₄]²⁺</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-rajdhani mt-2">
            Both dissolve, but the colour difference is diagnostic.
          </p>
        </div>
      ),
    },

    {
      id: "compare",
      title: "Compare & Identify",
      subtitle: "Review the full comparison table for Cu²⁺ vs Zn²⁺.",
      canProceed: true,
      instructions: {
        procedure: [
          "Review the summary table comparing all four tests",
          "Identify the two key diagnostic tests: excess NaOH and excess NH₃",
          "Note the colour difference in excess NH₃ between the two ions",
        ],
        tips: [
          "Cu²⁺: excess NaOH → stays blue (insoluble); excess NH₃ → deep blue",
          "Zn²⁺: excess NaOH → dissolves (amphoteric); excess NH₃ → colourless complex",
        ],
      },
      content: (
        <div className="flex flex-col h-full gap-3 p-4 overflow-y-auto">
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-3 py-2 bg-navy/30 border-b border-border">
              <p className="text-xs font-orbitron text-slate-400 tracking-wider">COMPARISON TABLE</p>
            </div>
            <table className="w-full text-xs font-rajdhani">
              <thead>
                <tr className="border-b border-border bg-navy/20">
                  <th className="text-left px-3 py-2 text-slate-400">Test</th>
                  <th className="px-3 py-2 text-blue-300">Cu²⁺</th>
                  <th className="px-3 py-2 text-slate-300">Zn²⁺</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="px-3 py-2 text-slate-400">+ NaOH drops</td>
                  <td className="px-3 py-2 text-center text-blue-300">Pale blue Cu(OH)₂↓</td>
                  <td className="px-3 py-2 text-center text-slate-300">White Zn(OH)₂↓</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="px-3 py-2 text-slate-400">+ excess NaOH</td>
                  <td className="px-3 py-2 text-center text-red-400">Insoluble ✗</td>
                  <td className="px-3 py-2 text-center text-teal">Dissolves ✓ (amphoteric)</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="px-3 py-2 text-slate-400">+ NH₃ drops</td>
                  <td className="px-3 py-2 text-center text-blue-300">Pale blue Cu(OH)₂↓</td>
                  <td className="px-3 py-2 text-center text-slate-300">White Zn(OH)₂↓</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-slate-400">+ excess NH₃</td>
                  <td className="px-3 py-2 text-center text-indigo-300">Deep blue [Cu(NH₃)₄]²⁺</td>
                  <td className="px-3 py-2 text-center text-slate-300">Colourless [Zn(NH₃)₄]²⁺</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="bg-teal/5 border border-teal/20 rounded-lg p-3 text-xs font-rajdhani">
            <p className="text-teal font-semibold mb-1">Key Diagnostic Tests:</p>
            <p className="text-slate-300">1. Excess NaOH: only Zn²⁺ dissolves (amphoteric behaviour)</p>
            <p className="text-slate-300 mt-0.5">2. Excess NH₃: Cu²⁺ gives deep blue; Zn²⁺ gives colourless</p>
          </div>
        </div>
      ),
      theory: (
        <div className="space-y-2">
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1">KEY TAKEAWAY</p>
          <p className="text-slate-300 text-xs font-rajdhani leading-relaxed">
            Zn(OH)₂ is <span className="text-teal font-semibold">amphoteric</span> — dissolves in both excess acid and base.
          </p>
          <p className="text-slate-300 text-xs font-rajdhani leading-relaxed mt-1">
            [Cu(NH₃)₄]²⁺ is <span className="text-indigo-300 font-semibold">deep blue</span> — instantly recognisable.
          </p>
          <p className="text-slate-400 text-xs font-mono mt-2">
            Cu(OH)₂ + 4NH₃ → [Cu(NH₃)₄]²⁺ + 2OH⁻
          </p>
        </div>
      ),
    },
  ], [naohDone, nh3Done, selectedIon, reagent, result, cuTube, znTube]);

  const persistentNotes = useMemo(() => (
    <ObservationsPanel observations={observations} testsDone={testsDone} />
  ), [observations, testsDone]);

  const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

  return (
    <>
      <StepWizard
        steps={steps}
        persistentNotes={persistentNotes}
        experimentTitle="Cu²⁺ vs Zn²⁺ — NaOH and NH₃ Tests"
        onComplete={handleComplete}
      />
      {showCompletion && (
        <CompletionOverlay
          experimentTitle="Cu²⁺ vs Zn²⁺ — NaOH and NH₃ Tests"
          score={score}
          maxScore={80}
          itemsTested={testsDone.size}
          totalItems={8}
          timeSpentSeconds={timeSpentSeconds}
          onDoAgain={handleDoAgain}
        />
      )}
    </>
  );
}
