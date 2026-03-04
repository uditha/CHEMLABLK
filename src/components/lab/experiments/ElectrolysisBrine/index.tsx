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

// ─── Electrolysis of Brine ────────────────────────────────────────────────────
// Cathode: 2H₂O + 2e⁻ → H₂↑ + 2OH⁻
// Anode: 2Cl⁻ → Cl₂↑ + 2e⁻
// Electrolyte: NaCl(aq) — industrial chlor-alkali process

// ─── Brine cell SVG ───────────────────────────────────────────────────────────

function BrineCell({ isRunning, elapsed }: { isRunning: boolean; elapsed: number }) {
  return (
    <svg viewBox="0 0 220 170" width="240" height="185" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 50 L20 150 Q20 165 40 165 L180 165 Q200 165 200 150 L200 50" fill="none" stroke="#334155" strokeWidth="2" />
      <rect x="21" y="85" width="178" height="79" fill="#B0C8E8" opacity={0.4} />
      {/* Cathode */}
      <rect x="55" y="40" width="10" height="120" fill="#475569" rx="2" />
      <text x="60" y="35" fontSize="8" fill="#60A5FA" textAnchor="middle">−</text>
      <text x="60" y="25" fontSize="6" fill="#94A3B8" textAnchor="middle">cathode</text>
      {/* Anode */}
      <rect x="155" y="40" width="10" height="120" fill="#475569" rx="2" />
      <text x="160" y="35" fontSize="8" fill="#EF4444" textAnchor="middle">+</text>
      <text x="160" y="25" fontSize="6" fill="#94A3B8" textAnchor="middle">anode</text>
      {/* H₂ bubbles */}
      {isRunning && [55, 60, 65].map((x, i) => (
        <motion.circle key={`h-${i}`} cx={x} cy={90} r="3" fill="rgba(200,230,255,0.5)"
          animate={{ cy: [90, 60, 40], opacity: [0.6, 0.4, 0] }}
          transition={{ duration: 1, delay: i * 0.3, repeat: Infinity }} />
      ))}
      {/* Cl₂ bubbles */}
      {isRunning && [155, 160, 165].map((x, i) => (
        <motion.circle key={`c-${i}`} cx={x} cy={90} r="3" fill="rgba(180,220,100,0.4)"
          animate={{ cy: [90, 60, 40], opacity: [0.6, 0.4, 0] }}
          transition={{ duration: 0.9, delay: i * 0.25, repeat: Infinity }} />
      ))}
      {elapsed > 10 && (
        <>
          <text x="60" y="58" fontSize="7" fill="#60A5FA" textAnchor="middle">H₂↑</text>
          <text x="160" y="58" fontSize="7" fill="#BEF264" textAnchor="middle">Cl₂↑</text>
        </>
      )}
      <text x="110" y="135" fontSize="7" fill="#94A3B8" textAnchor="middle">NaCl(aq) → NaOH</text>
      {/* Wires */}
      <line x1="60" y1="40" x2="60" y2="20" stroke="#475569" strokeWidth="1.5" />
      <line x1="160" y1="40" x2="160" y2="20" stroke="#475569" strokeWidth="1.5" />
      <line x1="60" y1="20" x2="110" y2="20" stroke="#475569" strokeWidth="1.5" />
      <line x1="160" y1="20" x2="110" y2="20" stroke="#475569" strokeWidth="1.5" />
    </svg>
  );
}

// ─── Observations panel ───────────────────────────────────────────────────────

