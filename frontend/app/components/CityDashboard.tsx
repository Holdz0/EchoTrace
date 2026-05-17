"use client";

import { useState, useMemo } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { ProvinceStats } from "../lib/provinceSimulation";
import { scoreToColor, PROVINCE_BASE_UNEMPLOYMENT } from "../lib/provinceSimulation";
import { PROVINCES } from "../lib/turkeyData";
import ProvinceParticles from "./ProvinceParticles";
import AgentTooltip from "./AgentTooltip";
import { useCityAgents } from "../lib/useCityAgents";
import type { BackendAgent } from "../lib/useCityAgents";
import type { LLMReport } from "../lib/useSimulation";

interface Props {
  stats: ProvinceStats;
  history: ProvinceStats[];
  onClose: () => void;
  onAgentCinematic?: (idx: number) => void;
  llmReport?: LLMReport | null;
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

type EffectObj = { target: string; filter?: Record<string, unknown>; operation: string; value: unknown };

function nameByCode(code: number): string {
  return PROVINCES.find(p => parseInt(p.id) - 1 === code)?.name ?? `İl ${code + 1}`;
}

function effectAppliesToCity(e: EffectObj, code: number): boolean {
  const cf = e.filter?.city;
  if (cf === undefined) return true;
  if (Array.isArray(cf)) return (cf as number[]).includes(code);
  return false;
}

function filterSummary(filter: Record<string, unknown> | undefined): string {
  if (!filter) return "tüm ajanlar";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(filter)) {
    if (k === "city") continue;
    if (Array.isArray(v)) parts.push(`${k}=[${(v as number[]).join(",")}]`);
    else if (typeof v === "object" && v !== null)
      parts.push(`${k} ${Object.entries(v as Record<string,unknown>).map(([op,val]) => `${op} ${val}`).join(", ")}`);
    else parts.push(`${k}=${v}`);
  }
  return parts.length ? parts.join(" · ") : "tüm ajanlar";
}

function buildCityNarrative(
  cityName: string,
  cityCode: number,
  effects: EffectObj[],
  cityJobLoss: number | undefined,
  cityReemploy: number | undefined,
  cityMigrations: { from_city: number; to_city: number; daily_rate: number }[],
  defaultReemploy: number,
  cityNote: string | undefined,
): string | null {
  if (cityNote) return cityNote;

  const parts: string[] = [];
  const incoming = cityMigrations.filter(m => m.to_city === cityCode);
  const outgoing = cityMigrations.filter(m => m.from_city === cityCode);
  const citySpecific = effects.filter(e => Array.isArray(e.filter?.city) && (e.filter!.city as number[]).includes(cityCode));
  const general = effects.filter(e => !e.filter?.city);

  if (citySpecific.some(e => e.target === "employed" && e.value === false))
    parts.push(`${cityName}'da çalışma yasaklandı; tüm çalışanlar işini kaybetti ve yeniden iş bulamıyor.`);
  else if (citySpecific.some(e => e.target === "employed" && e.value === true))
    parts.push(`${cityName}'daki işsizlere istihdam sağlandı.`);

  if (cityJobLoss !== undefined && cityJobLoss > 0.002) {
    const x = Math.round(cityJobLoss / 0.0005);
    parts.push(`Günlük iş kaybı hızı normalin ${x} katına yükseldi; işsizlik hızla artıyor.`);
  } else if (cityJobLoss !== undefined && cityJobLoss < 0.0004) {
    parts.push(`İş kaybı oranı düşürüldü; mevcut işler korunuyor.`);
  }

  if (cityReemploy === 0)
    parts.push(`Yeni iş girişi tamamen kapatıldı.`);
  else if (cityReemploy !== undefined && cityReemploy > defaultReemploy * 1.3)
    parts.push(`İşe giriş hızı artırıldı; işsizler daha kolay iş bulabiliyor.`);
  else if (cityReemploy !== undefined && cityReemploy < defaultReemploy * 0.7)
    parts.push(`İşe giriş zorlaştı; işsizlik kalıcı hale geliyor.`);

  if (outgoing.length > 0) {
    const dests = outgoing.map(m => nameByCode(m.to_city)).join(", ");
    parts.push(`İşsizler ${dests}'a göç ediyor.`);
  }
  if (incoming.length > 0) {
    const sources = incoming.map(m => nameByCode(m.from_city)).join(", ");
    const pct = (incoming.reduce((s, m) => s + m.daily_rate, 0) * 100).toFixed(2);
    parts.push(`${sources}'dan günlük %${pct} göç geliyor; işgücü piyasasına ek baskı oluşuyor.`);
  }

  if (parts.length === 0) {
    if (general.length > 0) {
      const targets = [...new Set(general.map(e => e.target))].join(", ");
      return `Bu il yasanın doğrudan hedefi değil; ${targets} üzerindeki genel etki buraya da yansıyor.`;
    }
    return null;
  }
  return parts.join(" ");
}

