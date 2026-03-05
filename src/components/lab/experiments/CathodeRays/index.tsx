"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useExperimentStore } from "@/store/experimentStore";
import { StepWizard } from "../../StepWizard";
import { CompletionOverlay } from "../../CompletionOverlay";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useSession } from "next-auth/react";
import { saveProgress } from "@/lib/progress";
import { DischargeCanvas } from "./DischargeCanvas";
import type { StepDefinition } from "../../StepWizard";
import type { CathodeRayTest } from "./DischargeCanvas";

// ─── Property summary card ────────────────────────────────────────────────────

const PROPERTIES = [
  {
    id: "straight",
    icon: "→",
    title: "Travel in Straight Lines",
    evidence: "Shadow of cross visible on screen",
    color: "#818CF8",
  },
  {
    id: "negative",
    icon: "−",
    title: "Carry Negative Charge",
    evidence: "Deflected towards positive plate",
    color: "#F87171",
  },
  {
    id: "magnetic",
    icon: "⊕",
    title: "Deflected by Magnetic Field",
    evidence: "Beam bends perpendicular to field",
    color: "#34D399",
  },
  {
    id: "mass",
    icon: "⚙",
    title: "Possess Mass (Momentum)",
    evidence: "Paddle wheel rotates when struck",
    color: "#FBBF24",
  },
  {
    id: "fluorescence",
    icon: "✦",
    title: "Cause Fluorescence",
    evidence: "Bright glow on fluorescent screen",
    color: "#C4B5FD",
  },
];

