"use client";

import { useEffect, useRef } from "react";
import type { MetalData } from "@/types";

interface SpectrumDisplayProps {
  metal: MetalData | null;
  showLines: boolean;
}

// Map wavelength (380–780 nm) to x position on canvas
function waveToX(wavelength: number, width: number): number {
  return ((wavelength - 380) / (780 - 380)) * width;
}

// Wavelength to approximate RGB colour
function wavelengthToColor(wl: number): [number, number, number] {
  let r = 0, g = 0, b = 0;
  if (wl >= 380 && wl < 440) {
    r = -(wl - 440) / 60;
    g = 0;
    b = 1;
  } else if (wl >= 440 && wl < 490) {
    r = 0;
    g = (wl - 440) / 50;
    b = 1;
  } else if (wl >= 490 && wl < 510) {
    r = 0;
    g = 1;
    b = -(wl - 510) / 20;
  } else if (wl >= 510 && wl < 580) {
    r = (wl - 510) / 70;
    g = 1;
    b = 0;
  } else if (wl >= 580 && wl < 645) {
    r = 1;
    g = -(wl - 645) / 65;
    b = 0;
  } else if (wl >= 645 && wl <= 780) {
    r = 1;
    g = 0;
    b = 0;
  }
  // Intensity rolloff at edges
  let factor = 1;
  if (wl >= 380 && wl < 420) factor = 0.3 + 0.7 * (wl - 380) / 40;
  else if (wl > 700 && wl <= 780) factor = 0.3 + 0.7 * (780 - wl) / 80;

  return [
    Math.round(255 * Math.pow(r * factor, 0.8)),
    Math.round(255 * Math.pow(g * factor, 0.8)),
    Math.round(255 * Math.pow(b * factor, 0.8)),
  ];
}

export function SpectrumDisplay({ metal, showLines }: SpectrumDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Draw rainbow background spectrum
    for (let x = 0; x < W; x++) {
      const wl = 380 + ((x / W) * (780 - 380));
      const [r, g, b] = wavelengthToColor(wl);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, 0, 1, H);
    }

    // Darken everything (emission spectrum background is black)
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fillRect(0, 0, W, H);

    if (!metal || !showLines) return;

    // Draw emission lines
    for (const line of metal.spectrumLines) {
      const x = waveToX(line.wavelength, W);
      const alpha = line.intensity;
      const [r, g, b] = wavelengthToColor(line.wavelength);

      // Glow effect
      const gradient = ctx.createLinearGradient(x - 8, 0, x + 8, 0);
      gradient.addColorStop(0, `rgba(${r},${g},${b},0)`);
      gradient.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.4})`);
      gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(x - 8, 0, 16, H);

      // Sharp line
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();

      // Bright core
      ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.8})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, H * 0.1);
      ctx.lineTo(x, H * 0.9);
      ctx.stroke();

      // Label wavelength
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`;
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${Math.round(line.wavelength)}`, x, H - 4);
    }
  }, [metal, showLines]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-orbitron text-slate-400 tracking-wider">
          EMISSION SPECTRUM
        </span>
        <div className="flex items-center gap-3 text-xs text-slate-500 font-rajdhani">
          <span>380 nm</span>
          <div className="w-20 h-2 rounded spectrum-gradient opacity-60" />
          <span>780 nm</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={380}
        height={60}
        className="w-full rounded border border-border"
        style={{ imageRendering: "pixelated" }}
      />
      {metal && showLines && metal.spectrumLines.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {metal.spectrumLines.map((line, i) => (
            <span
              key={i}
              className="text-xs font-rajdhani px-2 py-0.5 rounded-full border"
              style={{
                color: line.color,
                borderColor: line.color + "40",
                backgroundColor: line.color + "15",
              }}
            >
              {line.wavelength} nm
            </span>
          ))}
        </div>
      )}
      {(!metal || !showLines) && (
        <p className="text-slate-600 text-xs font-rajdhani mt-2 text-center">
          Select a metal and hold in flame to see emission lines
        </p>
      )}
    </div>
  );
}
