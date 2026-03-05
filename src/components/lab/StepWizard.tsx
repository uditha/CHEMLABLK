"use client";

import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";
import { AITutor } from "./AITutor";
import type { RightPanelTab, TutorContext } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StepInstruction {
  /** Numbered procedure steps, displayed as a bullet list */
  procedure: string[];
  /** Safety warnings */
  safetyNotes?: string[];
  /** What the student should expect to see */
  expectedObservations?: string[];
  /** Helpful tips */
  tips?: string[];
}

export interface StepQuiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface StepDefinition {
  id: string;
  title: string;
  subtitle?: string;
  /** The interactive experiment content for the center column */
  content: React.ReactNode;
  /** Legacy notes — shown in Theory tab if `theory` not provided */
  notes?: React.ReactNode;
  canProceed?: boolean;
  /** Detailed step instructions shown in left column */
  instructions?: StepInstruction;
  /** Content for the Theory tab in the right panel */
  theory?: React.ReactNode;
  /** Optional quick-check quiz shown in Guided mode after step action is done */
  quiz?: StepQuiz;
}

interface StepWizardProps {
  steps: StepDefinition[];
  /** Persistent content shown in Observations tab regardless of step */
  persistentNotes?: React.ReactNode;
  /** Experiment title shown in instructions panel header */
  experimentTitle?: string;
  onComplete?: () => void;
}

// ─── Step Quiz Card ─────────────────────────────────────────────────────────

