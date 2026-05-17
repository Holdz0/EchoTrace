"use client";

import { useState, useMemo } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { ProvinceStats } from "../lib/provinceSimulation";
import { scoreToColor } from "../lib/provinceSimulation";
import ProvinceParticles from "./ProvinceParticles";
import AgentTooltip from "./AgentTooltip";
import { useCityAgents } from "../lib/useCityAgents";
import type { BackendAgent } from "../lib/useCityAgents";

interface Props {
  stats: ProvinceStats;
  history: ProvinceStats[];
  onClose: () => void;
  onAgentCinematic?: (idx: number) => void;
}

interface TooltipState { idx: number; x: number; y: number }

function MiniChart({ data, dataKey, color, label, formatter }: {
  data: ProvinceStats[]; dataKey: keyof ProvinceStats;
  color: string; label: string; formatter?: (v: number) => string;
}) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 9, color: "#4b5563", marginBottom: 2 }}>{label}</div>
      <ResponsiveContainer width="100%" height={50}>
        <LineChart data={data} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
          <YAxis hide domain={["auto","auto"]} />
          <Tooltip
            contentStyle={{ background: "#030f1e", border: `1px solid ${color}44`, borderRadius: 6, fontSize: 10 }}
            formatter={(v: number) => formatter ? formatter(v) : v.toFixed(2)}
          />
          <Line type="monotone" dataKey={dataKey as string} stroke={color} dot={false} strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function pct(arr: BackendAgent[], pred: (a: BackendAgent) => boolean) {
  if (!arr.length) return 0;
  return Math.round((arr.filter(pred).length / arr.length) * 100);
}

function DemoBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6b7280", marginBottom: 2 }}>
        <span>{label}</span><span style={{ color }}>{value}%</span>
      </div>
      <div style={{ height: 3, background: "#0d1b2e", borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 2, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

export default function CityDashboard({ stats, history, onClose, onAgentCinematic }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const { agents, loading, cityName } = useCityAgents(stats.id);

  const scoreColor = scoreToColor(stats.score);
  const scoreLabel = stats.score > 0.15 ? "Kazanıyor" : stats.score < -0.15 ? "Kaybediyor" : "Nötr";

  // Demografik özet
  const demo = useMemo(() => {
    if (!agents.length) return null;
    return {
      female:     pct(agents, a => a.gender === "Kadın"),
      university: pct(agents, a => a.education_level === "Üniversite"),
      renter:     pct(agents, a => a.home_ownership === "Kiracı"),
      informal:   pct(agents, a => a.informal_employment),
      service:    pct(agents, a => a.economic_sector === "Hizmet"),
      industry:   pct(agents, a => a.economic_sector === "Sanayi"),
      avgIncome:  Math.round(agents.reduce((s, a) => s + a.income, 0) / agents.length),
      avgDebt:    Math.round(agents.reduce((s, a) => s + a.debt, 0) / agents.length),
    };
  }, [agents]);

  // Tıklanan partiküle karşılık gelen gerçek ajan
  function agentForIdx(idx: number): BackendAgent | undefined {
    if (!agents.length) return undefined;
    return agents[idx % agents.length];
  }

  return (
    <div style={{
      width: 360, height: "100%", background: "#030f1e",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 16px", borderBottom: "1px solid #1e3a5f",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>{stats.name}</div>
          <div style={{ fontSize: 11, color: "#4b5563", marginTop: 1, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              background: `${scoreColor}22`, color: scoreColor, padding: "1px 8px",
              borderRadius: 8, fontSize: 10, fontWeight: 700,
            }}>● {scoreLabel}</span>
            {cityName && (
              <span style={{ fontSize: 9, color: loading ? "#f59e0b" : "#22c55e" }}>
                {loading ? "⟳ yükleniyor…" : `● ${cityName} verisi`}
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "1px solid #1e3a5f", color: "#4b5563",
          borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12,
        }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Particle canvas */}
        <div>
          <div style={{ fontSize: 10, color: "#374151", marginBottom: 4 }}>
            Ajan Dağılımı — Tıkla → Profil
          </div>
          <div style={{ position: "relative" }}>
            <ProvinceParticles
              stats={stats}
              width={328}
              height={180}
              onParticleClick={(idx, x, y) => setTooltip({ idx, x, y })}
            />
            {tooltip && (
              <AgentTooltip
                agentIdx={tooltip.idx}
                stats={stats}
                agent={agentForIdx(tooltip.idx)}
                x={tooltip.x}
                y={tooltip.y}
                onClose={() => setTooltip(null)}
                onCinematic={onAgentCinematic}
              />
            )}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 12, fontSize: 10, color: "#6b7280" }}>
          {[["#22c55e","Kazananlar"],["#ef4444","Kaybedenler"],["#60a5fa","Nötr"]].map(([c, l]) => (
            <span key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block" }} />
              {l}
            </span>
          ))}
        </div>

        {/* Simülasyon metrikleri */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: "Kazanan %", value: `${(stats.winnerPct * 100).toFixed(0)}%`, color: "#22c55e" },
            { label: "Kaybeden %", value: `${(stats.loserPct * 100).toFixed(0)}%`, color: "#ef4444" },
            { label: "İşsizlik", value: `${(stats.unemployment * 100).toFixed(1)}%`, color: "#f59e0b" },
            { label: "Enflasyon", value: `${((stats.inflation - 1) * 100).toFixed(1)}%`, color: "#a78bfa" },
          ].map(row => (
            <div key={row.label} style={{
              background: "#0a1628", borderRadius: 8, padding: "8px 12px",
              border: `1px solid ${row.color}22`,
            }}>
              <div style={{ fontSize: 10, color: "#4b5563" }}>{row.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: row.color }}>{row.value}</div>
            </div>
          ))}
        </div>

        {/* Demografik özet (backend verisi) */}
        {demo && (
          <div style={{ background: "#0a1628", borderRadius: 8, padding: "10px 12px", border: "1px solid #1e3a5f" }}>
            <div style={{ fontSize: 10, color: "#374151", marginBottom: 8, letterSpacing: 1 }}>
              DEMOGRAFİK YAPI — GERÇEK VERİ
            </div>

            {/* Ortalama gelir & borç */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 9, color: "#4b5563" }}>Ort. Gelir</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>
                  {demo.avgIncome.toLocaleString("tr")} ₺
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: "#4b5563" }}>Ort. Borç</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>
                  {demo.avgDebt.toLocaleString("tr")} ₺
                </div>
              </div>
            </div>

            {/* Barlar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <DemoBar label="Kadın oranı"         value={demo.female}     color="#f472b6" />
              <DemoBar label="Üniversite mezunu"   value={demo.university} color="#60a5fa" />
              <DemoBar label="Kiracı"               value={demo.renter}     color="#f59e0b" />
              <DemoBar label="Kayıt dışı çalışan"  value={demo.informal}   color="#fb7185" />
              <DemoBar label="Hizmet sektörü"      value={demo.service}    color="#34d399" />
              <DemoBar label="Sanayi sektörü"      value={demo.industry}   color="#818cf8" />
            </div>
          </div>
        )}

        {/* Mini charts */}
        {history.length > 1 && (
          <div>
            <div style={{ fontSize: 10, color: "#374151", marginBottom: 6 }}>TARİHSEL SEYİR</div>
            <div style={{ display: "flex", gap: 8 }}>
              <MiniChart data={history} dataKey="unemployment" color="#f59e0b" label="İşsizlik(%)" formatter={v => `${(v*100).toFixed(1)}%`} />
              <MiniChart data={history} dataKey="consumption" color="#22c55e" label="Tüketim(K₺)" formatter={v => `${(v/1000).toFixed(1)}K`} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <MiniChart data={history} dataKey="inflation" color="#a78bfa" label="Enflasyon(%)" formatter={v => `${((v-1)*100).toFixed(1)}%`} />
              <MiniChart data={history} dataKey="gini" color="#60a5fa" label="Gini" formatter={v => v.toFixed(3)} />
            </div>
          </div>
        )}

        {/* Gini bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#4b5563", marginBottom: 4 }}>
            <span>Gini Katsayısı</span>
            <span style={{ color: "#e2e8f0" }}>{stats.gini.toFixed(3)}</span>
          </div>
          <div style={{ height: 4, background: "#0d1b2e", borderRadius: 2 }}>
            <div style={{
              height: "100%",
              width: `${Math.min(100, stats.gini * 200)}%`,
              background: stats.gini > 0.5 ? "#ef4444" : stats.gini > 0.4 ? "#f59e0b" : "#22c55e",
              borderRadius: 2,
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}
