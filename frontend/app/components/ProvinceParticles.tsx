"use client";

import { useRef, useEffect } from "react";
import type { ProvinceStats } from "../lib/provinceSimulation";
import { scoreToColor } from "../lib/provinceSimulation";

interface Particle {
  x: number; y: number; vx: number; vy: number;
  age: number; speed: number; idx: number;
  status: "winner" | "loser" | "neutral";
}

interface Props {
  stats: ProvinceStats;
  width?: number;
  height?: number;
  onParticleClick?: (idx: number, x: number, y: number) => void;
}

function seeded(seed: number, n: number) {
  return Math.abs(Math.sin(seed * 127.1 + n * 311.7)) % 1;
}

export default function ProvinceParticles({ stats, width = 340, height = 180, onParticleClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const count = Math.min(600, stats.agentCount);
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const s = i * 31 + parseInt(stats.id) * 7;
      const isWinner = seeded(s, 13) < stats.winnerPct;
      const isLoser  = !isWinner && seeded(s, 17) < stats.loserPct;
      const status   = isWinner ? "winner" : isLoser ? "loser" : "neutral";
      particles.push({
        x: seeded(s, 1) * width,
        y: seeded(s, 2) * height,
        vx: (seeded(s, 3) - 0.5) * 0.8,
        vy: (seeded(s, 4) - 0.5) * 0.8,
        age: seeded(s, 5) * Math.PI * 2,
        speed: 0.4 + seeded(s, 6) * 0.6,
        idx: i,
        status,
      });
    }
    particlesRef.current = particles;
  }, [stats, width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#020b18";
      ctx.fillRect(0, 0, width, height);

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.age += 0.04;

        if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); }
        if (p.x > width) { p.x = width; p.vx = -Math.abs(p.vx); }
        if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy); }
        if (p.y > height) { p.y = height; p.vy = -Math.abs(p.vy); }

        const r = 3.5 * (1 + Math.sin(p.age) * 0.35);
        const color = p.status === "winner" ? "#22c55e" : p.status === "loser" ? "#ef4444" : "#60a5fa";

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.5);
        grad.addColorStop(0, color + "cc");
        grad.addColorStop(1, "transparent");

        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [width, height]);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!onParticleClick) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let closest: Particle | null = null;
    let minDist = 20;
    for (const p of particlesRef.current) {
      const d = Math.hypot(p.x - mx, p.y - my);
      if (d < minDist) { minDist = d; closest = p; }
    }
    if (closest) onParticleClick(closest.idx, e.clientX, e.clientY);
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleClick}
      style={{ width: "100%", height, cursor: "crosshair", borderRadius: 8, display: "block" }}
    />
  );
}
