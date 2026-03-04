import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ExperimentMode,
  Language,
  TutorMessage,
  TutorContext,
  QuizAttempt,
  RightPanelTab,
} from "@/types";

// ─── State Shape ──────────────────────────────────────────────────────────────

interface ExperimentState {
  // Current experiment
  currentExperimentSlug: string | null;
  currentMode: ExperimentMode;
  currentStep: number;

  // Flame Test specific
  selectedMetal: string | null;
  hasSample: boolean;
  isInFlame: boolean;
  wireClean: boolean;

  // Scoring
  score: number;
  maxScore: number;
  totalSteps: number;
  experimentsCompleted: string[]; // slugs

  // Mode unlock tracking (persisted)
  modeCompletions: Record<string, ExperimentMode[]>;

  // UI
  lang: Language;
  isTutorOpen: boolean;
  isQuizOpen: boolean;
  activeRightTab: RightPanelTab;

  // Tutor context (set by ExperimentShell, read by StepWizard)
  tutorContext: TutorContext | null;

  // Quiz
  quizAttempts: QuizAttempt[];
  currentQuizScore: number;

  // Tutor
  tutorMessages: TutorMessage[];
  observations: string[];

  // Timer (for Exam mode)
  examStartTime: number | null;
  examTimeLimit: number; // seconds

  // Actions
  setCurrentExperiment: (slug: string) => void;
  setMode: (mode: ExperimentMode) => void;
  setStep: (step: number) => void;
  setTotalSteps: (n: number) => void;
  nextStep: () => void;
  goToStep: (step: number) => void;

  // Flame Test actions
  selectMetal: (metalId: string | null) => void;
  setHasSample: (has: boolean) => void;
  setIsInFlame: (inFlame: boolean) => void;
  setWireClean: (clean: boolean) => void;

  // Progress actions
  addScore: (points: number) => void;
  completeExperiment: (slug: string, score: number) => void;
  completeMode: (slug: string, mode: ExperimentMode) => void;
  isModeUnlocked: (slug: string, mode: ExperimentMode) => boolean;
  resetExperiment: () => void;

  // UI actions
  setLang: (lang: Language) => void;
  toggleTutor: () => void;
  toggleQuiz: () => void;
  setActiveRightTab: (tab: RightPanelTab) => void;
  setTutorContext: (ctx: TutorContext) => void;

  // Quiz actions
  recordQuizAttempt: (attempt: QuizAttempt) => void;
  resetQuiz: () => void;

  // Tutor actions
  addTutorMessage: (message: TutorMessage) => void;
  updateLastTutorMessage: (content: string) => void;
  clearTutorMessages: () => void;

  // Observation actions
  addObservation: (obs: string) => void;
  clearObservations: () => void;

  // Exam actions
  startExam: () => void;
  endExam: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useExperimentStore = create<ExperimentState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentExperimentSlug: null,
      currentMode: "Guided",
      currentStep: 0,

      selectedMetal: null,
      hasSample: false,
      isInFlame: false,
      wireClean: true,

      score: 0,
      maxScore: 100,
      totalSteps: 0,
      experimentsCompleted: [],
      modeCompletions: {},

      lang: "en",
      isTutorOpen: false,
      isQuizOpen: false,
      activeRightTab: "observations",
      tutorContext: null,

      quizAttempts: [],
      currentQuizScore: 0,

      tutorMessages: [],
      observations: [],

      examStartTime: null,
      examTimeLimit: 15 * 60, // 15 minutes

      // ── Actions ────────────────────────────────────────────────────────────

      setCurrentExperiment: (slug) =>
        set({
          currentExperimentSlug: slug,
          currentStep: 0,
          score: 0,
          selectedMetal: null,
          hasSample: false,
          isInFlame: false,
          wireClean: true,
          observations: [],
          quizAttempts: [],
          tutorMessages: [],
          examStartTime: null,
        }),

      setMode: (mode) => set({ currentMode: mode }),
      setStep: (step) => set({ currentStep: step }),
      setTotalSteps: (n) => set({ totalSteps: n }),
      nextStep: () => set((s) => ({ currentStep: s.currentStep + 1 })),
      goToStep: (step) => set((s) => {
        if (step >= 0 && step < s.totalSteps) return { currentStep: step };
        return {};
      }),

