"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";

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

const GUIDED_STEPS = [
  {
    id: 0,
    title: "Prepare test tubes",
    instructions:
      "Prepare three test tubes for each compound: one with bromine water (orange-brown), one with acidified KMnO₄ (purple).",
  },
  {
    id: 1,
    title: "Add compound to Br₂ water",
    instructions:
      "Add a few drops of the test compound to bromine water. Shake gently. Decolourisation = unsaturated compound.",
  },
  {
    id: 2,
    title: "Add compound to KMnO₄",
    instructions:
      "Add compound to acidified KMnO₄. Decolourisation (purple → colourless) = unsaturated or reducing compound.",
  },
  {
    id: 3,
    title: "Interpret results",
    instructions:
      "Both Br₂ and KMnO₄ positive → alkene/alkyne. Only KMnO₄ positive → could be alcohol. Both negative → alkane or aromatic.",
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

// ─── Main ─────────────────────────────────────────────────────────────────────

interface UnsaturationTestProps {
  onScoreUpdate?: (pts: number) => void;
}

export function UnsaturationTest({ onScoreUpdate }: UnsaturationTestProps) {
  const { currentMode, currentStep, nextStep, addScore, addObservation } =
    useExperimentStore();

  const [selectedCompound, setSelectedCompound] = useState<Compound | null>(null);
  const [testedBr2, setTestedBr2] = useState(false);
  const [testedKMnO4, setTestedKMnO4] = useState(false);
  const [testsDone, setTestsDone] = useState<Set<string>>(new Set());

  function handleTestBr2() {
    if (!selectedCompound || testedBr2) return;
    setTestedBr2(true);
    addObservation(`${selectedCompound.formula} + Br₂(aq): ${selectedCompound.br2Obs}`);
    const key = `${selectedCompound.id}-br2`;
    if (!testsDone.has(key)) {
      setTestsDone((prev) => new Set(Array.from(prev).concat(key)));
      addScore(10);
      onScoreUpdate?.(10);
    }
    if (currentMode === "Guided" && currentStep === 1) nextStep();
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
    }
    if (currentMode === "Guided" && currentStep === 2) nextStep();
  }

  function handleReset() {
    setTestedBr2(false);
    setTestedKMnO4(false);
  }

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
          <span className="text-orange-400 font-semibold">Bromine water</span> (orange-brown) and{" "}
          <span className="text-purple-400 font-semibold">acidified KMnO₄</span> (purple) both decolourise
          with alkenes (addition/oxidation of C=C). Alkanes and aromatic compounds give negative results.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Compound selector */}
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

        {/* Right: test tubes and results */}
        <div className="space-y-4">
          {/* Tubes */}
          <div className="flex items-end justify-around gap-4 py-4">
            <div className="text-center">
              <ReagentTube
                initialColor="#D97706"
                finalColor="#F0F0E0"
                reacted={testedBr2 && selectedCompound?.br2Water === "positive"}
                label="Br₂ water"
              />
            </div>
            <div className="text-center">
              <ReagentTube
                initialColor="#7C3AED"
                finalColor="#D1FAE5"
                reacted={testedKMnO4 && selectedCompound?.kmno4 === "positive"}
                label="KMnO₄"
              />
            </div>
          </div>

          {/* Test buttons */}
          {selectedCompound && (
            <div className="flex gap-2 flex-wrap">
              <motion.button
                onClick={handleTestBr2}
                disabled={testedBr2}
                whileTap={{ scale: 0.96 }}
                className={`px-3 py-2 text-xs font-rajdhani font-semibold border rounded transition-all ${
                  testedBr2 ? "border-green-700/30 bg-green-900/10 text-green-400 cursor-default"
                  : "border-amber-600/40 text-amber-300 hover:bg-amber-900/20"
                }`}
              >
                {testedBr2 ? "✓ Br₂ tested" : "Add to Br₂ water"}
              </motion.button>
              <motion.button
                onClick={handleTestKMnO4}
                disabled={testedKMnO4}
                whileTap={{ scale: 0.96 }}
                className={`px-3 py-2 text-xs font-rajdhani font-semibold border rounded transition-all ${
                  testedKMnO4 ? "border-green-700/30 bg-green-900/10 text-green-400 cursor-default"
                  : "border-purple-600/40 text-purple-300 hover:bg-purple-900/20"
                }`}
              >
                {testedKMnO4 ? "✓ KMnO₄ tested" : "Add to KMnO₄"}
              </motion.button>
              <button onClick={handleReset}
                className="px-3 py-2 text-slate-400 hover:text-white text-xs font-rajdhani border border-border rounded transition-colors">
                New test
              </button>
            </div>
          )}

          {/* Observations */}
          <AnimatePresence>
            {testedBr2 && selectedCompound && (
              <motion.div
                className={`rounded border p-3 ${selectedCompound.br2Water === "positive" ? "border-green-600/30 bg-green-900/10" : "border-amber-700/30 bg-amber-900/10"}`}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p className={`font-orbitron text-xs mb-1 ${selectedCompound.br2Water === "positive" ? "text-green-400" : "text-amber-400"}`}>
                  Br₂ water: {selectedCompound.br2Water === "positive" ? "✓ POSITIVE" : "✗ NEGATIVE"}
                </p>
                <p className="text-slate-300 text-xs font-rajdhani">{selectedCompound.br2Obs}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {testedKMnO4 && selectedCompound && (
              <motion.div
                className={`rounded border p-3 ${selectedCompound.kmno4 === "positive" ? "border-green-600/30 bg-green-900/10" : "border-purple-700/30 bg-purple-900/10"}`}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p className={`font-orbitron text-xs mb-1 ${selectedCompound.kmno4 === "positive" ? "text-green-400" : "text-purple-400"}`}>
                  KMnO₄: {selectedCompound.kmno4 === "positive" ? "✓ POSITIVE" : "✗ NEGATIVE"}
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

      {/* Reference table */}
      <div className="rounded border border-border overflow-hidden">
        <div className="px-3 py-2 bg-navy/30 border-b border-border">
          <p className="text-xs font-orbitron text-slate-400 tracking-wider">REFERENCE</p>
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
    </div>
  );
}
