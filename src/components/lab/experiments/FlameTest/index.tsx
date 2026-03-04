"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { FlameCanvas } from "./FlameCanvas";
import { SpectrumDisplay } from "./SpectrumDisplay";
import { ElectronDiagram } from "./ElectronDiagram";
import { METALS, getRandomMetal } from "./metals.data";
import { useExperimentStore } from "@/store/experimentStore";
import { StepWizard } from "../../StepWizard";
import { CompletionOverlay } from "../../CompletionOverlay";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useSession } from "next-auth/react";
import { saveProgress } from "@/lib/progress";
import type { StepDefinition } from "../../StepWizard";
import type { MetalData } from "@/types";

// ─── Observations Panel (right side persistent) ──────────────────────────────

function ObservationsPanel({
  observations,
  testedMetals,
}: {
  observations: string[];
  testedMetals: Set<string>;
}) {
  return (
    <div className="space-y-3">
      {/* Observations log */}
      <div>
        <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">OBSERVATIONS</p>
        {observations.length === 0 ? (
          <p className="text-slate-600 text-xs font-rajdhani">No observations recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {observations.map((obs, i) => (
              <div key={i} className="text-xs font-rajdhani text-slate-300 bg-navy/30 rounded p-2 border border-border/50">
                {obs}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metals tested progress */}
      <div>
        <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">METALS TESTED</p>
        <div className="flex flex-wrap gap-1">
          {METALS.map((m) => (
            <div
              key={m.id}
              className={`w-8 h-8 rounded flex items-center justify-center text-xs font-orbitron font-bold ${
                testedMetals.has(m.id)
                  ? "bg-teal/20 text-teal"
                  : "bg-border/30 text-slate-700"
              }`}
              title={m.name}
              style={testedMetals.has(m.id) ? { borderLeft: `2px solid ${m.flameColor}` } : undefined}
            >
              {m.symbol}
            </div>
          ))}
        </div>
        <p className="text-slate-600 text-xs font-rajdhani mt-1">{testedMetals.size}/{METALS.length} tested</p>
      </div>
    </div>
  );
}

// ─── FlameTest (Step-based 3-panel) ─────────────────────────────────────────

interface FlameTestProps {
  onScoreUpdate?: (score: number) => void;
}

export function FlameTest({ onScoreUpdate }: FlameTestProps) {
  const {
    currentMode,
    selectedMetal,
    hasSample,
    isInFlame,
    wireClean,
    lang,
    observations,
    addObservation,
    selectMetal,
    setHasSample,
    setIsInFlame,
    setWireClean,
    addScore,
    setTotalSteps,
    setStep,
    score,
    completeMode,
    resetExperiment,
  } = useExperimentStore();

  const { playSuccess, playError } = useSoundEffects();
  const { data: session } = useSession();
  const startTimeRef = useRef(Date.now());
  const [showCompletion, setShowCompletion] = useState(false);

  const [activeMetalData, setActiveMetalData] = useState<MetalData | null>(null);
  const [examMetal, setExamMetal] = useState<MetalData | null>(null);
  const [examAnswer, setExamAnswer] = useState<string>("");
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examCorrect, setExamCorrect] = useState<boolean | null>(null);
  const [observationRecorded, setObservationRecorded] = useState(false);
  const [testedMetals, setTestedMetals] = useState<Set<string>>(new Set());

  useEffect(() => {
    setTotalSteps(4);
  }, [setTotalSteps]);

  // Set up exam mode
  useEffect(() => {
    if (currentMode === "Exam" && !examMetal) {
      setExamMetal(getRandomMetal());
    }
  }, [currentMode, examMetal]);

  const displayMetal = currentMode === "Exam" ? examMetal : activeMetalData;

  function handleCleanWire() {
    setWireClean(true);
    setHasSample(false);
    selectMetal(null);
    setActiveMetalData(null);
    setIsInFlame(false);
    setObservationRecorded(false);
  }

  function handleSelectMetal(metal: MetalData) {
    selectMetal(metal.id);
    setActiveMetalData(metal);
    setHasSample(true);
    setIsInFlame(false);
    setObservationRecorded(false);
    setExamSubmitted(false);
    setExamCorrect(null);
  }

  function handleHoldInFlame() {
    if (!hasSample && currentMode !== "Exam") return;
    setIsInFlame(true);
    if (displayMetal) {
      addObservation(`${displayMetal.symbol}: ${getFlameColorName(displayMetal.id, lang)}`);
    }
  }

  function handleRecordObservation() {
    setObservationRecorded(true);
    if (displayMetal && currentMode !== "Exam") {
      playSuccess();
      addScore(10);
      onScoreUpdate?.(10);
      setTestedMetals((prev) => new Set(Array.from(prev).concat(displayMetal.id)));
    }
  }

  function handleExamSubmit() {
    if (!examMetal || !examAnswer) return;
    const correct = examAnswer === examMetal.id;
    setExamSubmitted(true);
    setExamCorrect(correct);
    if (correct) {
      playSuccess();
      addScore(25);
      onScoreUpdate?.(25);
    } else {
      playError();
    }
  }

  function handleTestAnother() {
    setHasSample(false);
    selectMetal(null);
    setActiveMetalData(null);
    setObservationRecorded(false);
    setExamSubmitted(false);
    setExamCorrect(null);
    setStep(1);
  }

  function handleComplete() {
    completeMode("flame-test", currentMode);
    setShowCompletion(true);

    if (session?.user?.role === "student") {
      const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      saveProgress({
        slug: "flame-test",
        mode: currentMode,
        score,
        timeSpentSeconds,
      }).catch(() => {});
    }
  }

  function handleDoAgain() {
    resetExperiment();
    setHasSample(false);
    selectMetal(null);
    setActiveMetalData(null);
    setObservationRecorded(false);
    setExamSubmitted(false);
    setExamCorrect(null);
    setTestedMetals(new Set());
    setExamMetal(currentMode === "Exam" ? getRandomMetal() : null);
    setStep(0);
    startTimeRef.current = Date.now();
    setShowCompletion(false);
  }

  function getFlameColorName(metalId: string, language: string): string {
    const colors: Record<string, Record<string, string>> = {
      sodium: { en: "Golden Yellow", si: "රන්වන් කහ", ta: "தங்க மஞ்சள்" },
      potassium: { en: "Lilac / Violet", si: "ලිලාක් / දම්", ta: "இளஞ்சிவப்பு / ஊதா" },
      lithium: { en: "Crimson Red", si: "රතු", ta: "சிவப்பு" },
      calcium: { en: "Brick Orange", si: "ගඩොල් තැඹිලි", ta: "செங்கல் ஆரஞ்சு" },
      strontium: { en: "Crimson Red", si: "ගැඹුරු රතු", ta: "ஆழமான சிவப்பு" },
      barium: { en: "Pale Green", si: "ලා කොළ", ta: "இளம் பச்சை" },
      copper: { en: "Blue-Green", si: "නිල්-කොළ", ta: "நீல-பச்சை" },
    };
    return colors[metalId]?.[language] ?? colors[metalId]?.en ?? metalId;
  }

  // ─── Step Definitions ──────────────────────────────────────────────────────

  const steps: StepDefinition[] = useMemo(() => [
    // Step 1: Clean Wire
    {
      id: "clean",
      title: lang === "si" ? "කම්බිය පිරිසිදු කරන්න" : lang === "ta" ? "கம்பியை சுத்தம் செய்" : "Clean the Nichrome Wire",
      subtitle: "Dip wire loop in conc. HCl and burn until no colour is seen.",
      canProceed: wireClean,
      instructions: {
        procedure: [
          "Hold the nichrome wire loop in concentrated HCl for 10 seconds",
          "Place the wire in the hottest part of the Bunsen flame (just above the inner blue cone)",
          "Repeat until no colour is imparted to the flame",
          "The wire is now clean and ready for testing",
        ],
        safetyNotes: [
          "Concentrated HCl is corrosive — wear gloves and safety goggles",
          "Work in a well-ventilated area or fume cupboard",
        ],
        expectedObservations: [
          "Initially, the flame may show yellow/orange from sodium contamination",
          "After cleaning, the flame should appear colourless (just the blue Bunsen flame)",
        ],
        tips: [
          "Sodium contamination is very persistent — you may need to repeat cleaning 3-4 times",
          "Use the roaring blue flame (air hole fully open) for best results",
        ],
      },
      quiz: {
        question: "Why must we clean the nichrome wire before each flame test?",
        options: [
          "To cool the wire down",
          "To remove contamination (e.g. sodium) that could mask other flame colours",
          "To make the wire harder",
          "To prevent the wire from rusting",
        ],
        correctIndex: 1,
        explanation: "Sodium contamination produces an intense yellow flame that masks the characteristic colours of other metals. Always clean in conc. HCl and burn until no colour is seen.",
      },
      content: (
        <div className="flex flex-col items-center justify-center h-full gap-6">
          <div className="bg-navy/40 border border-border rounded-lg p-5 max-w-lg w-full">
            <h3 className="text-teal font-orbitron text-sm tracking-wider mb-3">WHY CLEAN THE WIRE?</h3>
            <p className="text-slate-300 text-sm font-rajdhani leading-relaxed">
              Contamination from previous tests (especially <span className="text-amber-300 font-semibold">sodium</span>) can
              mask the flame colour of the sample. Always clean the wire loop in <span className="text-teal font-semibold">concentrated HCl</span> and
              burn until the flame shows no colour.
            </p>
          </div>

          <motion.button
            onClick={handleCleanWire}
            disabled={wireClean}
            whileTap={{ scale: 0.96 }}
            className={`
              px-8 py-4 rounded-lg text-sm font-rajdhani font-bold border-2 transition-all
              ${wireClean
                ? "border-teal/50 text-teal bg-teal/10 cursor-default"
                : "border-amber-500/60 text-amber-200 bg-amber-900/20 hover:bg-amber-800/30 hover:border-amber-400"
              }
            `}
          >
            {wireClean ? "✓ Wire is Clean" : "Dip in HCl & Burn Clean"}
          </motion.button>

          {wireClean && (
            <motion.p
              className="text-teal text-sm font-rajdhani"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Wire loop is clean and ready. Click &quot;NEXT STEP&quot; to select a metal.
            </motion.p>
          )}
        </div>
      ),
      theory: (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">WHY CLEAN?</p>
            <p className="text-xs font-rajdhani text-slate-300 leading-relaxed">
              Metal ion contamination (especially Na⁺) produces strong emission lines that can mask the characteristic flame colour of the sample being tested.
            </p>
          </div>
          <div>
            <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">NOTE</p>
            <p className="text-xs font-rajdhani text-amber-300/80">
              Sodium contamination is very common. Even tiny traces produce a strong yellow flame that masks other metals.
            </p>
          </div>
        </div>
      ),
    },

    // Step 2: Select Metal
    {
      id: "select",
      title: currentMode === "Exam"
        ? "Unknown Sample Loaded"
        : lang === "si" ? "ලෝහය තෝරන්න" : lang === "ta" ? "உலோகம் தேர்ந்தெடு" : "Select a Metal Salt",
      subtitle: currentMode === "Exam"
        ? "An unknown sample has been loaded."
        : "Dip the clean wire loop into the metal salt solution.",
      canProceed: currentMode === "Exam" || hasSample,
      instructions: {
        procedure: [
          "Choose a metal salt from the available options",
          "Dip the clean wire loop into the metal salt solution",
          "Ensure the wire loop is coated with the salt",
        ],
        expectedObservations: [
          "The wire loop should be visibly coated with the salt crystals/solution",
        ],
        tips: [
          "In exam mode, an unknown sample is pre-loaded for identification",
          "Test all 7 metals to complete the experiment",
        ],
      },
      content: currentMode === "Exam" ? (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="bg-red-900/20 border border-red-700/40 rounded-lg p-6 max-w-md text-center">
            <p className="text-red-300 font-orbitron text-xs tracking-wider mb-3">EXAM MODE</p>
            <p className="text-white font-rajdhani text-lg font-semibold">
              Unknown sample loaded in wire loop.
            </p>
            <p className="text-slate-400 text-sm font-rajdhani mt-2">
              Hold it in the flame and identify the metal from its colour.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl w-full">
            {METALS.map((metal) => (
              <motion.button
                key={metal.id}
                onClick={() => handleSelectMetal(metal)}
                whileTap={{ scale: 0.95 }}
                className={`
                  relative p-4 rounded-lg border-2 text-center transition-all duration-200
                  ${selectedMetal === metal.id
                    ? "shadow-lg"
                    : "border-border hover:border-slate-500"
                  }
                `}
                style={{
                  borderColor: selectedMetal === metal.id ? metal.flameColor : undefined,
                  backgroundColor: selectedMetal === metal.id ? metal.flameColor + "15" : "#0A0E1A",
                  boxShadow: selectedMetal === metal.id ? `0 0 20px ${metal.flameColor}30` : undefined,
                }}
              >
                <div
                  className="font-orbitron font-bold text-xl mb-1"
                  style={{ color: metal.flameColor }}
                >
                  {metal.symbol}
                </div>
                <div className="text-slate-400 text-xs font-rajdhani">
                  {lang === "si" ? metal.nameSi : lang === "ta" ? metal.nameTa : metal.name}
                </div>
                {testedMetals.has(metal.id) && (
                  <span className="text-green-400 text-xs mt-1 block">✓ tested</span>
                )}
                {selectedMetal === metal.id && (
                  <motion.div
                    className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
                    style={{ backgroundColor: metal.flameColor }}
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </motion.button>
            ))}
          </div>
          {selectedMetal && activeMetalData && (
            <motion.p
              className="text-sm font-rajdhani"
              style={{ color: activeMetalData.flameColor }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {activeMetalData.symbol} — {lang === "si" ? activeMetalData.nameSi : lang === "ta" ? activeMetalData.nameTa : activeMetalData.name} salt selected
            </motion.p>
          )}
        </div>
      ),
      theory: selectedMetal && activeMetalData ? (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">SELECTED</p>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: activeMetalData.flameColor }}
              />
              <span className="text-sm font-rajdhani text-white font-semibold">
                {activeMetalData.symbol} — {activeMetalData.name}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">EXPECTED FLAME</p>
            <p className="text-xs font-rajdhani" style={{ color: activeMetalData.flameColor }}>
              {getFlameColorName(activeMetalData.id, lang)}
            </p>
            <p className="text-xs font-rajdhani text-slate-400 mt-1">
              Wavelength: {activeMetalData.wavelengthNm} nm
            </p>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">AVAILABLE METALS</p>
          <div className="space-y-1">
            {METALS.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-xs font-rajdhani text-slate-400">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.flameColor }} />
                <span>{m.symbol} — {m.name}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },

    // Step 3: Hold in Flame
    {
      id: "flame",
      title: lang === "si" ? "ජ්වාලාවේ රඳවන්න" : lang === "ta" ? "சுடரில் பிடி" : "Hold in the Flame",
      subtitle: "Observe the colour carefully.",
      canProceed: isInFlame && (observationRecorded || (currentMode === "Exam" && examSubmitted)),
      instructions: {
        procedure: [
          "Hold the wire loop with the sample in the hottest part of the Bunsen flame",
          "Position just above the inner blue cone for maximum temperature",
          "Observe the flame colour carefully",
          "Record your observation before proceeding",
        ],
        safetyNotes: [
          "Do not look directly into the flame for extended periods",
          "Keep flammable materials away from the Bunsen burner",
        ],
        expectedObservations: [
          "Each metal produces a characteristic flame colour",
          "The colour should appear within 1-2 seconds of placing the sample in the flame",
        ],
        tips: [
          "View through blue cobalt glass to distinguish Na (yellow) from K (lilac)",
          "Some colours fade quickly — observe the initial flash carefully",
        ],
      },
      quiz: {
        question: "Which metal ion produces a characteristic golden-yellow flame?",
        options: ["Potassium (K⁺)", "Sodium (Na⁺)", "Lithium (Li⁺)", "Barium (Ba²⁺)"],
        correctIndex: 1,
        explanation: "Sodium produces an intense golden-yellow flame due to the 3p → 3s transition at 589 nm. Its colour is so strong it can mask other metals.",
      },
      content: (
        <div className="flex flex-col h-full gap-3">
          {/* Flame canvas — fills most of the space */}
          <div
            className="relative rounded-lg overflow-hidden flex-1"
            style={{
              minHeight: "200px",
              background: "#0A0E1A",
              border: isInFlame
                ? `1px solid ${displayMetal?.flameColor ?? "#0D7E6A"}40`
                : "1px solid #1A2540",
              boxShadow: isInFlame && displayMetal
                ? `0 0 30px ${displayMetal.flameColor}30`
                : undefined,
            }}
          >
            <FlameCanvas
              flameColor={displayMetal?.flameColor ?? "#FF6600"}
              flameColorSecondary={displayMetal?.flameColorSecondary}
              isActive={isInFlame}
              intensity={1.2}
            />

            {/* Flame colour label */}
            {isInFlame && displayMetal && (
              <motion.div
                className="absolute top-3 left-3"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div
                  className="px-3 py-1.5 rounded-full text-xs font-rajdhani font-semibold border backdrop-blur-sm"
                  style={{
                    color: displayMetal.flameColor,
                    borderColor: displayMetal.flameColor + "60",
                    backgroundColor: displayMetal.flameColor + "20",
                  }}
                >
                  {currentMode === "Exam" ? "Unknown Flame" : `${displayMetal.symbol} — ${getFlameColorName(displayMetal.id, lang)}`}
                </div>
              </motion.div>
            )}

            {!isInFlame && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-slate-600 text-sm font-rajdhani">
                  Click &apos;Hold in Flame&apos; to begin
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-3 flex-shrink-0">
            {!isInFlame && (
              <motion.button
                onClick={handleHoldInFlame}
                whileTap={{ scale: 0.96 }}
                className="px-6 py-2.5 rounded-lg text-sm font-rajdhani font-bold border-2 border-orange-500/50 text-orange-300 bg-orange-900/20 hover:bg-orange-800/30 transition-all"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                Hold in Flame
              </motion.button>
            )}
            {isInFlame && !observationRecorded && currentMode !== "Exam" && (
              <motion.button
                onClick={handleRecordObservation}
                whileTap={{ scale: 0.96 }}
                className="px-6 py-2.5 rounded-lg text-sm font-rajdhani font-bold border-2 border-green-500/50 text-green-300 bg-green-900/20 hover:bg-green-800/30 transition-all"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                Record Observation
              </motion.button>
            )}
          </div>

          {/* Exam answer section */}
          {currentMode === "Exam" && isInFlame && !examSubmitted && (
            <motion.div
              className="border border-red-700/40 rounded-lg p-3 flex-shrink-0"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-white font-rajdhani text-sm font-semibold mb-2">Identify the metal:</p>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {METALS.map((metal) => (
                  <button
                    key={metal.id}
                    onClick={() => setExamAnswer(metal.id)}
                    className={`p-1.5 rounded border text-xs font-rajdhani transition-all ${
                      examAnswer === metal.id
                        ? "border-teal bg-teal/20 text-teal"
                        : "border-border text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {metal.symbol}
                  </button>
                ))}
              </div>
              <button
                onClick={handleExamSubmit}
                disabled={!examAnswer}
                className="w-full bg-red-800/50 hover:bg-red-700/60 disabled:opacity-40 text-white font-orbitron text-xs tracking-wider py-2 rounded border border-red-600/50 transition-all"
              >
                SUBMIT
              </button>
            </motion.div>
          )}

          {/* Exam result */}
          {examSubmitted && examMetal && (
            <motion.div
              className={`rounded-lg border-2 p-3 flex-shrink-0 ${
                examCorrect ? "border-green-500/50 bg-green-900/20" : "border-red-500/50 bg-red-900/20"
              }`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <p className={`font-orbitron text-sm font-bold ${examCorrect ? "text-green-400" : "text-red-400"}`}>
                {examCorrect ? "✓ CORRECT!" : "✗ INCORRECT"}
              </p>
              <p className="text-white font-rajdhani text-sm mt-1">
                The sample was: <strong style={{ color: examMetal.flameColor }}>{examMetal.symbol} — {examMetal.name}</strong>
              </p>
            </motion.div>
          )}
        </div>
      ),
      theory: isInFlame && displayMetal ? (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">FLAME COLOUR</p>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: displayMetal.flameColor }} />
              <span className="text-sm font-rajdhani text-white font-semibold">
                {currentMode === "Exam" ? "???" : getFlameColorName(displayMetal.id, lang)}
              </span>
            </div>
            {currentMode !== "Exam" && (
              <p className="text-xs font-rajdhani text-slate-400 mt-1">
                λ = {displayMetal.wavelengthNm} nm
              </p>
            )}
          </div>
          {currentMode !== "Exam" && (
            <div>
              <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">TRANSITION</p>
              <p className="text-xs font-rajdhani text-slate-300">
                {displayMetal.electronTransition.description}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">INSTRUCTIONS</p>
          <p className="text-xs font-rajdhani text-slate-400">
            Hold the wire loop with the sample in the hottest part of the Bunsen flame — just above the inner blue cone. Observe the colour carefully.
          </p>
        </div>
      ),
    },

    // Step 4: Record & Review
    {
      id: "review",
      title: "Review & Science",
      subtitle: displayMetal && (observationRecorded || examSubmitted)
        ? `${displayMetal.symbol} — review the spectrum and electron transitions.`
        : "Review the science behind flame tests.",
      canProceed: true,
      instructions: {
        procedure: [
          "Review the emission spectrum for the tested metal",
          "Study the electron transition diagram",
          "Understand the relationship between energy levels and emitted wavelength",
          "Test another metal to compare flame colours",
        ],
        tips: [
          "E = hf = hc/λ — shorter wavelength means higher energy transition",
          "Compare spectra of different metals to see how emission lines differ",
        ],
      },
      content: (
        <div className="flex flex-col h-full gap-4 overflow-y-auto p-4">
          {/* Spectrum */}
          <SpectrumDisplay
            metal={displayMetal && (observationRecorded || examSubmitted) ? displayMetal : null}
            showLines={observationRecorded || examSubmitted}
          />

          {/* Electron diagram */}
          {displayMetal && (observationRecorded || examSubmitted) && (
            <ElectronDiagram
              metal={displayMetal}
              isExcited={true}
            />
          )}

          {/* Test another */}
          <div className="flex justify-center pt-2">
            <button
              onClick={handleTestAnother}
              className="px-5 py-2.5 text-teal hover:text-white text-sm font-rajdhani font-semibold border border-teal/40 hover:bg-teal/10 rounded-lg transition-all"
            >
              Test Another Metal
            </button>
          </div>
        </div>
      ),
      theory: displayMetal && (observationRecorded || examSubmitted) ? (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">OBSERVATION</p>
            <div
              className="rounded-lg border p-3"
              style={{
                borderColor: displayMetal.flameColor + "40",
                backgroundColor: displayMetal.flameColor + "10",
              }}
            >
              <p className="text-sm font-rajdhani text-white font-semibold">
                {displayMetal.symbol} ({lang === "si" ? displayMetal.nameSi : lang === "ta" ? displayMetal.nameTa : displayMetal.name})
              </p>
              <p className="text-xs font-rajdhani mt-1">
                <span className="text-slate-400">Flame: </span>
                <span style={{ color: displayMetal.flameColor }}>{getFlameColorName(displayMetal.id, lang)}</span>
              </p>
              <p className="text-xs font-rajdhani text-slate-400 mt-1">
                λ = {displayMetal.wavelengthNm} nm | E = {displayMetal.electronTransition.energyEv} eV
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">SCIENCE</p>
            <p className="text-xs font-rajdhani text-slate-300 leading-relaxed">
              {lang === "si" ? displayMetal.descriptionSi : lang === "ta" ? displayMetal.descriptionTa : displayMetal.description}
            </p>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">ABOUT FLAME TESTS</p>
          <p className="text-xs font-rajdhani text-slate-400 leading-relaxed">
            When metal salts are heated in a flame, electrons are excited to higher energy levels.
            As they fall back, they emit photons of characteristic wavelengths — producing the distinctive colours we observe.
          </p>
        </div>
      ),
    },
  ], [wireClean, selectedMetal, activeMetalData, hasSample, isInFlame, displayMetal, observationRecorded, currentMode, examMetal, examAnswer, examSubmitted, examCorrect, lang, testedMetals]);

  // Persistent notes: observations panel
  const persistentNotes = useMemo(() => (
    <ObservationsPanel observations={observations} testedMetals={testedMetals} />
  ), [observations, testedMetals]);

  const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

  return (
    <>
      <StepWizard
        steps={steps}
        persistentNotes={persistentNotes}
        experimentTitle="Flame Test — Metal Ion Identification"
        onComplete={handleComplete}
      />
      {showCompletion && (
        <CompletionOverlay
          experimentTitle="Flame Tests — Na, K, Li, Ca, Sr, Ba, Cu"
          score={score}
          maxScore={100}
          itemsTested={testedMetals.size}
          totalItems={METALS.length}
          timeSpentSeconds={timeSpentSeconds}
          onDoAgain={handleDoAgain}
        />
      )}
    </>
  );
}
