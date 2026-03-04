"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSoundEffects } from "@/hooks/useSoundEffects";

interface CompletionOverlayProps {
  experimentTitle: string;
  score: number;
  maxScore: number;
  itemsTested: number;
  totalItems: number;
  timeSpentSeconds: number;
  /** Go back to dashboard */
  onBack?: () => void;
  /** Reset and redo the experiment (Do Again) */
  onDoAgain?: () => void;
  /** @deprecated Use onBack/onDoAgain */
  onClose?: () => void;
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-navy/40 border border-border rounded-lg p-3">
      <p className="text-slate-500 text-xs font-orbitron tracking-wider">{label}</p>
      <p className={`text-lg font-orbitron font-bold ${color}`}>{value}</p>
    </div>
  );
}

export function CompletionOverlay({
  experimentTitle,
  score,
  maxScore,
  itemsTested,
  totalItems,
  timeSpentSeconds,
  onBack,
  onDoAgain,
  onClose,
}: CompletionOverlayProps) {
  const { playFanfare } = useSoundEffects();

  useEffect(() => {
    playFanfare();
  }, [playFanfare]);

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const mins = Math.floor(timeSpentSeconds / 60);
  const secs = timeSpentSeconds % 60;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div
        className="relative z-10 bg-panel border border-border rounded-xl p-8 max-w-md w-full text-center"
        initial={{ scale: 0.8, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 20 }}
      >
        {/* Trophy */}
        <motion.div
          className="text-6xl mb-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
          transition={{ delay: 0.3, type: "spring" }}
        >
          🏆
        </motion.div>

        <h2 className="font-orbitron text-lg font-bold text-gold tracking-wider mb-1">
          WELL DONE!
        </h2>
        <p className="text-slate-400 text-sm font-rajdhani mb-6">{experimentTitle}</p>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard label="SCORE" value={`${score}`} color="text-teal" />
          <StatCard label="ACCURACY" value={`${percentage}%`} color="text-gold" />
          <StatCard
            label="TESTED"
            value={`${itemsTested}/${totalItems}`}
            color="text-teal"
          />
          <StatCard
            label="TIME"
            value={`${mins}m ${String(secs).padStart(2, "0")}s`}
            color="text-slate-300"
          />
        </div>

        <div className="flex flex-col gap-2">
          {onBack ? (
            <button
              onClick={onBack}
              className="w-full py-2.5 rounded-lg text-sm font-rajdhani font-bold bg-teal hover:bg-teal-light text-white transition-all"
            >
              Back to Dashboard
            </button>
          ) : (
            <Link
              href="/dashboard"
              className="w-full py-2.5 rounded-lg text-sm font-rajdhani font-bold bg-teal hover:bg-teal-light text-white transition-all text-center block"
            >
              Back to Dashboard
            </Link>
          )}
          {(onDoAgain ?? onClose) && (
            <button
              onClick={onDoAgain ?? onClose}
              className="w-full py-2 rounded-lg text-xs font-rajdhani text-slate-400 hover:text-white border border-border hover:border-slate-500 transition-all"
            >
              {onDoAgain ? "Do Again" : "Continue Experimenting"}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
