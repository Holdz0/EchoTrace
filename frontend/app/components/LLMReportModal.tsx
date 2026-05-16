"use client";

import type { LLMReport } from "../lib/useSimulation";

const CITY_NAMES: Record<string, string> = {
  "0": "İstanbul", "1": "Ankara", "2": "İzmir", "3": "Bursa",
  "4": "Antalya",  "5": "Konya",  "6": "Adana", "7": "Şanlıurfa",
  "8": "Gaziantep","9": "Kocaeli","10": "Diğer",
};
const PROFESSION_NAMES: Record<number, string> = {
  0: "Memur", 1: "İşçi", 2: "Esnaf", 3: "Emekli", 4: "İşsiz",
};
const SECTOR_NAMES: Record<number, string> = {
  0: "Tarım", 1: "Sanayi", 2: "İnşaat", 3: "Hizmet",
};

function formatFilterValue(field: string, val: unknown): string {
  if (field === "profession" && Array.isArray(val))
    return val.map((v: number) => PROFESSION_NAMES[v] ?? v).join(", ");
  if (field === "city" && Array.isArray(val))
    return val.map((v: number) => CITY_NAMES[String(v)] ?? v).join(", ");
  if (field === "economic_sector" && Array.isArray(val))
    return val.map((v: number) => SECTOR_NAMES[v] ?? v).join(", ");
  if (typeof val === "object" && val !== null) {
    return Object.entries(val as Record<string, unknown>)
      .map(([op, v]) => `${op} ${v}`).join(", ");
  }
  return String(val);
}

function EffectCard({ effect, log }: { effect: Record<string, unknown>; log?: string }) {
  const filter = (effect.filter as Record<string, unknown>) ?? {};
  const hasFilter = Object.keys(filter).length > 0;
  const isOk = log?.startsWith("OK:");
  const isSkip = log?.startsWith("SKIP:");

  return (
    <div style={{
      background: "#0a1628", border: `1px solid ${isSkip ? "#b91c1c44" : "#1e3a5f"}`,
      borderRadius: 8, padding: "12px 14px", marginBottom: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 700,
          background: "#1e3a5f", color: "#93c5fd",
        }}>
          {String(effect.target)}
        </span>
        <span style={{ fontSize: 13, color: "#e2e8f0" }}>
          <strong style={{ color: "#f472b6" }}>{String(effect.operation)}</strong>
          {" → "}
          <strong style={{ color: "#4ade80" }}>{JSON.stringify(effect.value)}</strong>
        </span>
        {isOk && (
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#4ade80" }}>
            {log?.match(/\d+ ajan/)?.[0]} etkilendi
          </span>
        )}
        {isSkip && (
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#f87171" }}>
            Hiç ajan seçilmedi
          </span>
        )}
      </div>

      {hasFilter && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <span style={{ fontSize: 10, color: "#6b7280" }}>Filtre:</span>
          {Object.entries(filter).map(([field, condition]) => (
            <span key={field} style={{
              fontSize: 11, background: "#0f2240", border: "1px solid #1e3a5f",
              borderRadius: 6, padding: "2px 8px", color: "#93c5fd",
            }}>
              {field} {formatFilterValue(field, condition)}
            </span>
          ))}
        </div>
      )}
      {!hasFilter && (
        <span style={{ fontSize: 11, color: "#6b7280" }}>Tüm ajanlar etkilendi</span>
      )}
    </div>
  );
}

function MigrationRow({ m }: { m: Record<string, unknown> }) {
  const from = CITY_NAMES[String(m.from_city)] ?? m.from_city;
  const to   = CITY_NAMES[String(m.to_city)]   ?? m.to_city;
  const rate = Number(m.daily_rate);
  const pct  = (rate * 100).toFixed(2);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #0f2240" }}>
      <span style={{ color: "#f87171", fontSize: 13, minWidth: 90, fontWeight: 600 }}>{String(from)}</span>
      <span style={{ color: "#6b7280" }}>→</span>
      <span style={{ color: "#4ade80", fontSize: 13, minWidth: 90, fontWeight: 600 }}>{String(to)}</span>
      <span style={{ fontSize: 11, color: "#93c5fd", marginLeft: "auto" }}>
        günlük %{pct} göç
      </span>
    </div>
  );
}

