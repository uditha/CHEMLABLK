"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { EXPERIMENTS, UNITS } from "@/data/experiments";

const FLAME_COLORS = [
  "#FFA500", // Na yellow
  "#9966CC", // K violet
  "#FF1744", // Li red
  "#FF8F00", // Ca orange
  "#E53935", // Sr crimson
  "#66BB6A", // Ba green
  "#00BCD4", // Cu blue-green
];

function FloatingParticle({ color, delay, x }: { color: string; delay: number; x: number }) {
  return (
    <motion.div
      className="absolute w-1 h-1 rounded-full opacity-60"
      style={{ backgroundColor: color, left: `${x}%`, bottom: "20%" }}
      animate={{
        y: [0, -120, -240],
        opacity: [0, 0.7, 0],
        scale: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 3,
        delay,
        repeat: Infinity,
        ease: "easeOut",
      }}
    />
  );
}

const experimentCount = EXPERIMENTS.length;
const builtCount = EXPERIMENTS.filter((e) => e.status === "Built").length;
const p1Count = EXPERIMENTS.filter((e) => e.priority === "P1").length;

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-deep text-white overflow-hidden">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 lab-grid-bg opacity-40" />

        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(13,126,106,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Floating flame particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {FLAME_COLORS.map((color, i) => (
            <FloatingParticle
              key={i}
              color={color}
              delay={i * 0.7}
              x={10 + i * 12}
            />
          ))}
          {FLAME_COLORS.map((color, i) => (
            <FloatingParticle
              key={`b${i}`}
              color={color}
              delay={i * 0.5 + 1.5}
              x={15 + i * 11}
            />
          ))}
        </div>

        {/* Nav */}
        <nav className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-teal/20 border border-teal/40 flex items-center justify-center">
              <span className="text-teal font-orbitron font-bold text-sm">C</span>
            </div>
            <span className="font-orbitron font-bold text-white tracking-widest text-sm">
              CHEMLAB LK
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-slate-300 hover:text-white text-sm font-rajdhani font-medium transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="bg-teal hover:bg-teal-light text-white text-sm font-rajdhani font-semibold px-4 py-2 rounded transition-colors"
            >
              Get Started
            </Link>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          {/* Sri Lanka flag colours stripe */}
          <motion.div
            className="flex justify-center gap-1 mb-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-8 h-1.5 bg-orange-500 rounded-full" />
            <div className="w-8 h-1.5 bg-green-500 rounded-full" />
            <div className="w-24 h-1.5 bg-amber-600 rounded-full" />
            <div className="w-8 h-1.5 bg-green-500 rounded-full" />
            <div className="w-8 h-1.5 bg-orange-500 rounded-full" />
          </motion.div>

          <motion.p
            className="text-teal font-orbitron text-xs tracking-[0.3em] mb-4 uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Sri Lanka A/L Chemistry · NIE Syllabus {new Date().getFullYear()}
          </motion.p>

          <motion.h1
            className="font-orbitron text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <span className="text-white">Chemistry Lab</span>
            <br />
            <span className="glow-teal" style={{ color: "#0D7E6A" }}>
              In Your Pocket
            </span>
          </motion.h1>

          <motion.p
            className="text-slate-300 text-lg md:text-xl font-rajdhani max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            All{" "}
            <span className="text-gold font-bold">{experimentCount} A/L Chemistry practicals</span>{" "}
            simulated. For the 300,000 students who deserve a real lab
            experience — wherever they are in Sri Lanka.
          </motion.p>

          <motion.p
            className="text-slate-400 text-base font-rajdhani mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            English · <span className="font-sinhala">සිංහල</span> ·{" "}
            <span className="font-tamil">தமிழ்</span>
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Link
              href="/register"
              className="w-full sm:w-auto bg-teal hover:bg-teal-light text-white font-orbitron font-bold py-3 px-8 rounded text-sm tracking-wider transition-all duration-200 hover:shadow-teal-glow"
            >
              START EXPERIMENTING
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto border border-teal/50 text-teal hover:border-teal hover:bg-teal/10 font-orbitron font-bold py-3 px-8 rounded text-sm tracking-wider transition-all duration-200"
            >
              LOG IN
            </Link>
          </motion.div>
        </div>

        {/* Stats bar */}
        <motion.div
          className="absolute bottom-8 left-0 right-0 flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <div className="flex gap-8 md:gap-16 text-center">
            <div>
              <div className="font-orbitron text-2xl font-bold text-teal">
                {experimentCount}
              </div>
              <div className="text-slate-400 text-xs tracking-wider">
                EXPERIMENTS
              </div>
            </div>
            <div>
              <div className="font-orbitron text-2xl font-bold text-gold">
                {UNITS.length}
              </div>
              <div className="text-slate-400 text-xs tracking-wider">
                NIE UNITS
              </div>
            </div>
            <div>
              <div className="font-orbitron text-2xl font-bold text-white">
                3
              </div>
              <div className="text-slate-400 text-xs tracking-wider">
                LANGUAGES
              </div>
            </div>
            <div>
              <div className="font-orbitron text-2xl font-bold" style={{ color: "#FFA500" }}>
                5
              </div>
              <div className="text-slate-400 text-xs tracking-wider">
                LAB MODES
              </div>
            </div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-2 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-px h-8 bg-gradient-to-b from-teal/60 to-transparent mx-auto" />
        </motion.div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-bench">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className="font-orbitron text-2xl md:text-3xl font-bold text-center mb-4 text-white"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Why ChemLab LK?
          </motion.h2>
          <p className="text-slate-400 text-center mb-16 font-rajdhani text-lg">
            Built for students who have never held a burette.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: "⚗️",
                title: "Realistic Simulations",
                desc: "Particle-based flame animations. Accurate colour physics. Real chemical behaviour — not cartoons.",
                color: "#0D7E6A",
              },
              {
                icon: "🤖",
                title: "AI Chemistry Tutor",
                desc: "Powered by Claude (Anthropic). Socratic guidance. Responds in English, Sinhala, or Tamil.",
                color: "#C4962A",
              },
              {
                icon: "📋",
                title: "Exam Simulation",
                desc: "Unknown samples. 15-minute timer. Auto-marked against the actual DoE mark scheme.",
                color: "#FF1744",
              },
              {
                icon: "📊",
                title: "Track Progress",
                desc: "Score every experiment. Teachers see class performance. 5 lab modes for every learning style.",
                color: "#9966CC",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                className="lab-panel p-6 rounded lab-panel-hover cursor-default"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3
                  className="font-orbitron font-bold text-sm mb-3 tracking-wide"
                  style={{ color: feature.color }}
                >
                  {feature.title}
                </h3>
                <p className="text-slate-400 text-sm font-rajdhani leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Experiment Showcase ────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className="font-orbitron text-2xl md:text-3xl font-bold text-center mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            All{" "}
            <span style={{ color: "#0D7E6A" }}>{experimentCount} Experiments</span>
          </motion.h2>
          <p className="text-slate-400 text-center mb-16 font-rajdhani text-lg">
            Every practical in the NIE {new Date().getFullYear()} Chemistry syllabus.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {EXPERIMENTS.slice(0, 16).map((exp, i) => (
              <motion.div
                key={exp.slug}
                className="lab-panel p-3 rounded text-sm"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-slate-500 font-orbitron text-xs">
                    U{String(exp.unit).padStart(2, "0")}
                  </span>
                  <span
                    className={
                      exp.status === "Built"
                        ? "badge-built"
                        : exp.status === "Next"
                        ? "badge-next"
                        : "badge-planned"
                    }
                  >
                    {exp.status}
                  </span>
                </div>
                <p className="text-slate-300 font-rajdhani text-sm leading-tight line-clamp-2">
                  {exp.title}
                </p>
              </motion.div>
            ))}
            {/* Show remaining count */}
            <motion.div
              className="lab-panel p-3 rounded text-sm flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              <span className="text-slate-400 font-orbitron text-sm text-center">
                +{experimentCount - 16} more
                <br />
                experiments
              </span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Lab Modes ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-bench">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            className="font-orbitron text-2xl md:text-3xl font-bold text-center mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            5 Lab Modes
          </motion.h2>
          <p className="text-slate-400 text-center mb-16 font-rajdhani text-lg">
            Every student learns differently. Every mode serves a purpose.
          </p>

          <div className="space-y-4">
            {[
              {
                mode: "GUIDED",
                color: "#0D7E6A",
                desc: "Step-by-step walkthrough with hints. The AI tutor explains the chemistry behind every observation. Perfect for first attempts.",
              },
              {
                mode: "FREE EXPLORE",
                color: "#C4962A",
                desc: "Open bench. No scoring. No timer. Combine anything. Curiosity-driven discovery — science the way it should feel.",
              },
              {
                mode: "EXAM",
                color: "#FF1744",
                desc: "Unknown sample. 15 minutes. Auto-marked against the DoE mark scheme. The closest you can get to the real A/L practical.",
              },
              {
                mode: "MISTAKE LAB",
                color: "#9966CC",
                desc: "A pre-broken experiment is presented. Find the error. Explain why the results are wrong. Fix it. The most powerful learning mode.",
              },
              {
                mode: "TEACHER ASSIGNMENT",
                color: "#3b82f6",
                desc: "Your teacher assigns an experiment with a deadline. Auto-graded. Results sent to the class dashboard.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="lab-panel p-5 rounded flex items-start gap-4"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div
                  className="w-1.5 self-stretch rounded-full flex-shrink-0 mt-1"
                  style={{ backgroundColor: item.color }}
                />
                <div>
                  <h3
                    className="font-orbitron font-bold text-sm tracking-wider mb-1"
                    style={{ color: item.color }}
                  >
                    {item.mode}
                  </h3>
                  <p className="text-slate-400 font-rajdhani text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 text-center">
        <motion.div
          className="max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-orbitron text-3xl md:text-4xl font-bold mb-6">
            Ready to Start?
          </h2>
          <p className="text-slate-400 font-rajdhani text-lg mb-10">
            Free for all Sri Lankan A/L Chemistry students. No equipment
            required. No lab fee. Just chemistry.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-teal hover:bg-teal-light text-white font-orbitron font-bold py-4 px-10 rounded text-sm tracking-wider transition-all duration-200 hover:shadow-teal-glow"
            >
              I'M A STUDENT →
            </Link>
            <Link
              href="/register?type=teacher"
              className="w-full sm:w-auto border border-gold/50 text-gold hover:border-gold hover:bg-gold/10 font-orbitron font-bold py-4 px-10 rounded text-sm tracking-wider transition-all duration-200"
            >
              I'M A TEACHER →
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-orbitron font-bold text-teal text-sm tracking-widest">
              CHEMLAB LK
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-500 text-xs font-rajdhani">
              NIE Chemistry {new Date().getFullYear()} · Units 1–14
            </span>
          </div>
          <p className="text-slate-600 text-xs font-rajdhani text-center">
            Built with maximum effort for Sri Lankan students who deserve access to proper chemistry education.
          </p>
        </div>
      </footer>
    </main>
  );
}
