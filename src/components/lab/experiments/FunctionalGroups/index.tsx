"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface FunctionalGroup {
  id: string;
  name: string;
  generalFormula: string;
  color: string;
}

interface Test {
  id: string;
  name: string;
  reagent: string;
  condition: string;
  description: string;
}

interface TestResult {
  groupId: string;
  testId: string;
  result: "positive" | "negative";
  observation: string;
}

const GROUPS: FunctionalGroup[] = [
  { id: "alkene", name: "Alkene (C=C)", generalFormula: "R-CH=CH-R", color: "#22C55E" },
  { id: "alcohol", name: "Alcohol (-OH)", generalFormula: "R-OH", color: "#3B82F6" },
  { id: "aldehyde", name: "Aldehyde (-CHO)", generalFormula: "R-CHO", color: "#F59E0B" },
  { id: "ketone", name: "Ketone (C=O)", generalFormula: "R-CO-R", color: "#8B5CF6" },
  { id: "carboxylic", name: "Carboxylic acid (-COOH)", generalFormula: "R-COOH", color: "#EF4444" },
  { id: "ester", name: "Ester (-COO-)", generalFormula: "R-COO-R", color: "#EC4899" },
  { id: "amine", name: "Amine (-NH₂)", generalFormula: "R-NH₂", color: "#14B8A6" },
  { id: "amide", name: "Amide (-CONH₂)", generalFormula: "R-CONH₂", color: "#F97316" },
];

const TESTS: Test[] = [
  { id: "bromine", name: "Bromine water", reagent: "Br₂(aq)", condition: "Room temp", description: "Decolourisation of orange-brown Br₂" },
  { id: "kmno4", name: "KMnO₄ test", reagent: "Acidified KMnO₄(aq)", condition: "Room temp", description: "Purple → colourless" },
  { id: "na-metal", name: "Sodium metal", reagent: "Na(s)", condition: "Anhydrous", description: "Effervescence (H₂ gas)" },
  { id: "litmus", name: "Litmus paper", reagent: "Blue litmus", condition: "Solution", description: "Blue → red (acidic)" },
  { id: "na2co3", name: "Na₂CO₃ test", reagent: "Na₂CO₃(aq)", condition: "Room temp", description: "Effervescence (CO₂)" },
  { id: "tollens", name: "Tollens' test", reagent: "[Ag(NH₃)₂]⁺", condition: "Warm 60°C", description: "Silver mirror" },
  { id: "fehling", name: "Fehling's test", reagent: "Fehling's A+B", condition: "Boil", description: "Blue → brick-red" },
  { id: "2-4-dnp", name: "2,4-DNP test", reagent: "2,4-dinitrophenylhydrazine", condition: "Room temp", description: "Orange/yellow precipitate" },
  { id: "lucas", name: "Lucas test", reagent: "ZnCl₂/conc. HCl", condition: "Room temp", description: "Turbidity (3° fast, 2° slow, 1° no)" },
  { id: "pcl5", name: "PCl₅ test", reagent: "Phosphorus pentachloride", condition: "Anhydrous", description: "White fumes of HCl" },
];