function ObservationsPanel({
  elapsed,
  h2Volume,
  cl2Volume,
  testDone,
}: {
  elapsed: number;
  h2Volume: number;
  cl2Volume: number;
  testDone: string[];
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-orbitron text-slate-400 tracking-wider mb-2">GAS COLLECTED</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-900/20 border border-blue-700/30 rounded p-2 text-center">
            <p className="text-blue-300 text-xs font-orbitron">H₂</p>
            <p className="text-white font-orbitron">{h2Volume.toFixed(1)} mL</p>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-700/30 rounded p-2 text-center">
            <p className="text-yellow-300 text-xs font-orbitron">Cl₂</p>
            <p className="text-white font-orbitron">{cl2Volume.toFixed(1)} mL</p>
          </div>
        </div>
        {elapsed > 0 && <p className="text-slate-500 text-xs font-rajdhani mt-1">Time: {elapsed}s</p>}
      </div>
      <div>
        <p className="text-xs font-orbitron text-slate-400 tracking-wider mb-1">TESTS DONE</p>
        <div className="space-y-1">
          {[
            { id: "h2", label: "H₂ (squeaky pop)" },
            { id: "cl2", label: "Cl₂ (litmus bleach)" },
            { id: "naoh", label: "NaOH (alkaline)" },
          ].map((t) => (
            <div key={t.id} className={`flex items-center gap-2 text-xs font-rajdhani px-2 py-1 rounded ${
              testDone.includes(t.id) ? "text-teal" : "text-slate-600"
            }`}>
              <span>{testDone.includes(t.id) ? "✓" : "○"}</span>
              <span>{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface ElectrolysisBrineProps {
  onScoreUpdate?: (pts: number) => void;
}

export function ElectrolysisBrine({ onScoreUpdate }: ElectrolysisBrineProps) {
  const { addScore, addObservation, setTotalSteps, setStep, score, completeMode, resetExperiment } =
    useExperimentStore();
  const { playSuccess } = useSoundEffects();
  const { data: session } = useSession();
  const startTimeRef = useRef(Date.now());

  const [showCompletion, setShowCompletion] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [h2Volume, setH2Volume] = useState(0);
  const [cl2Volume, setCl2Volume] = useState(0);
  const [electrolysisDone, setElectrolysisDone] = useState(false);
  const [testDone, setTestDone] = useState<string[]>([]);
  const [testedGas, setTestedGas] = useState<{ gas: string; result: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => { setTotalSteps(4); }, []);

  function startElectrolysis() {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(true);

    timerRef.current = setInterval(() => {
      setElapsed((t) => {
        const next = t + 1;
        setH2Volume((v) => Math.min(50, v + 0.5));
        setCl2Volume((v) => Math.min(50, v + 0.5));

        if (next >= 60) {
          clearInterval(timerRef.current!);
          setIsRunning(false);
          setElectrolysisDone(true);
          addObservation("Brine electrolysis: H₂ collected at cathode, Cl₂ at anode. NaOH forms in solution.");
          addScore(15);
          onScoreUpdate?.(15);
          playSuccess();
        }

        return next;
      });
    }, 300);
  }

  function handleTest(gas: "h2" | "cl2") {
    if (testDone.includes(gas)) return;
    setTestDone((prev) => [...prev, gas]);

    if (gas === "h2") {
      setTestedGas({ gas: "H₂ (cathode)", result: "Squeaky pop! — confirms hydrogen gas." });
      addObservation("H₂ test (cathode): squeaky pop confirms hydrogen.");
    } else {
      setTestedGas({ gas: "Cl₂ (anode)", result: "Damp litmus paper bleached/decolourised — confirms chlorine gas." });
      addObservation("Cl₂ test (anode): bleaches damp litmus paper — confirms chlorine.");
    }

    addScore(10);
    onScoreUpdate?.(10);
    playSuccess();
  }

  function handleTestSolution() {
    if (testDone.includes("naoh")) return;
    setTestDone((prev) => [...prev, "naoh"]);
    setTestedGas({ gas: "Remaining solution", result: "Red litmus turns blue — NaOH (alkaline) has formed." });
    addObservation("Solution after electrolysis: alkaline (NaOH). Red litmus → blue.");
    addScore(10);
    onScoreUpdate?.(10);
    playSuccess();
  }

  async function handleComplete() {
    completeMode();
    setShowCompletion(true);
    if (session?.user?.role === "student") {
      await saveProgress({
        experimentSlug: "electrolysis-brine",
        score,
        maxScore: 80,
        timeSpentSeconds: Math.round((Date.now() - startTimeRef.current) / 1000),
      });
    }
  }

  function handleDoAgain() {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowCompletion(false);
    setIsRunning(false);
    setElapsed(0);
    setH2Volume(0);
    setCl2Volume(0);
    setElectrolysisDone(false);
    setTestDone([]);
    setTestedGas(null);
    startTimeRef.current = Date.now();
    resetExperiment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setTotalSteps(4);
  }

  // ─── Shared cell + gas collection UI ────────────────────────────────────────
  const cellUI = (
    <div className="space-y-3">
      <div className="bg-navy/30 border border-border rounded p-4 flex justify-center">
        <BrineCell isRunning={isRunning} elapsed={elapsed} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-blue-900/20 border border-blue-700/30 rounded p-2 text-center">
          <p className="text-blue-300 text-xs font-orbitron">H₂ (cathode)</p>
          <p className="text-white font-orbitron text-lg">{h2Volume.toFixed(1)} mL</p>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-700/30 rounded p-2 text-center">
          <p className="text-yellow-300 text-xs font-orbitron">Cl₂ (anode)</p>
          <p className="text-white font-orbitron text-lg">{cl2Volume.toFixed(1)} mL</p>
        </div>
      </div>

      <div className="flex gap-2">
        {!isRunning && !electrolysisDone ? (
          <motion.button onClick={startElectrolysis} whileTap={{ scale: 0.96 }}
            className="px-4 py-2 bg-amber-800/50 hover:bg-amber-700/60 text-white text-sm font-rajdhani font-semibold border border-amber-600/40 rounded transition-all">
            Start Electrolysis
          </motion.button>
        ) : isRunning ? (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs font-rajdhani">Running… {elapsed}s</span>
          </div>
        ) : (
          <div className="text-teal text-xs font-rajdhani flex items-center gap-2">
            <span>✓</span> Gas collected — proceed to test the products
          </div>
        )}
      </div>
    </div>
  );

  // ─── Testing panel UI ────────────────────────────────────────────────────────
  const testingUI = (
    <div className="space-y-3">
      <p className="text-slate-400 text-xs font-orbitron tracking-wider">TEST THE PRODUCTS</p>

      {electrolysisDone ? (
        <div className="space-y-2">
          <button onClick={() => handleTest("h2")} disabled={testDone.includes("h2")}
            className={`w-full p-3 rounded border text-left text-xs font-rajdhani transition-all ${
              testDone.includes("h2") ? "border-green-600/40 bg-green-900/20 text-green-400" : "border-blue-700/30 hover:border-blue-500/50 text-blue-300"
            }`}>
            <p className="font-semibold">Test H₂ (cathode) — Squeaky pop test</p>
            <p className="text-slate-400 mt-0.5">Hold a burning splint near the gas opening</p>
            {testDone.includes("h2") && <p className="text-green-400 mt-1">✓ POP! Hydrogen confirmed.</p>}
          </button>

          <button onClick={() => handleTest("cl2")} disabled={testDone.includes("cl2")}
            className={`w-full p-3 rounded border text-left text-xs font-rajdhani transition-all ${
              testDone.includes("cl2") ? "border-yellow-600/40 bg-yellow-900/20 text-yellow-400" : "border-yellow-700/30 hover:border-yellow-500/50 text-yellow-300"
            }`}>
            <p className="font-semibold">Test Cl₂ (anode) — Litmus paper test</p>
            <p className="text-slate-400 mt-0.5">Hold damp litmus paper in the gas</p>
            {testDone.includes("cl2") && <p className="text-yellow-400 mt-1">✓ Damp litmus BLEACHED. Chlorine confirmed.</p>}
          </button>

          <button onClick={handleTestSolution} disabled={testDone.includes("naoh")}
            className={`w-full p-3 rounded border text-left text-xs font-rajdhani transition-all ${
              testDone.includes("naoh") ? "border-teal/40 bg-teal/10 text-teal" : "border-border hover:border-slate-500 text-slate-300"
            }`}>
            <p className="font-semibold">Test remaining solution — litmus</p>
            <p className="text-slate-400 mt-0.5">Add red litmus to the solution</p>
            {testDone.includes("naoh") && <p className="text-teal mt-1">✓ Red litmus → blue. NaOH is alkaline.</p>}
          </button>
        </div>
      ) : (
        <p className="text-slate-600 text-xs font-rajdhani">Complete the electrolysis first to collect gases for testing.</p>
      )}

      <AnimatePresence>
        {testedGas && (
          <motion.div className="bg-teal/10 border border-teal/30 rounded p-3"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="text-teal font-orbitron text-xs tracking-wider mb-1">TEST RESULT</p>
            <p className="text-white font-rajdhani text-sm font-semibold">{testedGas.gas}</p>
            <p className="text-slate-300 text-xs font-rajdhani mt-0.5">{testedGas.result}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // ─── Steps ─────────────────────────────────────────────────────────────────
  const steps: StepDefinition[] = useMemo(() => [
    {
      id: "intro",
      title: "Introduction to Electrolysis of Brine",
      subtitle: "Chlor-alkali process and electrode reactions",
      instructions: {
        procedure: [
          "Prepare a saturated NaCl solution (brine) — 360 g NaCl per litre at 20°C",
          "Set up two inert graphite or platinum electrodes",
          "Connect to a DC power supply (6 V, ~0.5 A)",
          "Use inverted measuring cylinders over each electrode to collect gas",
          "Run for several minutes, then test the collected gases and solution",
        ],
        safetyNotes: [
          "Cl₂ is toxic — work in a well-ventilated area or fume cupboard",
          "Do NOT mix Cl₂ with flammable materials",
          "NaOH is corrosive — handle carefully",
          "Keep the splint test (H₂) away from the Cl₂ electrode",
        ],
        expectedObservations: [
          "Cathode: colourless gas (H₂) — burns with squeaky pop",
          "Anode: yellow-green gas (Cl₂) — bleaches damp litmus paper",
          "Remaining solution: alkaline — turns red litmus blue (NaOH formed)",
          "Volume ratio: H₂ : Cl₂ = 1 : 1 (equal moles from equations)",
        ],
        tips: [
          "Graphite is the standard inert electrode for brine electrolysis",
          "The diaphragm cell (industrial) keeps Cl₂ and NaOH separate to avoid chlorate formation",
          "Always test gases carefully — Cl₂ is very hazardous",
          "Remember: Cl⁻ is preferentially oxidised at anode (not OH⁻ or O₂)",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Ions in Brine</p>
          <p>NaCl(aq) contains: <span className="text-white">Na⁺, Cl⁻, H⁺, OH⁻, H₂O</span></p>
          <div className="space-y-2">
            <div className="bg-navy/50 border border-blue-500/20 rounded p-2">
              <p className="text-blue-400 font-semibold">Cathode (−) — H⁺ ions reduced</p>
              <p className="font-mono text-white">2H⁺(aq) + 2e⁻ → H₂(g)</p>
              <p className="text-slate-400">(or: 2H₂O + 2e⁻ → H₂↑ + 2OH⁻)</p>
            </div>
            <div className="bg-navy/50 border border-yellow-500/20 rounded p-2">
              <p className="text-yellow-400 font-semibold">Anode (+) — Cl⁻ ions oxidised</p>
              <p className="font-mono text-white">2Cl⁻(aq) → Cl₂(g) + 2e⁻</p>
              <p className="text-slate-400">Cl⁻ preferred over OH⁻ at high [Cl⁻]</p>
            </div>
            <div className="bg-navy/50 border border-teal/20 rounded p-2">
              <p className="text-teal font-semibold">Overall</p>
              <p className="font-mono text-white text-xs">2NaCl + 2H₂O → H₂↑ + Cl₂↑ + 2NaOH</p>
            </div>
          </div>
        </div>
      ),
      quiz: {
        question: "At the anode during brine electrolysis, which ion is preferentially discharged and why?",
        options: [
          "OH⁻ — it is more negatively charged",
          "Cl⁻ — present at very high concentration (overrides discharge potential)",
          "Na⁺ — sodium is at the anode",
          "H⁺ — hydrogen ions are reduced",
        ],
        correctIndex: 1,
        explanation: "Although the discharge potential of OH⁻ is lower than Cl⁻, the very high concentration of Cl⁻ in saturated brine means Cl⁻ is preferentially discharged at the anode. This is a concentration effect overriding the standard potential order. In dilute NaCl, O₂ would be produced instead.",
      },
      content: (
        <div className="space-y-4">
          <div className="bg-navy/40 border border-border rounded p-4 text-xs font-rajdhani">
            <p className="text-amber-300 font-semibold mb-2">Brine = Saturated NaCl(aq)</p>
            <p className="text-slate-300 leading-relaxed">
              Brine contains Na⁺, Cl⁻, H⁺, OH⁻, and H₂O molecules. Electrolysis selectively
              discharges specific ions at each electrode to produce three commercially important products.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs font-rajdhani text-center">
            <div className="bg-blue-900/20 border border-blue-700/30 rounded p-3">
              <p className="text-blue-300 font-semibold">H₂</p>
              <p className="text-slate-400">Cathode</p>
              <p className="text-slate-300">Fuel cells, margarine production</p>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded p-3">
              <p className="text-yellow-300 font-semibold">Cl₂</p>
              <p className="text-slate-400">Anode</p>
              <p className="text-slate-300">PVC, bleach, disinfectants</p>
            </div>
            <div className="bg-teal/10 border border-teal/30 rounded p-3">
              <p className="text-teal font-semibold">NaOH</p>
              <p className="text-slate-400">Solution</p>
              <p className="text-slate-300">Soap, paper, textiles</p>
            </div>
          </div>
          <p className="text-center text-slate-500 text-xs font-rajdhani">
            Proceed to run the electrolysis.
          </p>
        </div>
      ),
      canProceed: true,
    },
    {
      id: "run-electrolysis",
      title: "Run Electrolysis & Collect Gases",
      subtitle: "Observe gas evolution at each electrode",
      instructions: {
        procedure: [
          "Click 'Start Electrolysis' to pass current through the brine",
          "Watch the gas bubbles forming at each electrode",
          "At cathode (−): colourless bubbles of H₂",
          "At anode (+): slightly yellow-green Cl₂ gas",
          "Gas volumes are collected — note both volumes are approximately equal",
          "After 60 seconds, electrolysis completes — gas is ready for testing",
        ],
        expectedObservations: [
          "Cathode: vigorous colourless bubbles (H₂)",
          "Anode: slightly coloured yellow-green bubbles (Cl₂)",
          "Both electrodes produce gas simultaneously",
          "H₂ : Cl₂ volume ratio ≈ 1 : 1 from stoichiometry",
        ],
        tips: [
          "Both gases are produced in equal molar quantities (1:1 ratio)",
          "In practice, slightly less Cl₂ is collected (it dissolves in water)",
          "Cl₂ is denser than air (2.5 × heavier) — collects readily",
          "H₂ is less dense than air — handle gas upside-down",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Selective Discharge</p>
          <p>In a solution with multiple ions, only some are discharged at each electrode. The preferred ion depends on:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><span className="text-white">Position in electrochemical series</span> — standard electrode potential</li>
            <li><span className="text-white">Concentration</span> — high [Cl⁻] overrides potential at anode</li>
            <li><span className="text-white">Electrode material</span> — some metals overpotential effects</li>
          </ul>
          <div className="bg-navy/50 border border-teal/20 rounded p-2">
            <p className="text-white font-semibold">Why H₂ at cathode and not Na?</p>
            <p>Na⁺ requires a very negative potential to reduce. H⁺/H₂O is reduced preferentially. Na is only deposited at the cathode if the electrolyte is molten NaCl (no water).</p>
          </div>
        </div>
      ),
      quiz: {
        question: "Why is H₂ produced at the cathode during brine electrolysis instead of sodium metal?",
        options: [
          "Na⁺ ions do not migrate to the cathode",
          "H⁺/H₂O requires less energy to reduce than Na⁺ ions",
          "Sodium is too heavy to be deposited",
          "H₂ is more concentrated than Na⁺",
        ],
        correctIndex: 1,
        explanation: "Na⁺ has a very negative standard electrode potential (−2.71 V), requiring much more energy to reduce than H⁺/H₂O (0.00 V). In aqueous solution, H⁺ ions (from water) are preferentially reduced to form H₂ gas. Metallic sodium is only produced from molten NaCl (anhydrous electrolysis).",
      },
      content: cellUI,
      canProceed: electrolysisDone,
    },
    {
      id: "test-products",
      title: "Test the Products",
      subtitle: "Identify H₂, Cl₂, and NaOH by chemical tests",
      instructions: {
        procedure: [
          "Test H₂ from cathode: apply burning splint to gas — listen for squeaky pop",
          "Test Cl₂ from anode: hold damp litmus paper in gas — observe bleaching",
          "Test remaining solution: add red litmus — it should turn blue (NaOH is alkaline)",
          "Record observations clearly for each test",
          "Complete all three tests before proceeding",
        ],
        expectedObservations: [
          "H₂: 'squeaky pop' — hydrogen burns with a distinctive sound",
          "Cl₂: damp litmus turns red then is completely bleached/decolourised",
          "Solution: red litmus → blue (NaOH, pH > 7)",
        ],
        tips: [
          "Both gases are colourless — only Cl₂ has a distinctive choking smell",
          "The litmus bleaching by Cl₂ is due to HClO formed: Cl₂ + H₂O → HCl + HClO",
          "NaOH in solution is confirmed by (a) blue litmus and (b) pH > 7",
          "Cl₂ also bleaches coloured fabric — important in textile industry",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Gas Tests in Detail</p>
          <div className="space-y-2">
            <div className="bg-navy/50 border border-blue-500/20 rounded p-2">
              <p className="text-blue-400 font-semibold">H₂ — Burning splint test</p>
              <p>H₂ burns: 2H₂ + O₂ → 2H₂O. The distinctive squeaky pop occurs because the rapid combustion causes a pressure wave. Safe, distinctive test.</p>
            </div>
            <div className="bg-navy/50 border border-yellow-500/20 rounded p-2">
              <p className="text-yellow-400 font-semibold">Cl₂ — Damp litmus test</p>
              <p>Cl₂ + H₂O ⇌ HCl + HClO (hypochlorous acid). HClO is a powerful bleaching agent — it oxidises the dye in litmus paper and decolourises it.</p>
            </div>
            <div className="bg-navy/50 border border-teal/20 rounded p-2">
              <p className="text-teal font-semibold">NaOH — Litmus test</p>
              <p>NaOH is a strong alkali. Red litmus → blue in alkaline solution. Also confirmed by pH ≈ 13 and neutralisation with acid.</p>
            </div>
          </div>
        </div>
      ),
      quiz: {
        question: "Why does damp litmus paper become bleached (not just turned red) when placed in Cl₂ gas?",
        options: [
          "Cl₂ is acidic and destroys the paper",
          "Cl₂ reacts with water to form HClO (hypochlorous acid), a powerful oxidising bleach",
          "Cl₂ absorbs light, preventing the paper from showing any colour",
          "The paper dries out and loses its colour naturally",
        ],
        correctIndex: 1,
        explanation: "Cl₂ dissolves in water to form HClO: Cl₂ + H₂O ⇌ HCl + HClO. Hypochlorous acid (HClO) is a powerful oxidising agent that bleaches the indicator dye in litmus. First the paper turns red (acidic HCl), then becomes completely decolourised (bleached by HClO).",
      },
      content: testingUI,
      canProceed: testDone.length >= 3,
    },
    {
      id: "applications",
      title: "Industrial Applications & Conclusions",
      subtitle: "Chlor-alkali process and exam summary",
      instructions: {
        procedure: [
          "Write the half-equations for cathode and anode reactions with state symbols",
          "Write the overall equation for brine electrolysis",
          "Name one industrial use for each of the three products (H₂, Cl₂, NaOH)",
          "Explain why Cl⁻ is preferentially discharged at the anode (not OH⁻)",
          "State what would be produced if molten NaCl (not aqueous) were electrolysed",
        ],
        expectedObservations: [
          "H₂ at cathode, Cl₂ at anode, NaOH in solution — confirmed by tests",
          "Equal volumes of H₂ and Cl₂ (1:1 molar ratio)",
          "Solution becomes increasingly alkaline as NaOH accumulates",
        ],
        tips: [
          "In exam: always include state symbols in half-equations",
          "The chlor-alkali process is one of the largest chemical industries globally",
          "Molten NaCl → Na metal at cathode + Cl₂ at anode (no H₂O to reduce)",
          "Diaphragm cell keeps Cl₂ away from NaOH — prevents formation of NaClO",
        ],
      },
      theory: (
        <div className="space-y-3 text-xs font-rajdhani text-slate-300 leading-relaxed">
          <p className="text-teal font-semibold text-sm">Industrial Chlor-Alkali Process</p>
          <div className="space-y-2">
            <div className="bg-navy/50 border border-teal/20 rounded p-2">
              <p className="text-white font-semibold">Membrane Cell</p>
              <p>Modern industrial method. Ion-exchange membrane separates cathode and anode compartments. Pure NaOH produced. Lower energy and purer products than diaphragm cell.</p>
            </div>
            <div className="bg-navy/50 border border-border rounded p-2">
              <p className="text-white font-semibold">Products and Uses</p>
              <p><span className="text-blue-300">H₂:</span> Fuel cells, Haber process (NH₃), margarine hydrogenation</p>
              <p><span className="text-yellow-300">Cl₂:</span> Bleach (NaClO), PVC polymer, disinfection of drinking water</p>
              <p><span className="text-teal">NaOH:</span> Soap/detergent manufacture, paper making, aluminium extraction</p>
            </div>
          </div>
        </div>
      ),
      quiz: {
        question: "What would be produced at the cathode if MOLTEN sodium chloride (not aqueous brine) were electrolysed?",
        options: [
          "H₂ gas — same as from aqueous brine",
          "Na metal — Na⁺ reduced with no competing H₂O",
          "Cl₂ gas — chlorine is still produced at cathode",
          "NaOH — alkali still forms at cathode",
        ],
        correctIndex: 1,
        explanation: "In molten NaCl, there are no water molecules to compete with Na⁺ ions. Therefore, Na⁺ is reduced at the cathode: Na⁺ + e⁻ → Na(l). Sodium metal is produced. This is how sodium metal is manufactured industrially (Downs cell process).",
      },
      content: (
        <div className="space-y-4">
          <div className="bg-navy/40 border border-border rounded p-3 text-xs font-rajdhani">
            <p className="text-teal font-semibold mb-2">Summary of Results</p>
            <div className="space-y-1">
              {[
                { electrode: "Cathode (−)", ion: "H⁺/H₂O", product: "H₂ gas", obs: "squeaky pop", color: "text-blue-300" },
                { electrode: "Anode (+)", ion: "Cl⁻", product: "Cl₂ gas", obs: "bleaches litmus", color: "text-yellow-300" },
                { electrode: "Solution", ion: "Na⁺ + OH⁻", product: "NaOH", obs: "red litmus → blue", color: "text-teal" },
              ].map((r) => (
                <div key={r.electrode} className="grid grid-cols-3 gap-2 py-1 border-b border-border/50">
                  <span className="text-slate-400">{r.electrode}</span>
                  <span className={r.color}>{r.product}</span>
                  <span className="text-slate-500">{r.obs}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-navy/30 border border-border rounded p-3 text-xs font-rajdhani space-y-1">
            <p className="text-slate-400 font-semibold">Overall Equation</p>
            <p className="font-mono text-white text-center py-1">
              2NaCl(aq) + 2H₂O(l) → H₂(g) + Cl₂(g) + 2NaOH(aq)
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs font-rajdhani text-center">
            {[
              { product: "H₂", use: "Fuel cells, Haber process, hydrogenation", color: "text-blue-300", border: "border-blue-700/30" },
              { product: "Cl₂", use: "Bleach (NaClO), PVC, water disinfection", color: "text-yellow-300", border: "border-yellow-700/30" },
              { product: "NaOH", use: "Soap, paper, aluminium extraction", color: "text-teal", border: "border-teal/30" },
            ].map((r) => (
              <div key={r.product} className={`bg-navy/30 border ${r.border} rounded p-2`}>
                <p className={`${r.color} font-semibold`}>{r.product}</p>
                <p className="text-slate-400 text-xs mt-1">{r.use}</p>
              </div>
            ))}
          </div>
        </div>
      ),
      canProceed: true,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [electrolysisDone, testDone, isRunning, elapsed, h2Volume, cl2Volume, testedGas]);

  const persistentNotes = useMemo(
    () => (
      <ObservationsPanel
        elapsed={elapsed}
        h2Volume={h2Volume}
        cl2Volume={cl2Volume}
        testDone={testDone}
      />
    ),
    [elapsed, h2Volume, cl2Volume, testDone]
  );

  return (
    <>
      <StepWizard
        steps={steps}
        persistentNotes={persistentNotes}
        experimentTitle="Electrolysis of Brine (Chlor-Alkali Process)"
        onComplete={handleComplete}
        onStepChange={setStep}
      />
      {showCompletion && (
        <CompletionOverlay
          experimentTitle="Electrolysis of Brine (Chlor-Alkali Process)"
          score={score}
          maxScore={80}
          itemsTested={testDone.length + (electrolysisDone ? 1 : 0)}
          totalItems={4}
          timeSpentSeconds={Math.round((Date.now() - startTimeRef.current) / 1000)}
          onDoAgain={handleDoAgain}
        />
      )}
    </>
  );
}
