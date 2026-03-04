"use client";

import { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";
import { StepWizard } from "../../StepWizard";
import { CompletionOverlay } from "../../CompletionOverlay";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useSession } from "next-auth/react";
import { saveProgress } from "@/lib/progress";
import type { StepDefinition } from "../../StepWizard";

// ─── Lucas Test data ──────────────────────────────────────────────────────────
// Lucas reagent = ZnCl₂ + conc. HCl
// 3° → turbidity immediately (SN1, stable 3° carbocation)
// 2° → turbidity in 5 min (SN1, slower)
// 1° → no reaction at RT (SN2 too slow without heat)

interface Alcohol {
  id: string;
  name: string;
  formula: string;
  type: "primary" | "secondary" | "tertiary";
  result: "immediate" | "5min" | "none";
  reactionTime: number;
  mechanism: string;
  color: string;
}

const ALCOHOLS: Alcohol[] = [
  {
    id: "2-methylpropan-2-ol",
    name: "2-Methylpropan-2-ol",
    formula: "(CH₃)₃COH",
    type: "tertiary",
    result: "immediate",
    reactionTime: 3,
    mechanism: "SN1 — tertiary carbocation (CH₃)₃C⁺ forms instantly. Very stable.",
    color: "#EF4444",
  },
  {
    id: "2-butanol",
    name: "Butan-2-ol",
    formula: "CH₃CH(OH)CH₂CH₃",
    type: "secondary",
    result: "5min",
    reactionTime: 15,
    mechanism: "SN1 — secondary carbocation forms, but slower than 3°.",
    color: "#F59E0B",
  },
  {
    id: "cyclohexanol",
    name: "Cyclohexanol",
    formula: "C₆H₁₁OH",
    type: "secondary",
    result: "5min",
    reactionTime: 18,
    mechanism: "SN1 — secondary cyclic carbocation; moderate rate.",
    color: "#F97316",
  },
  {
    id: "1-butanol",
    name: "Butan-1-ol",
    formula: "CH₃CH₂CH₂CH₂OH",
    type: "primary",
    result: "none",
    reactionTime: Infinity,
    mechanism: "SN2 only — primary carbocation too unstable. No turbidity at RT.",
    color: "#64748B",
  },
  {
    id: "ethanol",
    name: "Ethanol",
    formula: "CH₃CH₂OH",
    type: "primary",
    result: "none",
    reactionTime: Infinity,
    mechanism: "Primary alcohol — no reaction with Lucas reagent at room temperature.",
    color: "#64748B",
  },
];

// ─── Test tube ────────────────────────────────────────────────────────────────

function LucasTube({ turbidity, label }: { turbidity: number; label: string }) {
  const clearColor = `rgba(240, 248, 255, ${0.3 + turbidity * 0.4})`;
  const turbidColor = `rgba(220, 210, 180, ${turbidity * 0.8})`;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 40 130" width="46" height="145" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id={`lt-${label}`}>
            <path d="M8 5 L8 95 Q8 115 20 115 Q32 115 32 95 L32 5 Z" />
          </clipPath>
        </defs>
        <path d="M8 5 L8 95 Q8 115 20 115 Q32 115 32 95 L32 5"
          fill="rgba(200,220,255,0.06)" stroke="#334155" strokeWidth="1.5" />
        <rect x="8" y="30" width="24" height="87" fill={clearColor} clipPath={`url(#lt-${label})`} />
        {turbidity > 0.05 && (
          <rect x="8" y={100 - turbidity * 40} width="24" height={turbidity * 40}
            fill={turbidColor} clipPath={`url(#lt-${label})`} opacity={0.9} />
        )}
        <rect x="7" y="3" width="26" height="3" fill="#1E293B" rx="1" />
      </svg>
      <p className="text-slate-500 text-xs font-rajdhani text-center leading-tight">{label}</p>
    </div>
  );
}

// ─── Observations panel ───────────────────────────────────────────────────────