function PropertySummary({ confirmed }: { confirmed: Set<string> }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-3">
        PROPERTIES CONFIRMED
      </p>
      {PROPERTIES.map((p) => {
        const done = confirmed.has(p.id);
        return (
          <div
            key={p.id}
            className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all ${
              done
                ? "border-opacity-40 bg-opacity-10"
                : "border-border bg-transparent opacity-40"
            }`}
            style={
              done
                ? {
                    borderColor: p.color + "50",
                    backgroundColor: p.color + "10",
                  }
                : undefined
            }
          >
            <span
              className="text-sm font-bold w-5 text-center flex-shrink-0 mt-0.5"
              style={{ color: done ? p.color : "#4B5563" }}
            >
              {done ? p.icon : "○"}
            </span>
            <div>
              <p
                className="text-sm font-rajdhani font-semibold"
                style={{ color: done ? "#F1F5F9" : "#6B7280" }}
              >
                {p.title}
              </p>
              <p className="text-xs font-rajdhani text-slate-500">
                {p.evidence}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Step content wrapper with canvas ────────────────────────────────────────

function StepContent({
  isOn,
  activeTest,
  onToggle,
  toggleLabel,
  toggleActive,
  children,
}: {
  isOn: boolean;
  activeTest: CathodeRayTest;
  onToggle?: () => void;
  toggleLabel?: string;
  toggleActive?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Discharge tube canvas */}
      <div className="flex-shrink-0 bg-navy/40 border border-border rounded-xl p-4 flex items-center justify-center">
        <DischargeCanvas isOn={isOn} activeTest={activeTest} />
      </div>

      {/* Controls + info */}
      <div className="flex flex-col gap-3 flex-1 justify-center">
        {onToggle && toggleLabel && (
          <div className="flex justify-center">
            <motion.button
              onClick={onToggle}
              whileTap={{ scale: 0.96 }}
              className={`px-6 py-3 rounded-lg text-sm font-rajdhani font-bold border-2 transition-all ${
                toggleActive
                  ? "border-teal/60 bg-teal/15 text-teal"
                  : "border-slate-600/60 text-slate-300 bg-slate-800/40 hover:border-slate-400"
              }`}
            >
              {toggleLabel}
            </motion.button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ─── Main experiment ──────────────────────────────────────────────────────────

interface CathodeRaysProps {
  onScoreUpdate?: (score: number) => void;
}

export function CathodeRays({ onScoreUpdate }: CathodeRaysProps) {
  const {
    currentMode,
    score,
    addScore,
    setTotalSteps,
    completeMode,
    resetExperiment,
  } = useExperimentStore();

  const { playSuccess } = useSoundEffects();
  const { data: session } = useSession();
  const startTimeRef = useRef(Date.now());
  const [showCompletion, setShowCompletion] = useState(false);

  // Per-step state
  const [tubeOn, setTubeOn] = useState(false);
  const [shadowShown, setShadowShown] = useState(false);
  const [electricShown, setElectricShown] = useState(false);
  const [magneticShown, setMagneticShown] = useState(false);
  const [paddleShown, setPaddleShown] = useState(false);

  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setTotalSteps(5);
  }, [setTotalSteps]);

  function confirm(id: string, pts: number) {
    setConfirmed((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      playSuccess();
      addScore(pts);
      onScoreUpdate?.(pts);
      return next;
    });
  }

  // Step 1 — Evacuate & Power On
  function handlePowerOn() {
    setTubeOn(true);
    confirm("fluorescence", 10);
  }

  // Step 2 — Shadow test
  function handleToggleShadow() {
    const next = !shadowShown;
    setShadowShown(next);
    if (next) confirm("straight", 15);
  }

  // Step 3 — Electric field
  function handleToggleElectric() {
    const next = !electricShown;
    setElectricShown(next);
    if (next) confirm("negative", 15);
  }

  // Step 4 — Magnetic field
  function handleToggleMagnetic() {
    const next = !magneticShown;
    setMagneticShown(next);
    if (next) confirm("magnetic", 15);
  }

  // Step 5 — Paddle wheel
  function handleTogglePaddle() {
    const next = !paddleShown;
    setPaddleShown(next);
    if (next) confirm("mass", 15);
  }

  function handleComplete() {
    completeMode("cathode-rays", currentMode);
    setShowCompletion(true);
    if (session?.user?.role === "student") {
      saveProgress({
        slug: "cathode-rays",
        mode: currentMode,
        score,
        timeSpentSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
      }).catch(() => {});
    }
  }

  function handleDoAgain() {
    resetExperiment();
    setTubeOn(false);
    setShadowShown(false);
    setElectricShown(false);
    setMagneticShown(false);
    setPaddleShown(false);
    setConfirmed(new Set());
    startTimeRef.current = Date.now();
    setShowCompletion(false);
  }

  const activeTest = useCallback((): CathodeRayTest => {
    if (paddleShown) return "paddle";
    if (magneticShown) return "magnetic";
    if (electricShown) return "electric";
    if (shadowShown) return "shadow";
    return "none";
  }, [paddleShown, magneticShown, electricShown, shadowShown]);

  // ─── Step definitions ────────────────────────────────────────────────────

  const steps: StepDefinition[] = [
    // ── Step 1: Setup ──
    {
      id: "setup",
      title: "Set Up the Discharge Tube",
      subtitle: "Evacuate to low pressure and apply high voltage.",
      canProceed: tubeOn,
      instructions: {
        procedure: [
          "Connect the discharge tube to a vacuum pump and reduce the pressure to ~0.01 atm",
          "Connect the cathode (−) and anode (+) to a high-voltage supply (5 000 – 15 000 V)",
          "Switch on the high-voltage supply",
          "Observe the glowing beam appearing between the electrodes",
        ],
        safetyNotes: [
          "High voltage is dangerous — never touch the electrodes when the power is on",
          "The glass tube becomes hot with extended use",
        ],
        expectedObservations: [
          "A glowing beam appears, travelling from cathode toward the anode and screen",
          "The fluorescent screen glows where the beam strikes it",
          "The gas in the tube may glow with a faint purple/violet colour",
        ],
        tips: [
          "The beam is invisible in air — vacuum is essential",
          "A fluorescent coating (e.g. zinc sulfide) on the screen makes the beam visible",
        ],
      },
      quiz: {
        question:
          "Why must the discharge tube be evacuated to low pressure before cathode rays can be produced?",
        options: [
          "To make the glass transparent",
          "To allow the high voltage to create a visible glow without air resistance stopping the beam",
          "To keep the electrodes cool",
          "To make the beam travel faster",
        ],
        correctIndex: 1,
        explanation:
          "At atmospheric pressure, electrons collide with too many gas molecules and cannot travel. Low pressure allows the beam to cross the tube. The remaining gas molecules that are ionised produce the glow.",
      },
      theory: (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">
              WHAT ARE CATHODE RAYS?
            </p>
            <p className="text-xs font-rajdhani text-slate-300 leading-relaxed">
              Cathode rays are streams of electrons emitted from the negative electrode (cathode) when
              a high voltage is applied across a gas at low pressure. They were discovered by J.J. Thomson
              in 1897, who used them to determine the charge-to-mass ratio (e/m) of the electron.
            </p>
          </div>
          <div>
            <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">
              VACUUM NEEDED
            </p>
            <p className="text-xs font-rajdhani text-amber-300/80">
              At normal pressure, electrons collide with air molecules and cannot travel far. Evacuating
              the tube allows the electrons to travel freely from cathode to screen.
            </p>
          </div>
        </div>
      ),
      content: (
        <StepContent isOn={tubeOn} activeTest="none">
          <div className="flex flex-col items-center gap-3">
            <motion.button
              onClick={handlePowerOn}
              disabled={tubeOn}
              whileTap={{ scale: 0.96 }}
              className={`px-8 py-3 rounded-lg text-sm font-rajdhani font-bold border-2 transition-all ${
                tubeOn
                  ? "border-green-500/50 bg-green-900/15 text-green-400 cursor-default"
                  : "border-amber-500/60 text-amber-200 bg-amber-900/20 hover:bg-amber-800/30"
              }`}
            >
              {tubeOn ? "✓ Tube Active — Cathode Rays Visible" : "Evacuate & Apply High Voltage"}
            </motion.button>
            {tubeOn && (
              <motion.p
                className="text-sm font-rajdhani text-teal text-center"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                Cathode rays appear as a glowing beam. The screen fluoresces where the beam hits.
                <br />
                <span className="text-slate-400">
                  Property confirmed: <strong className="text-purple-400">Fluorescence</strong>
                </span>
              </motion.p>
            )}
          </div>
        </StepContent>
      ),
    },

    // ── Step 2: Straight Line ──
    {
      id: "shadow",
      title: "Property 1: Straight Line Travel",
      subtitle: "Place a cross-shaped obstacle in the beam path.",
      canProceed: shadowShown,
      instructions: {
        procedure: [
          "With the tube on, place a metal cross obstacle inside the tube in the path of the beam",
          "Observe the fluorescent screen carefully",
          "Note the shape of the dark region on the screen",
        ],
        expectedObservations: [
          "A sharp cross-shaped shadow appears on the fluorescent screen",
          "The shadow is well-defined, showing the beam cannot bend around the obstacle",
        ],
        tips: [
          "The sharpness of the shadow proves the rays travel in perfectly straight lines",
          "This is the same property that light has — later experiments show cathode rays are NOT light",
        ],
      },
      quiz: {
        question: "What does the cross-shaped shadow on the screen prove about cathode rays?",
        options: [
          "That they carry a negative charge",
          "That they travel in straight lines",
          "That they have mass",
          "That they cause fluorescence",
        ],
        correctIndex: 1,
        explanation:
          "The sharp shadow proves the rays travel in straight lines — they cannot bend around the obstacle. If they were waves like light, diffraction would blur the edges.",
      },
      theory: (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">
              STRAIGHT LINE PROPAGATION
            </p>
            <p className="text-xs font-rajdhani text-slate-300 leading-relaxed">
              When a metal cross is placed in the path of cathode rays, a sharp cross-shaped shadow
              is cast on the fluorescent screen. This proves the rays travel in straight lines,
              just as light does — they cannot bend around obstacles.
            </p>
          </div>
          <div>
            <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">
              WHY THIS MATTERS
            </p>
            <p className="text-xs font-rajdhani text-slate-400 leading-relaxed">
              This was one of the first clues that cathode rays are a stream of particles, not
              a wave. The sharp shadow edge shows no diffraction — unlike what you would see with
              a light wave passing an obstacle.
            </p>
          </div>
        </div>
      ),
      content: (
        <StepContent
          isOn={tubeOn}
          activeTest={shadowShown ? "shadow" : "none"}
          onToggle={handleToggleShadow}
          toggleLabel={shadowShown ? "✓ Cross Obstacle In Place" : "Place Cross in Beam Path"}
          toggleActive={shadowShown}
        >
          {shadowShown && (
            <motion.div
              className="bg-navy/40 border border-indigo-500/30 rounded-lg p-3 text-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-sm font-rajdhani text-white font-semibold">
                Sharp cross-shaped shadow on screen!
              </p>
              <p className="text-xs font-rajdhani text-slate-400 mt-1">
                Conclusion: <strong className="text-indigo-300">Cathode rays travel in straight lines.</strong>
              </p>
            </motion.div>
          )}
        </StepContent>
      ),
    },

    // ── Step 3: Electric Field ──
    {
      id: "electric",
      title: "Property 2: Negative Charge",
      subtitle: "Apply an electric field across the beam.",
      canProceed: electricShown,
      instructions: {
        procedure: [
          "Remove the cross obstacle from the tube",
          "Place two charged metal plates inside the tube — positive plate on top, negative plate on bottom",
          "Apply the electric field and observe the beam direction on the screen",
          "Note which plate the beam deflects toward",
        ],
        expectedObservations: [
          "The beam deflects upward, toward the positive plate",
          "The spot on the fluorescent screen moves upward",
        ],
        tips: [
          "Opposite charges attract — the beam moving toward the + plate proves it carries − charge",
          "J.J. Thomson used this to calculate the charge-to-mass ratio e/m of the electron",
        ],
      },
      quiz: {
        question:
          "The cathode ray beam deflects toward the positive plate. What does this prove?",
        options: [
          "Cathode rays travel faster near positive charges",
          "Cathode rays carry negative charge",
          "Cathode rays are positively charged",
          "Cathode rays are not affected by electric fields",
        ],
        correctIndex: 1,
        explanation:
          "Opposite charges attract. Since the beam is attracted toward the positive plate, the cathode rays must carry negative charge — they are electrons.",
      },
      theory: (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">
              ELECTRIC DEFLECTION
            </p>
            <p className="text-xs font-rajdhani text-slate-300 leading-relaxed">
              When an electric field is applied (+ plate on top, − plate on bottom), the beam
              deflects toward the positive plate. Since opposite charges attract, this proves
              cathode rays carry <strong className="text-red-400">negative charge</strong>.
            </p>
          </div>
          <div>
            <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">
              J.J. THOMSON (1897)
            </p>
            <p className="text-xs font-rajdhani text-slate-400 leading-relaxed">
              Thomson used the degree of deflection to calculate the charge-to-mass ratio (e/m)
              of the particles. He found e/m = 1.76 × 10¹¹ C kg⁻¹, the same regardless of
              the cathode material — proving these were a universal particle: the electron.
            </p>
          </div>
        </div>
      ),
      content: (
        <StepContent
          isOn={tubeOn}
          activeTest={electricShown ? "electric" : "none"}
          onToggle={handleToggleElectric}
          toggleLabel={electricShown ? "✓ Electric Field Applied" : "Apply Electric Field"}
          toggleActive={electricShown}
        >
          {electricShown && (
            <motion.div
              className="bg-navy/40 border border-red-500/30 rounded-lg p-3 text-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-sm font-rajdhani text-white font-semibold">
                Beam deflects toward the + plate!
              </p>
              <p className="text-xs font-rajdhani text-slate-400 mt-1">
                Conclusion: <strong className="text-red-300">Cathode rays carry negative charge.</strong>
              </p>
            </motion.div>
          )}
        </StepContent>
      ),
    },

    // ── Step 4: Magnetic Field ──
    {
      id: "magnetic",
      title: "Property 3: Magnetic Deflection",
      subtitle: "Apply a magnetic field perpendicular to the beam.",
      canProceed: magneticShown,
      instructions: {
        procedure: [
          "Remove the electric field plates",
          "Apply a magnetic field directed into the page (shown by × symbols) around the beam",
          "Observe the direction of deflection of the beam",
        ],
        expectedObservations: [
          "The beam deflects downward (using Fleming's left-hand rule for negative charges moving left)",
          "The spot on the fluorescent screen moves downward",
        ],
        tips: [
          "Use Fleming's left-hand rule: point fingers in direction of conventional current (opposite to electron flow), curl toward field direction, thumb points in force direction",
          "Reversing the magnetic field direction reverses the deflection",
        ],
      },
      quiz: {
        question:
          "What does the deflection of cathode rays by a magnetic field confirm?",
        options: [
          "Cathode rays are a form of light",
          "Cathode rays are electrically neutral",
          "Cathode rays are moving charged particles",
          "Cathode rays travel slower than light",
        ],
        correctIndex: 2,
        explanation:
          "A magnetic field only exerts force on moving charged particles (F = qv × B). Since cathode rays are deflected, they must be moving charged particles — confirming they are electrons.",
      },
      theory: (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">
              MAGNETIC FORCE
            </p>
            <p className="text-xs font-rajdhani text-slate-300 leading-relaxed">
              A magnetic field exerts a force on moving charged particles: <strong className="text-green-300">F = qv × B</strong>.
              The deflection of cathode rays by a magnetic field confirms they are moving charged particles.
            </p>
          </div>
          <div>
            <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">
              DIRECTION
            </p>
            <p className="text-xs font-rajdhani text-slate-400 leading-relaxed">
              For electrons (negative charge) moving left with B field into the page:
              the force is directed downward. Reversing B or the velocity reverses the deflection.
            </p>
          </div>
        </div>
      ),
      content: (
        <StepContent
          isOn={tubeOn}
          activeTest={magneticShown ? "magnetic" : "none"}
          onToggle={handleToggleMagnetic}
          toggleLabel={magneticShown ? "✓ Magnetic Field Applied" : "Apply Magnetic Field"}
          toggleActive={magneticShown}
        >
          {magneticShown && (
            <motion.div
              className="bg-navy/40 border border-green-500/30 rounded-lg p-3 text-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-sm font-rajdhani text-white font-semibold">
                Beam deflects downward!
              </p>
              <p className="text-xs font-rajdhani text-slate-400 mt-1">
                Conclusion:{" "}
                <strong className="text-green-300">
                  Cathode rays are moving charged particles (electrons).
                </strong>
              </p>
            </motion.div>
          )}
        </StepContent>
      ),
    },

    // ── Step 5: Paddle Wheel ──
    {
      id: "paddle",
      title: "Property 4: Mechanical Effect",
      subtitle: "Place a small paddle wheel in the beam path.",
      canProceed: paddleShown,
      instructions: {
        procedure: [
          "Remove the magnetic field",
          "Place a lightweight paddle wheel (Crookes wheel) on tracks inside the tube",
          "Position it in the path of the cathode ray beam",
          "Switch on the tube and observe the wheel",
        ],
        expectedObservations: [
          "The paddle wheel rotates when the beam strikes it",
          "If the beam is blocked, the wheel stops",
          "Moving the tube tilts the wheel direction",
        ],
        tips: [
          "The wheel rotates because the electrons transfer momentum to the paddles",
          "This proves cathode rays have mass — they can do mechanical work",
        ],
      },
      quiz: {
        question: "What does the rotation of the paddle wheel prove about cathode rays?",
        options: [
          "They travel in straight lines",
          "They possess mass and can transfer momentum",
          "They carry negative charge",
          "They travel at the speed of light",
        ],
        correctIndex: 1,
        explanation:
          "The wheel rotates because the beam transfers momentum to it. Momentum = mass × velocity. Since the rays can transfer momentum, they must have mass — proving cathode rays are particles (electrons), not massless waves.",
      },
      theory: (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">
              MECHANICAL EFFECT
            </p>
            <p className="text-xs font-rajdhani text-slate-300 leading-relaxed">
              When the cathode ray beam strikes the paddles of the wheel, it rotates. This shows
              the rays transfer momentum (p = mv), proving they have mass. This was key evidence
              that cathode rays are <strong className="text-yellow-300">particles, not waves</strong>.
            </p>
          </div>
          <div>
            <p className="text-xs font-orbitron text-slate-500 tracking-wider mb-2">
              HISTORICAL NOTE
            </p>
            <p className="text-xs font-rajdhani text-slate-400 leading-relaxed">
              William Crookes (1879) used the paddle wheel experiment to demonstrate the mechanical
              effect of cathode rays. J.J. Thomson later determined the mass of the electron
              using e/m measurements.
            </p>
          </div>
        </div>
      ),
      content: (
        <StepContent
          isOn={tubeOn}
          activeTest={paddleShown ? "paddle" : "none"}
          onToggle={handleTogglePaddle}
          toggleLabel={paddleShown ? "✓ Paddle Wheel Spinning" : "Place Paddle Wheel in Beam"}
          toggleActive={paddleShown}
        >
          {paddleShown && (
            <motion.div
              className="bg-navy/40 border border-yellow-500/30 rounded-lg p-3 text-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-sm font-rajdhani text-white font-semibold">
                Paddle wheel rotates!
              </p>
              <p className="text-xs font-rajdhani text-slate-400 mt-1">
                Conclusion:{" "}
                <strong className="text-yellow-300">
                  Cathode rays possess mass and can transfer momentum.
                </strong>
              </p>
            </motion.div>
          )}
        </StepContent>
      ),
    },
  ];

  // Persistent observations panel
  const persistentNotes = <PropertySummary confirmed={confirmed} />;

  return (
    <>
      <StepWizard
        steps={steps}
        persistentNotes={persistentNotes}
        experimentTitle="Properties of Cathode Rays"
        onComplete={handleComplete}
      />
      {showCompletion && (
        <CompletionOverlay
          experimentTitle="Properties of Cathode Rays (Discharge Tube)"
          score={score}
          maxScore={100}
          itemsTested={confirmed.size}
          totalItems={PROPERTIES.length}
          timeSpentSeconds={Math.floor(
            (Date.now() - startTimeRef.current) / 1000
          )}
          onDoAgain={handleDoAgain}
        />
      )}
    </>
  );
}
