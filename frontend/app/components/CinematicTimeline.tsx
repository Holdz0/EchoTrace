"use client";

import { useState, useEffect } from "react";
import type { ProvinceStats } from "../lib/provinceSimulation";

const OCCUPATIONS = [
  "Tekstil İşçisi","Öğretmen","Çiftçi","Esnaf","Hemşire","İnşaat İşçisi",
  "Muhasebeci","Şoför","Emekli","İşsiz","Mühendis","Bakkal","Temizlik Görevlisi",
  "Güvenlik Görevlisi","Aşçı","Terzi","Tamirci","Kasap",
];
const AGE_GROUPS = ["18-24","25-34","35-44","45-54","55-64","65+"];

function seeded(seed: number, n: number) {
  return Math.abs(Math.sin(seed * n + n));
}

interface TimelineEvent {
  month: number;
  icon: string;
  title: string;
  detail: string;
  sentiment: "positive" | "negative" | "neutral";
}

function buildJourney(agentIdx: number, stats: ProvinceStats, scenario: string): {
  age: string; occ: string; income: number; status: string; events: TimelineEvent[];
} {
  const s = agentIdx * 31 + parseInt(stats.id) * 7;
  const age = AGE_GROUPS[Math.floor(seeded(s, 3) * AGE_GROUPS.length)];
  const occ = OCCUPATIONS[Math.floor(seeded(s, 7) * OCCUPATIONS.length)];
  const income = Math.round(20000 + seeded(s, 11) * 60000);
  const isWinner = seeded(s, 13) < stats.winnerPct;
  const isLoser  = !isWinner && seeded(s, 17) < stats.loserPct;
  const status   = isWinner ? "winner" : isLoser ? "loser" : "neutral";

  const events: TimelineEvent[] = [
    {
      month: 1,
      icon: "📢",
      title: "Yasa Yürürlüğe Girdi",
      detail: `${scenario} uygulaması başladı. İlk tepkiler karışık.`,
      sentiment: "neutral",
    },
    ...(isWinner ? [
      {
        month: 2,
        icon: "💰",
        title: "Gelir Artışı",
        detail: `Maaşına %${Math.round(seeded(s,5)*15+5)} zam yansıdı. Alım gücü yükseldi.`,
        sentiment: "positive" as const,
      },
      {
        month: 4,
        icon: "🛒",
        title: "Tüketim Patlaması",
        detail: "Beyaz eşya ve gıda harcamaları belirgin artış gösterdi.",
        sentiment: "positive" as const,
      },
    ] : isLoser ? [
      {
        month: 2,
        icon: "📈",
        title: "Enflasyon Hissedildi",
        detail: `Temel gıda fiyatları %${Math.round(seeded(s,5)*12+4)} arttı. Bütçe sıkıştı.`,
        sentiment: "negative" as const,
      },
      {
        month: 4,
        icon: "✂️",
        title: "Tasarruf Kısıntısı",
        detail: "Zorunlu harcamalar artınca aylık tasarruf sıfırlandı.",
        sentiment: "negative" as const,
      },
    ] : [
      {
        month: 3,
        icon: "🔄",
        title: "Adaptasyon",
        detail: "Değişime adapte oldu. Harcama kalıpları yavaş yavaş ayarlandı.",
        sentiment: "neutral" as const,
      },
    ]),
    {
      month: 6,
      icon: isWinner ? "📊" : isLoser ? "⚠️" : "📊",
      title: "6. Ay Değerlendirmesi",
      detail: isWinner
        ? "Gerçek gelir artışı sürdü. Tasarruf oranı %8 yükseldi."
        : isLoser
        ? "Reel ücret geriledi. İkinci iş arayışına girildi."
        : "Ekonomik durum büyük ölçüde stabil kaldı.",
      sentiment: isWinner ? "positive" : isLoser ? "negative" : "neutral",
    },
    {
      month: 9,
      icon: isLoser ? "🏥" : "🏠",
      title: isLoser ? "Zorunlu Tasarruf" : "Yaşam Kalitesi",
      detail: isLoser
        ? "Sağlık harcamaları ertelendi. Konut giderleri bütçenin %42'sine ulaştı."
        : isWinner
        ? "Kira hariç tüm harcamaları rahatça karşılayabiliyor."
        : "Durumu stabil; büyük değişim yok.",
      sentiment: isWinner ? "positive" : isLoser ? "negative" : "neutral",
    },
    {
      month: 12,
      icon: isWinner ? "🎯" : isLoser ? "📉" : "🔵",
      title: "Yıl Sonu",
      detail: isWinner
        ? `Net refah artışı: +%${Math.round(seeded(s,9)*18+7)}. Yasa olumlu etki yarattı.`
        : isLoser
        ? `Reel gelir kaybı: -%${Math.round(seeded(s,9)*12+4)}. Politika olumsuz etkiledi.`
        : "Yıl boyunca büyük değişim yaşanmadı.",
      sentiment: isWinner ? "positive" : isLoser ? "negative" : "neutral",
    },
  ];

  return { age, occ, income, status, events };
}