function ObservationsPanel({ testsDone }: { testsDone: Set<string> }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-orbitron text-slate-400 tracking-wider mb-2">ALCOHOLS TESTED</p>
        <div className="space-y-1">
          {ALCOHOLS.map((a) => (
            <div key={a.id} className={`flex items-center justify-between text-xs font-rajdhani px-2 py-1 rounded ${
              testsDone.has(a.id) ? "text-teal" : "text-slate-600"
            }`}>
              <span>{testsDone.has(a.id) ? "✓" : "○"} {a.formula}</span>
              <span className={testsDone.has(a.id) ? (
                a.type === "tertiary" ? "text-red-400" : a.type === "secondary" ? "text-amber-400" : "text-slate-500"
              ) : "text-slate-700"}>
                {a.type === "tertiary" ? "3°" : a.type === "secondary" ? "2°" : "1°"}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="text-xs font-rajdhani">
        <p className="text-slate-400 mb-1">Progress</p>
        <p className="text-teal">{testsDone.size} / {ALCOHOLS.length} tested</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface LucasTestProps {
  onScoreUpdate?: (pts: number) => void;
}

export function LucasTest({ onScoreUpdate }: LucasTestProps) {
  const { addScore, addObservation, setTotalSteps, setStep, score, completeMode, resetExperiment } =
    useExperimentStore();
  const { playSuccess } = useSoundEffects();
  const { data: session } = useSession();
  const startTimeRef = useRef(Date.now());

  const [showCompletion, setShowCompletion] = useState(false);
  const [selectedAlcohol, setSelectedAlcohol] = useState<Alcohol | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [turbidity, setTurbidity] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [testsDone, setTestsDone] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => { setTotalSteps(4); }, []);

  function startTest() {
    if (!selectedAlcohol || isRunning) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(true);
    setElapsed(0);
    setTurbidity(0);
    setIsDone(false);

    const alcohol = selectedAlcohol;

    timerRef.current = setInterval(() => {
      setElapsed((t) => {
        const next = t + 0.5;

        if (alcohol.result === "none") {
          setTurbidity(0);
        } else {
          const progress = Math.min(1, next / alcohol.reactionTime);
          setTurbidity(progress);
        }

        if (next >= Math.min(alcohol.reactionTime * 1.2, 25)) {
          clearInterval(timerRef.current!);
          setIsRunning(false);
          setIsDone(true);

          if (!testsDone.has(alcohol.id)) {
            setTestsDone((prev) => new Set(Array.from(prev).concat(alcohol.id)));
            addScore(15);
            onScoreUpdate?.(15);
            playSuccess();
            const obs = alcohol.result === "immediate"
              ? `${alcohol.name} (${alcohol.type}): immediate turbidity — 3° alcohol.`
              : alcohol.result === "5min"
              ? `${alcohol.name} (${alcohol.type}): turbidity after ~5 min — 2° alcohol.`
              : `${alcohol.name} (${alcohol.type}): no turbidity — 1° alcohol.`;
            addObservation(obs);
          }
        }

        return next;
      });
    }, 500);
  }

  function handleReset() {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false);
    setElapsed(0);
    setTurbidity(0);
    setIsDone(false);
  }

  async function handleComplete() {
    completeMode();
    setShowCompletion(true);
    if (session?.user?.role === "student") {
      await saveProgress({
        experimentSlug: "lucas-test",
        score,
        maxScore: 100,
        timeSpentSeconds: Math.round((Date.now() - startTimeRef.current) / 1000),
      });
    }
  }

  function handleDoAgain() {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowCompletion(false);
    setSelectedAlcohol(null);
    setIsRunning(false);
    setElapsed(0);
    setTurbidity(0);
    setIsDone(false);
    setTestsDone(new Set());
    startTimeRef.current = Date.now();
    resetExperiment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setTotalSteps(4);
  }

  const resultLabel = isDone && selectedAlcohol
    ? selectedAlcohol.result === "immediate" ? "Turbidity immediately → 3° alcohol"
    : selectedAlcohol.result === "5min" ? "Turbid within 5 min → 2° alcohol"
    : "No turbidity → 1° alcohol"
    : "";

  // ── Shared experiment UI ──────────────────────────────────────────────────
  function makeExperimentUI(filterTypes?: Alcohol["type"][]) {
    const displayAlcohols = filterTypes
      ? ALCOHOLS.filter((a) => filterTypes.includes(a.type))
      : ALCOHOLS;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <p className="text-slate-400 text-xs font-orbitron tracking-wider">SELECT ALCOHOL</p>
          <div className="space-y-1.5">
            {displayAlcohols.map((a) => (
              <button key={a.id}
                onClick={() => { setSelectedAlcohol(a); handleReset(); }}
                className={`w-full p-2.5 rounded border text-left text-xs font-rajdhani transition-all ${
                  selectedAlcohol?.id === a.id ? "border-2 text-white" : "border-border text-slate-300 hover:border-slate-500"
                }`}
                style={selectedAlcohol?.id === a.id ? { borderColor: a.color, backgroundColor: a.color + "15" } : undefined}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold">{a.formula}</span>
                    <span className="text-slate-500 ml-1">— {a.name}</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-xs flex-shrink-0 ${
                    a.type === "tertiary" ? "bg-red-900/30 text-red-400"
                    : a.type === "secondary" ? "bg-amber-900/30 text-amber-400"
                    : "bg-slate-800 text-slate-400"
                  }`}>
                    {a.type === "tertiary" ? "3°" : a.type === "secondary" ? "2°" : "1°"}
                  </span>
                </div>
                {testsDone.has(a.id) && <span className="text-green-400 text-xs mt-0.5 block">✓ tested</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <LucasTube turbidity={turbidity} label={selectedAlcohol?.formula ?? "—"} />

          <div className="text-center">
            <div className={`font-orbitron text-2xl font-bold tabular-nums ${
              isRunning ? "text-amber-400" : isDone && turbidity > 0 ? "text-red-400" : "text-slate-600"
            }`}>
              {elapsed.toFixed(1)}s
            </div>
            {isDone && (
              <motion.p className={`text-sm font-rajdhani mt-1 font-semibold ${
                turbidity > 0.8 ? "text-red-400" : turbidity > 0.1 ? "text-amber-400" : "text-slate-400"
              }`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {resultLabel}
              </motion.p>
            )}
          </div>

          <div className="flex gap-2">
            {selectedAlcohol && !isRunning && (
              <motion.button onClick={startTest} whileTap={{ scale: 0.96 }}
                className="px-4 py-2 bg-amber-800/50 hover:bg-amber-700/60 text-white text-sm font-rajdhani font-semibold border border-amber-600/40 rounded transition-all">
                Add to Lucas Reagent
              </motion.button>
            )}
            {(isRunning || isDone) && (
              <button onClick={handleReset} className="px-3 py-2 text-slate-400 hover:text-white text-xs font-rajdhani border border-border rounded transition-colors">
                New test
              </button>
            )}
          </div>

          <AnimatePresence>
            {isDone && selectedAlcohol && (
              <motion.div className={`rounded border p-3 w-full ${
                selectedAlcohol.type === "tertiary" ? "border-red-600/40 bg-red-900/10"
                : selectedAlcohol.type === "secondary" ? "border-amber-600/40 bg-amber-900/10"
                : "border-slate-700/40 bg-slate-900/20"
              }`}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p className={`font-orbitron text-xs font-bold mb-1 ${
                  selectedAlcohol.type === "tertiary" ? "text-red-400"
                  : selectedAlcohol.type === "secondary" ? "text-amber-400"
                  : "text-slate-400"
                }`}>
                  {selectedAlcohol.type === "tertiary" ? "3° ALCOHOL — Immediate"
                  : selectedAlcohol.type === "secondary" ? "2° ALCOHOL — 5 min"
                  : "1° ALCOHOL — No reaction"}
                </p>
                <p className="text-white font-rajdhani text-sm">{selectedAlcohol.formula}</p>
                <p className="text-slate-400 text-xs font-rajdhani mt-1">{selectedAlcohol.mechanism}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  const summaryTable = (
    <div className="rounded border border-border overflow-hidden">
      <div className="px-3 py-2 bg-navy/30 border-b border-border">
        <p className="text-xs font-orbitron text-slate-400 tracking-wider">LUCAS TEST SUMMARY</p>
      </div>
      <table className="w-full text-xs font-rajdhani">
        <thead>
          <tr className="border-b border-border bg-navy/20">
            <th className="text-left px-3 py-1.5 text-slate-400">Alcohol type</th>
            <th className="text-left px-3 py-1.5 text-slate-400">Result</th>
            <th className="text-left px-3 py-1.5 text-slate-400">Mechanism</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border/50">
            <td className="px-3 py-2 text-red-400 font-semibold">3° (tertiary)</td>
            <td className="px-3 py-2 text-white">Immediate turbidity</td>
            <td className="px-3 py-2 text-slate-400">SN1 — stable 3° carbocation</td>
          </tr>
          <tr className="border-b border-border/50">
            <td className="px-3 py-2 text-amber-400 font-semibold">2° (secondary)</td>
            <td className="px-3 py-2 text-white">Turbid within 5 min</td>
            <td className="px-3 py-2 text-slate-400">SN1 — 2° carbocation, slower</td>
          </tr>
          <tr>
            <td className="px-3 py-2 text-slate-400 font-semibold">1° (primary)</td>
            <td className="px-3 py-2 text-white">No turbidity at RT</td>
            <td className="px-3 py-2 text-slate-400">SN2 only — no 1° carbocation</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  // ─── Steps ─────────────────────────────────────────────────────────────────
  const steps: StepDefinition[] = useMemo(() => [
    {
      id: "intro",
      title: "Introduction to the Lucas Test",
      subtitle: "Lucas reagent and alcohol classification",
      instructions: {
        procedure: [
          "Prepare Lucas reagent: dissolve anhydrous ZnCl₂ in concentrated HCl with cooling",
          "ZnCl₂ (Lewis acid) activates the OH group by coordinating to the oxygen",
          "Add ~5 drops of test alcohol to ~2 mL Lucas reagent in a test tube",
          "Stopper and shake gently — start timing immediately",
          "Observe if turbidity (cloudiness) develops: immediately, within 5 min, or not at all",
          "Turbidity is from the insoluble alkyl chloride (RCl) formed",
        ],
        safetyNotes: [
          "Concentrated HCl is corrosive and gives off acidic fumes — work in fume cupboard",
          "ZnCl₂ is toxic — avoid inhalation and skin contact",
          "Wear eye protection and gloves throughout",
          "Dispose of waste containing ZnCl₂ as toxic chemical waste",
        ],
        expectedObservations: [
          "3° alcohols: solution turns milky/turbid almost immediately (< 1 min)",
          "2° alcohols: turbidity develops within about 5 minutes",
          "1° alcohols: solution remains clear at room temperature",
        ],
        tips: [
          "Always test at room temperature — heating changes the results",
          "Shake gently and stopper the tube to prevent HCl fumes escaping",
          "Record exact time of turbidity for classification",
          "The test identifies degree of substitution, not the specific alcohol",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Mechanism: Why Different Rates?</p>
          <p><span className="text-white font-semibold">Lucas reagent</span> = ZnCl₂ + conc. HCl</p>
          <p>Reaction: <span className="font-mono text-white">R-OH + HCl → R-Cl + H₂O</span></p>
          <p>The alkyl chloride (R-Cl) is insoluble in the aqueous reagent — appears as turbidity.</p>
          <div className="space-y-2">
            <div className="bg-navy/50 border border-red-500/20 rounded p-2">
              <p className="text-red-400 font-semibold">3° Alcohol — SN1 mechanism</p>
              <p>Forms stable tertiary carbocation instantly → fast reaction → immediate turbidity</p>
              <p className="font-mono text-xs text-slate-400">(CH₃)₃C-OH → (CH₃)₃C⁺ + OH⁻ → (CH₃)₃C-Cl</p>
            </div>
            <div className="bg-navy/50 border border-amber-500/20 rounded p-2">
              <p className="text-amber-400 font-semibold">2° Alcohol — SN1, slower</p>
              <p>Secondary carbocation is less stable → slower formation → turbidity in ~5 min</p>
            </div>
            <div className="bg-navy/50 border border-slate-700/40 rounded p-2">
              <p className="text-slate-400 font-semibold">1° Alcohol — SN2 only at RT</p>
              <p>Primary carbocation is too unstable for SN1. SN2 with HCl is too slow at RT. No turbidity.</p>
            </div>
          </div>
        </div>
      ),
      quiz: {
        question: "What is the observation when a tertiary alcohol is added to Lucas reagent?",
        options: [
          "Solution remains clear — no reaction",
          "Turbidity develops after 5 minutes",
          "Immediate turbidity — milky appearance within seconds",
          "Gas is evolved vigorously",
        ],
        correctIndex: 2,
        explanation: "Tertiary alcohols react immediately with Lucas reagent (ZnCl₂/HCl) via an SN1 mechanism. A stable tertiary carbocation forms almost instantly, then reacts with Cl⁻ to give an insoluble alkyl chloride. This appears as immediate cloudiness/turbidity in the solution.",
      },
      content: (
        <div className="space-y-4">
          <div className="bg-navy/40 border border-border rounded p-4 text-xs font-rajdhani">
            <p className="text-amber-300 font-semibold mb-2">Lucas Reagent = ZnCl₂ + conc. HCl</p>
            <p className="text-slate-300 leading-relaxed">
              Used to distinguish between primary, secondary, and tertiary alcohols based on their
              reactivity with HCl (activated by ZnCl₂). Turbidity = insoluble alkyl chloride formed.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs font-rajdhani text-center">
            <div className="bg-red-900/20 border border-red-700/30 rounded p-3">
              <p className="text-red-400 font-bold text-sm">3°</p>
              <p className="text-white">Immediate</p>
              <p className="text-slate-400">turbidity</p>
            </div>
            <div className="bg-amber-900/20 border border-amber-700/30 rounded p-3">
              <p className="text-amber-400 font-bold text-sm">2°</p>
              <p className="text-white">~5 min</p>
              <p className="text-slate-400">turbidity</p>
            </div>
            <div className="bg-slate-800/50 border border-border rounded p-3">
              <p className="text-slate-400 font-bold text-sm">1°</p>
              <p className="text-white">No reaction</p>
              <p className="text-slate-400">at RT</p>
            </div>
          </div>
          <p className="text-center text-slate-500 text-xs font-rajdhani">
            Proceed to test the tertiary and secondary alcohols.
          </p>
        </div>
      ),
      canProceed: true,
    },
    {
      id: "test-3-and-2",
      title: "Test 3° and 2° Alcohols",
      subtitle: "Observe SN1 reaction rates",
      instructions: {
        procedure: [
          "Select 2-methylpropan-2-ol (3° alcohol) and add to Lucas reagent",
          "Observe immediate turbidity — the fastest reaction",
          "Next, select butan-2-ol or cyclohexanol (2° alcohols)",
          "Observe slower turbidity development (simulated as ~5 min)",
          "Compare the rate of turbidity: 3° >> 2°",
          "Test both 2° alcohols to see similar behaviour",
        ],
        expectedObservations: [
          "2-methylpropan-2-ol (3°): turbid almost immediately",
          "Butan-2-ol (2°): slower turbidity, takes longer",
          "Cyclohexanol (2°): similar to butan-2-ol, moderate rate",
          "Turbidity from insoluble alkyl chloride layer forming",
        ],
        tips: [
          "In simulation: time is accelerated (3° shows in seconds, 2° in ~15-18s)",
          "In real lab: 3° is immediate, 2° takes 5 minutes",
          "The cloudy layer (turbidity) is the RCl product separating from water",
          "Shake gently — vigorous shaking may make it harder to observe",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Carbocation Stability</p>
          <p>The SN1 reaction rate depends on carbocation stability:</p>
          <div className="bg-navy/50 border border-teal/20 rounded p-3 font-mono text-center">
            <p className="text-white">3° &gt; 2° &gt; 1° carbocation stability</p>
          </div>
          <p>Tertiary carbocations are stabilised by:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>3 alkyl groups donating electron density (induction)</li>
            <li>Hyperconjugation with adjacent C-H bonds</li>
            <li>More groups → more stabilisation → faster ionisation</li>
          </ul>
          <p>Primary carbocations are so unstable they essentially cannot form under mild SN1 conditions. Only SN2 is possible for 1° at RT, but HCl/ZnCl₂ is not a good SN2 reagent.</p>
        </div>
      ),
      quiz: {
        question: "Why does cyclohexanol (2° alcohol) react more slowly with Lucas reagent than 2-methylpropan-2-ol (3°)?",
        options: [
          "Cyclohexanol has a larger molecular mass",
          "The secondary carbocation is less stable than the tertiary carbocation",
          "Cyclohexanol does not react via SN1",
          "Cyclohexanol has a ring structure that blocks the OH group",
        ],
        correctIndex: 1,
        explanation: "Both react via the SN1 mechanism, but the intermediate carbocation is less stable for cyclohexanol (secondary) than for 2-methylpropan-2-ol (tertiary). The tertiary carbocation forms more rapidly, so the reaction is faster. Rate of SN1 ∝ stability of carbocation.",
      },
      content: makeExperimentUI(["tertiary", "secondary"]),
      canProceed: testsDone.size >= 2,
    },
    {
      id: "test-1",
      title: "Test 1° Alcohols",
      subtitle: "Confirm no reaction for primary alcohols",
      instructions: {
        procedure: [
          "Select butan-1-ol or ethanol (1° primary alcohols)",
          "Add to Lucas reagent and start timing",
          "Observe that the solution remains clear — no turbidity",
          "Wait the full duration — primary alcohols do not react at RT",
          "Compare this with the 3° and 2° results from the previous step",
        ],
        expectedObservations: [
          "Solution remains clear and transparent throughout",
          "No turbidity forms — no alkyl chloride product",
          "1° alcohols cannot form stable primary carbocations for SN1",
          "SN2 with HCl is too slow under these mild conditions",
        ],
        tips: [
          "Primary alcohols DO react with HCl, but need heating or a different catalyst",
          "In the Lucas test, room temperature is the key condition — no heat applied",
          "This test is only reliable for alcohols with up to ~5 carbons (higher ones are slower even for 3°)",
          "1° alcohols can be tested differently: phosphorus pentachloride (PCl₅) test",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Why 1° Alcohols Don&apos;t React</p>
          <p>Primary carbocations (R-CH₂⁺) are highly unstable — they carry the positive charge on a carbon with only one electron-donating group.</p>
          <div className="bg-navy/50 border border-slate-700/40 rounded p-2">
            <p className="text-slate-300">The energy required to form a 1° carbocation is too high under mild RT conditions. The reaction doesn&apos;t proceed via SN1.</p>
          </div>
          <p>SN2 is possible in principle (Cl⁻ attacks from behind), but the ZnCl₂/HCl system is not set up for efficient SN2, so the rate is negligible at RT.</p>
          <div className="bg-navy/50 border border-teal/20 rounded p-2">
            <p className="text-teal font-semibold">Lucas Test Limitation</p>
            <p>The Lucas test CANNOT distinguish 1° alcohols from each other — all give negative results. Use other tests (oxidation, iodoform) for further differentiation.</p>
          </div>
        </div>
      ),
      quiz: {
        question: "A student adds an unknown alcohol to Lucas reagent. After 10 minutes, the solution is still clear. What conclusion can they draw?",
        options: [
          "The compound is a tertiary alcohol",
          "The compound is not an alcohol at all",
          "The compound is a primary alcohol (or possibly very large 2° alcohol)",
          "The Lucas reagent was not prepared correctly",
        ],
        correctIndex: 2,
        explanation: "No turbidity after several minutes indicates the compound is a primary alcohol. Primary alcohols do not form turbidity with Lucas reagent at room temperature because primary carbocations are too unstable to form. (Note: 2° alcohols turn turbid within 5 min, 3° almost immediately.)",
      },
      content: makeExperimentUI(["primary"]),
      canProceed: Array.from(testsDone).some((id) => ALCOHOLS.find((a) => a.id === id)?.type === "primary"),
    },
    {
      id: "summary",
      title: "Classify & Draw Conclusions",
      subtitle: "Lucas test summary and exam applications",
      instructions: {
        procedure: [
          "Review the summary table linking alcohol type to Lucas test result",
          "Practice: given 'immediate turbidity' — identify as 3° alcohol",
          "Practice: 'turbid in 5 min' — identify as 2° alcohol",
          "Practice: 'no turbidity' — identify as 1° alcohol",
          "Test all remaining alcohols for a complete dataset",
          "Write the mechanism for one SN1 reaction (3° or 2° alcohol with HCl)",
        ],
        expectedObservations: [
          "3° → immediate turbidity (SN1, stable 3° carbocation)",
          "2° → turbidity in ~5 min (SN1, less stable 2° carbocation)",
          "1° → no turbidity at RT (no viable SN1 pathway)",
        ],
        tips: [
          "In exam: state the observation, then the conclusion (don't just write one)",
          "Mechanism for 3°: formation of carbocation first, then Cl⁻ attack (two steps)",
          "Include: ZnCl₂ activates -OH group by acting as Lewis acid",
          "The Lucas test is limited to alcohols — won't work for ethers, aldehydes, etc.",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Full SN1 Mechanism (3° Alcohol)</p>
          <div className="space-y-1 text-xs font-mono bg-navy/50 border border-teal/20 rounded p-3">
            <p className="text-white">Step 1 (slow — RDS): ionisation</p>
            <p>(CH₃)₃C-OH + ZnCl₂ → <span className="text-red-400">(CH₃)₃C⁺</span> + [ZnCl₂OH]⁻</p>
            <p className="text-white mt-2">Step 2 (fast): substitution</p>
            <p><span className="text-red-400">(CH₃)₃C⁺</span> + Cl⁻ → (CH₃)₃C-Cl↓</p>
            <p className="text-slate-400 mt-1">(insoluble — appears as turbidity)</p>
          </div>
          <p>The rate-determining step (RDS) is the ionisation — hence faster for more stable carbocations.</p>
        </div>
      ),
      quiz: {
        question: "In the Lucas test, a compound shows turbidity after exactly 4 minutes. What is the most likely classification?",
        options: [
          "Primary alcohol — just a slow batch",
          "Secondary alcohol — SN1 via secondary carbocation",
          "Tertiary alcohol — should be immediate",
          "Not an alcohol — alcohols don&apos;t show turbidity",
        ],
        correctIndex: 1,
        explanation: "Turbidity developing after several minutes (2-5 min) is the characteristic result for secondary alcohols in the Lucas test. Tertiary alcohols react almost immediately, and primary alcohols show no turbidity at room temperature. So 4 minutes is consistent with a secondary alcohol.",
      },
      content: (
        <div className="space-y-4">
          {summaryTable}
          <div className="space-y-2">
            <p className="text-slate-400 text-xs font-orbitron tracking-wider">TEST MORE ALCOHOLS</p>
            {makeExperimentUI()}
          </div>
        </div>
      ),
      canProceed: true,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [testsDone, selectedAlcohol, isRunning, elapsed, turbidity, isDone, resultLabel]);

  const persistentNotes = useMemo(
    () => <ObservationsPanel testsDone={testsDone} />,
    [testsDone]
  );

  return (
    <>
      <StepWizard
        steps={steps}
        persistentNotes={persistentNotes}
        experimentTitle="Lucas Test for Alcohols"
        onComplete={handleComplete}
        onStepChange={setStep}
      />
      {showCompletion && (
        <CompletionOverlay
          experimentTitle="Lucas Test for Alcohols"
          score={score}
          maxScore={100}
          itemsTested={testsDone.size}
          totalItems={ALCOHOLS.length}
          timeSpentSeconds={Math.round((Date.now() - startTimeRef.current) / 1000)}
          onDoAgain={handleDoAgain}
        />
      )}
    </>
  );
}
