// ─── ChemLab LK — Core Types ──────────────────────────────────────────────────

export type Language = "en" | "si" | "ta";
export type Difficulty = "Easy" | "Medium" | "Hard";
export type Priority = "P1" | "P2" | "P3";
export type ExperimentStatus = "Built" | "Next" | "Planned";
export type ExperimentMode = "Guided" | "Free" | "Exam" | "Mistake" | "Teacher";
export type UserRole = "student" | "teacher" | "admin";
export type RightPanelTab = "observations" | "theory" | "tutor";

// ─── Experiment ───────────────────────────────────────────────────────────────

export interface ExperimentData {
  id: string;
  slug: string;
  unit: number;
  title: string;
  titleSi: string;
  titleTa: string;
  description: string;
  difficulty: Difficulty;
  priority: Priority;
  status: ExperimentStatus;
  createdAt?: Date;
}

export interface ExperimentProgress {
  id: string;
  studentId: string;
  experimentId: string;
  mode: ExperimentMode;
  completed: boolean;
  score: number;
  attempts: number;
  timeSpentSeconds: number;
  lastAttempt: Date;
}

// ─── Flame Test ───────────────────────────────────────────────────────────────

export interface MetalData {
  id: string;
  name: string;
  nameSi: string;
  nameTa: string;
  symbol: string;
  flameColor: string;
  flameColorHex: string;
  flameColorSecondary?: string;
  spectrumLines: SpectrumLine[];
  electronTransition: ElectronTransition;
  description: string;
  descriptionSi: string;
  descriptionTa: string;
  wavelengthNm?: number;
  isUnknown?: boolean;
}

export interface SpectrumLine {
  wavelength: number; // nm
  intensity: number; // 0-1
  color: string;
}

export interface ElectronTransition {
  from: number; // energy level (orbital)
  to: number;
  energyEv: number;
  description: string;
}

export interface FlameParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  color: string;
  alpha: number;
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

export interface QuizQuestion {
  id: string;
  experimentId: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  year?: number;
  difficulty: Difficulty;
}

export interface QuizAttempt {
  questionId: string;
  selectedAnswer: number;
  correct: boolean;
  timestamp: Date;
}

// ─── AI Tutor ─────────────────────────────────────────────────────────────────

export interface TutorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface TutorContext {
  experimentSlug: string;
  experimentTitle: string;
  unit: number;
  mode: ExperimentMode;
  currentStep?: string;
  selectedItem?: string;
  observations?: string[];
  language: Language;
}

// ─── User / Auth ──────────────────────────────────────────────────────────────

export interface StudentUser {
  id: string;
  indexNumber: string;
  name: string;
  schoolId: string;
  language: Language;
  classId?: string;
  role: "student";
}

export interface TeacherUser {
  id: string;
  email: string;
  name: string;
  schoolId: string;
  role: "teacher";
}

export type User = StudentUser | TeacherUser;

// ─── i18n ─────────────────────────────────────────────────────────────────────

export interface LocaleStrings {
  common: {
    appName: string;
    loading: string;
    error: string;
    success: string;
    cancel: string;
    confirm: string;
    save: string;
    back: string;
    next: string;
    complete: string;
    score: string;
    attempts: string;
    timeSpent: string;
  };
  nav: {
    dashboard: string;
    experiments: string;
    progress: string;
    settings: string;
    logout: string;
    aiTutor: string;
  };
  lab: {
    guided: string;
    free: string;
    exam: string;
    mistake: string;
    teacher: string;
    startExperiment: string;
    resetExperiment: string;
    submitExam: string;
    askTutor: string;
    viewQuiz: string;
    metalSelector: string;
    unknown: string;
    observations: string;
    spectrumDisplay: string;
    electronDiagram: string;
  };
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
