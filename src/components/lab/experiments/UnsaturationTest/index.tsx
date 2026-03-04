"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";
import { StepWizard } from "../../StepWizard";
import { CompletionOverlay } from "../../CompletionOverlay";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useSession } from "next-auth/react";
import { saveProgress } from "@/lib/progress";
import type { StepDefinition } from "../../StepWizard";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Compound {
  id: string;
  name: string;
  formula: string;
  type: "alkene" | "alkane" | "alkyne" | "aromatic" | "alcohol";
  unsaturated: boolean;
  br2Water: "positive" | "negative";
  kmno4: "positive" | "negative";
  br2Obs: string;
  kmno4Obs: string;
  note: string;
}

const COMPOUNDS: Compound[] = [
  {
    id: "ethene",
    name: "Ethene",
    formula: "CH₂=CH₂",
    type: "alkene",
    unsaturated: true,
    br2Water: "positive",
    kmno4: "positive",
    br2Obs: "Orange-brown Br₂ water rapidly decolourises — addition across C=C.",
    kmno4Obs: "Purple KMnO₄ decolourises — C=C oxidised to diols/cleavage products.",
    note: "Alkenes decolourise both reagents — most reliable test for unsaturation.",
  },
  {
    id: "cyclohexene",
    name: "Cyclohexene",
    formula: "C₆H₁₀",
    type: "alkene",
    unsaturated: true,
    br2Water: "positive",
    kmno4: "positive",
    br2Obs: "Orange-brown colour disappears rapidly on shaking.",
    kmno4Obs: "Purple → colourless (diol formation).",
    note: "Cyclic alkene — same reactivity as open-chain alkenes.",
  },
  {
    id: "ethyne",
    name: "Ethyne (acetylene)",
    formula: "HC≡CH",
    type: "alkyne",
    unsaturated: true,
    br2Water: "positive",
    kmno4: "positive",
    br2Obs: "Decolourises — Br₂ adds in two steps across C≡C.",
    kmno4Obs: "Decolourises — triple bond oxidised.",
    note: "Alkynes also show unsaturation tests — can add 2 mol Br₂.",
  },
  {
    id: "hexane",
    name: "Hexane",
    formula: "CH₃(CH₂)₄CH₃",
    type: "alkane",
    unsaturated: false,
    br2Water: "negative",
    kmno4: "negative",
    br2Obs: "No decolourisation — alkanes do NOT react with Br₂ water at RT.",
    kmno4Obs: "Purple colour remains — alkanes are not oxidised by cold KMnO₄.",
    note: "Alkanes are saturated. No reaction under mild conditions.",
  },
  {
    id: "benzene",
    name: "Benzene",
    formula: "C₆H₆",
    type: "aromatic",
    unsaturated: false,
    br2Water: "negative",
    kmno4: "negative",
    br2Obs: "No decolourisation — aromatic rings resist electrophilic addition.",
    kmno4Obs: "No decolourisation — benzene ring very stable (aromatic stabilisation).",
    note: "Aromatic compounds resist addition reactions despite apparent unsaturation.",
  },
  {
    id: "ethanol",
    name: "Ethanol",
    formula: "CH₃CH₂OH",
    type: "alcohol",
    unsaturated: false,
    br2Water: "negative",
    kmno4: "positive",
    br2Obs: "No decolourisation — alcohol does not react with Br₂ water.",
    kmno4Obs: "KMnO₄ may decolourise slowly — alcohol oxidised to aldehyde/acid.",
    note: "Alcohols can reduce KMnO₄ but do not decolourise Br₂ water — distinguishes from alkenes.",
  },
];

// ─── Test tube display ────────────────────────────────────────────────────────

