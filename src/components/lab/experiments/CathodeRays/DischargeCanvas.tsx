"use client";

import { motion, AnimatePresence } from "framer-motion";

export type CathodeRayTest =
  | "none"
  | "shadow"
  | "electric"
  | "magnetic"
  | "paddle";

interface DischargeCanvasProps {
  isOn: boolean;
  activeTest: CathodeRayTest;
}

// ─── Dimensions ───────────────────────────────────────────────────────────────
const W = 560;
const H = 220;
const TUBE_Y1 = 55;
const TUBE_Y2 = 165;
const TUBE_X1 = 30;
const TUBE_X2 = 530;
const MID_Y = (TUBE_Y1 + TUBE_Y2) / 2; // 110
const CATHODE_X = 70;
const ANODE_X = 230;
const SCREEN_X = 500;

// Beam path: cathode → anode hole → screen
const BEAM_Y = MID_Y;

// Electric deflection: beam curves upward (toward + plate on top)
function deflectedBeamPath(deflect: "up" | "down" | null): string {
  if (!deflect) {
    return `M ${ANODE_X} ${BEAM_Y} L ${SCREEN_X} ${BEAM_Y}`;
  }
  const dy = deflect === "up" ? -38 : 38;
  return `M ${ANODE_X} ${BEAM_Y} Q ${(ANODE_X + SCREEN_X) / 2} ${BEAM_Y + dy / 2} ${SCREEN_X} ${BEAM_Y + dy}`;
}

function screenHitY(deflect: "up" | "down" | null): number {
  if (!deflect) return BEAM_Y;
  return deflect === "up" ? BEAM_Y - 38 : BEAM_Y + 38;
}

