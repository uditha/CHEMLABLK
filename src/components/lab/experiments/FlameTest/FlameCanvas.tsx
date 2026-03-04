"use client";

import { useRef, useEffect, useCallback } from "react";

// ─── FlameParticle ────────────────────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;       // 0–1
  decay: number;
  size: number;
  color: string;
  twinkle: number;
}

function createParticle(
  cx: number,
  cy: number,
  color: string,
  intensity: number = 1
): Particle {
  const angle = (Math.random() * Math.PI) - Math.PI / 2; // upward spread
  const speed = (1.5 + Math.random() * 3) * intensity;
  return {
    x: cx + (Math.random() - 0.5) * 20,
    y: cy,
    vx: Math.cos(angle) * speed * 0.4 + (Math.random() - 0.5) * 0.8,
    vy: -Math.abs(Math.sin(angle) * speed) - 1.5,
    life: 1,
    decay: 0.012 + Math.random() * 0.018,
    size: (3 + Math.random() * 8) * intensity,
    color,
    twinkle: Math.random() * Math.PI * 2,
  };
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  // BUG FIX: Clamp life before any Math.sqrt call to prevent NaN alpha
  const clampedLife = Math.max(0, Math.min(1, p.life));
  const alpha = Math.max(0, Math.min(1, Math.sqrt(clampedLife)));

  const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
  gradient.addColorStop(0, hexToRgba(p.color, alpha));
  gradient.addColorStop(0.6, hexToRgba(p.color, alpha * 0.5));
  gradient.addColorStop(1, hexToRgba(p.color, 0));

  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── FlameCanvas Component ────────────────────────────────────────────────────

interface FlameCanvasProps {
  flameColor: string;
  flameColorSecondary?: string;
  isActive: boolean;   // true = flame animating
  intensity?: number;  // 0.5–2
  width?: number;
  height?: number;
}

export function FlameCanvas({
  flameColor,
  flameColorSecondary,
  isActive,
  intensity = 1,
  width = 400,
  height = 500,
}: FlameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resize observer to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const observer = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    });
    observer.observe(container);
    canvas.width = container.clientWidth || width;
    canvas.height = container.clientHeight || height;

    return () => observer.disconnect();
  }, [width, height]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Clear with slight trail effect for glow
    ctx.fillStyle = "rgba(10, 14, 26, 0.25)";
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const burnerY = H - 60;

    // Draw burner base
    ctx.fillStyle = "#2a3a5e";
    ctx.fillRect(cx - 25, burnerY, 50, 20);
    ctx.fillStyle = "#1a2a4e";
    ctx.fillRect(cx - 15, burnerY + 20, 30, 40);

    if (isActive) {
      // Spawn new particles
      const spawnCount = Math.floor(3 + Math.random() * 4 * intensity);
      for (let i = 0; i < spawnCount; i++) {
        particlesRef.current.push(createParticle(cx, burnerY, flameColor, intensity));
        // Add secondary colour particles occasionally
        if (flameColorSecondary && Math.random() < 0.3) {
          particlesRef.current.push(
            createParticle(cx, burnerY, flameColorSecondary, intensity * 0.7)
          );
        }
        // Add warm core particles
        if (Math.random() < 0.4) {
          particlesRef.current.push(createParticle(cx, burnerY, "#FFFFFF", intensity * 0.3));
        }
      }

      // Draw intense glow at base of flame
      const glowGrad = ctx.createRadialGradient(cx, burnerY, 0, cx, burnerY, 60 * intensity);
      glowGrad.addColorStop(0, hexToRgba(flameColor, 0.6));
      glowGrad.addColorStop(0.5, hexToRgba(flameColor, 0.2));
      glowGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, burnerY, 60 * intensity, 0, Math.PI * 2);
      ctx.fill();
    }

    // Update and draw particles
    particlesRef.current = particlesRef.current.filter((p) => p.life > 0.01);

    for (const p of particlesRef.current) {
      // BUG FIX: Use Math.max(0, ...) before subtracting to prevent negative life
      p.life = Math.max(0, p.life - p.decay);

      // Physics
      p.x += p.vx;
      p.y += p.vy;
      p.vx += (Math.random() - 0.5) * 0.3; // turbulence
      p.vy *= 0.99; // slight deceleration
      p.twinkle += 0.1;

      if (p.life > 0.01) {
        drawParticle(ctx, p);
      }
    }

    // Wire above flame (if active)
    if (isActive) {
      ctx.strokeStyle = hexToRgba("#AAAAAA", 0.7);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 2, burnerY - 15);
      ctx.lineTo(cx - 2, burnerY - 80);
      ctx.stroke();

      // Loop at top of wire
      ctx.strokeStyle = hexToRgba("#888888", 0.9);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, burnerY - 80, 8, 0, Math.PI * 2);
      ctx.stroke();

      // Sample glowing in loop
      const glowR = 12 + Math.sin(Date.now() * 0.01) * 3;
      const sampleGlow = ctx.createRadialGradient(
        cx, burnerY - 80, 0,
        cx, burnerY - 80, glowR
      );
      sampleGlow.addColorStop(0, hexToRgba(flameColor, 0.9));
      sampleGlow.addColorStop(0.5, hexToRgba(flameColor, 0.4));
      sampleGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sampleGlow;
      ctx.beginPath();
      ctx.arc(cx, burnerY - 80, glowR, 0, Math.PI * 2);
      ctx.fill();
    }

    // BUG FIX: Store frame ID so we can cancel on unmount
    animFrameRef.current = requestAnimationFrame(animate);
  }, [isActive, flameColor, flameColorSecondary, intensity]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(animate);

    // BUG FIX: Cancel animation frame on unmount to prevent memory leak
    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [animate]);

  // Clear particles when flame turns off
  useEffect(() => {
    if (!isActive) {
      // Let particles fade naturally, just stop spawning
      // (handled by isActive check in animate loop)
    }
  }, [isActive]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      style={{ minHeight: height }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: "block" }}
        aria-label="Flame test animation canvas"
      />
    </div>
  );
}
