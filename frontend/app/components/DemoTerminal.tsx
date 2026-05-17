"use client";

import { useEffect, useRef } from "react";
import type { DemoLogEntry } from "../lib/demoScenario";
import { getDemoPhaseLabel } from "../lib/demoScenario";

interface Props {
  logs: DemoLogEntry[];
  currentDay: number;
}

const LEVEL_COLOR = { info: "#4ade80", warn: "#facc15", critical: "#f87171" } as const;
const LEVEL_TAG   = { info: "  INFO  ", warn: "▲ UYARI ", critical: "█ KRİTİK" } as const;

export default function DemoTerminal({ logs, currentDay }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const phase  = getDemoPhaseLabel(currentDay);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  return (
    <div style={{
      position: "fixed", bottom: 70, left: 16,
      width: 470, zIndex: 90,
      fontFamily: "'Courier New', monospace",
      fontSize: 11,
    }}>
      {/* Faz banner */}
      <div style={{
        background: "rgba(0,4,10,0.95)",
        borderTop:    `1px solid ${phase.color}44`,
        borderLeft:   `1px solid ${phase.color}44`,
        borderRight:  `1px solid ${phase.color}44`,
        borderBottom: "none",
        borderRadius: "8px 8px 0 0",
        padding: "5px 14px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ color: phase.color, fontWeight: 700, fontSize: 10, letterSpacing: 1 }}>
          {phase.label}
        </span>
        <span style={{ color: "#374151", fontSize: 9, letterSpacing: 1 }}>
          6301 TERSINE GÖÇ PAKETİ — GÜN {currentDay}/365
        </span>
      </div>

      {/* Log satırları */}
      <div style={{
        background: "rgba(0,4,10,0.95)",
        border: `1px solid ${phase.color}33`,
        borderRadius: "0 0 8px 8px",
        overflow: "hidden",
        boxShadow: `0 0 30px ${phase.color}11`,
      }}>
        <div style={{ maxHeight: 164, overflowY: "auto", padding: "6px 0" }}
          className="demo-terminal-scroll">
          <style>{`.demo-terminal-scroll::-webkit-scrollbar{width:3px}.demo-terminal-scroll::-webkit-scrollbar-thumb{background:#1a3a1a}`}</style>
          {logs.slice(-9).map((entry, i) => (
            <div key={i} style={{
              padding: "2px 14px", display: "flex", gap: 10, alignItems: "flex-start",
              opacity: i === Math.min(logs.length, 9) - 1 ? 1 : 0.6 + (i / 20),
              animation: i === Math.min(logs.length, 9) - 1 ? "termFadeIn 0.3s ease" : undefined,
            }}>
              <style>{`@keyframes termFadeIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}`}</style>
              <span style={{ color: "#1d4d1d", flexShrink: 0, fontSize: 10 }}>
                {String(entry.day).padStart(3, "0")}
              </span>
              <span style={{ color: LEVEL_COLOR[entry.level], fontWeight: entry.level !== "info" ? 700 : 400, flexShrink: 0 }}>
                {LEVEL_TAG[entry.level]}
              </span>
              <span style={{ color: entry.level === "critical" ? "#fca5a5" : entry.level === "warn" ? "#fde68a" : "#bbf7d0", lineHeight: 1.4 }}>
                {entry.msg}
              </span>
            </div>
          ))}
          {logs.length === 0 && (
            <div style={{ padding: "8px 14px", color: "#1d4d1d", fontSize: 10 }}>
              Simülasyon başlatılıyor...
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
}