      selectMetal: (metalId) =>
        set({ selectedMetal: metalId, hasSample: metalId !== null }),

      setHasSample: (has) => set({ hasSample: has }),
      setIsInFlame: (inFlame) => set({ isInFlame: inFlame }),
      setWireClean: (clean) => set({ wireClean: clean }),

      addScore: (points) =>
        set((s) => ({ score: Math.min(s.score + points, s.maxScore) })),

      completeExperiment: (slug, score) =>
        set((s) => ({
          experimentsCompleted: s.experimentsCompleted.includes(slug)
            ? s.experimentsCompleted
            : [...s.experimentsCompleted, slug],
          score,
          // Also record mode completion
          modeCompletions: {
            ...s.modeCompletions,
            [slug]: (s.modeCompletions[slug] || []).includes(s.currentMode)
              ? s.modeCompletions[slug] || []
              : [...(s.modeCompletions[slug] || []), s.currentMode],
          },
        })),

      completeMode: (slug, mode) =>
        set((s) => {
          const current = s.modeCompletions[slug] || [];
          if (current.includes(mode)) return {};
          return {
            modeCompletions: {
              ...s.modeCompletions,
              [slug]: [...current, mode],
            },
          };
        }),

      isModeUnlocked: (slug, mode) => {
        const state = get();
        const completed = state.modeCompletions[slug] || [];
        if (mode === "Guided") return true;
        if (mode === "Free") return completed.includes("Guided");
        if (mode === "Exam") return completed.includes("Free");
        return true;
      },

      resetExperiment: () =>
        set({
          currentStep: 0,
          score: 0,
          selectedMetal: null,
          hasSample: false,
          isInFlame: false,
          wireClean: true,
          observations: [],
          quizAttempts: [],
          examStartTime: null,
        }),

      setLang: (lang) => set({ lang }),
      toggleTutor: () =>
        set((s) => ({
          isTutorOpen: !s.isTutorOpen,
          activeRightTab: "tutor",
        })),
      toggleQuiz: () => set((s) => ({ isQuizOpen: !s.isQuizOpen })),
      setActiveRightTab: (tab) => set({ activeRightTab: tab }),
      setTutorContext: (ctx) => set({ tutorContext: ctx }),

      recordQuizAttempt: (attempt) =>
        set((s) => ({
          quizAttempts: [...s.quizAttempts, attempt],
          currentQuizScore: s.currentQuizScore + (attempt.correct ? 1 : 0),
        })),

      resetQuiz: () => set({ quizAttempts: [], currentQuizScore: 0 }),

      addTutorMessage: (message) =>
        set((s) => ({ tutorMessages: [...s.tutorMessages, message] })),

      updateLastTutorMessage: (content) =>
        set((s) => {
          const messages = [...s.tutorMessages];
          if (messages.length > 0) {
            messages[messages.length - 1] = {
              ...messages[messages.length - 1],
              content,
              isStreaming: false,
            };
          }
          return { tutorMessages: messages };
        }),

      clearTutorMessages: () => set({ tutorMessages: [] }),

      addObservation: (obs) =>
        set((s) => ({
          observations: [...s.observations, obs],
        })),

      clearObservations: () => set({ observations: [] }),

      startExam: () =>
        set({
          examStartTime: Date.now(),
          currentMode: "Exam",
          score: 0,
          quizAttempts: [],
          observations: [],
        }),

      endExam: () =>
        set((s) => {
          const timeSpent = s.examStartTime
            ? Math.floor((Date.now() - s.examStartTime) / 1000)
            : 0;
          return {
            examStartTime: null,
            // Could save timeSpent to progress here
          };
        }),
    }),
    {
      name: "chemlab-experiment-store",
      storage: createJSONStorage(() => localStorage),
      // Only persist selected fields
      partialize: (state) => ({
        lang: state.lang,
        experimentsCompleted: state.experimentsCompleted,
        modeCompletions: state.modeCompletions,
      }),
      skipHydration: true,
    }
  )
);