interface Props {
  agentIdx: number;
  stats: ProvinceStats;
  scenario: string;
  onClose: () => void;
}

const SENTIMENT_COLOR = { positive: "#22c55e", negative: "#ef4444", neutral: "#60a5fa" };
const STATUS_LABEL = { winner: "Kazanıyor", loser: "Kaybediyor", neutral: "Nötr" };

export default function CinematicTimeline({ agentIdx, stats, scenario, onClose }: Props) {
  const { age, occ, income, status, events } = buildJourney(agentIdx, stats, scenario);
  const [visibleCount, setVisibleCount] = useState(0);

  // Animate events appearing one by one
  useEffect(() => {
    setVisibleCount(0);
    const timers = events.map((_, i) =>
      setTimeout(() => setVisibleCount(i + 1), 400 + i * 500)
    );
    return () => timers.forEach(clearTimeout);
  }, [agentIdx]);

  const statusColor = SENTIMENT_COLOR[status as keyof typeof SENTIMENT_COLOR] || "#60a5fa";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(1,5,15,0.97)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(4px)",
      animation: "fadeIn 0.4s ease",
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      {/* Close */}
      <button onClick={onClose} style={{
        position: "absolute", top: 20, right: 24,
        background: "none", border: "1px solid #1e3a5f",
        color: "#6b7280", borderRadius: 8, padding: "6px 14px",
        cursor: "pointer", fontSize: 13,
      }}>✕ Kapat</button>

      {/* Agent card */}
      <div style={{
        background: "#030f1e", border: `1px solid ${statusColor}44`,
        borderRadius: 16, padding: "20px 32px", marginBottom: 40,
        display: "flex", alignItems: "center", gap: 28,
        boxShadow: `0 0 40px ${statusColor}22`,
        animation: "slideUp 0.5s ease",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: `${statusColor}22`, border: `2px solid ${statusColor}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24,
        }}>
          {status === "winner" ? "😊" : status === "loser" ? "😟" : "😐"}
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#4b5563", marginBottom: 3 }}>AJAN #{agentIdx + 1} — {stats.name.toUpperCase()}</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#e2e8f0" }}>{occ}, {age}</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            Gelir: <strong style={{ color: "#e2e8f0" }}>{income.toLocaleString("tr")} ₺</strong>
            <span style={{
              marginLeft: 12, fontSize: 12, padding: "2px 10px", borderRadius: 10,
              background: `${statusColor}22`, color: statusColor, fontWeight: 700,
            }}>● {STATUS_LABEL[status as keyof typeof STATUS_LABEL]}</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ fontSize: 11, color: "#374151", marginBottom: 20, letterSpacing: 2 }}>
        12 AYLIK KİŞİSEL YOLCULUK
      </div>

      <div style={{
        display: "flex", alignItems: "flex-start", gap: 0,
        maxWidth: "min(900px, 90vw)", width: "100%", overflowX: "auto", paddingBottom: 8,
      }}>
        {events.map((ev, i) => {
          const visible = i < visibleCount;
          const color = SENTIMENT_COLOR[ev.sentiment];
          return (
            <div key={i} style={{
              flex: 1, minWidth: 130, display: "flex", flexDirection: "column", alignItems: "center",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 0.4s, transform 0.4s",
            }}>
              {/* Connector line */}
              <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                <div style={{ flex: 1, height: 1, background: i === 0 ? "transparent" : "#1e3a5f" }} />
                {/* Node */}
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                  background: "#030f1e", border: `2px solid ${color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, boxShadow: `0 0 12px ${color}44`,
                }}>
                  {ev.icon}
                </div>
                <div style={{ flex: 1, height: 1, background: i === events.length - 1 ? "transparent" : "#1e3a5f" }} />
              </div>

              {/* Month label */}
              <div style={{ fontSize: 10, color: "#4b5563", marginTop: 6, marginBottom: 6 }}>
                Ay {ev.month}
              </div>

              {/* Event card */}
              <div style={{
                background: "#030f1e", border: `1px solid ${color}33`,
                borderRadius: 10, padding: "10px 12px",
                width: "calc(100% - 16px)", margin: "0 8px",
                borderTop: `2px solid ${color}`,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>
                  {ev.title}
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5 }}>
                  {ev.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 32, fontSize: 11, color: "#1e3a5f" }}>
        ESC veya kapat butonuna bas
      </div>
    </div>
  );
}