function StepQuizCard({
  quiz,
  onComplete,
}: {
  quiz: StepQuiz;
  onComplete: (correct: boolean) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const isCorrect = selected === quiz.correctIndex;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-navy/50 border border-teal/30 rounded-lg p-3 space-y-2.5"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-orbitron text-gold tracking-wider">QUICK CHECK</p>
        <p className="text-xs font-rajdhani text-slate-500 italic">optional</p>
      </div>
      <p className="text-sm font-rajdhani text-white leading-relaxed">{quiz.question}</p>
      <div className="space-y-1">
        {quiz.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => !submitted && setSelected(i)}
            disabled={submitted}
            className={`w-full text-left px-2.5 py-1.5 rounded text-sm font-rajdhani border transition-all ${
              submitted && i === quiz.correctIndex
                ? "border-green-500/60 bg-green-900/20 text-green-300"
                : submitted && i === selected && !isCorrect
                ? "border-red-500/60 bg-red-900/20 text-red-300"
                : selected === i
                ? "border-teal/60 bg-teal/10 text-white"
                : "border-border text-slate-400 hover:border-slate-500"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {!submitted ? (
        <button
          onClick={() => {
            if (selected === null) return;
            setSubmitted(true);
            onComplete(selected === quiz.correctIndex);
          }}
          disabled={selected === null}
          className="w-full py-1.5 rounded text-sm font-rajdhani font-bold bg-teal hover:bg-teal-light disabled:opacity-40 text-white transition-all"
        >
          CHECK
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-sm font-rajdhani p-2 rounded ${
            isCorrect ? "bg-green-900/20 text-green-300" : "bg-amber-900/20 text-amber-300"
          }`}
        >
          {isCorrect ? "Correct! +5 pts" : quiz.explanation}
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Left Panel: Instructions ───────────────────────────────────────────────

function InstructionsPanel({
  steps,
  currentStep,
  experimentTitle,
  onStepClick,
  isFreeMode,
  canProceed,
  onNext,
  quizCard,
}: {
  steps: StepDefinition[];
  currentStep: number;
  experimentTitle?: string;
  onStepClick: (step: number) => void;
  isFreeMode: boolean;
  canProceed: boolean;
  onNext: () => void;
  quizCard?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <p className="text-xs font-orbitron text-teal tracking-widest">
          EXPERIMENT INSTRUCTIONS
        </p>
        {experimentTitle && (
          <p className="text-sm font-rajdhani font-semibold text-white mt-1 leading-tight">
            {experimentTitle}
          </p>
        )}
      </div>

      {/* Step list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
        {steps.map((step, i) => {
          const isCompleted = i < currentStep;
          const isCurrent = i === currentStep;
          const isClickable = isFreeMode || isCompleted;

          return (
            <div key={step.id}>
              {/* Step header (always visible) */}
              <button
                onClick={() => isClickable && onStepClick(i)}
                disabled={!isClickable && !isCurrent}
                className={`
                  w-full text-left rounded-lg p-2.5 transition-all duration-200 relative
                  ${isCurrent
                    ? "bg-teal/10 border border-teal/30"
                    : isCompleted
                    ? "bg-teal/5 border border-transparent hover:border-teal/20 cursor-pointer"
                    : "border border-transparent opacity-50"
                  }
                `}
              >
                <div className="flex items-start gap-2.5">
                  {/* Step indicator */}
                  <div
                    className={`
                      flex items-center justify-center w-6 h-6 rounded-full text-xs font-orbitron font-bold flex-shrink-0 mt-0.5
                      ${isCurrent
                        ? "bg-teal text-white"
                        : isCompleted
                        ? "bg-teal/30 text-teal"
                        : "bg-border/60 text-slate-600"
                      }
                    `}
                  >
                    {isCompleted ? (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>

                  {/* Step title */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-rajdhani font-semibold leading-tight ${
                        isCurrent ? "text-white" : isCompleted ? "text-teal" : "text-slate-500"
                      }`}
                    >
                      {step.title}
                    </p>
                    {isCurrent && step.subtitle && (
                      <p className="text-slate-400 text-sm font-rajdhani mt-1 leading-relaxed">
                        {step.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Active step indicator bar */}
                {isCurrent && (
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full bg-teal"
                    layoutId="step-indicator"
                  />
                )}
              </button>

              {/* Expanded instructions for current step */}
              <AnimatePresence>
                {isCurrent && step.instructions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-11 pr-3 pb-2 space-y-3">
                      {/* Procedure */}
                      {step.instructions.procedure.length > 0 && (
                        <div>
                          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1.5">
                            PROCEDURE
                          </p>
                          <ol className="space-y-1">
                            {step.instructions.procedure.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm font-rajdhani text-slate-300 leading-relaxed">
                                <span className="text-teal font-bold flex-shrink-0 mt-0.5">{idx + 1}.</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Safety notes */}
                      {step.instructions.safetyNotes && step.instructions.safetyNotes.length > 0 && (
                        <div className="bg-amber-900/15 border border-amber-600/30 rounded-md p-2.5">
                          <p className="text-xs font-orbitron text-amber-400 tracking-wider mb-1.5">
                            SAFETY
                          </p>
                          <ul className="space-y-1">
                            {step.instructions.safetyNotes.map((note, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm font-rajdhani text-amber-200/80 leading-relaxed">
                                <span className="flex-shrink-0 mt-0.5">⚠</span>
                                <span>{note}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Expected observations */}
                      {step.instructions.expectedObservations && step.instructions.expectedObservations.length > 0 && (
                        <div>
                          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1.5">
                            EXPECTED
                          </p>
                          <ul className="space-y-1">
                            {step.instructions.expectedObservations.map((obs, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm font-rajdhani text-slate-400 leading-relaxed">
                                <span className="text-teal flex-shrink-0 mt-0.5">→</span>
                                <span>{obs}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Tips */}
                      {step.instructions.tips && step.instructions.tips.length > 0 && (
                        <div className="bg-navy/30 border border-border/50 rounded-md p-2.5">
                          <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-1.5">
                            TIPS
                          </p>
                          <ul className="space-y-1">
                            {step.instructions.tips.map((tip, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm font-rajdhani text-slate-300 leading-relaxed">
                                <span className="text-gold flex-shrink-0 mt-0.5">*</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Quiz card (Guided mode only) */}
      {quizCard && (
        <div className="px-3 pb-2">
          {quizCard}
        </div>
      )}

      {/* Next step button */}
      <div className="px-3 py-3 border-t border-border flex-shrink-0">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`
            w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-rajdhani font-bold tracking-wider transition-all
            ${canProceed
              ? "bg-teal hover:bg-teal-light text-white"
              : "bg-slate-800/60 text-slate-600 cursor-not-allowed"
            }
          `}
        >
          {currentStep >= steps.length - 1 ? "COMPLETE" : "NEXT STEP"}
          {currentStep < steps.length - 1 && (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Right Panel: Resources with Tabs ───────────────────────────────────────

const TAB_CONFIG: { id: RightPanelTab; label: string; icon: string }[] = [
  { id: "observations", label: "Obs", icon: "📋" },
  { id: "theory", label: "Theory", icon: "📖" },
  { id: "tutor", label: "AI", icon: "🤖" },
];

function ResourcesPanel({
  activeTab,
  onTabChange,
  persistentNotes,
  stepTheory,
  stepNotes,
  tutorContext,
}: {
  activeTab: RightPanelTab;
  onTabChange: (tab: RightPanelTab) => void;
  persistentNotes?: React.ReactNode;
  stepTheory?: React.ReactNode;
  stepNotes?: React.ReactNode;
  tutorContext: TutorContext | null;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-border flex-shrink-0">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-sm font-rajdhani font-semibold tracking-wide transition-all border-b-2
              ${activeTab === tab.id
                ? "text-teal border-teal bg-teal/5"
                : "text-slate-500 border-transparent hover:text-slate-300 hover:bg-panel/50"
              }
            `}
          >
            <span className="text-xs">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "observations" && (
            <motion.div
              key="observations"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="h-full overflow-y-auto px-3 py-3"
            >
              {persistentNotes || (
                <p className="text-slate-600 text-sm font-rajdhani">
                  No observations recorded yet.
                </p>
              )}
            </motion.div>
          )}

          {activeTab === "theory" && (
            <motion.div
              key="theory"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="h-full overflow-y-auto px-3 py-3 space-y-3"
            >
              {stepTheory ?? stepNotes ?? (
                <p className="text-slate-600 text-sm font-rajdhani">
                  No theory notes for this step.
                </p>
              )}
            </motion.div>
          )}

          {activeTab === "tutor" && (
            <motion.div
              key="tutor"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {tutorContext ? (
                <AITutor context={tutorContext} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-600 text-xs font-rajdhani">
                    AI Tutor unavailable.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Main 3-Column Layout ─────────────────────────────────────────────────

export function StepWizard({ steps, persistentNotes, experimentTitle, onComplete }: StepWizardProps) {
  const { currentStep, setStep, nextStep, currentMode, activeRightTab, setActiveRightTab, tutorContext, addScore } =
    useExperimentStore();

  const [quizCompleted, setQuizCompleted] = useState<Record<string, boolean>>({});

  const isFreeMode = currentMode === "Free";
  const isGuidedMode = currentMode === "Guided";
  const activeStep = Math.min(currentStep, steps.length - 1);
  const stepDef = steps[activeStep];

  // Quiz: shown in Guided mode but NOT gating — students can proceed without answering
  const hasQuiz = isGuidedMode && !!stepDef?.quiz;
  const stepActionDone = isFreeMode || stepDef?.canProceed !== false;
  const canGoNext = stepActionDone;
  const isLastStep = activeStep === steps.length - 1;

  const handleQuizComplete = useCallback(
    (stepId: string, correct: boolean) => {
      setQuizCompleted((prev) => ({ ...prev, [stepId]: true }));
      if (correct) addScore(5);
    },
    [addScore]
  );

  const goToStep = useCallback(
    (target: number) => {
      if (target < 0 || target >= steps.length) return;
      setStep(target);
    },
    [steps.length, setStep]
  );

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete?.();
    } else if (canGoNext) {
      nextStep();
    }
  }, [isLastStep, canGoNext, nextStep, onComplete]);

  // Keyboard navigation
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowDown" && canGoNext && !isLastStep) handleNext();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canGoNext, isLastStep, handleNext]);

  return (
    <>
      {/* ─── Desktop: 3-column grid ────────────────────────────────────── */}
      <div className="hidden md:grid grid-cols-[30%_1fr_25%] h-full min-h-0 w-full">
        {/* Left: Instructions */}
        <div className="bg-panel border-r border-border flex flex-col overflow-hidden">
          <InstructionsPanel
            steps={steps}
            currentStep={activeStep}
            experimentTitle={experimentTitle}
            onStepClick={goToStep}
            isFreeMode={isFreeMode}
            canProceed={canGoNext}
            onNext={handleNext}
            quizCard={
              hasQuiz && stepActionDone ? (
                <StepQuizCard
                  key={stepDef!.id}
                  quiz={stepDef!.quiz!}
                  onComplete={(correct) => handleQuizComplete(stepDef!.id, correct)}
                />
              ) : undefined
            }
          />
        </div>

        {/* Center: Experiment workspace */}
        <div className="min-w-0 flex flex-col min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex-1 min-h-0 flex flex-col"
            >
              {stepDef?.content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right: Resources with tabs */}
        <div className="bg-panel border-l border-border flex flex-col overflow-hidden">
          <ResourcesPanel
            activeTab={activeRightTab}
            onTabChange={setActiveRightTab}
            persistentNotes={persistentNotes}
            stepTheory={stepDef?.theory}
            stepNotes={stepDef?.notes}
            tutorContext={tutorContext}
          />
        </div>
      </div>

      {/* ─── Mobile: single-column with bottom tabs ────────────────────── */}
      <div className="md:hidden flex flex-col h-full w-full">
        {/* Progress strip */}
        <div className="flex items-center gap-1 px-3 py-1.5 bg-panel/90 border-b border-border flex-shrink-0">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className={`h-1 flex-1 rounded-full transition-all ${
                i < activeStep ? "bg-teal" : i === activeStep ? "bg-teal/60" : "bg-border"
              }`}
            />
          ))}
          <span className="text-slate-500 text-xs font-orbitron ml-2 flex-shrink-0">
            {activeStep + 1}/{steps.length}
          </span>
        </div>

        {/* Experiment content */}
        <div className="flex-1 min-h-0 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex-1 min-h-0 flex flex-col"
            >
              {stepDef?.content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile next button */}
        <div className="px-3 py-2 border-t border-border bg-panel flex-shrink-0">
          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className={`
              w-full py-2.5 rounded-lg text-sm font-rajdhani font-bold tracking-wider transition-all
              ${canGoNext
                ? "bg-teal hover:bg-teal-light text-white"
                : "bg-slate-800/60 text-slate-600 cursor-not-allowed"
              }
            `}
          >
            {isLastStep ? "COMPLETE" : "NEXT STEP"}
          </button>
        </div>
      </div>
    </>
  );
}