function LLMCitySection({ stats, llmReport }: { stats: ProvinceStats; llmReport: LLMReport }) {
  const cityCode = parseInt(stats.id) - 1;
  const dynamics = llmReport.dynamics;
  const jlMap = (dynamics?.job_loss_rate_by_city ?? {}) as Record<string, number>;
  const reMap = (dynamics?.reemploy_rate_by_city ?? {}) as Record<string, number>;
  const migList = (dynamics?.migration ?? []) as { from_city: number; to_city: number; daily_rate: number }[];

  const cityJobLoss = jlMap[String(cityCode)];
  const cityReemploy = reMap[String(cityCode)];
  const cityMigrations = migList.filter(m => m.from_city === cityCode || m.to_city === cityCode);

  const allEffects = llmReport.effects as EffectObj[];
  const effects = allEffects.filter(e => effectAppliesToCity(e, cityCode));
  const hasDynamics = cityJobLoss !== undefined || cityReemploy !== undefined || cityMigrations.length > 0;

  const baseUnemp = PROVINCE_BASE_UNEMPLOYMENT[stats.name] ?? 0.105;
  const defaultReemploy = 0.0005 * (1 - baseUnemp) / baseUnemp;

  const cityNote = llmReport.cityNotes?.[String(cityCode)];
  const narrative = buildCityNarrative(
    stats.name, cityCode, allEffects,
    cityJobLoss, cityReemploy, cityMigrations,
    defaultReemploy, cityNote,
  );

  const borderColor = hasDynamics || cityNote ? "#7c3aed44" : "#1e3a5f";

  return (
    <div style={{ background: "#0a1628", borderRadius: 8, padding: "10px 12px", border: `1px solid ${borderColor}` }}>
      <div style={{ fontSize: 10, color: "#a78bfa", marginBottom: narrative ? 6 : 10, letterSpacing: 1 }}>
        🧠 YZ KARARLARI — {stats.name.toUpperCase()}
      </div>

      {/* Şehre özgü açıklama */}
      {narrative && (
        <div style={{
          fontSize: 11, color: "#cbd5e1", lineHeight: 1.6,
          borderLeft: `2px solid ${cityNote ? "#a78bfa" : "#4b5563"}`, paddingLeft: 8, marginBottom: 10,
        }}>
          {narrative}
        </div>
      )}

      {!narrative && !hasDynamics && effects.length === 0 && (
        <div style={{ fontSize: 11, color: "#4b5563" }}>Bu il bu yasa kapsamında doğrudan etkilenmiyor.</div>
      )}

      {/* Doğrudan efektler */}
      {effects.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: "#4b5563", marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 }}>
            Doğrudan Efektler ({effects.length})
          </div>
          {effects.map((e, i) => {
            const isGeneral = !e.filter?.city;
            const fsum = filterSummary(e.filter);
            const reason = (e as Record<string, unknown>).reason as string | undefined;
            return (
              <div key={i} style={{
                background: "#030f1e", borderRadius: 6, padding: "6px 10px", marginBottom: 4,
                border: "1px solid #1e3a5f",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: "#93c5fd", fontWeight: 700 }}>{e.target}</span>
                  <span style={{ fontSize: 11, color: "#f472b6" }}>{e.operation}</span>
                  <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 700 }}>{JSON.stringify(e.value)}</span>
                  {isGeneral && (
                    <span style={{ fontSize: 9, color: "#6b7280", marginLeft: "auto" }}>tüm iller</span>
                  )}
                </div>
                {fsum !== "tüm ajanlar" && (
                  <div style={{ fontSize: 9, color: "#6b7280", marginTop: 2 }}>
                    Filtre: {fsum}
                  </div>
                )}
                {reason && (
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4, lineHeight: 1.4 }}>
                    ↳ {reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* İstihdam dinamikleri */}
      {(cityJobLoss !== undefined || cityReemploy !== undefined) && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: "#4b5563", marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 }}>
            İstihdam Dinamikleri
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {cityJobLoss !== undefined && (
              <div style={{
                flex: 1, background: "#030f1e", borderRadius: 6, padding: "8px 10px",
                border: `1px solid ${cityJobLoss > 0.0005 ? "#7f1d1d" : "#14532d"}66`,
              }}>
                <div style={{ fontSize: 9, color: "#6b7280" }}>İş kaybı / gün</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: cityJobLoss > 0.0005 ? "#f87171" : "#4ade80" }}>
                  %{(cityJobLoss * 100).toFixed(3)}
                  <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 4 }}>
                    {cityJobLoss > 0.0005 ? "↑" : "↓"}
                  </span>
                </div>
                <div style={{ fontSize: 9, color: "#374151" }}>varsayılan: %0.050</div>
              </div>
            )}
            {cityReemploy !== undefined && (
              <div style={{
                flex: 1, background: "#030f1e", borderRadius: 6, padding: "8px 10px",
                border: `1px solid ${cityReemploy > defaultReemploy ? "#14532d" : "#7f1d1d"}66`,
              }}>
                <div style={{ fontSize: 9, color: "#6b7280" }}>İşe giriş / gün</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: cityReemploy > defaultReemploy ? "#4ade80" : "#f87171" }}>
                  %{(cityReemploy * 100).toFixed(3)}
                  <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 4 }}>
                    {cityReemploy > defaultReemploy ? "↑" : "↓"}
                  </span>
                </div>
                <div style={{ fontSize: 9, color: "#374151" }}>varsayılan: %{(defaultReemploy * 100).toFixed(3)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Göç akışları */}
      {cityMigrations.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: "#4b5563", marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 }}>
            Göç Akışları
          </div>
          {cityMigrations.map((m, i) => {
            const isOutgoing = m.from_city === cityCode;
            const otherCode  = isOutgoing ? m.to_city : m.from_city;
            const pct = (m.daily_rate * 100).toFixed(3);
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "#030f1e", borderRadius: 6, padding: "6px 10px", marginBottom: 4,
                border: "1px solid #1e3a5f", fontSize: 11,
              }}>
                <span style={{ color: isOutgoing ? "#f87171" : "#4ade80", fontSize: 13 }}>
                  {isOutgoing ? "↗" : "↙"}
                </span>
                <span style={{ color: "#e2e8f0" }}>
                  {isOutgoing
                    ? <><strong style={{ color: "#f87171" }}>{stats.name}</strong> → <strong style={{ color: "#93c5fd" }}>{nameByCode(otherCode)}</strong></>
                    : <><strong style={{ color: "#93c5fd" }}>{nameByCode(otherCode)}</strong> → <strong style={{ color: "#4ade80" }}>{stats.name}</strong></>
                  }
                </span>
                <span style={{ marginLeft: "auto", fontSize: 10, color: "#6b7280" }}>
                  %{pct}/gün
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CityDashboard({ stats, history, onClose, onAgentCinematic, llmReport }: Props) {
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

        {/* YZ Kararları bölümü */}
        {llmReport && (
          <LLMCitySection stats={stats} llmReport={llmReport} />
        )}

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
