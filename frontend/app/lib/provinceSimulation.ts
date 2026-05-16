import { PROVINCES } from "./turkeyData";
import type { DaySnapshot } from "../types";

// Province plate ID → backend city name (from cities.py)
const PROVINCE_TO_CITY: Record<number, string> = {
  34: "İstanbul",
  6: "Ankara",  18: "Ankara",  40: "Ankara",  71: "Ankara",
  35: "İzmir",  9: "İzmir",   20: "İzmir",   45: "İzmir",   48: "İzmir",  64: "İzmir",
  16: "Bursa",  10: "Bursa",  11: "Bursa",   17: "Bursa",   54: "Bursa",  77: "Bursa",
  7:  "Antalya", 15: "Antalya", 32: "Antalya",
  42: "Konya",  50: "Konya",  51: "Konya",   68: "Konya",   70: "Konya",
  1:  "Adana",  31: "Adana",  33: "Adana",   80: "Adana",
  63: "Şanlıurfa", 21: "Şanlıurfa", 30: "Şanlıurfa", 47: "Şanlıurfa",
  56: "Şanlıurfa", 65: "Şanlıurfa", 72: "Şanlıurfa", 73: "Şanlıurfa",
  27: "Gaziantep", 2: "Gaziantep", 44: "Gaziantep", 46: "Gaziantep", 79: "Gaziantep",
  41: "Kocaeli", 14: "Kocaeli", 22: "Kocaeli", 39: "Kocaeli", 59: "Kocaeli", 81: "Kocaeli",
};

// Yasadan önceki baz işsizlik oranları — cities.py'dan (TÜİK 2024)
const CITY_BASE_UNEMPLOYMENT: Record<string, number> = {
  "İstanbul":  0.085,
  "Ankara":    0.070,
  "İzmir":     0.090,
  "Bursa":     0.080,
  "Antalya":   0.095,
  "Konya":     0.130,
  "Adana":     0.145,
  "Şanlıurfa": 0.220,
  "Gaziantep": 0.110,
  "Kocaeli":   0.065,
  "Diğer":     0.105,
};
const NATIONAL_BASE_UNEMPLOYMENT = 0.105;

export function computeProvinceStatsLive(
  currentSnap: DaySnapshot,
  _baselineSnap: DaySnapshot, // imza uyumu için tutuldu
): ProvinceStats[] {
  const currCity = currentSnap.cityUnemployment ?? {};

  return PROVINCES.map(p => {
    const pid      = parseInt(p.id);
    const cityName = PROVINCE_TO_CITY[pid] ?? "Diğer";

    // Baz: yasadan önceki bilinen şehir işsizliği (cities.py)
    const baseUnemp = CITY_BASE_UNEMPLOYMENT[cityName] ?? NATIONAL_BASE_UNEMPLOYMENT;
    // Eğer backend bu şehri raporlamadıysa baseline = 0 değişim (nötr)
    const currUnemp = currCity[cityName] !== undefined
      ? currCity[cityName]
      : baseUnemp;

    // Sadece şehre özgü işsizlik değişimi — ulusal sızmayı kaldır
    const unempImprovement = (baseUnemp - currUnemp) / Math.max(0.01, baseUnemp);

    const noise    = (seeded(pid, 3) - 0.5) * 0.02;
    const rawScore = unempImprovement + noise;
    const score    = Math.max(-0.5, Math.min(0.5, rawScore));

    const winnerPct = Math.max(0.05, Math.min(0.9, 0.3 + score * 0.6));
    const loserPct  = Math.max(0.05, Math.min(0.9, 0.3 - score * 0.6));

    return {
      id: p.id,
      name: p.name,
      score,
      winnerPct,
      loserPct,
      unemployment: currUnemp,
      consumption:  currentSnap.avgConsumption * (1 + score * 0.3),
      inflation:    currentSnap.avgPrice / 100,
      gini:         currentSnap.gini + (seeded(pid, 7) - 0.5) * 0.02,
      agentCount:   Math.max(50, Math.round(p.population / 100000) * 10),
    };
  });
}

export interface ProvinceStats {
  id: string;
  name: string;
  score: number;
  winnerPct: number;
  loserPct: number;
  unemployment: number;
  consumption: number;
  inflation: number;
  gini: number;
  agentCount: number;
}

function seeded(seed: number, n: number): number {
  return Math.abs(Math.sin(seed * 127.1 + n * 311.7)) % 1;
}

export function computeProvinceStats(
  day: number,
  params: { minWageMultiplier: number; vatMultiplier: number; retirementBoost: number }
): ProvinceStats[] {
  const t = day / 365;
  const wageEffect = (params.minWageMultiplier - 1) * t * 0.6;
  const vatEffect  = (1 - params.vatMultiplier) * t * 0.4;
  const eytEffect  = params.retirementBoost * t * 0.3;
  const totalEffect = wageEffect + vatEffect + eytEffect;

  return PROVINCES.map(p => {
    const pid = parseInt(p.id);
    const provinceRng = seeded(pid, 1);
    const industrialWeight = seeded(pid, 5);
    const ruralWeight = seeded(pid, 9);

    const wageBonus = industrialWeight * wageEffect * 1.2;
    const vatBonus  = (1 - ruralWeight) * vatEffect * 0.8;
    const eytBonus  = ruralWeight * eytEffect * 1.4;
    const localNoise = (seeded(pid, 3) - 0.5) * 0.05;

    const rawScore = wageBonus + vatBonus + eytBonus + localNoise;
    const score = Math.max(-0.5, Math.min(0.5, rawScore));

    const baseWinner = 0.3 + score * 0.6;
    const baseLoser  = 0.3 - score * 0.6;
    const winnerPct = Math.max(0.05, Math.min(0.9, baseWinner));
    const loserPct  = Math.max(0.05, Math.min(0.9, baseLoser));

    const baseUnemployment = 0.08 + provinceRng * 0.12;
    const unemployment = Math.max(0.03, baseUnemployment - totalEffect * 0.04 + localNoise * 0.5);

    const baseConsumption = 4000 + provinceRng * 8000;
    const consumption = baseConsumption * (1 + score * 0.4);

    const inflation = 1 + (params.vatMultiplier < 1 ? (1 - params.vatMultiplier) * -0.3 : 0)
                      + totalEffect * 0.15 + 0.02 * t + provinceRng * 0.05;

    const gini = 0.38 + provinceRng * 0.12 + totalEffect * 0.03 - score * 0.05;

    const pop = p.population;
    const agentCount = Math.max(50, Math.round(pop / 100000) * 10);

    return { id: p.id, name: p.name, score, winnerPct, loserPct, unemployment, consumption, inflation, gini, agentCount };
  });
}

export function scoreToColor(score: number): string {
  if (score > 0.15)  return `rgb(${Math.round(20 - score * 20)}, ${Math.round(100 + score * 155)}, ${Math.round(60 + score * 40)})`;
  if (score < -0.15) return `rgb(${Math.round(180 + Math.abs(score) * 75)}, ${Math.round(30 - Math.abs(score) * 10)}, ${Math.round(30 - Math.abs(score) * 10)})`;
  return `rgb(30, 58, 95)`;
}
