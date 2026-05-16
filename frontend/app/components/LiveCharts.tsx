"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import type { DaySnapshot } from "../types";

interface Props {
  snapshots: DaySnapshot[];
  currentDay: number;
}

function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }
function k(v: number) { return `${(v / 1000).toFixed(1)}K`; }
function bn(v: number) { return `${(v / 1_000_000_000).toFixed(2)}B`; }

const CHART_STYLE = {
  background: "#030f1e", borderRadius: 10, border: "1px solid #1e3a5f",
  padding: "10px 10px 4px 0",
};

export default function LiveCharts({ snapshots, currentDay }: Props) {
  const data = snapshots.slice(0, currentDay).filter((_, i) => i % 7 === 0 || i === currentDay - 1)
    .map(s => ({
      day: s.day,
      consumption: s.avgConsumption,
      unemployment: s.unemploymentRate,
      price: s.avgPrice,
      gini: s.gini,
      savings: s.avgSavings,
      taxRevenue: s.taxRevenue,
    }));

  const charts = [
    { key: "consumption",  label: "Ort. Tüketim",    color: "#22c55e",  fmt: k   },
    { key: "unemployment", label: "İşsizlik Oranı",  color: "#ef4444",  fmt: pct },
    { key: "price",        label: "Fiyat Endeksi",   color: "#f59e0b",  fmt: (v: number) => v.toFixed(1) },
    { key: "gini",         label: "Gini Katsayısı",  color: "#a78bfa",  fmt: (v: number) => v.toFixed(3) },
    { key: "savings",      label: "Ort. Tasarruf",   color: "#60a5fa",  fmt: k   },
    { key: "taxRevenue",   label: "Vergi Geliri",    color: "#fb923c",  fmt: bn  },
  ];

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
      gridTemplateRows: "1fr 1fr",
      gap: 12, height: "100%", padding: 4,
    }}>
      {charts.map(c => (
        <div key={c.key} style={CHART_STYLE}>
          <div style={{ fontSize: 10, color: "#4b5563", paddingLeft: 10, marginBottom: 4 }}>{c.label}</div>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart data={data} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#0a1628" strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fill: "#374151", fontSize: 9 }} tickLine={false} />
              <YAxis tick={{ fill: "#374151", fontSize: 9 }} tickLine={false} tickFormatter={c.fmt} width={45} />
              <Tooltip
                contentStyle={{ background: "#030f1e", border: `1px solid ${c.color}44`, borderRadius: 6, fontSize: 10 }}
                formatter={(v: number) => c.fmt(v)}
              />
              <Line type="monotone" dataKey={c.key} stroke={c.color} dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}
