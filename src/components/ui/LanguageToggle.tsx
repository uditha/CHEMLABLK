"use client";
import { motion } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";
import type { Language } from "@/types";

const LANGUAGES: { code: Language; label: string; nativeLabel: string }[] = [
  { code: "en", label: "EN", nativeLabel: "English" },
  { code: "si", label: "SI", nativeLabel: "සිංහල" },
  { code: "ta", label: "TA", nativeLabel: "தமிழ்" },
];

interface LanguageToggleProps {
  className?: string;
  showNative?: boolean;
}

export function LanguageToggle({ className = "", showNative = false }: LanguageToggleProps) {
  const { lang, setLang } = useExperimentStore();

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {LANGUAGES.map(({ code, label, nativeLabel }) => (
        <motion.button
          key={code}
          onClick={() => setLang(code)}
          whileTap={{ scale: 0.95 }}
          className={`
            relative px-2.5 py-1 rounded text-xs font-semibold transition-all duration-200
            ${lang === code
              ? "text-teal"
              : "text-slate-400 hover:text-white"
            }
          `}
          title={nativeLabel}
        >
          {lang === code && (
            <motion.div
              layoutId="lang-indicator"
              className="absolute inset-0 bg-teal/15 border border-teal/40 rounded"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{showNative ? nativeLabel : label}</span>
        </motion.button>
      ))}
    </div>
  );
}
