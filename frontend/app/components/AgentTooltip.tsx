"use client";

import type { ProvinceStats } from "../lib/provinceSimulation";
import type { BackendAgent } from "../lib/useCityAgents";

function seeded(seed: number, n: number) {
  return Math.abs(Math.sin(seed * 127.1 + n * 311.7)) % 1;
}

interface Props {
  agentIdx: number;
  stats: ProvinceStats;
  agent?: BackendAgent;        // backend'den gelen gerçek veri (varsa)
  x: number;
  y: number;
  onClose: () => void;
  onCinematic?: (idx: number) => void;
}

export default function AgentTooltip({ agentIdx, stats, agent, x, y, onClose, onCinematic }: Props) {
  // Dinamik durum (kazanan/kaybeden) her zaman canlı simülasyon verisinden
  const s         = agentIdx * 31 + parseInt(stats.id) * 7;
  const isWinner  = seeded(s, 13) < stats.winnerPct;
  const isLoser   = !isWinner && seeded(s, 17) < stats.loserPct;
  const status    = isWinner ? "winner" : isLoser ? "loser" : "neutral";
  const changePct = isWinner
    ? `+${Math.round(seeded(s, 19) * 20 + 5)}%`
    : isLoser
      ? `-${Math.round(seeded(s, 19) * 15 + 3)}%`
      : `+${Math.round(seeded(s, 19) * 5)}%`;

  // Demografik veri: backend varsa oradan, yoksa seed'li fallback
  const profession  = agent?.profession  ?? ["Tekstil İşçisi","Öğretmen","Çiftçi","Esnaf","Hemşire","İnşaat İşçisi","Muhasebeci","Şoför","Emekli","İşsiz","Mühendis","Bakkal","Temizlik Görevlisi","Güvenlik Görevlisi","Aşçı"][Math.floor(seeded(s, 7) * 15)];
  const age         = agent?.age         ?? Math.floor(seeded(s, 3) * 47 + 18);
  const income      = agent?.income      ?? Math.round(20000 + seeded(s, 11) * 60000);
  const gender      = agent?.gender      ?? (seeded(s, 21) < 0.5 ? "Erkek" : "Kadın");
  const education   = agent?.education_level ?? ["İlkokul","Ortaokul","Lise","Üniversite"][Math.floor(seeded(s, 23) * 4)];
  const sector      = agent?.economic_sector ?? "Hizmet";
  const homeStatus  = agent?.home_ownership  ?? "Kiracı";
  const children    = agent?.children_count  ?? Math.floor(seeded(s, 25) * 3);
  const informal    = agent?.informal_employment ?? false;
  const savings     = agent?.savings ?? Math.round(seeded(s, 27) * 30000);
  const isBackend   = !!agent;

  const clampedX = Math.min(x, window.innerWidth - 280);
  const clampedY = Math.min(y, window.innerHeight - 310);

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
        width: 260,
        boxShadow: `0 0 20px ${statusColor}22`,
        pointerEvents: "auto",
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: "#4b5563" }}>
          AJAN #{agentIdx + 1}
          {isBackend && <span style={{ color: "#22c55e", marginLeft: 6 }}>● CANLI</span>}
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer", fontSize: 14 }}>✕</button>
      </div>

      {/* Meslek + yaş */}
      <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{profession}</div>
      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>
        {gender} · {age} yaş · {education}
      </div>

      {/* Metrikler */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 0", fontSize: 11, marginBottom: 8 }}>
        {[
          ["Gelir",   `${income.toLocaleString("tr")} ₺`,      "#e2e8f0"],
          ["Birikim", `${savings.toLocaleString("tr")} ₺`,     "#60a5fa"],
          ["Konut",   homeStatus,                               "#a78bfa"],
          ["Sektör",  sector,                                   "#fbbf24"],
          ["Çocuk",   `${children}`,                            "#e2e8f0"],
          ["Kayıt dışı", informal ? "Evet" : "Hayır",         informal ? "#f87171" : "#4ade80"],
        ].map(([lbl, val, color]) => (
          <div key={lbl as string} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ color: "#6b7280" }}>{lbl}</span>
            <span style={{ color: color as string, fontWeight: 600 }}>{val}</span>
          </div>
        ))}
      </div>

      {/* Simülasyon etkisi — her zaman canlı veriden */}
      <div style={{
        borderTop: `1px solid ${statusColor}22`, paddingTop: 8, marginTop: 4,
        display: "flex", justifyContent: "space-between", fontSize: 12,
      }}>
        <span style={{ color: "#6b7280" }}>Yasa etkisi</span>
        <span style={{ color: statusColor, fontWeight: 700 }}>{changePct} · {statusLabel}</span>
      </div>

      {onCinematic && (
        <button
          onClick={() => { onCinematic(agentIdx); onClose(); }}
          style={{
            width: "100%", padding: "6px 0", borderRadius: 6, border: "none",
            background: `${statusColor}22`, color: statusColor,
            cursor: "pointer", fontSize: 11, fontWeight: 600, marginTop: 8,
          }}
        >
          ▶ Yolculuğunu İzle
        </button>
      )}
    </div>
  );
}
