"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SCENARIOS, type ScenarioKey } from "./mockData";
import type { DaySnapshot } from "../types";

type Mode = "live" | "mock";

// Backend DayResult (snake_case) → frontend DaySnapshot (camelCase)
interface BackendDayResult {
  day: number;
  gini: number;
  unemployment_rate: number;
  avg_consumption: number;
  avg_savings: number;
  tax_revenue: number;
  agent_status: { winners: number; losers: number; neutral: number };
  city_unemployment: Record<string, number>;
}

function toSnapshot(r: BackendDayResult): DaySnapshot {
  return {
    day: r.day,
    gini: r.gini,
    unemploymentRate: r.unemployment_rate,
    avgConsumption: r.avg_consumption,
    avgSavings: r.avg_savings,
    taxRevenue: r.tax_revenue,
    avgPrice: 100 * (1 + r.unemployment_rate * 0.15),
    agents: [],
    cityUnemployment: r.city_unemployment,
  };
}

// Scenario → SimulationRequest params
const SCENARIO_REQUESTS: Record<ScenarioKey, object> = {
  minWage: {
    effects: [{ target: "income", filter: { income: { lt: 25000 } }, operation: "multiply", value: 1.5 }],
    inflation_shock: 0.05,
    vat_food_rate: null,
    duration_days: 365,
  },
  vat: {
    effects: [],
    inflation_shock: -0.02,
    vat_food_rate: 0.08,
    duration_days: 365,
  },
  eyt: {
    effects: [{ target: "income", filter: { profession: [3] }, operation: "multiply", value: 1.2 }],
    inflation_shock: 0.03,
    vat_food_rate: null,
    duration_days: 365,
  },
};

export interface UseSimulationReturn {
  snapshots: DaySnapshot[];
  currentDay: number;
  playing: boolean;
  speed: number;
  mode: Mode;
  cityUnemployment: Record<string, number>;
  setCurrentDay: (d: number | ((prev: number) => number)) => void;
  setPlaying: (p: boolean) => void;
  setSpeed: (s: number) => void;
  resetScenario: (key: ScenarioKey) => void;
  runCustomLaw: (lawText: string, onError?: () => void, onSuccess?: () => void) => void;
}

export function useSimulation(initialScenario: ScenarioKey): UseSimulationReturn {
  const [snapshots, setSnapshots]           = useState<DaySnapshot[]>(SCENARIOS[initialScenario]);
  const [currentDay, setCurrentDay]         = useState(1);
  const [playing, setPlaying]               = useState(false);
  const [speed, setSpeed]                   = useState(1);
  const [mode, setMode]                     = useState<Mode>("mock");
  const [cityUnemployment, setCityUnemp]    = useState<Record<string, number>>({});
  const scenarioRef = useRef<ScenarioKey>(initialScenario);
  const wsRef       = useRef<WebSocket | null>(null);

  const connectAndRun = useCallback((request: object) => {
    wsRef.current?.close();

    const ws = new WebSocket("ws://localhost:8000/ws/simulate");
    wsRef.current = ws;

    ws.onopen = () => {
      setMode("live");
      setSnapshots(Array(365).fill(null).map((_, i) => SCENARIOS[scenarioRef.current][i]));
      setCurrentDay(1);
      ws.send(JSON.stringify(request));
    };

    let completedNormally = false;

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as { type: string; days?: BackendDayResult[]; message?: string };
        if (msg.type === "data" && msg.days) {
          const converted = msg.days.map(toSnapshot);
          setSnapshots(prev => {
            const next = [...prev];
            for (const snap of converted) next[snap.day - 1] = snap;
            return next;
          });
          const lastDay = msg.days[msg.days.length - 1];
          setCurrentDay(lastDay.day);
          if (lastDay.city_unemployment) setCityUnemp(lastDay.city_unemployment);
        }
        if (msg.type === "done") {
          setPlaying(false);
          completedNormally = true;
        }
      } catch {}
    };

    // Sadece hata/anormal kapanmada mock'a dön; normal tamamlanmada "live" kalsın
    ws.onerror = () => { ws.close(); setMode("mock"); };
    ws.onclose = () => { if (!completedNormally) setMode(m => m === "live" ? "mock" : m); };
  }, []);

  // Try initial backend connection on mount
  useEffect(() => {
    connectAndRun(SCENARIO_REQUESTS[initialScenario]);
    return () => wsRef.current?.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetScenario = useCallback((key: ScenarioKey) => {
    scenarioRef.current = key;
    setSnapshots(SCENARIOS[key]);
    setCurrentDay(1);
    setPlaying(false);
    setCityUnemp({});
    // Re-run with new scenario params if backend is available
    connectAndRun(SCENARIO_REQUESTS[key]);
  }, [connectAndRun]);

  // Parse a free-form law text via the LLM endpoint, then simulate
  const runCustomLaw = useCallback((lawText: string, onError?: () => void, onSuccess?: () => void) => {
    fetch("http://localhost:8000/parse-and-simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ law_text: lawText }),
    })
      .then(r => r.json())
      .then((resp: { results: BackendDayResult[]; effect_log?: string[]; error?: string }) => {
        if (resp.error) {
          console.error("❌ Backend hatası:", resp.error);
          onError?.();
          return;
        }
        // LLM'in ürettiği efektleri konsola bas (debug)
        if (resp.effect_log?.length) {
          console.group("🔍 LLM Effect Log");
          resp.effect_log.forEach(l => console.log(l));
          console.groupEnd();
        }
        if (!resp.results?.length) { onError?.(); return; }
        const snaps = resp.results.map(toSnapshot);
        // Pad to 365 if shorter
        while (snaps.length < 365) snaps.push({ ...snaps[snaps.length - 1], day: snaps.length + 1 });
        setSnapshots(snaps);
        setCurrentDay(1);
        setMode("live");
        setPlaying(true);
        setCityUnemp(resp.results[resp.results.length - 1]?.city_unemployment ?? {});
        onSuccess?.();
      })
      .catch(() => onError?.());
  }, []);

  return {
    snapshots, currentDay, playing, speed, mode, cityUnemployment,
    setCurrentDay, setPlaying, setSpeed, resetScenario, runCustomLaw,
  };
}