// Results matrix
const RESULTS: TestResult[] = [
  // Alkene
  { groupId: "alkene", testId: "bromine", result: "positive", observation: "Orange-brown Br₂ water decolourises rapidly" },
  { groupId: "alkene", testId: "kmno4", result: "positive", observation: "Purple KMnO₄ decolourises" },
  { groupId: "alkene", testId: "na-metal", result: "negative", observation: "No reaction" },
  { groupId: "alkene", testId: "tollens", result: "negative", observation: "No silver mirror" },
  { groupId: "alkene", testId: "fehling", result: "negative", observation: "No colour change" },
  { groupId: "alkene", testId: "2-4-dnp", result: "negative", observation: "No precipitate" },

  // Alcohol
  { groupId: "alcohol", testId: "na-metal", result: "positive", observation: "Effervescence (H₂ gas): 2ROH + 2Na → 2RONa + H₂↑" },
  { groupId: "alcohol", testId: "pcl5", result: "positive", observation: "White steamy fumes of HCl" },
  { groupId: "alcohol", testId: "bromine", result: "negative", observation: "No decolourisation (unless phenol)" },
  { groupId: "alcohol", testId: "litmus", result: "negative", observation: "Neutral — alcohols are not acidic" },
  { groupId: "alcohol", testId: "na2co3", result: "negative", observation: "No effervescence" },
  { groupId: "alcohol", testId: "tollens", result: "negative", observation: "No silver mirror" },

  // Aldehyde
  { groupId: "aldehyde", testId: "tollens", result: "positive", observation: "Silver mirror forms on tube wall" },
  { groupId: "aldehyde", testId: "fehling", result: "positive", observation: "Deep blue → brick-red Cu₂O precipitate" },
  { groupId: "aldehyde", testId: "2-4-dnp", result: "positive", observation: "Orange/yellow crystalline precipitate" },
  { groupId: "aldehyde", testId: "bromine", result: "positive", observation: "Decolourises (oxidation of CHO)" },
  { groupId: "aldehyde", testId: "kmno4", result: "positive", observation: "Purple → colourless (oxidised to RCOOH)" },
  { groupId: "aldehyde", testId: "litmus", result: "negative", observation: "Neutral" },

  // Ketone
  { groupId: "ketone", testId: "2-4-dnp", result: "positive", observation: "Orange/yellow precipitate" },
  { groupId: "ketone", testId: "tollens", result: "negative", observation: "No silver mirror — ketones cannot reduce Ag⁺" },
  { groupId: "ketone", testId: "fehling", result: "negative", observation: "Solution remains deep blue" },
  { groupId: "ketone", testId: "bromine", result: "negative", observation: "No rapid decolourisation" },
  { groupId: "ketone", testId: "litmus", result: "negative", observation: "Neutral" },

  // Carboxylic acid
  { groupId: "carboxylic", testId: "litmus", result: "positive", observation: "Blue litmus turns red (acidic)" },
  { groupId: "carboxylic", testId: "na2co3", result: "positive", observation: "Effervescence — CO₂ gas: RCOOH + Na₂CO₃ → RCOONa + CO₂↑ + H₂O" },
  { groupId: "carboxylic", testId: "na-metal", result: "positive", observation: "Effervescence (H₂ gas)" },
  { groupId: "carboxylic", testId: "pcl5", result: "positive", observation: "White fumes of HCl" },
  { groupId: "carboxylic", testId: "tollens", result: "negative", observation: "No silver mirror" },
  { groupId: "carboxylic", testId: "2-4-dnp", result: "negative", observation: "No precipitate" },

  // Ester
  { groupId: "ester", testId: "litmus", result: "negative", observation: "Neutral — esters are not acidic" },
  { groupId: "ester", testId: "na2co3", result: "negative", observation: "No effervescence" },
  { groupId: "ester", testId: "na-metal", result: "negative", observation: "No reaction" },
  { groupId: "ester", testId: "tollens", result: "negative", observation: "No silver mirror" },
  { groupId: "ester", testId: "bromine", result: "negative", observation: "No decolourisation" },
  { groupId: "ester", testId: "pcl5", result: "positive", observation: "White fumes of HCl" },

  // Amine
  { groupId: "amine", testId: "litmus", result: "negative", observation: "Red litmus turns blue (basic solution)" },
  { groupId: "amine", testId: "na-metal", result: "negative", observation: "No significant reaction" },
  { groupId: "amine", testId: "bromine", result: "negative", observation: "No decolourisation (primary alkyl amines)" },

  // Amide
  { groupId: "amide", testId: "litmus", result: "negative", observation: "Nearly neutral" },
  { groupId: "amide", testId: "na2co3", result: "negative", observation: "No effervescence" },
  { groupId: "amide", testId: "tollens", result: "negative", observation: "No silver mirror" },
];

function getResult(groupId: string, testId: string): TestResult | null {
  return RESULTS.find((r) => r.groupId === groupId && r.testId === testId) ?? null;
}