function CityRateTable({ title, rates, isLow }: { title: string; rates: Record<string, unknown>; isLow: boolean }) {
  const entries = Object.entries(rates);
  if (!entries.length) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {entries.map(([city, rate]) => {
          const cityName = CITY_NAMES[city] ?? city;
          const pct = (Number(rate) * 100).toFixed(3);
          const color = isLow ? "#f87171" : "#4ade80";
          return (
            <span key={city} style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 8,
              background: "#0a1628", border: `1px solid ${color}44`, color,
            }}>
              {cityName}: %{pct}
            </span>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  report: LLMReport;
  onClose: () => void;
}

export default function LLMReportModal({ report, onClose }: Props) {
  const dynamics = report.dynamics as Record<string, unknown> | null;
  const jobLoss   = (dynamics?.job_loss_rate_by_city  as Record<string, unknown>) ?? {};
  const reemploy  = (dynamics?.reemploy_rate_by_city  as Record<string, unknown>) ?? {};
  const migration = (dynamics?.migration              as Record<string, unknown>[]) ?? [];

  const hasDynamics = Object.keys(jobLoss).length > 0
    || Object.keys(reemploy).length > 0
    || migration.length > 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(2,11,24,0.85)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#030f1e", border: "1px solid #1e3a5f", borderRadius: 12,
          width: "100%", maxWidth: 720, maxHeight: "85vh", display: "flex", flexDirection: "column",
          boxShadow: "0 0 40px #7c3aed22",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", borderBottom: "1px solid #1e3a5f",
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#a78bfa" }}>YZ Karar Raporu</div>
            <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>
              LLM'nin yasayı nasıl yorumladığı
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#6b7280", fontSize: 18, cursor: "pointer" }}
          >✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: "auto", padding: "18px 20px", flex: 1 }}>

          {/* Girilen yasa */}
          <section style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
              Girilen Yasa
            </div>
            <div style={{
              background: "#0a1628", borderRadius: 8, padding: "10px 14px",
              fontSize: 13, color: "#e2e8f0", fontStyle: "italic",
              borderLeft: "3px solid #7c3aed",
            }}>
              {report.lawText}
            </div>
          </section>

          {/* Ajan Efektleri */}
          <section style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
              Ajan Efektleri ({report.effects.length})
            </div>
            {report.effects.length === 0 && (
              <div style={{ fontSize: 12, color: "#4b5563" }}>Efekt üretilmedi.</div>
            )}
            {report.effects.map((effect, i) => (
              <EffectCard
                key={i}
                effect={effect as Record<string, unknown>}
                log={report.effectLog[i]}
              />
            ))}
          </section>

          {/* Makro */}
          {(report.macro.inflation_shock !== undefined || report.macro.vat_food_rate !== undefined) && (
            <section style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
                Makro Parametreler
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {report.macro.inflation_shock !== undefined && (
                  <div style={{ background: "#0a1628", borderRadius: 8, padding: "10px 14px", flex: 1 }}>
                    <div style={{ fontSize: 10, color: "#6b7280" }}>Enflasyon Şoku</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: Number(report.macro.inflation_shock) >= 0 ? "#f87171" : "#4ade80" }}>
                      {Number(report.macro.inflation_shock) >= 0 ? "+" : ""}
                      {(Number(report.macro.inflation_shock) * 100).toFixed(1)}%
                    </div>
                  </div>
                )}
                {report.macro.vat_food_rate !== undefined && (
                  <div style={{ background: "#0a1628", borderRadius: 8, padding: "10px 14px", flex: 1 }}>
                    <div style={{ fontSize: 10, color: "#6b7280" }}>Gıda KDV Oranı</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#93c5fd" }}>
                      %{(Number(report.macro.vat_food_rate) * 100).toFixed(0)}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Dinamik Parametreler */}
          {hasDynamics && (
            <section style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
                Dinamik Ekonomik Etkiler (LLM Çıkarımı)
              </div>

              <CityRateTable
                title="İş kaybı hızı (yüksekse o şehirde hızla işsizlik artar)"
                rates={jobLoss}
                isLow={false}
              />
              <CityRateTable
                title="Yeniden istihdam hızı (yüksekse o şehirde hızla iş bulunur)"
                rates={reemploy}
                isLow={false}
              />

              {migration.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>
                    Göç Akışları (yasak bölgedeki işsizler komşulara göç eder)
                  </div>
                  {migration.map((m, i) => <MigrationRow key={i} m={m} />)}
                </div>
              )}
            </section>
          )}

          {!hasDynamics && (
            <div style={{ fontSize: 12, color: "#4b5563", marginBottom: 16 }}>
              Bu yasa için dinamik parametre üretilmedi (ulusal/gelir politikası).
            </div>
          )}

          {/* Effect log */}
          {report.effectLog.length > 0 && (
            <section>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
                Simülasyon Uygulama Logu
              </div>
              <div style={{ background: "#000a14", borderRadius: 8, padding: "10px 14px", fontFamily: "monospace", fontSize: 11 }}>
                {report.effectLog.map((line, i) => (
                  <div key={i} style={{ color: line.startsWith("OK") ? "#4ade80" : "#f87171", marginBottom: 4 }}>
                    {line}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