function ReagentTube({
  initialColor,
  finalColor,
  reacted,
  label,
}: {
  initialColor: string;
  finalColor: string;
  reacted: boolean;
  label: string;
}) {
  const color = reacted ? finalColor : initialColor;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 36 120" width="40" height="132" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id={`rt-${label}`}>
            <path d="M7 5 L7 88 Q7 106 18 106 Q29 106 29 88 L29 5 Z" />
          </clipPath>
        </defs>
        <path d="M7 5 L7 88 Q7 106 18 106 Q29 106 29 88 L29 5"
          fill="rgba(200,220,255,0.06)" stroke="#334155" strokeWidth="1.5" />
        <rect x="7" y="28" width="22" height="80" fill={color} clipPath={`url(#rt-${label})`}
          opacity={0.7} style={{ transition: "fill 1.5s ease" }} />
        <rect x="6" y="3" width="24" height="3" fill="#1E293B" rx="1" />
      </svg>
      <p className="text-slate-500 text-xs font-rajdhani text-center leading-tight">{label}</p>
    </div>
  );
}

// ─── Observations panel ───────────────────────────────────────────────────────

function ObservationsPanel({ testsDone }: { testsDone: Set<string> }) {
  const br2Count = COMPOUNDS.filter((c) => testsDone.has(`${c.id}-br2`)).length;
  const kmno4Count = COMPOUNDS.filter((c) => testsDone.has(`${c.id}-kmno4`)).length;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-orbitron text-slate-400 tracking-wider mb-2">TEST PROGRESS</p>
        <div className="grid grid-cols-2 gap-2 text-xs font-rajdhani text-center">
          <div className="bg-amber-900/20 border border-amber-700/30 rounded p-2">
            <p className="text-amber-300">Br₂ tests</p>
            <p className="text-white font-semibold">{br2Count}/{COMPOUNDS.length}</p>
          </div>
          <div className="bg-purple-900/20 border border-purple-700/30 rounded p-2">
            <p className="text-purple-300">KMnO₄ tests</p>
            <p className="text-white font-semibold">{kmno4Count}/{COMPOUNDS.length}</p>
          </div>
        </div>
      </div>
      <div>
        <p className="text-xs font-orbitron text-slate-400 tracking-wider mb-1">RESULTS</p>
        <div className="space-y-0.5">
          {COMPOUNDS.map((c) => {
            const br2Done = testsDone.has(`${c.id}-br2`);
            const kmno4Done = testsDone.has(`${c.id}-kmno4`);
            if (!br2Done && !kmno4Done) return null;
            return (
              <div key={c.id} className="text-xs font-rajdhani text-slate-400 flex gap-2">
                <span className="text-white">{c.formula}</span>
                {br2Done && <span className={c.br2Water === "positive" ? "text-green-400" : "text-red-400"}>Br₂{c.br2Water === "positive" ? "+" : "−"}</span>}
                {kmno4Done && <span className={c.kmno4 === "positive" ? "text-green-400" : "text-red-400"}>KMnO₄{c.kmno4 === "positive" ? "+" : "−"}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface UnsaturationTestProps {
  onScoreUpdate?: (pts: number) => void;
}

export function UnsaturationTest({ onScoreUpdate }: UnsaturationTestProps) {
  const { addScore, addObservation, setTotalSteps, setStep, score, completeMode, resetExperiment, currentMode } =
    useExperimentStore();
  const { playSuccess } = useSoundEffects();
  const { data: session } = useSession();
  const startTimeRef = useRef(Date.now());

  const [showCompletion, setShowCompletion] = useState(false);
  const [selectedCompound, setSelectedCompound] = useState<Compound | null>(null);
  const [testedBr2, setTestedBr2] = useState(false);
  const [testedKMnO4, setTestedKMnO4] = useState(false);
  const [testsDone, setTestsDone] = useState<Set<string>>(new Set());

  useEffect(() => { setTotalSteps(4); }, [setTotalSteps]);

  function handleTestBr2() {
    if (!selectedCompound || testedBr2) return;
    setTestedBr2(true);
    addObservation(`${selectedCompound.formula} + Br₂(aq): ${selectedCompound.br2Obs}`);
    const key = `${selectedCompound.id}-br2`;
    if (!testsDone.has(key)) {
      setTestsDone((prev) => new Set(Array.from(prev).concat(key)));
      addScore(10);
      onScoreUpdate?.(10);
      playSuccess();
    }
  }

  function handleTestKMnO4() {
    if (!selectedCompound || testedKMnO4) return;
    setTestedKMnO4(true);
    addObservation(`${selectedCompound.formula} + KMnO₄(aq): ${selectedCompound.kmno4Obs}`);
    const key = `${selectedCompound.id}-kmno4`;
    if (!testsDone.has(key)) {
      setTestsDone((prev) => new Set(Array.from(prev).concat(key)));
      addScore(10);
      onScoreUpdate?.(10);
      playSuccess();
    }
  }

  function handleReset() {
    setTestedBr2(false);
    setTestedKMnO4(false);
  }

  function handleComplete() {
    completeMode("unsaturation-test-br2-kmno4", currentMode);
    setShowCompletion(true);
    if (session?.user?.role === "student") {
      const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      saveProgress({
        slug: "unsaturation-test-br2-kmno4",
        mode: currentMode,
        score: Math.min(score, 100),
        timeSpentSeconds,
      }).catch(() => {});
    }
  }

  function handleDoAgain() {
    resetExperiment();
    setShowCompletion(false);
    setSelectedCompound(null);
    setTestedBr2(false);
    setTestedKMnO4(false);
    setTestsDone(new Set());
    setStep(0);
    startTimeRef.current = Date.now();
  }

  const br2TestsDone = COMPOUNDS.filter((c) => testsDone.has(`${c.id}-br2`)).length;
  const kmno4TestsDone = COMPOUNDS.filter((c) => testsDone.has(`${c.id}-kmno4`)).length;

  // ─── Shared test UI ─────────────────────────────────────────────────────────
  const testUI = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-slate-400 text-xs font-orbitron tracking-wider mb-2">SELECT COMPOUND</p>
          <div className="space-y-1.5">
            {COMPOUNDS.map((c) => (
              <button key={c.id}
                onClick={() => { setSelectedCompound(c); handleReset(); }}
                className={`w-full p-2.5 rounded border text-left text-xs font-rajdhani transition-all ${
                  selectedCompound?.id === c.id ? "border-teal/50 bg-teal/10 text-white" : "border-border text-slate-300 hover:border-slate-500"
                }`}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold">{c.formula}</span>
                    <span className="text-slate-500 ml-1">— {c.name}</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-xs flex-shrink-0 ${
                    c.type === "alkene" ? "bg-green-900/30 text-green-400"
                    : c.type === "alkyne" ? "bg-blue-900/30 text-blue-400"
                    : c.type === "alkane" ? "bg-slate-800 text-slate-400"
                    : c.type === "aromatic" ? "bg-amber-900/30 text-amber-400"
                    : "bg-purple-900/30 text-purple-400"
                  }`}>
                    {c.type}
                  </span>
                </div>
                {(testsDone.has(`${c.id}-br2`) || testsDone.has(`${c.id}-kmno4`)) && (
                  <span className="text-green-400 text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-end justify-around gap-4 py-4">
            <ReagentTube
              initialColor="#D97706"
              finalColor="#F0F0E0"
              reacted={testedBr2 && selectedCompound?.br2Water === "positive"}
              label="Br₂ water"
            />
            <ReagentTube
              initialColor="#7C3AED"
              finalColor="#D1FAE5"
              reacted={testedKMnO4 && selectedCompound?.kmno4 === "positive"}
              label="KMnO₄"
            />
          </div>

          {selectedCompound && (
            <div className="flex gap-2 flex-wrap">
              <motion.button onClick={handleTestBr2} disabled={testedBr2} whileTap={{ scale: 0.96 }}
                className={`px-3 py-2 text-xs font-rajdhani font-semibold border rounded transition-all ${
                  testedBr2 ? "border-green-700/30 bg-green-900/10 text-green-400 cursor-default"
                  : "border-amber-600/40 text-amber-300 hover:bg-amber-900/20"
                }`}>
                {testedBr2 ? "✓ Br₂ tested" : "Add to Br₂ water"}
              </motion.button>
              <motion.button onClick={handleTestKMnO4} disabled={testedKMnO4} whileTap={{ scale: 0.96 }}
                className={`px-3 py-2 text-xs font-rajdhani font-semibold border rounded transition-all ${
                  testedKMnO4 ? "border-green-700/30 bg-green-900/10 text-green-400 cursor-default"
                  : "border-purple-600/40 text-purple-300 hover:bg-purple-900/20"
                }`}>
                {testedKMnO4 ? "✓ KMnO₄ tested" : "Add to KMnO₄"}
              </motion.button>
              <button onClick={handleReset}
                className="px-3 py-2 text-slate-400 hover:text-white text-xs font-rajdhani border border-border rounded transition-colors">
                New test
              </button>
            </div>
          )}

          <AnimatePresence>
            {testedBr2 && selectedCompound && (
              <motion.div className={`rounded border p-3 ${selectedCompound.br2Water === "positive" ? "border-green-600/30 bg-green-900/10" : "border-amber-700/30 bg-amber-900/10"}`}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p className={`font-orbitron text-xs mb-1 ${selectedCompound.br2Water === "positive" ? "text-green-400" : "text-amber-400"}`}>
                  Br₂ water: {selectedCompound.br2Water === "positive" ? "✓ POSITIVE — decolourises" : "✗ NEGATIVE — no change"}
                </p>
                <p className="text-slate-300 text-xs font-rajdhani">{selectedCompound.br2Obs}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {testedKMnO4 && selectedCompound && (
              <motion.div className={`rounded border p-3 ${selectedCompound.kmno4 === "positive" ? "border-green-600/30 bg-green-900/10" : "border-purple-700/30 bg-purple-900/10"}`}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p className={`font-orbitron text-xs mb-1 ${selectedCompound.kmno4 === "positive" ? "text-green-400" : "text-purple-400"}`}>
                  KMnO₄: {selectedCompound.kmno4 === "positive" ? "✓ POSITIVE — decolourises" : "✗ NEGATIVE — stays purple"}
                </p>
                <p className="text-slate-300 text-xs font-rajdhani">{selectedCompound.kmno4Obs}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {testedBr2 && testedKMnO4 && selectedCompound && (
            <motion.div className="bg-navy/40 border border-teal/30 rounded p-3"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-teal font-orbitron text-xs tracking-wider mb-1">CONCLUSION</p>
              <p className="text-white font-rajdhani text-sm">{selectedCompound.formula} — {selectedCompound.name}</p>
              <p className="text-slate-400 text-xs font-rajdhani mt-1">{selectedCompound.note}</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Reference table ─────────────────────────────────────────────────────────
  const referenceTable = (
    <div className="rounded border border-border overflow-hidden">
      <div className="px-3 py-2 bg-navy/30 border-b border-border">
        <p className="text-xs font-orbitron text-slate-400 tracking-wider">REFERENCE TABLE</p>
      </div>
      <table className="w-full text-xs font-rajdhani">
        <thead>
          <tr className="border-b border-border bg-navy/20">
            <th className="text-left px-3 py-1.5 text-slate-400">Compound</th>
            <th className="text-center px-3 py-1.5 text-orange-400">Br₂ water</th>
            <th className="text-center px-3 py-1.5 text-purple-400">KMnO₄</th>
          </tr>
        </thead>
        <tbody>
          {COMPOUNDS.map((c) => (
            <tr key={c.id} className="border-b border-border/50">
              <td className="px-3 py-1.5">
                <span className="text-white">{c.formula}</span>
                <span className="text-slate-500 ml-1">({c.type})</span>
              </td>
              <td className="px-3 py-1.5 text-center">
                <span className={c.br2Water === "positive" ? "text-green-400" : "text-red-400"}>
                  {c.br2Water === "positive" ? "✓ decolourises" : "✗ no change"}
                </span>
              </td>
              <td className="px-3 py-1.5 text-center">
                <span className={c.kmno4 === "positive" ? "text-green-400" : "text-red-400"}>
                  {c.kmno4 === "positive" ? "✓ decolourises" : "✗ no change"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ─── Steps ─────────────────────────────────────────────────────────────────
  const steps: StepDefinition[] = useMemo(() => [
    {
      id: "intro",
      title: "Introduction to Tests for Unsaturation",
      subtitle: "Bromine water and KMnO₄ tests",
      instructions: {
        procedure: [
          "Prepare bromine water (Br₂ dissolved in water): orange-brown colour",
          "Prepare acidified KMnO₄ solution: purple colour",
          "Add a few drops of test compound to each reagent separately",
          "Shake gently and observe any colour change",
          "Decolourisation = positive result (compound is unsaturated or reducing)",
          "No change = negative result",
        ],
        safetyNotes: [
          "Bromine water is corrosive and toxic — avoid skin and eye contact",
          "KMnO₄ is a strong oxidiser — avoid contact with flammable materials",
          "Both reagents stain skin — wear gloves and eye protection",
          "Work in a well-ventilated area",
        ],
        expectedObservations: [
          "Alkenes: decolourise both Br₂ and KMnO₄ immediately on shaking",
          "Alkynes: also decolourise both (can add 2 mol Br₂ across C≡C)",
          "Alkanes: no colour change with either reagent",
          "Benzene: no colour change — aromatic stability resists addition",
          "Ethanol: only decolourises KMnO₄ slowly (not Br₂)",
        ],
        tips: [
          "The key distinction: both positive → alkene/alkyne",
          "Only KMnO₄ positive → could be alcohol or aldehyde",
          "Both negative → alkane, aromatic, ester, or amide",
          "Always test both reagents for reliable identification",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Why These Reagents?</p>
          <div className="space-y-2">
            <div className="bg-navy/50 border border-amber-500/20 rounded p-2">
              <p className="text-amber-400 font-semibold">Bromine Water (Br₂/H₂O)</p>
              <p>Electrophilic addition to C=C: CH₂=CH₂ + Br₂ → BrCH₂CH₂Br (colourless)</p>
              <p className="text-slate-400">Orange-brown → colourless = addition occurred</p>
            </div>
            <div className="bg-navy/50 border border-purple-500/20 rounded p-2">
              <p className="text-purple-400 font-semibold">Acidified KMnO₄</p>
              <p>Oxidises C=C (Mn⁷⁺ → Mn²⁺): purple → colourless. Also oxidises alcohols and aldehydes.</p>
              <p className="text-slate-400">Less specific than Br₂ — also reacts with reducing agents</p>
            </div>
          </div>
          <p>Using both tests together gives more information — the combination of results identifies the compound class.</p>
        </div>
      ),
      quiz: {
        question: "Hexane (an alkane) is added to bromine water. What is the observation?",
        options: [
          "Immediate decolourisation — alkanes react rapidly",
          "Slow decolourisation — alkanes react by substitution",
          "No colour change — alkanes do not react with Br₂(aq) at room temperature",
          "The solution turns blue — alkanes form a complex with Br₂",
        ],
        correctIndex: 2,
        explanation: "Alkanes are saturated hydrocarbons and do not undergo addition reactions with bromine water at room temperature (no C=C or C≡C bonds to react). The orange-brown colour of the bromine water remains unchanged. Alkanes only react with Br₂ in UV light (free radical substitution).",
      },
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs font-rajdhani">
            <div className="bg-amber-900/20 border border-amber-700/30 rounded p-3">
              <p className="text-amber-300 font-semibold mb-1">Bromine Water</p>
              <p className="text-slate-400">Initial colour: orange-brown</p>
              <p className="text-green-400">Positive: rapid decolourisation</p>
              <p className="text-red-400">Negative: colour persists</p>
            </div>
            <div className="bg-purple-900/20 border border-purple-700/30 rounded p-3">
              <p className="text-purple-300 font-semibold mb-1">Acidified KMnO₄</p>
              <p className="text-slate-400">Initial colour: purple</p>
              <p className="text-green-400">Positive: purple → colourless</p>
              <p className="text-red-400">Negative: stays purple</p>
            </div>
          </div>
          <div className="bg-navy/40 border border-teal/20 rounded p-3 text-xs font-rajdhani">
            <p className="text-teal font-semibold mb-1">Interpretation Key</p>
            <div className="space-y-1 text-slate-300">
              <p>Both ✓ → alkene or alkyne (unsaturated C=C or C≡C)</p>
              <p>Br₂ ✓ only → (rare — some special reactions)</p>
              <p>KMnO₄ ✓ only → alcohol or aldehyde (reducing/oxidisable group)</p>
              <p>Both ✗ → alkane, aromatic, ester, amide</p>
            </div>
          </div>
          <p className="text-center text-slate-500 text-xs font-rajdhani">Proceed to test with bromine water.</p>
        </div>
      ),
      canProceed: true,
    },
    {
      id: "br2-test",
      title: "Test with Bromine Water",
      subtitle: "Identify C=C and C≡C bonds",
      instructions: {
        procedure: [
          "Select each compound from the list",
          "Click 'Add to Br₂ water' to test",
          "Observe: does the orange-brown colour disappear?",
          "Decolourisation = C=C or C≡C present (addition reaction)",
          "No change = no reactive double/triple bond",
          "Test at least 3 compounds before proceeding",
        ],
        expectedObservations: [
          "Ethene CH₂=CH₂: rapid decolourisation — Br₂ adds across C=C",
          "Cyclohexene: rapid decolourisation",
          "Ethyne HC≡CH: decolourises (adds 2 mol Br₂)",
          "Hexane: NO decolourisation — saturated, no addition",
          "Benzene: NO decolourisation — aromatic, resists addition",
          "Ethanol: NO decolourisation with Br₂ water",
        ],
        tips: [
          "Bromine water is more specific than KMnO₄ — mainly reacts with C=C/C≡C",
          "Phenol (not shown) also decolourises Br₂ — different mechanism",
          "In the simulation, 'Add to Br₂ water' runs the test instantly",
          "You can test the same compound with both reagents for comparison",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Mechanism: Electrophilic Addition</p>
          <div className="space-y-2">
            <div className="bg-navy/50 border border-teal/20 rounded p-2">
              <p className="text-white font-semibold">Alkenes + Br₂</p>
              <p className="font-mono text-xs">CH₂=CH₂ + Br₂ → BrCH₂CH₂Br</p>
              <p>Bromine polarised by π-electrons → Br⁺ attacks C=C → forms bromonium ion → Cl⁻ attacks → 1,2-dibromide</p>
            </div>
            <div className="bg-navy/50 border border-amber-500/20 rounded p-2">
              <p className="text-amber-300 font-semibold">Why Benzene Doesn&apos;t React</p>
              <p>Benzene&apos;s delocalised π-electrons are stabilised by resonance. Addition would destroy aromaticity. Much higher energy barrier — no reaction with Br₂(aq) at RT. (Requires FeBr₃ catalyst for substitution, not addition.)</p>
            </div>
          </div>
        </div>
      ),
      quiz: {
        question: "Cyclohexene decolourises bromine water rapidly, but benzene does not. Both contain C=C bonds — why the difference?",
        options: [
          "Benzene's C=C bonds are longer and harder to break",
          "Benzene has aromatic stabilisation from delocalised electrons — addition would destroy it",
          "Benzene is a gas so it doesn't mix well with bromine water",
          "Cyclohexene has more hydrogen atoms to react with",
        ],
        correctIndex: 1,
        explanation: "Benzene's ring contains delocalised π electrons spread over all 6 carbons, giving it aromatic stability. An addition reaction would disrupt this and require much more energy than in a normal alkene. Addition would form an intermediate that is non-aromatic and therefore less stable. Consequently, benzene resists addition under mild conditions, even though it has apparent unsaturation.",
      },
      content: testUI,
      canProceed: br2TestsDone >= 3,
    },
    {
      id: "kmno4-test",
      title: "Test with Acidified KMnO₄",
      subtitle: "Compare with bromine water results",
      instructions: {
        procedure: [
          "Select a compound you already tested with Br₂ water",
          "Click 'Add to KMnO₄' to test with acidified potassium manganate(VII)",
          "Observe: does the purple colour disappear (→ colourless)?",
          "Compare KMnO₄ result with Br₂ result for the same compound",
          "Test at least 3 compounds with KMnO₄ before proceeding",
          "Note: ethanol gives positive with KMnO₄ but negative with Br₂",
        ],
        expectedObservations: [
          "Alkenes: decolourise KMnO₄ (oxidation of C=C to diols or cleavage)",
          "Ethanol: decolourises KMnO₄ slowly (alcohol oxidised to aldehyde/acid)",
          "Hexane: KMnO₄ remains purple — no oxidisable groups",
          "Benzene: KMnO₄ remains purple — aromatic ring not oxidised by cold KMnO₄",
        ],
        tips: [
          "Cold, dilute KMnO₄ gives different products than hot, concentrated KMnO₄",
          "Cold KMnO₄ + alkene → diol (cis-addition)",
          "Hot, conc. KMnO₄ + alkene → carboxylic acids and/or CO₂ (cleavage)",
          "Ethanol (KMnO₄ +, Br₂ −) is a key distinguishing result",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">KMnO₄ Oxidation</p>
          <div className="space-y-2">
            <div className="bg-navy/50 border border-purple-500/20 rounded p-2">
              <p className="text-purple-400 font-semibold">Cold, dilute KMnO₄ + alkene</p>
              <p className="font-mono text-xs">CH₂=CH₂ + [O] + H₂O → HOCH₂CH₂OH (diol)</p>
              <p>Mn⁷⁺ → Mn²⁺ (purple → colourless)</p>
            </div>
            <div className="bg-navy/50 border border-blue-500/20 rounded p-2">
              <p className="text-blue-400 font-semibold">KMnO₄ + alcohol</p>
              <p>Alcohols can reduce KMnO₄ (slower than alkenes):</p>
              <p className="font-mono text-xs">CH₃CH₂OH → CH₃CHO → CH₃COOH</p>
            </div>
          </div>
          <p className="text-teal">Key pattern: KMnO₄ is less specific than Br₂. Both positive together best confirms C=C.</p>
        </div>
      ),
      quiz: {
        question: "Ethanol gives a positive result with acidified KMnO₄ but a negative result with bromine water. What does this suggest?",
        options: [
          "Ethanol contains a C=C bond that only reacts with one reagent",
          "Ethanol has no C=C bond but has an oxidisable group (-OH) that reduces KMnO₄",
          "The bromine water was too dilute",
          "KMnO₄ is not selective and reacts with all organic compounds",
        ],
        correctIndex: 1,
        explanation: "Ethanol doesn't contain a C=C bond, so it doesn't decolourise bromine water (no electrophilic addition). However, the -OH group can be oxidised by KMnO₄ (first to ethanal, then to ethanoic acid). This pattern — positive KMnO₄ but negative Br₂ — suggests an alcohol or aldehyde rather than an alkene.",
      },
      content: testUI,
      canProceed: kmno4TestsDone >= 3,
    },
    {
      id: "compare",
      title: "Compare Results & Draw Conclusions",
      subtitle: "Use both tests together for identification",
      instructions: {
        procedure: [
          "Review the reference table showing all results for each compound",
          "Identify the pattern: alkenes give both positive, alkanes give both negative",
          "Note the special case: ethanol (KMnO₄ positive, Br₂ negative)",
          "Practice: for an unknown compound with both tests positive, what is it likely to be?",
          "Complete testing any remaining compounds you haven't done yet",
        ],
        expectedObservations: [
          "Alkenes/alkynes: both Br₂ AND KMnO₄ positive",
          "Alkanes: both negative",
          "Benzene (aromatic): both negative despite formula suggesting unsaturation",
          "Ethanol: KMnO₄ positive, Br₂ negative",
        ],
        tips: [
          "Two positive tests strongly suggests alkene or alkyne",
          "Aromatic compounds appear unsaturated (low H:C ratio) but test negative — aromatic stability",
          "Always state 'decolourises' not just 'reacts' in exam answers",
          "The Br₂ test is more selective and reliable for unsaturation specifically",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Exam-Ready Decision Key</p>
          <div className="space-y-1">
            {[
              { cond: "Br₂ ✓ + KMnO₄ ✓", result: "→ Alkene or Alkyne (C=C or C≡C present)", color: "text-green-400" },
              { cond: "Br₂ ✗ + KMnO₄ ✓", result: "→ Alcohol or Aldehyde (no C=C, but oxidisable)", color: "text-blue-300" },
              { cond: "Br₂ ✗ + KMnO₄ ✗", result: "→ Alkane, Aromatic, Ester, or Amide", color: "text-slate-400" },
            ].map((r, i) => (
              <div key={i} className="bg-navy/50 rounded p-2">
                <span className="text-white font-semibold">{r.cond}</span>
                <span className={`ml-2 ${r.color}`}>{r.result}</span>
              </div>
            ))}
          </div>
          <p className="text-slate-400">Remember: these tests do not distinguish individual compounds within a class — further tests (e.g., Tollens', 2,4-DNP) are needed.</p>
        </div>
      ),
      quiz: {
        question: "An unknown compound decolourises bromine water rapidly but does NOT decolourise acidified KMnO₄. What is the most likely compound class?",
        options: [
          "Alkane — saturated compound",
          "Alkene — C=C present",
          "Alcohol — contains -OH group",
          "This combination is unusual — suggests the compound is atypical (e.g., some aromatic amine)",
        ],
        correctIndex: 3,
        explanation: "A compound that decolourises Br₂ but NOT KMnO₄ is unusual. Alkenes decolourise both. Alcohols typically give the opposite (KMnO₄ yes, Br₂ no). This pattern could suggest a compound like phenylamine (aniline) which reacts with Br₂ via electrophilic substitution on the ring but is less easily oxidised by cold KMnO₄. In practice, this result warrants further investigation.",
      },
      content: (
        <div className="space-y-4">
          {referenceTable}
          <div className="space-y-2">
            <p className="text-slate-400 text-xs font-orbitron tracking-wider">TEST REMAINING COMPOUNDS</p>
            {testUI}
          </div>
        </div>
      ),
      canProceed: true,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [br2TestsDone, kmno4TestsDone, selectedCompound, testedBr2, testedKMnO4, testsDone]);

  const persistentNotes = useMemo(
    () => <ObservationsPanel testsDone={testsDone} />,
    [testsDone]
  );

  return (
    <>
      <StepWizard
        steps={steps}
        persistentNotes={persistentNotes}
        experimentTitle="Tests for Unsaturation (Br₂ & KMnO₄)"
        onComplete={handleComplete}
      />
      {showCompletion && (
        <CompletionOverlay
          experimentTitle="Tests for Unsaturation (Br₂ & KMnO₄)"
          score={score}
          maxScore={120}
          itemsTested={testsDone.size}
          totalItems={COMPOUNDS.length * 2}
          timeSpentSeconds={Math.round((Date.now() - startTimeRef.current) / 1000)}
          onDoAgain={handleDoAgain}
        />
      )}
    </>
  );
}
