"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import LiveCharts from "./LiveCharts";
import CityDashboard from "./CityDashboard";
import CinematicTimeline from "./CinematicTimeline";
import { useSimulation } from "../lib/useSimulation";
import { type ScenarioKey } from "../lib/mockData";
import { computeProvinceStats, computeProvinceStatsLive } from "../lib/provinceSimulation";
import { getActiveAlerts, latLonToMapPct } from "../lib/alertSystem";
import { openReportWindow } from "../lib/reportGenerator";
import RadarPing from "./RadarPing";
import AlertToast from "./AlertToast";
import LawInput from "./LawInput";
import LLMReportModal from "./LLMReportModal";

const TurkeyMap  = dynamic(() => import("./TurkeyMap"),  { ssr: false });
const SplitMap   = dynamic(() => import("./SplitMap"),   { ssr: false });

// ─────────────────────────────────────────────────────────────
const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  minWage: "Asgari Ücret %50 Zam",
  vat:     "Gıdada KDV %10 İndirim",
  eyt:     "EYT Genişlemesi",
};
const SCENARIO_PARAMS: Record<ScenarioKey, { minWageMultiplier: number; vatMultiplier: number; retirementBoost: number }> = {
  minWage: { minWageMultiplier: 1.5, vatMultiplier: 1,   retirementBoost: 0 },
  vat:     { minWageMultiplier: 1,   vatMultiplier: 0.5, retirementBoost: 0 },
  eyt:     { minWageMultiplier: 1,   vatMultiplier: 1,   retirementBoost: 1 },
};
const SPEED_OPTIONS = [1, 5, 15, 30] as const;
type ViewMode = "map" | "split" | "charts";

// ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [scenario, setScenario]         = useState<ScenarioKey>("minWage");
  const [selectedProvince, setSelectedProvince] = useState<{ id: string; name: string } | null>(null);
  const [view, setView]                 = useState<ViewMode>("map");
  const [isometric, setIsometric]       = useState(false);
  const [cinematic, setCinematic]       = useState<{ agentIdx: number } | null>(null);
  const [showLawInput, setShowLawInput] = useState(false);

  const { snapshots, currentDay, playing, speed, mode, cityUnemployment, llmReport,
          setCurrentDay, setPlaying, setSpeed, resetScenario, runCustomLaw } =
    useSimulation(scenario);

  const [showLLMReport, setShowLLMReport] = useState(false);

  const params = SCENARIO_PARAMS[scenario];

  const provinceStats = useMemo(() => {
    const current  = snapshots[Math.min(currentDay - 1, snapshots.length - 1)];
    const baseline = snapshots[0];
    if (mode === "live" && current?.cityUnemployment && baseline?.cityUnemployment) {
      return computeProvinceStatsLive(current, baseline);
    }
    return computeProvinceStats(currentDay, params);
  }, [mode, currentDay, params, snapshots]);

  const activeAlerts  = useMemo(() => getActiveAlerts(currentDay, scenario), [currentDay, scenario]);

  const beforeStats = useMemo(() => {
    const baseline = snapshots[0];
    if (mode === "live" && baseline?.cityUnemployment) {
      return computeProvinceStatsLive(baseline, baseline);
    }
    return computeProvinceStats(1, params);
  }, [mode, params, snapshots]);

  const afterStats = useMemo(() => {
    const baseline = snapshots[0];
    const last     = snapshots[snapshots.length - 1];
    if (mode === "live" && last?.cityUnemployment && baseline?.cityUnemployment) {
      return computeProvinceStatsLive(last, baseline);
    }
    return computeProvinceStats(365, params);
  }, [mode, params, snapshots]);

  const provinceHistory = useMemo(() => {
    if (!selectedProvince) return [];
    const days: number[] = [];
    for (let d = 1; d <= currentDay; d += 7) days.push(d);
    if (days[days.length - 1] !== currentDay) days.push(currentDay);
    const baseline = snapshots[0];
    return days
      .map(d => {
        const snap = snapshots[Math.min(d - 1, snapshots.length - 1)];
        const stats = (mode === "live" && snap?.cityUnemployment && baseline?.cityUnemployment)
          ? computeProvinceStatsLive(snap, baseline)
          : computeProvinceStats(d, params);
        return stats.find(s => s.id === selectedProvince.id)!;
      })
      .filter(Boolean);
  }, [mode, selectedProvince, currentDay, params, snapshots]);

  const selectedStats = selectedProvince
    ? provinceStats.find(s => s.id === selectedProvince.id) ?? null
    : null;

  const snapshot = snapshots[Math.min(currentDay - 1, snapshots.length - 1)];

  // Playback
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);
  useEffect(() => {
    if (!playing) { stop(); return; }
    stop();
    intervalRef.current = setInterval(() => {
      setCurrentDay(d => {
        const next = Math.min(d + speed, 365);
        if (next >= 365) { stop(); setPlaying(false); }
        return next;
      });
    }, 100);
    return stop;
  }, [playing, speed, stop, setCurrentDay, setPlaying]);

  const handleScenarioChange = (key: ScenarioKey) => {
    setScenario(key);
    resetScenario(key);
    setSelectedProvince(null);
  };

  const progressPct = ((currentDay - 1) / 364) * 100;
  const winners = provinceStats.filter(s => s.score > 0.15).length;
  const losers  = provinceStats.filter(s => s.score < -0.15).length;

  // ─── Isometric transform string ───────────────────────────
  const isoStyle = isometric
    ? {
        transform: "perspective(1100px) rotateX(38deg) rotateZ(-3deg) scale(1.08)",
        transformOrigin: "center 65%",
        transition: "transform 0.6s cubic-bezier(.4,0,.2,1)",
      }
    : {
        transform: "perspective(1100px) rotateX(0deg) rotateZ(0deg) scale(1)",
        transformOrigin: "center 65%",
        transition: "transform 0.6s cubic-bezier(.4,0,.2,1)",
      };

  return (
    <div style={{
      position: "fixed", inset: 0,
      display: "grid", gridTemplateRows: "auto 1fr auto",
      background: "#020b18", color: "#f9fafb",
      overflow: "hidden", fontFamily: "system-ui, sans-serif",
    }}>
      {/* ══════════════ HEADER ══════════════ */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 20px", borderBottom: "1px solid #1e3a5f", background: "#030f1e",
        flexWrap: "wrap", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#60a5fa", letterSpacing: 2, margin: 0 }}>ECHOTRACE</h1>
            <p style={{ fontSize: 10, color: "#374151", margin: 0 }}>Yasanın yankısını, yasa çıkmadan duy.</p>
          </div>

          <span style={{
            fontSize: 10, padding: "2px 8px", borderRadius: 12, fontWeight: 700, letterSpacing: 1,
            background: mode === "live" ? "#14532d" : "#0f2240",
            color: mode === "live" ? "#4ade80" : "#60a5fa",
            border: `1px solid ${mode === "live" ? "#166534" : "#1e3a5f"}`,
          }}>
            {mode === "live" ? "● CANLI" : "● DEMO"}
          </span>

          {/* View tabs */}
          <div style={{ display: "flex", gap: 3, background: "#0a1628", padding: 3, borderRadius: 8 }}>
            {([["map","🗺 Harita"],["split","⇔ Karşılaştır"],["charts","📊 Grafikler"]] as [ViewMode,string][]).map(([v, lbl]) => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: "4px 11px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11,
                background: view === v ? "#1e3a5f" : "transparent",
                color: view === v ? "#93c5fd" : "#6b7280",
              }}>{lbl}</button>
            ))}
          </div>

          {/* Isometric toggle */}
          {view !== "charts" && (
            <button
              onClick={() => setIsometric(p => !p)}
              title="İzometrik görünüm"
              style={{
                padding: "4px 11px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11,
                background: isometric ? "#312e81" : "#0a1628",
                color: isometric ? "#a5b4fc" : "#6b7280",
              }}
            >
              {isometric ? "◆ 3D" : "◇ 3D"}
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "#22c55e", background: "#14532d22", padding: "3px 10px", borderRadius: 10 }}>
            ✓ {winners} il kazanıyor
          </span>
          <span style={{ fontSize: 11, color: "#ef4444", background: "#7f1d1d22", padding: "3px 10px", borderRadius: 10 }}>
            ✗ {losers} il kaybediyor
          </span>
          <div style={{ width: 1, height: 24, background: "#1e3a5f" }} />

          {/* Law input button */}
          <button
            onClick={() => setShowLawInput(true)}
            style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              cursor: "pointer", border: "1px solid #7c3aed44",
              background: "linear-gradient(135deg,#1a0a2e,#2d1b5e)",
              color: "#a78bfa",
              boxShadow: "0 0 10px #7c3aed33",
              animation: "lawGlow 2.5s ease-in-out infinite",
            }}
          >⚡ Yasa Gir</button>

          <style>{`@keyframes lawGlow{0%,100%{box-shadow:0 0 8px #7c3aed44}50%{box-shadow:0 0 18px #a78bfaaa}} @keyframes reportGlow{0%,100%{box-shadow:0 0 8px #2563eb44}50%{box-shadow:0 0 18px #3b82f6aa}} @keyframes aiGlow{0%,100%{box-shadow:0 0 8px #7c3aed33}50%{box-shadow:0 0 16px #a78bfa88}}`}</style>

          {/* LLM decision report button — only visible after a custom law run */}
          {llmReport && (
            <button
              onClick={() => setShowLLMReport(true)}
              style={{
                padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                cursor: "pointer", border: "1px solid #7c3aed66",
                background: "linear-gradient(135deg,#1a0a2e,#2d1b5e)",
                color: "#c4b5fd",
                animation: "aiGlow 2.5s ease-in-out infinite",
              }}
            >🧠 YZ Raporu</button>
          )}

          {/* Report generator button */}
          <button
            onClick={() => openReportWindow(scenario, currentDay, provinceStats)}
            style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              cursor: "pointer", border: "1px solid #2563eb44",
              background: "linear-gradient(135deg,#0f2240,#1e3a5f)",
              color: "#93c5fd",
              boxShadow: "0 0 10px #2563eb33",
              animation: "reportGlow 2.5s ease-in-out infinite",
            }}
          >📄 Rapor Oluştur</button>

        </div>
      </header>

      {/* ══════════════ MAIN ══════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: selectedProvince ? "1fr 360px" : "1fr", minHeight: 0, overflow: "hidden" }}>

        {/* Left: map / split / charts */}
        <div style={{ position: "relative", overflow: "hidden" }}>

          {view === "charts" && (
            <div style={{ padding: 16, height: "100%", overflow: "hidden" }}>
              <LiveCharts snapshots={snapshots} currentDay={currentDay} />
            </div>
          )}

          {view === "map" && (
            <div style={{ width: "100%", height: "100%", ...isoStyle }}>
              <TurkeyMap
                provinceStats={provinceStats}
                selectedId={selectedProvince?.id ?? null}
                onSelect={(id, name) => setSelectedProvince({ id, name })}
              />
              {/* Radar pings for active alerts */}
              {activeAlerts.map(alert => {
                const pos = latLonToMapPct(alert.lat, alert.lon);
                return (
                  <RadarPing
                    key={alert.id}
                    x={pos.x}
                    y={pos.y}
                    severity={alert.severity}
                    label={alert.provinceName}
                  />
                );
              })}
              {/* Overlays */}
              <MapOverlays currentDay={currentDay} winners={winners} losers={losers} />
            </div>
          )}

          {view === "split" && (
            <div style={{ width: "100%", height: "100%", ...isoStyle }}>
              <SplitMap
                beforeStats={beforeStats}
                afterStats={afterStats}
                selectedId={selectedProvince?.id ?? null}
                onSelect={(id, name) => setSelectedProvince({ id, name })}
              />
            </div>
          )}
        </div>

        {/* Right: City Dashboard */}
        {selectedProvince && selectedStats && (
          <div style={{ borderLeft: "1px solid #1e3a5f", overflow: "hidden" }}>
            <CityDashboard
              stats={selectedStats}
              history={provinceHistory}
              onClose={() => setSelectedProvince(null)}
              onAgentCinematic={(idx) => setCinematic({ agentIdx: idx })}
              llmReport={llmReport}
            />
          </div>
        )}
      </div>

      {/* ══════════════ TIMELINE ══════════════ */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "7px 20px", borderTop: "1px solid #1e3a5f", background: "#030f1e",
      }}>
        <button
          onClick={() => setPlaying(!playing)}
          style={{
            width: 34, height: 34, borderRadius: "50%",
            background: playing ? "#dc2626" : "#2563eb",
            border: "none", color: "#fff", fontSize: 13,
            cursor: "pointer", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >{playing ? "⏸" : "▶"}</button>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ height: 3, background: "#0d1b2e", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${progressPct}%`,
              background: "linear-gradient(90deg,#1d4ed8,#60a5fa)",
              transition: "width 0.1s linear",
            }} />
          </div>
          <input
            type="range" min={1} max={365} value={currentDay}
            onChange={e => { setCurrentDay(Number(e.target.value)); setPlaying(false); }}
            style={{ width: "100%", accentColor: "#3b82f6", margin: 0 }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#374151" }}>
            {["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"].map(m => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6b7280" }}>
          <span>Hız:</span>
          {SPEED_OPTIONS.map(s => (
            <button key={s} onClick={() => setSpeed(s)} style={{
              padding: "3px 7px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 11,
              background: speed === s ? "#2563eb" : "#0d1b2e",
              color: speed === s ? "#fff" : "#6b7280",
            }}>{s}x</button>
          ))}
        </div>
      </div>

      {/* ══════════════ ALERT TOASTS ══════════════ */}
      <AlertToast alerts={activeAlerts} scenarioKey={scenario} />

      {/* ══════════════ LAW INPUT MODAL ══════════════ */}
      {showLawInput && (
        <LawInput
          mode={mode}
          onSubmit={(text, onError, onSuccess) => runCustomLaw(text, onError, onSuccess)}
          onClose={() => setShowLawInput(false)}
        />
      )}

      {showLLMReport && llmReport && (
        <LLMReportModal report={llmReport} onClose={() => setShowLLMReport(false)} />
      )}

      {/* ══════════════ CITY UNEMPLOYMENT (backend live data) ══════════════ */}
      {mode === "live" && Object.keys(cityUnemployment).length > 0 && (
        <div style={{
          position: "fixed", bottom: 60, left: 16,
          background: "rgba(2,11,24,0.92)", borderRadius: 8,
          padding: "8px 14px", zIndex: 50, border: "1px solid #14532d",
        }}>
          <div style={{ fontSize: 9, color: "#4b5563", marginBottom: 5, letterSpacing: 1 }}>CANLI — ŞEHİR İŞSİZLİK</div>
          {Object.entries(cityUnemployment).slice(0, 5).map(([city, rate]) => (
            <div key={city} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 10, marginBottom: 2 }}>
              <span style={{ color: "#9ca3af" }}>{city}</span>
              <span style={{ color: rate > 0.15 ? "#ef4444" : "#22c55e", fontWeight: 700 }}>
                %{(rate * 100).toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════ CINEMATIC MODE ══════════════ */}
      {cinematic && selectedStats && (
        <CinematicTimeline
          agentIdx={cinematic.agentIdx}
          stats={selectedStats}
          scenario={SCENARIO_LABELS[scenario]}
          onClose={() => setCinematic(null)}
        />
      )}
    </div>
  );
}

// ── Small overlay helper ────────────────────────────────────
function MapOverlays({ currentDay, winners, losers }: { currentDay: number; winners: number; losers: number }) {
  return (
    <>
      <div style={{
        position: "absolute", top: 12, right: 16,
        background: "rgba(2,11,24,0.85)", borderRadius: 8, padding: "6px 14px", fontSize: 13,
      }}>
        <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: 22, marginRight: 6 }}>{currentDay}</span>
        / 365. gün
      </div>
      <div style={{
        position: "absolute", bottom: 12, left: 16,
        display: "flex", flexDirection: "column", gap: 4,
        background: "rgba(2,11,24,0.85)", borderRadius: 8, padding: "8px 14px", fontSize: 11,
      }}>
        <div style={{ color: "#6b7280", marginBottom: 2, fontSize: 10 }}>İL ETKİ SKORU</div>
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { color: "#14643c", label: "Kazanıyor" },
            { color: "#1e3a5f", label: "Nötr" },
            { color: "#7f1d1d", label: "Kaybediyor" },
          ].map(item => (
            <span key={item.label} style={{ display: "flex", alignItems: "center", gap: 5, color: "#9ca3af" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, display: "inline-block" }} />
              {item.label}
            </span>
          ))}
        </div>
        <div style={{ fontSize: 10, color: "#374151" }}>İle tıkla → Şehir Karnesi</div>
      </div>
    </>
  );
}
