"use client";

import type { ProvinceStats } from "../lib/provinceSimulation";

const OCCUPATIONS = [
  "Tekstil İşçisi","Öğretmen","Çiftçi","Esnaf","Hemşire","İnşaat İşçisi",
  "Muhasebeci","Şoför","Emekli","İşsiz","Mühendis","Bakkal","Temizlik Görevlisi",
  "Güvenlik Görevlisi","Aşçı","Terzi","Tamirci","Kasap",
];
const AGE_GROUPS = ["18-24","25-34","35-44","45-54","55-64","65+"];

function seeded(seed: number, n: number) {
  return Math.abs(Math.sin(seed * 127.1 + n * 311.7)) % 1;
}

interface Props {
  agentIdx: number;
  stats: ProvinceStats;
  x: number;
  y: number;
  onClose: () => void;
  onCinematic?: (idx: number) => void;
}

export default function AgentTooltip({ agentIdx, stats, x, y, onClose, onCinematic }: Props) {
  const s = agentIdx * 31 + parseInt(stats.id) * 7;
  const age = AGE_GROUPS[Math.floor(seeded(s, 3) * AGE_GROUPS.length)];
  const occ = OCCUPATIONS[Math.floor(seeded(s, 7) * OCCUPATIONS.length)];
  const income = Math.round(20000 + seeded(s, 11) * 60000);
  const isWinner = seeded(s, 13) < stats.winnerPct;
  const isLoser  = !isWinner && seeded(s, 17) < stats.loserPct;
  const status   = isWinner ? "winner" : isLoser ? "loser" : "neutral";
  const change   = isWinner ? `+${Math.round(seeded(s, 19) * 20 + 5)}%` : isLoser ? `-${Math.round(seeded(s, 19) * 15 + 3)}%` : `+${Math.round(seeded(s, 19) * 5)}%`;

  const clampedX = Math.min(x, window.innerWidth - 260);
  const clampedY = Math.min(y, window.innerHeight - 200);

  const statusColor = status === "winner" ? "#22c55e" : status === "loser" ? "#ef4444" : "#60a5fa";
  const statusLabel = status === "winner" ? "Kazanıyor" : status === "loser" ? "Kaybediyor" : "Nötr";

  return (
    <div
      style={{
        position: "fixed",
        left: clampedX + 12,
        top: clampedY - 10,
        zIndex: 200,
        background: "#030f1e",
        border: `1px solid ${statusColor}44`,
        borderRadius: 12,
        padding: "12px 16px",
        width: 240,
        boxShadow: `0 0 20px ${statusColor}22`,
        pointerEvents: "auto",
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: "#4b5563" }}>AJAN #{agentIdx + 1}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer", fontSize: 14 }}>✕</button>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{occ}</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>{age} yaş grubu</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
        <span style={{ color: "#6b7280" }}>Gelir</span>
        <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{income.toLocaleString("tr")} ₺</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 10 }}>
        <span style={{ color: "#6b7280" }}>Etki</span>
        <span style={{ color: statusColor, fontWeight: 700 }}>{change} · {statusLabel}</span>
      </div>
      {onCinematic && (
        <button
          onClick={() => { onCinematic(agentIdx); onClose(); }}
          style={{
            width: "100%", padding: "6px 0", borderRadius: 6, border: "none",
            background: `${statusColor}22`, color: statusColor, cursor: "pointer", fontSize: 11, fontWeight: 600,
          }}
        >
          ▶ Yolculuğunu İzle
        </button>
      )}
    </div>
  );
}
