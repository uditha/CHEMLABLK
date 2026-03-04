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

// ─── Observations panel ───────────────────────────────────────────────────────

function ObservationsPanel({
  testsDone,
  displayGroup,
}: {
  testsDone: Set<string>;
  displayGroup: FunctionalGroup | null;
}) {
  const groupTests = displayGroup
    ? TESTS.filter((t) => testsDone.has(`${displayGroup.id}-${t.id}`))
    : [];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-orbitron text-slate-400 tracking-wider mb-1">TESTS RUN</p>
        <p className="text-teal text-sm font-orbitron">{testsDone.size}</p>
        {displayGroup && (
          <p className="text-slate-500 text-xs font-rajdhani mt-1">On: {displayGroup.name}</p>
        )}
      </div>
      {groupTests.length > 0 && (
        <div className="space-y-1">
          {groupTests.map((t) => {
            const r = displayGroup ? getResult(displayGroup.id, t.id) : null;
            return (
              <div key={t.id} className="flex items-center gap-2 text-xs font-rajdhani">
                <span className={`w-5 h-5 rounded flex items-center justify-center font-bold flex-shrink-0 ${
                  r?.result === "positive" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
                }`}>
                  {r?.result === "positive" ? "+" : "−"}
                </span>
                <span className="text-slate-300">{t.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface FunctionalGroupsProps {
  onScoreUpdate?: (pts: number) => void;
}

export function FunctionalGroups({ onScoreUpdate }: FunctionalGroupsProps) {
  const { addScore, addObservation, setTotalSteps, setStep, score, completeMode, currentMode, resetExperiment } =
    useExperimentStore();
  const { playSuccess } = useSoundEffects();
  const { data: session } = useSession();
  const startTimeRef = useRef(Date.now());

  const [showCompletion, setShowCompletion] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<FunctionalGroup | null>(null);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [testsDone, setTestsDone] = useState<Set<string>>(new Set());
  const [currentResult, setCurrentResult] = useState<TestResult | null>(null);
  const [unknownGroup] = useState<FunctionalGroup>(GROUPS[Math.floor(Math.random() * GROUPS.length)]);
  const [examAnswer, setExamAnswer] = useState<string>("");
  const [examSubmitted, setExamSubmitted] = useState(false);

  const isExam = currentMode === "Exam";
  const displayGroup = isExam ? unknownGroup : selectedGroup;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => { setTotalSteps(4); }, []);

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
      playSuccess();
      addObservation(`${selectedTest.name} on ${displayGroup.name}: ${result.observation}`);
    }
  }

  function handleExamSubmit() {
    setExamSubmitted(true);
    if (examAnswer === unknownGroup.id) {
      addScore(30);
      onScoreUpdate?.(30);
      playSuccess();
    }
  }

  function handleComplete() {
    completeMode("functional-group-identification", currentMode);
    setShowCompletion(true);
    if (session?.user?.role === "student") {
      const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      saveProgress({
        slug: "functional-group-identification",
        mode: currentMode,
        score: Math.min(score, 100),
        timeSpentSeconds,
      }).catch(() => {});
    }
  }

  function handleDoAgain() {
    setShowCompletion(false);
    setSelectedGroup(null);
    setSelectedTest(null);
    setTestsDone(new Set());
    setCurrentResult(null);
    setExamAnswer("");
    setExamSubmitted(false);
    startTimeRef.current = Date.now();
    resetExperiment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setTotalSteps(4);
  }

  // ─── Shared test panel UI ────────────────────────────────────────────────────
  const testPanel = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-3">
        {isExam ? (
          <div className="bg-red-900/20 border border-red-700/40 rounded p-3">
            <p className="text-red-300 font-orbitron text-xs">EXAM MODE — Unknown Compound</p>
            <p className="text-slate-300 text-xs font-rajdhani mt-1">Run tests to identify the functional group.</p>
          </div>
        ) : (
          <div>
            <p className="text-slate-400 text-xs font-orbitron tracking-wider mb-2">SELECT FUNCTIONAL GROUP</p>
            <div className="grid grid-cols-2 gap-1.5">
              {GROUPS.map((g) => (
                <button key={g.id}
                  onClick={() => { setSelectedGroup(g); setCurrentResult(null); }}
                  className={`p-2 rounded border text-left text-xs font-rajdhani transition-all ${
                    selectedGroup?.id === g.id ? "border-2 text-white" : "border-border text-slate-300 hover:border-slate-500"
                  }`}
                  style={selectedGroup?.id === g.id ? { borderColor: g.color, backgroundColor: g.color + "15" } : undefined}>
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

        <div>
          <p className="text-slate-400 text-xs font-orbitron tracking-wider mb-2">SELECT TEST</p>
          <div className="space-y-1">
            {TESTS.map((t) => {
              const done = displayGroup && testsDone.has(`${displayGroup.id}-${t.id}`);
              const r = displayGroup ? getResult(displayGroup.id, t.id) : null;
              return (
                <button key={t.id}
                  onClick={() => setSelectedTest(t)}
                  disabled={!displayGroup}
                  className={`w-full p-2 rounded border text-left text-xs font-rajdhani transition-all ${
                    !displayGroup ? "opacity-40 cursor-not-allowed" : ""
                  } ${selectedTest?.id === t.id
                    ? "border-teal/50 bg-teal/10 text-white"
                    : "border-border text-slate-300 hover:border-slate-500"
                  }`}>
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
            <motion.button onClick={handleRunTest} disabled={!displayGroup} whileTap={{ scale: 0.96 }}
              className="mt-3 w-full px-3 py-2 bg-teal/20 hover:bg-teal/30 disabled:opacity-40 text-teal text-xs font-rajdhani font-semibold border border-teal/30 rounded transition-all">
              Run Test →
            </motion.button>
          </div>
        )}

        <AnimatePresence>
          {currentResult && (
            <motion.div className={`rounded border p-4 ${
              currentResult.result === "positive" ? "border-green-600/40 bg-green-900/20" : "border-red-600/40 bg-red-900/20"
            }`}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className={`font-orbitron text-sm font-bold mb-1 ${
                currentResult.result === "positive" ? "text-green-400" : "text-red-400"
              }`}>
                {currentResult.result === "positive" ? "✓ POSITIVE" : "✗ NEGATIVE"}
              </p>
              <p className="text-white font-rajdhani text-sm">{currentResult.observation}</p>
            </motion.div>
          )}
        </AnimatePresence>

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
      </div>
    </div>
  );

  // ─── Flowchart ───────────────────────────────────────────────────────────────
  const flowchart = (
    <div className="rounded border border-border overflow-hidden">
      <div className="px-3 py-2 bg-navy/30 border-b border-border">
        <p className="text-xs font-orbitron text-slate-400 tracking-wider">IDENTIFICATION FLOWCHART</p>
      </div>
      <div className="p-3 text-xs font-rajdhani space-y-2">
        {[
          { test: "Br₂ water + KMnO₄ → both positive", result: "→ ALKENE (C=C)" },
          { test: "2,4-DNP → positive", result: "→ Carbonyl compound (aldehyde or ketone)" },
          { test: "2,4-DNP + Tollens'/Fehling's → positive", result: "→ ALDEHYDE" },
          { test: "2,4-DNP → positive, Tollens'/Fehling's → negative", result: "→ KETONE" },
          { test: "Litmus red + Na₂CO₃ effervescence", result: "→ CARBOXYLIC ACID" },
          { test: "Litmus neutral + Na effervescence (no CO₂)", result: "→ ALCOHOL" },
          { test: "Litmus neutral + PCl₅ only (HCl fumes)", result: "→ ESTER" },
          { test: "Litmus blue (basic) → amine behaviour", result: "→ AMINE" },
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
  );

  // ─── Steps ─────────────────────────────────────────────────────────────────
  const steps: StepDefinition[] = useMemo(() => [
    {
      id: "intro",
      title: "Functional Group Identification",
      subtitle: "Systematic chemical testing scheme",
      instructions: {
        procedure: [
          "Understand that functional groups determine chemical reactivity",
          "A systematic series of tests is used to identify the functional group present",
          "Each test probes for a specific type of bond or atom group",
          "Compile all positive and negative results to draw a final conclusion",
          "Select a functional group (or work in Exam mode) then choose tests to run",
        ],
        safetyNotes: [
          "Tollens' reagent: prepare fresh and do not store — can form explosive silver nitride",
          "2,4-DNP: toxic and potentially explosive in pure form — use prepared solution",
          "Na metal: extremely reactive with water — use tiny pieces in anhydrous conditions",
          "PCl₅: reacts violently with water, giving HCl fumes — handle carefully",
        ],
        expectedObservations: [
          "Each test gives a clear positive (colour change, precipitate, gas) or negative",
          "Multiple tests are needed to conclusively identify a functional group",
          "Some tests are specific (e.g., Tollens' for aldehyde), others are broad",
        ],
        tips: [
          "Follow the flowchart: test unsaturation first, then carbonyl, then acidic groups",
          "Always state both the observation AND the conclusion in exam answers",
          "Negative results are equally important — they rule out alternatives",
          "2,4-DNP detects both aldehydes AND ketones — use Tollens'/Fehling's to differentiate",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Key Tests Summary</p>
          <div className="space-y-1">
            {[
              { test: "Bromine water", specific: "C=C bonds (alkenes)", obs: "Decolourises orange-brown" },
              { test: "Tollens'", specific: "Aldehydes only", obs: "Silver mirror" },
              { test: "Fehling's", specific: "Aliphatic aldehydes", obs: "Brick-red Cu₂O" },
              { test: "2,4-DNP", specific: "Aldehydes + ketones", obs: "Orange/yellow ppt" },
              { test: "Na₂CO₃", specific: "Carboxylic acids", obs: "CO₂ effervescence" },
              { test: "Na metal", specific: "Acidic H (RCOOH, ROH)", obs: "H₂ effervescence" },
              { test: "Litmus", specific: "Acidic/basic groups", obs: "Colour change" },
            ].map((r) => (
              <div key={r.test} className="flex gap-2 py-0.5 border-b border-border/30">
                <span className="text-teal w-24 flex-shrink-0">{r.test}</span>
                <span className="text-white">{r.specific}</span>
              </div>
            ))}
          </div>
        </div>
      ),
      quiz: {
        question: "An unknown compound gives a positive result with 2,4-DNP but a negative result with Tollens' reagent. What is the functional group?",
        options: [
          "Aldehyde — both tests should be positive for aldehydes",
          "Ketone — 2,4-DNP positive but no silver mirror with Tollens'",
          "Carboxylic acid — it reacts with 2,4-DNP",
          "Alcohol — alcohols give a yellow precipitate",
        ],
        correctIndex: 1,
        explanation: "2,4-DNP reacts with both aldehydes AND ketones (both have C=O group) giving an orange/yellow precipitate. Tollens' reagent is selective for aldehydes only — it forms a silver mirror. A compound that gives 2,4-DNP positive but Tollens' negative must be a ketone, which cannot reduce Ag⁺ to Ag.",
      },
      content: (
        <div className="space-y-4">
          <div className="bg-navy/40 border border-border rounded p-4 text-xs font-rajdhani">
            <p className="text-teal font-semibold mb-2">What are Functional Groups?</p>
            <p className="text-slate-300 leading-relaxed">
              A functional group is a specific atom or group of atoms within a molecule that is responsible
              for its characteristic chemical reactions. Different functional groups react differently with
              the same reagent, allowing chemical identification.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {GROUPS.map((g) => (
              <div key={g.id} className="flex items-center gap-2 p-2 rounded border border-border text-xs font-rajdhani">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                <div>
                  <p className="text-white font-semibold">{g.name}</p>
                  <p className="text-slate-500 font-mono">{g.generalFormula}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-500 text-xs font-rajdhani">
            Proceed to learn the testing scheme systematically.
          </p>
        </div>
      ),
      canProceed: true,
    },
    {
      id: "unsaturation-carbonyl",
      title: "Test for Unsaturation & Carbonyl",
      subtitle: "First two stages of identification",
      instructions: {
        procedure: [
          "Select a functional group (or use Exam mode for an unknown)",
          "Run: Bromine water test — positive confirms C=C (alkene)",
          "Run: 2,4-DNP test — positive confirms a carbonyl group (C=O)",
          "If both Br₂ and KMnO₄ are positive → alkene",
          "If 2,4-DNP positive → run Tollens' or Fehling's to distinguish aldehyde vs ketone",
          "Run at least 4 different tests before proceeding",
        ],
        expectedObservations: [
          "Alkene: Br₂ ✓, KMnO₄ ✓, 2,4-DNP ✗",
          "Aldehyde: 2,4-DNP ✓, Tollens' ✓, Fehling's ✓",
          "Ketone: 2,4-DNP ✓, Tollens' ✗, Fehling's ✗",
        ],
        tips: [
          "Start with Br₂ water — if positive, likely alkene, no need for many other tests",
          "2,4-DNP is the 'carbonyl detector' — positive for both aldehydes and ketones",
          "Use Tollens' or Fehling's to distinguish: both positive for aldehydes, both negative for ketones",
          "Remember: aldehydes are reducing agents (can reduce Ag⁺), ketones cannot",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Aldehyde vs Ketone</p>
          <div className="space-y-2">
            <div className="bg-navy/50 border border-amber-500/20 rounded p-2">
              <p className="text-amber-400 font-semibold">Aldehyde (R-CHO)</p>
              <p>Has a H on the carbonyl carbon — this makes it a reducing agent:</p>
              <p className="font-mono text-xs">R-CHO + 2[Ag(NH₃)₂]⁺ + 2OH⁻ → R-COO⁻ + 2Ag↓ + 4NH₃ + H₂O</p>
            </div>
            <div className="bg-navy/50 border border-purple-500/20 rounded p-2">
              <p className="text-purple-400 font-semibold">Ketone (R-CO-R)</p>
              <p>No H on carbonyl carbon — cannot be oxidised under mild conditions. Does NOT reduce Tollens' or Fehling's.</p>
            </div>
          </div>
          <p>The 2,4-DNP test detects the C=O group in BOTH — it reacts by condensation (not oxidation), so it doesn&apos;t depend on reducing ability.</p>
        </div>
      ),
      quiz: {
        question: "Why do aldehydes give a positive Tollens' test but ketones do not?",
        options: [
          "Aldehydes contain more carbon atoms",
          "Aldehydes have a hydrogen on the carbonyl carbon, making them reducing agents that can oxidise Ag⁺ to Ag",
          "Ketones are too large to react with the reagent",
          "Tollens' reagent only works with straight-chain compounds",
        ],
        correctIndex: 1,
        explanation: "Aldehydes (R-CHO) have a hydrogen directly bonded to the carbonyl carbon. This makes them mild reducing agents — they can be oxidised to carboxylic acids (RCOOH) while reducing Ag⁺ → Ag (silver mirror). Ketones (R-CO-R) have two carbon groups instead, so they cannot be oxidised under these mild conditions and give a negative Tollens' result.",
      },
      content: testPanel,
      canProceed: testsDone.size >= 4,
    },
    {
      id: "acidic-groups",
      title: "Test for Acidic & Other Groups",
      subtitle: "Distinguish carboxylic acid, alcohol, ester, amine",
      instructions: {
        procedure: [
          "Run litmus test: blue litmus turning red indicates an acidic compound",
          "If acidic: test with Na₂CO₃ — effervescence (CO₂) confirms carboxylic acid",
          "If not acidic with Na₂CO₃: but reacts with Na metal → alcohol",
          "Test with PCl₅: white HCl fumes from -OH or -COOH groups",
          "If litmus turns blue: compound is basic → amine",
          "Continue testing — aim for 8 or more tests",
        ],
        expectedObservations: [
          "Carboxylic acid: litmus ✓ (red), Na₂CO₃ ✓ (CO₂), Na ✓ (H₂)",
          "Alcohol: litmus ✗ (neutral), Na₂CO₃ ✗, Na ✓ (H₂), PCl₅ ✓",
          "Ester: all acidic tests ✗, PCl₅ ✓",
          "Amine: litmus shows blue (basic)",
        ],
        tips: [
          "Key distinction: carboxylic acid (litmus red + CO₂ with Na₂CO₃) vs alcohol (neutral litmus, Na but no CO₂)",
          "pKa(RCOOH) ≈ 5, pKa(ROH) ≈ 16 — alcohols too weak to react with Na₂CO₃",
          "PCl₅ reacts with any compound containing an -OH group (alcohol, carboxylic acid) or C=O (ester, acid chloride)",
          "Esters: neutral to litmus, no Na₂CO₃ reaction, but PCl₅ gives HCl fumes",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Acidic Group Tests</p>
          <div className="space-y-2">
            <div className="bg-navy/50 border border-red-500/20 rounded p-2">
              <p className="text-red-400 font-semibold">Carboxylic Acid (-COOH)</p>
              <p>Strong enough acid to: turn litmus red, react with Na₂CO₃ (CO₂), react with Na (H₂).</p>
              <p className="font-mono text-xs">RCOOH + Na₂CO₃ → RCOONa + CO₂↑ + H₂O</p>
            </div>
            <div className="bg-navy/50 border border-blue-500/20 rounded p-2">
              <p className="text-blue-400 font-semibold">Alcohol (-OH)</p>
              <p>Very weak acid (pKa ~16) — neutral to litmus, no CO₂ with Na₂CO₃, but reacts with Na:</p>
              <p className="font-mono text-xs">2ROH + 2Na → 2RONa + H₂↑</p>
            </div>
            <div className="bg-navy/50 border border-pink-500/20 rounded p-2">
              <p className="text-pink-400 font-semibold">Ester (-COO-)</p>
              <p>No acidic/basic groups — neutral. No Na₂CO₃ or Na reactions. PCl₅ gives HCl.</p>
            </div>
          </div>
        </div>
      ),
      quiz: {
        question: "A compound turns litmus red but does NOT produce effervescence with Na₂CO₃. What functional group does it contain?",
        options: [
          "Carboxylic acid — should produce CO₂ with Na₂CO₃",
          "Phenol — acidic enough for litmus but too weak to react with Na₂CO₃",
          "Alcohol — neutral litmus",
          "Ester — neutral, no acidic groups",
        ],
        correctIndex: 1,
        explanation: "Phenol (C₆H₅OH) is acidic enough to turn litmus red (pKa ≈ 10) but is a much weaker acid than carboxylic acids (pKa ≈ 5). It is NOT strong enough to react with Na₂CO₃ to produce CO₂ gas. This combination — litmus red, no CO₂ with Na₂CO₃ — is the diagnostic test for phenol vs carboxylic acid.",
      },
      content: testPanel,
      canProceed: testsDone.size >= 8,
    },
    {
      id: "conclusion",
      title: "Identify & Conclude",
      subtitle: "Apply the flowchart and exam-mode identification",
      instructions: {
        procedure: [
          "Review the identification flowchart for the systematic decision tree",
          "In Exam mode: compile your test results and select your answer",
          "Check: do your results match all positive AND negative tests for that group?",
          "Write a conclusion: 'The compound contains a [functional group] because...'",
          "State each key observation and what it proves",
        ],
        expectedObservations: [
          "A complete set of tests gives an unambiguous identification",
          "Negative results rule out alternatives just as much as positives confirm",
          "The flowchart guides the most efficient order of testing",
        ],
        tips: [
          "In exam: always write 'The compound is [group] because...' — show reasoning",
          "Cite at least 2 positive tests for your conclusion",
          "Also mention 1-2 negative tests that rule out alternatives",
          "State the reagent used AND the observation — not just the conclusion",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Exam Answer Structure</p>
          <div className="bg-navy/50 border border-teal/20 rounded p-3 space-y-1">
            <p className="text-white font-semibold">For an aldehyde (e.g., ethanal):</p>
            <p>1. Add 2,4-DNP → orange precipitate → confirms C=O group</p>
            <p>2. Add Tollens' reagent, warm → silver mirror → confirms aldehyde (reducing agent)</p>
            <p>3. Add Fehling's, boil → brick-red precipitate → confirms aliphatic aldehyde</p>
            <p>4. Add Br₂ water → no decolourisation → no C=C bond</p>
            <p className="text-teal">Conclusion: The compound is an aldehyde (R-CHO).</p>
          </div>
          <p>Negative tests are part of the identification — they eliminate other possibilities.</p>
        </div>
      ),
      quiz: {
        question: "Which combination of test results uniquely identifies a carboxylic acid?",
        options: [
          "Litmus red + Na₂CO₃ effervescence + Tollens' positive",
          "Litmus red + Na₂CO₃ effervescence + Tollens' negative + Na metal effervescence",
          "2,4-DNP positive + Tollens' negative",
          "Litmus neutral + PCl₅ positive",
        ],
        correctIndex: 1,
        explanation: "A carboxylic acid: turns litmus red (it's acidic), reacts with Na₂CO₃ to give CO₂ effervescence (stronger acid than alcohols), reacts with Na metal (gives H₂), but gives NO silver mirror with Tollens' (it's not an aldehyde). This combination is unique to carboxylic acids. Alcohols also react with Na but don't turn litmus red or react with Na₂CO₃.",
      },
      content: (
        <div className="space-y-4">
          {flowchart}

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
            <motion.div className={`rounded border p-3 ${examAnswer === unknownGroup.id ? "border-green-500/40 bg-green-900/20" : "border-red-500/40 bg-red-900/20"}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className={`font-orbitron text-sm font-bold mb-1 ${examAnswer === unknownGroup.id ? "text-green-400" : "text-red-400"}`}>
                {examAnswer === unknownGroup.id ? "✓ CORRECT!" : "✗ INCORRECT"}
              </p>
              <p className="text-white font-rajdhani text-sm">
                The compound was: <strong style={{ color: unknownGroup.color }}>{unknownGroup.name}</strong>
              </p>
            </motion.div>
          )}

          <div className="space-y-2">
            <p className="text-slate-400 text-xs font-orbitron tracking-wider">CONTINUE TESTING</p>
            {testPanel}
          </div>
        </div>
      ),
      canProceed: true,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [testsDone, selectedGroup, selectedTest, currentResult, examAnswer, examSubmitted, displayGroup, isExam]);

  const persistentNotes = useMemo(
    () => <ObservationsPanel testsDone={testsDone} displayGroup={displayGroup} />,
    [testsDone, displayGroup]
  );

  return (
    <>
      <StepWizard
        steps={steps}
        persistentNotes={persistentNotes}
        experimentTitle="Identification of Functional Groups"
        onComplete={handleComplete}
      />
      {showCompletion && (
        <CompletionOverlay
          experimentTitle="Identification of Functional Groups"
          score={score}
          maxScore={130}
          itemsTested={testsDone.size}
          totalItems={TESTS.length}
          timeSpentSeconds={Math.round((Date.now() - startTimeRef.current) / 1000)}
          onDoAgain={handleDoAgain}
        />
      )}
    </>
  );
}