export function DischargeCanvas({ isOn, activeTest }: DischargeCanvasProps) {
  const deflect: "up" | "down" | null =
    activeTest === "electric" ? "up" : activeTest === "magnetic" ? "down" : null;

  const hitY = screenHitY(deflect);
  const showShadow = activeTest === "shadow";
  const showPaddle = activeTest === "paddle";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-full"
      style={{ maxHeight: "220px" }}
    >
      {/* ── Glow filter ────────────────────────────────────────────────── */}
      <defs>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="softglow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="tubeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1A2540" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#0A0E1A" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#1A2540" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* ── Glass tube body ─────────────────────────────────────────────── */}
      <rect
        x={TUBE_X1}
        y={TUBE_Y1}
        width={TUBE_X2 - TUBE_X1}
        height={TUBE_Y2 - TUBE_Y1}
        rx="18"
        fill="url(#tubeGrad)"
        stroke="#2A3A5C"
        strokeWidth="2"
      />
      {/* Glass shine */}
      <rect
        x={TUBE_X1 + 4}
        y={TUBE_Y1 + 4}
        width={TUBE_X2 - TUBE_X1 - 8}
        height="12"
        rx="6"
        fill="white"
        fillOpacity="0.05"
      />

      {/* ── Vacuum glow (when on) ──────────────────────────────────────── */}
      {isOn && (
        <motion.rect
          x={TUBE_X1 + 2}
          y={TUBE_Y1 + 2}
          width={TUBE_X2 - TUBE_X1 - 4}
          height={TUBE_Y2 - TUBE_Y1 - 4}
          rx="16"
          fill="#7C3AED"
          fillOpacity="0.06"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.04, 0.08, 0.04] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* ── Cathode ─────────────────────────────────────────────────────── */}
      <rect
        x={CATHODE_X - 6}
        y={TUBE_Y1 + 20}
        width="12"
        height={TUBE_Y2 - TUBE_Y1 - 40}
        rx="3"
        fill="#374151"
        stroke="#4B5563"
        strokeWidth="1.5"
      />
      {/* Cathode wire */}
      <line
        x1={CATHODE_X - 6}
        y1={MID_Y}
        x2={TUBE_X1}
        y2={MID_Y}
        stroke="#374151"
        strokeWidth="3"
      />
      <text
        x={CATHODE_X}
        y={TUBE_Y1 - 8}
        textAnchor="middle"
        fill="#94A3B8"
        fontSize="11"
        fontFamily="monospace"
      >
        Cathode (−)
      </text>
      {/* Negative glow around cathode when on */}
      {isOn && (
        <motion.ellipse
          cx={CATHODE_X + 12}
          cy={MID_Y}
          rx="18"
          ry="28"
          fill="#818CF8"
          fillOpacity="0.15"
          animate={{ fillOpacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* ── Anode ───────────────────────────────────────────────────────── */}
      {/* Top part */}
      <rect
        x={ANODE_X - 5}
        y={TUBE_Y1 + 18}
        width="10"
        height={MID_Y - TUBE_Y1 - 28}
        rx="2"
        fill="#92400E"
        stroke="#B45309"
        strokeWidth="1.5"
      />
      {/* Bottom part */}
      <rect
        x={ANODE_X - 5}
        y={MID_Y + 10}
        width="10"
        height={TUBE_Y2 - MID_Y - 28}
        rx="2"
        fill="#92400E"
        stroke="#B45309"
        strokeWidth="1.5"
      />
      {/* Anode hole label */}
      <text
        x={ANODE_X}
        y={TUBE_Y2 + 18}
        textAnchor="middle"
        fill="#94A3B8"
        fontSize="11"
        fontFamily="monospace"
      >
        Anode (+)
      </text>

      {/* ── Electric field plates ────────────────────────────────────────── */}
      {activeTest === "electric" && (
        <>
          {/* Top plate (positive) */}
          <rect
            x={ANODE_X + 30}
            y={TUBE_Y1 + 8}
            width={SCREEN_X - ANODE_X - 60}
            height="8"
            rx="2"
            fill="#DC2626"
            fillOpacity="0.8"
          />
          <text
            x={(ANODE_X + 30 + SCREEN_X - 30) / 2}
            y={TUBE_Y1 + 4}
            textAnchor="middle"
            fill="#FCA5A5"
            fontSize="10"
            fontFamily="monospace"
          >
            + + + + +
          </text>
          {/* Bottom plate (negative) */}
          <rect
            x={ANODE_X + 30}
            y={TUBE_Y2 - 16}
            width={SCREEN_X - ANODE_X - 60}
            height="8"
            rx="2"
            fill="#1D4ED8"
            fillOpacity="0.8"
          />
          <text
            x={(ANODE_X + 30 + SCREEN_X - 30) / 2}
            y={TUBE_Y2 + 14}
            textAnchor="middle"
            fill="#93C5FD"
            fontSize="10"
            fontFamily="monospace"
          >
            − − − − −
          </text>
          <text
            x={(ANODE_X + SCREEN_X) / 2}
            y={TUBE_Y1 - 8}
            textAnchor="middle"
            fill="#FBBF24"
            fontSize="10"
            fontFamily="monospace"
          >
            Electric Field ↑
          </text>
        </>
      )}

      {/* ── Magnetic field dots (into screen) ───────────────────────────── */}
      {activeTest === "magnetic" && (
        <>
          {[320, 360, 400, 440].map((x) =>
            [85, 110, 135].map((y) => (
              <text
                key={`${x}-${y}`}
                x={x}
                y={y}
                textAnchor="middle"
                fill="#34D399"
                fontSize="13"
                fontFamily="monospace"
                fillOpacity="0.6"
              >
                ×
              </text>
            ))
          )}
          <text
            x={(ANODE_X + SCREEN_X) / 2}
            y={TUBE_Y1 - 8}
            textAnchor="middle"
            fill="#34D399"
            fontSize="10"
            fontFamily="monospace"
          >
            Magnetic Field (into page)
          </text>
        </>
      )}

      {/* ── Cross obstacle (shadow test) ─────────────────────────────────── */}
      {showShadow && (
        <>
          {/* Vertical bar */}
          <rect
            x={360}
            y={TUBE_Y1 + 25}
            width="10"
            height={TUBE_Y2 - TUBE_Y1 - 50}
            fill="#475569"
            stroke="#64748B"
            strokeWidth="1"
          />
          {/* Horizontal bar */}
          <rect
            x={345}
            y={MID_Y - 5}
            width="40"
            height="10"
            fill="#475569"
            stroke="#64748B"
            strokeWidth="1"
          />
        </>
      )}

      {/* ── Paddle wheel ─────────────────────────────────────────────────── */}
      {showPaddle && (
        <motion.g
          transform={`translate(365, ${MID_Y})`}
          animate={isOn ? { rotate: [0, 360] } : { rotate: 0 }}
          transition={
            isOn ? { duration: 1.2, repeat: Infinity, ease: "linear" } : {}
          }
        >
          {/* Hub */}
          <circle r="7" fill="#475569" stroke="#64748B" strokeWidth="1" />
          {/* Blades */}
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <rect
              key={angle}
              x="-3"
              y="-22"
              width="6"
              height="15"
              rx="2"
              fill="#94A3B8"
              transform={`rotate(${angle})`}
            />
          ))}
        </motion.g>
      )}

      {/* ── Cathode ray beam ─────────────────────────────────────────────── */}
      {isOn && (
        <>
          {/* Cathode → Anode segment (always straight) */}
          <motion.line
            x1={CATHODE_X + 8}
            y1={BEAM_Y}
            x2={ANODE_X}
            y2={BEAM_Y}
            stroke="#818CF8"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#glow)"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />

          {/* Anode → Screen segment (deflected or straight, hidden behind shadow) */}
          {!showShadow && (
            <motion.path
              d={deflectedBeamPath(deflect)}
              stroke="#818CF8"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              filter="url(#glow)"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}

          {/* Partial beam hitting the cross (shadow test) */}
          {showShadow && (
            <>
              {/* Beam hits the cross - partial beam up to cross */}
              <motion.line
                x1={ANODE_X}
                y1={BEAM_Y}
                x2={358}
                y2={BEAM_Y}
                stroke="#818CF8"
                strokeWidth="2.5"
                strokeLinecap="round"
                filter="url(#glow)"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              {/* Beams going around cross (top and bottom) */}
              <motion.line
                x1={358}
                y1={TUBE_Y1 + 25}
                x2={372}
                y2={TUBE_Y1 + 25}
                stroke="#818CF8"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeOpacity="0.5"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <motion.line
                x1={372}
                y1={TUBE_Y1 + 25}
                x2={SCREEN_X}
                y2={TUBE_Y1 + 25}
                stroke="#818CF8"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeOpacity="0.5"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <motion.line
                x1={372}
                y1={TUBE_Y2 - 25}
                x2={SCREEN_X}
                y2={TUBE_Y2 - 25}
                stroke="#818CF8"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeOpacity="0.5"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            </>
          )}

          {/* Moving particle dots along the beam */}
          {!showShadow && !showPaddle && (
            <motion.circle
              r="3"
              fill="#C4B5FD"
              filter="url(#glow)"
              animate={{
                offsetDistance: ["0%", "100%"],
              }}
              style={{
                offsetPath: `path("${deflectedBeamPath(deflect)}")`,
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          )}

          {/* Screen hit glow */}
          {!showShadow && (
            <motion.ellipse
              cx={SCREEN_X}
              cy={hitY}
              rx="12"
              ry="12"
              fill="#818CF8"
              filter="url(#softglow)"
              animate={{ opacity: [0.4, 0.9, 0.4], rx: [10, 14, 10] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}

          {/* Shadow cross silhouette on screen */}
          {showShadow && (
            <>
              {/* Dark shadow area (cross shape) on screen */}
              <rect
                x={SCREEN_X - 4}
                y={MID_Y - 35}
                width="8"
                height={70}
                fill="#0A0E1A"
                fillOpacity="0.85"
              />
              <rect
                x={SCREEN_X - 16}
                y={MID_Y - 5}
                width="32"
                height={10}
                fill="#0A0E1A"
                fillOpacity="0.85"
              />
              {/* Glow around shadow cross */}
              <motion.ellipse
                cx={SCREEN_X}
                cy={TUBE_Y1 + 32}
                rx="10"
                ry="6"
                fill="#818CF8"
                filter="url(#softglow)"
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <motion.ellipse
                cx={SCREEN_X}
                cy={TUBE_Y2 - 32}
                rx="10"
                ry="6"
                fill="#818CF8"
                filter="url(#softglow)"
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </>
          )}
        </>
      )}

      {/* ── Fluorescent screen ───────────────────────────────────────────── */}
      <rect
        x={SCREEN_X - 5}
        y={TUBE_Y1 + 15}
        width="10"
        height={TUBE_Y2 - TUBE_Y1 - 30}
        rx="3"
        fill={isOn ? "#1E293B" : "#111827"}
        stroke={isOn ? "#818CF8" : "#374151"}
        strokeWidth="1.5"
      />
      <text
        x={SCREEN_X}
        y={TUBE_Y1 - 8}
        textAnchor="middle"
        fill="#94A3B8"
        fontSize="11"
        fontFamily="monospace"
      >
        Screen
      </text>

      {/* ── Labels ──────────────────────────────────────────────────────── */}
      {/* Low pressure label */}
      <text
        x={(CATHODE_X + SCREEN_X) / 2}
        y={TUBE_Y2 + 32}
        textAnchor="middle"
        fill="#475569"
        fontSize="10"
        fontFamily="monospace"
      >
        Low pressure gas (evacuated)
      </text>

      {/* ── Power indicator ──────────────────────────────────────────────── */}
      <circle
        cx={TUBE_X1 + 14}
        cy={TUBE_Y1 - 12}
        r="5"
        fill={isOn ? "#10B981" : "#374151"}
      />
      <text
        x={TUBE_X1 + 24}
        y={TUBE_Y1 - 8}
        fill={isOn ? "#10B981" : "#6B7280"}
        fontSize="10"
        fontFamily="monospace"
      >
        {isOn ? "HV ON" : "HV OFF"}
      </text>
    </svg>
  );
}
