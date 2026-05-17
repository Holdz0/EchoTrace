"use client";

import { useState, useEffect } from "react";
import type { AlertDef } from "../lib/alertSystem";

interface Props {
  alerts: AlertDef[];
  scenarioKey: string; // reset dismissed when scenario changes
}

export default function AlertToast({ alerts, scenarioKey }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Clear dismissed state when scenario changes
  useEffect(() => { setDismissed(new Set()); }, [scenarioKey]);

  const visible = alerts.filter(a => !dismissed.has(a.id)).slice(0, 3);
  if (visible.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 54,
        right: 12,
        zIndex: 400,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: 340,
        pointerEvents: "auto",
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(50px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {visible.map(alert => {
        const color =
          alert.severity === "critical" ? "#ef4444" :
          alert.severity === "success"  ? "#22c55e" :
          "#f59e0b";
        const label =
          alert.severity === "critical" ? "🔴 KRİTİK UYARI" :
          alert.severity === "success"  ? "🟢 CANLANMA"     :
          "🟡 UYARI";
        return (
          <div
            key={alert.id}
            style={{
              background: "#030f1e",
              borderTop:    `1px solid ${color}66`,
              borderRight:  `1px solid ${color}66`,
              borderBottom: `1px solid ${color}66`,
              borderLeft:   `4px solid ${color}`,
              borderRadius: 8,
              padding: "10px 14px",
              boxShadow: `0 0 24px ${color}33`,
              animation: "slideInRight 0.4s ease",
              position: "relative",
            }}
          >
            <button
              onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
              style={{
                position: "absolute", top: 5, right: 8,
                background: "none", border: "none", color: "#4b5563",
                cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 2,
              }}
            >✕</button>

            <div style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>
              {label} — {alert.provinceName}
            </div>
            <div style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 600, marginBottom: 4, paddingRight: 18, lineHeight: 1.4 }}>
              {alert.message}
            </div>
            <div style={{ fontSize: 10, color: "#6b7280", lineHeight: 1.5 }}>
              {alert.detail}
            </div>
          </div>
        );
      })}
    </div>
  );
}