const GUIDED_STEPS = [
  {
    id: 0,
    title: "Understand functional groups",
    instructions: "Each functional group has characteristic chemical reactions. We use a systematic series of tests to identify which functional group is present in an unknown compound.",
  },
  {
    id: 1,
    title: "Test for unsaturation",
    instructions: "First check for C=C double bonds using bromine water (decolourisation) and KMnO₄ (purple to colourless). Both positive → alkene.",
  },
  {
    id: 2,
    title: "Test for carbonyl group",
    instructions: "Use 2,4-DNP (orange/yellow ppt) to confirm aldehyde or ketone. Then use Tollens' or Fehling's to distinguish aldehyde from ketone.",
  },
  {
    id: 3,
    title: "Test for acidic groups",
    instructions: "Blue litmus turns red → acidic group. Na₂CO₃ effervescence confirms carboxylic acid (pKa ~5) vs phenol (pKa ~10).",
  },
  {
    id: 4,
    title: "Conclude the identification",
    instructions: "Compile all observations and match to the functional group that explains all positive and negative results.",
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

interface FunctionalGroupsProps {
  onScoreUpdate?: (pts: number) => void;
}

export function FunctionalGroups({ onScoreUpdate }: FunctionalGroupsProps) {
  const { currentMode, currentStep, nextStep, addScore, addObservation } =
    useExperimentStore();

  const [selectedGroup, setSelectedGroup] = useState<FunctionalGroup | null>(null);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [testsDone, setTestsDone] = useState<Set<string>>(new Set());
  const [currentResult, setCurrentResult] = useState<TestResult | null>(null);
  const [unknownGroup] = useState<FunctionalGroup>(GROUPS[Math.floor(Math.random() * GROUPS.length)]);
  const [examAnswer, setExamAnswer] = useState<string>("");
  const [examSubmitted, setExamSubmitted] = useState(false);
  const isExam = currentMode === "Exam";
  const displayGroup = isExam ? unknownGroup : selectedGroup;

  function handleRunTest() {
    if (!displayGroup || !selectedTest) return;
    const result = getResult(displayGroup.id, selectedTest.id);
    if (!result) return;

    setCurrentResult(result);
    const key = `${displayGroup.id}-${selectedTest.id}`;
    if (!testsDone.has(key)) {
      setTestsDone((prev) => new Set(Array.from(prev).concat(key)));
      addScore(8);
      onScoreUpdate?.(8);
      addObservation(`${selectedTest.name} on ${displayGroup.name}: ${result.observation}`);
    }

    if (currentMode === "Guided") {
      if (selectedTest.id === "bromine" && currentStep === 1) nextStep();
      if (selectedTest.id === "2-4-dnp" && currentStep === 2) nextStep();
      if (selectedTest.id === "litmus" && currentStep === 3) nextStep();
    }
  }

  function handleExamSubmit() {
    setExamSubmitted(true);
    if (examAnswer === unknownGroup.id) {
      addScore(30);
      onScoreUpdate?.(30);
    }
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: group selector */}
        <div className="space-y-3">
          {isExam ? (
            <div className="bg-red-900/20 border border-red-700/40 rounded p-3">
              <p className="text-red-300 font-orbitron text-xs">EXAM MODE — Unknown Compound</p>
              <p className="text-slate-300 text-xs font-rajdhani mt-1">
                Run tests to identify the functional group.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-slate-400 text-xs font-orbitron tracking-wider mb-2">SELECT FUNCTIONAL GROUP</p>
              <div className="grid grid-cols-2 gap-1.5">
                {GROUPS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => { setSelectedGroup(g); setCurrentResult(null); }}
                    className={`p-2 rounded border text-left text-xs font-rajdhani transition-all ${
                      selectedGroup?.id === g.id
                        ? "border-2 text-white"
                        : "border-border text-slate-300 hover:border-slate-500"
                    }`}
                    style={selectedGroup?.id === g.id ? { borderColor: g.color, backgroundColor: g.color + "15" } : undefined}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                      <span className="font-semibold truncate">{g.name}</span>
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5 font-mono">{g.generalFormula}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Test selector */}
          <div>
            <p className="text-slate-400 text-xs font-orbitron tracking-wider mb-2">SELECT TEST</p>
            <div className="space-y-1">
              {TESTS.map((t) => {
                const done = displayGroup && testsDone.has(`${displayGroup.id}-${t.id}`);
                const r = displayGroup ? getResult(displayGroup.id, t.id) : null;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTest(t)}
                    disabled={!displayGroup}
                    className={`w-full p-2 rounded border text-left text-xs font-rajdhani transition-all ${
                      !displayGroup ? "opacity-40 cursor-not-allowed" : ""
                    } ${selectedTest?.id === t.id
                      ? "border-teal/50 bg-teal/10 text-white"
                      : "border-border text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold">{t.name}</span>
                        <span className="text-slate-500 ml-1">({t.reagent})</span>
                      </div>
                      {done && r && (
                        <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                          r.result === "positive" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
                        }`}>
                          {r.result === "positive" ? "+" : "−"}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: result panel */}
        <div className="space-y-3">
          {selectedTest && (
            <div className="bg-navy/40 border border-border rounded p-3">
              <p className="text-slate-400 text-xs font-orbitron tracking-wider mb-2">SELECTED TEST</p>
              <p className="text-white font-rajdhani font-semibold">{selectedTest.name}</p>
              <div className="text-xs font-rajdhani space-y-0.5 mt-1">
                <p className="text-slate-400">Reagent: <span className="text-white">{selectedTest.reagent}</span></p>
                <p className="text-slate-400">Condition: <span className="text-white">{selectedTest.condition}</span></p>
                <p className="text-slate-400">Positive result: <span className="text-teal">{selectedTest.description}</span></p>
              </div>
              <motion.button
                onClick={handleRunTest}
                disabled={!displayGroup}
                whileTap={{ scale: 0.96 }}
                className="mt-3 w-full px-3 py-2 bg-teal/20 hover:bg-teal/30 disabled:opacity-40 text-teal text-xs font-rajdhani font-semibold border border-teal/30 rounded transition-all"
              >
                Run Test →
              </motion.button>
            </div>
          )}

          <AnimatePresence>
            {currentResult && (
              <motion.div
                className={`rounded border p-4 ${
                  currentResult.result === "positive"
                    ? "border-green-600/40 bg-green-900/20"
                    : "border-red-600/40 bg-red-900/20"
                }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <p className={`font-orbitron text-sm font-bold mb-1 ${
                  currentResult.result === "positive" ? "text-green-400" : "text-red-400"
                }`}>
                  {currentResult.result === "positive" ? "✓ POSITIVE" : "✗ NEGATIVE"}
                </p>
                <p className="text-white font-rajdhani text-sm">{currentResult.observation}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results summary for this group */}
          {displayGroup && testsDone.size > 0 && (
            <div className="rounded border border-border overflow-hidden">
              <div className="px-3 py-2 bg-navy/30 border-b border-border">
                <p className="text-xs font-orbitron text-slate-400 tracking-wider">TEST RESULTS</p>
              </div>
              <div className="p-2 space-y-1">
                {TESTS.filter((t) => testsDone.has(`${displayGroup.id}-${t.id}`)).map((t) => {
                  const r = getResult(displayGroup.id, t.id);
                  return (
                    <div key={t.id} className="flex items-center gap-2 text-xs font-rajdhani">
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        r?.result === "positive" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
                      }`}>
                        {r?.result === "positive" ? "+" : "−"}
                      </span>
                      <span className="text-slate-300">{t.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Exam answer */}
          {isExam && testsDone.size >= 3 && !examSubmitted && (
            <motion.div className="border border-red-700/40 rounded p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-white font-rajdhani text-sm font-semibold mb-2">Identify the functional group:</p>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {GROUPS.map((g) => (
                  <button key={g.id} onClick={() => setExamAnswer(g.id)}
                    className={`p-2 rounded border text-xs font-rajdhani transition-all text-left ${
                      examAnswer === g.id ? "border-teal bg-teal/20 text-teal" : "border-border text-slate-300"
                    }`}>
                    {g.name}
                  </button>
                ))}
              </div>
              <button onClick={handleExamSubmit} disabled={!examAnswer}
                className="w-full bg-red-800/50 hover:bg-red-700/60 disabled:opacity-40 text-white font-orbitron text-xs py-2 rounded border border-red-600/50 transition-all">
                SUBMIT
              </button>
            </motion.div>
          )}

          {examSubmitted && (
            <motion.div
              className={`rounded border p-3 ${examAnswer === unknownGroup.id ? "border-green-500/40 bg-green-900/20" : "border-red-500/40 bg-red-900/20"}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              <p className={`font-orbitron text-sm font-bold mb-1 ${examAnswer === unknownGroup.id ? "text-green-400" : "text-red-400"}`}>
                {examAnswer === unknownGroup.id ? "✓ CORRECT!" : "✗ INCORRECT"}
              </p>
              <p className="text-white font-rajdhani text-sm">
                The compound was: <strong style={{ color: unknownGroup.color }}>{unknownGroup.name}</strong>
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Quick reference flowchart */}
      <div className="rounded border border-border overflow-hidden">
        <div className="px-3 py-2 bg-navy/30 border-b border-border">
          <p className="text-xs font-orbitron text-slate-400 tracking-wider">IDENTIFICATION FLOWCHART</p>
        </div>
        <div className="p-3 text-xs font-rajdhani space-y-2">
          {[
            { test: "Bromine water + KMnO₄ → positive", result: "→ ALKENE (C=C)" },
            { test: "2,4-DNP → positive", result: "→ Carbonyl compound (aldehyde or ketone)" },
            { test: "2,4-DNP + Tollens'/Fehling's → positive", result: "→ ALDEHYDE" },
            { test: "2,4-DNP + Tollens'/Fehling's → negative", result: "→ KETONE" },
            { test: "Litmus red + Na₂CO₃ effervescence", result: "→ CARBOXYLIC ACID" },
            { test: "Litmus neutral + Na effervescence", result: "→ ALCOHOL" },
            { test: "Litmus neutral + PCl₅ only", result: "→ ESTER" },
          ].map((item, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-slate-500 flex-shrink-0">→</span>
              <div>
                <span className="text-slate-300">{item.test}</span>
                <span className="text-teal font-semibold ml-2">{item.result}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
