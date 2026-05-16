"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import type { ProvinceStats } from "../lib/provinceSimulation";

const TurkeyMap = dynamic(() => import("./TurkeyMap"), { ssr: false });

interface Props {
  beforeStats: ProvinceStats[];   // Day 1 — policy just announced
  afterStats: ProvinceStats[];    // Day 365 — full effect
  selectedId: string | null;
  onSelect: (id: string, name: string) => void;
}

export default function SplitMap({ beforeStats, afterStats, selectedId, onSelect }: Props) {
  const [splitPct, setSplitPct] = useState(50);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    setSplitPct(pct);
  }, [dragging]);

  const onMouseUp = useCallback(() => setDragging(false), []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", userSelect: "none" }}
    >
      {/* ── BEFORE (left) ── */}
      <div style={{
        position: "absolute", inset: 0,
        clipPath: `inset(0 ${100 - splitPct}% 0 0)`,
        transition: dragging ? "none" : "clip-path 0.05s",
      }}>
        <TurkeyMap provinceStats={beforeStats} selectedId={selectedId} onSelect={onSelect} />
        {/* Label */}
        <div style={{
          position: "absolute", top: 12, left: 16,
          background: "rgba(2,11,24,0.85)", borderRadius: 8,
          padding: "5px 14px", fontSize: 12, color: "#9ca3af",
          border: "1px solid #1e3a5f",
        }}>
          📅 Mevcut Durum <span style={{ color: "#60a5fa", marginLeft: 6 }}>Gün 1</span>
        </div>
      </div>

      {/* ── AFTER (right) ── */}
      <div style={{
        position: "absolute", inset: 0,
        clipPath: `inset(0 0 0 ${splitPct}%)`,
        transition: dragging ? "none" : "clip-path 0.05s",
      }}>
        <TurkeyMap provinceStats={afterStats} selectedId={selectedId} onSelect={onSelect} />
        {/* Label */}
        <div style={{
          position: "absolute", top: 12, right: 16,
          background: "rgba(2,11,24,0.85)", borderRadius: 8,
          padding: "5px 14px", fontSize: 12, color: "#9ca3af",
          border: "1px solid #1e3a5f",
        }}>
          <span style={{ color: "#facc15", marginRight: 6 }}>1 Yıl Sonra</span> 📊 Gün 365
        </div>
      </div>

      {/* ── Divider ── */}
      <div
        onMouseDown={() => setDragging(true)}
        style={{
          position: "absolute",
          top: 0, bottom: 0,
          left: `${splitPct}%`,
          width: 40,
          transform: "translateX(-50%)",
          cursor: "col-resize",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Line */}
        <div style={{
          position: "absolute",
          top: 0, bottom: 0,
          left: "50%",
          width: 2,
          background: "linear-gradient(180deg, transparent, #facc15, #facc15, transparent)",
          opacity: 0.9,
        }} />

        {/* Handle */}
        <div style={{
          width: 36, height: 36,
          borderRadius: "50%",
          background: "#020b18",
          border: "2px solid #facc15",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          boxShadow: "0 0 16px #facc1566",
          zIndex: 1,
          transition: "transform 0.1s",
          transform: dragging ? "scale(1.2)" : "scale(1)",
        }}>
          ⇔
        </div>
      </div>
    </div>
  );
}
