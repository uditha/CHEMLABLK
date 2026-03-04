"use client";

import { useEffect, useRef, useState } from "react";
import type { MetalData } from "@/types";

const BASE_WIDTH = 200;
const BASE_HEIGHT = 195;
const ASPECT = BASE_HEIGHT / BASE_WIDTH;
const MAX_HEIGHT = 300;

interface ElectronDiagramProps {
  metal: MetalData | null;
  isExcited: boolean;
}

export function ElectronDiagram({ metal, isExcited }: ElectronDiagramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ w: BASE_WIDTH, h: BASE_HEIGHT });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const scale = W / BASE_WIDTH;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "#0A0E1A";
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const nucleusY = H - 22 * scale;
    const nucleusR = 14 * scale;
    const shellSpacing = 20 * scale;

    // Draw energy levels (shells)
    const shells = [1, 2, 3, 4, 5, 6, 7];
    const shellColors = [
      "#FF6B6B", "#FFA500", "#FFD700",
      "#00FF7F", "#00BFFF", "#9966CC", "#FF69B4"
    ];

    shells.forEach((shell, i) => {
      const yPos = nucleusY - (shell * shellSpacing) - 8 * scale;
      ctx.strokeStyle = `rgba(${i < 3 ? "50,150,100" : "30,80,60"},0.5)`;
      ctx.lineWidth = Math.max(1, scale);
      ctx.setLineDash([4 * scale, 4 * scale]);
      ctx.beginPath();
      ctx.moveTo(20 * scale, yPos);
      ctx.lineTo(W - 20 * scale, yPos);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = "rgba(100,150,120,0.6)";
      ctx.font = `${Math.round(8 * scale)}px monospace`;
      ctx.textAlign = "left";
      ctx.fillText(`n=${shell}`, 4 * scale, yPos + 3 * scale);
    });

    if (!metal) {
      // Draw nucleus
      const nucGrad = ctx.createRadialGradient(cx, nucleusY, 0, cx, nucleusY, nucleusR);
      nucGrad.addColorStop(0, "#ffffff");
      nucGrad.addColorStop(0.5, "#888888");
      nucGrad.addColorStop(1, "#333333");
      ctx.fillStyle = nucGrad;
      ctx.beginPath();
      ctx.arc(cx, nucleusY, nucleusR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(100,150,120,0.6)";
      ctx.font = `${Math.round(9 * scale)}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText("Select metal", cx, H / 2);
      return;
    }

    const { from, to } = metal.electronTransition;
    const fromY = nucleusY - (from * shellSpacing) - 8 * scale;
    const toY = nucleusY - (to * shellSpacing) - 8 * scale;

    // Draw the electron at either excited or ground state
    const currentY = isExcited ? fromY : toY;
    const electronX = cx + 26 * scale;
    const electronR = 8 * scale;

    // Electron (animated)
    const time = Date.now() * 0.003;
    const wobble = Math.sin(time) * (isExcited ? 6 : 2.5) * scale;

    const electronGrad = ctx.createRadialGradient(
      electronX + wobble, currentY, 0,
      electronX + wobble, currentY, electronR
    );
    electronGrad.addColorStop(0, metal.flameColor);
    electronGrad.addColorStop(0.6, metal.flameColor + "80");
    electronGrad.addColorStop(1, "transparent");

    ctx.fillStyle = electronGrad;
    ctx.beginPath();
    ctx.arc(electronX + wobble, currentY, electronR, 0, Math.PI * 2);
    ctx.fill();

    // Core electron
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(electronX + wobble, currentY, 3.5 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Draw arrow showing transition direction
    if (isExcited && from !== to) {
      // Arrow going down (emission)
      const arrowX = cx - 18 * scale;
      ctx.strokeStyle = metal.flameColor;
      ctx.lineWidth = Math.max(2, 2 * scale);
      ctx.setLineDash([4 * scale, 3 * scale]);
      ctx.beginPath();
      ctx.moveTo(arrowX, fromY);
      ctx.lineTo(arrowX, toY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrowhead
      ctx.fillStyle = metal.flameColor;
      ctx.beginPath();
      ctx.moveTo(arrowX, toY + 6 * scale);
      ctx.lineTo(arrowX - 5 * scale, toY - 2 * scale);
      ctx.lineTo(arrowX + 5 * scale, toY - 2 * scale);
      ctx.closePath();
      ctx.fill();

      // Photon squiggle
      const midY = (fromY + toY) / 2;
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = Math.max(1.5, 1.5 * scale);
      ctx.beginPath();
      ctx.moveTo(arrowX + 12 * scale, fromY);
      for (let y = fromY; y > toY; y -= 4 * scale) {
        const x = arrowX + 12 * scale + Math.sin((fromY - y) * 0.5) * 4 * scale;
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Energy label
      ctx.fillStyle = metal.flameColor;
      ctx.font = `bold ${Math.round(9 * scale)}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText(`${metal.electronTransition.energyEv} eV`, arrowX, midY);
      ctx.fillText(`λ=${metal.wavelengthNm ?? "?"} nm`, arrowX, midY + 11 * scale);
    }

    // Draw nucleus
    const nucGrad = ctx.createRadialGradient(cx, nucleusY, 0, cx, nucleusY, nucleusR);
    nucGrad.addColorStop(0, "#FFFFFF");
    nucGrad.addColorStop(0.4, metal.flameColor + "CC");
    nucGrad.addColorStop(1, metal.flameColor + "44");
    ctx.fillStyle = nucGrad;
    ctx.beginPath();
    ctx.arc(cx, nucleusY, nucleusR, 0, Math.PI * 2);
    ctx.fill();

    // Symbol in nucleus
    ctx.fillStyle = "#000000";
    ctx.font = `bold ${Math.round(11 * scale)}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(metal.symbol, cx, nucleusY);
    ctx.textBaseline = "alphabetic";

    // State label
    ctx.fillStyle = isExcited ? metal.flameColor : "#94a3b8";
    ctx.font = `${Math.round(9 * scale)}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(
      isExcited ? "EXCITED STATE" : "GROUND STATE",
      cx,
      12 * scale
    );

  }, [metal, isExcited, dimensions]);

  // Resize canvas to fill available width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const containerW = Math.max(BASE_WIDTH, Math.floor(e.contentRect.width));
        const scale = Math.min(containerW / BASE_WIDTH, MAX_HEIGHT / BASE_HEIGHT);
        const w = Math.floor(BASE_WIDTH * scale);
        const h = Math.floor(BASE_HEIGHT * scale);
        setDimensions((prev) => (prev.w !== w || prev.h !== h ? { w, h } : prev));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Animate only when excited
  useEffect(() => {
    if (!isExcited) return;
    let raf: number;
    function loop() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Force redraw by dispatching custom event
      canvas.dispatchEvent(new Event("animframe"));
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isExcited, metal]);

  // Re-render when canvas gets animframe event
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = () => {
      // Trigger React re-render via dummy state would be expensive
      // Instead, we directly call the draw logic again
      // The effect above with [metal, isExcited] handles this
    };
    canvas.addEventListener("animframe", handler);
    return () => canvas.removeEventListener("animframe", handler);
  }, []);

  return (
    <div ref={containerRef} className="w-full shrink-0 min-w-[200px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-orbitron text-slate-400 tracking-wider">
          ELECTRON TRANSITION
        </span>
        {metal && (
          <span
            className="text-xs font-rajdhani font-medium"
            style={{ color: metal.flameColor }}
          >
            {metal.symbol} — {isExcited ? "Emitting" : "Ground State"}
          </span>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={dimensions.w}
        height={dimensions.h}
        className="w-full rounded border border-border"
        style={{ imageRendering: "auto" }}
      />
      {metal && (
        <p className="text-xs text-slate-500 font-rajdhani mt-1.5 leading-relaxed">
          {metal.electronTransition.description}
        </p>
      )}
    </div>
  );
}
