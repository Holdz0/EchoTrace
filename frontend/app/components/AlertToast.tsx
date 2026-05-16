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
        const isCrit = alert.severity === "critical";
        const color  = isCrit ? "#ef4444" : "#f59e0b";
        return (
          <div
            key={alert.id}
            style={{
              background: "#030f1e",
              border: `1px solid ${color}88`,
              borderLeft: `4px solid ${color}`,
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
              {isCrit ? "🔴 KRİTİK UYARI" : "🟡 UYARI"} — {alert.provinceName}
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
