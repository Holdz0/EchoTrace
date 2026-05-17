import { PROVINCES } from "./turkeyData";
import type { DaySnapshot } from "../types";

// Yasadan önceki baz işsizlik oranları — provinces_calibration.json ile senkronize (TÜİK 2024)
const PROVINCE_BASE_UNEMPLOYMENT: Record<string, number> = {
  "Adana": 0.130, "Adıyaman": 0.155, "Afyonkarahisar": 0.102, "Ağrı": 0.200,
  "Amasya": 0.112, "Ankara": 0.072, "Antalya": 0.098, "Artvin": 0.098,
  "Aydın": 0.098, "Balıkesir": 0.092, "Bilecik": 0.082, "Bingöl": 0.168,
  "Bitlis": 0.228, "Bolu": 0.068, "Burdur": 0.105, "Bursa": 0.080,
  "Çanakkale": 0.092, "Çankırı": 0.105, "Çorum": 0.112, "Denizli": 0.098,
  "Diyarbakır": 0.220, "Edirne": 0.095, "Elazığ": 0.138, "Erzincan": 0.148,
  "Erzurum": 0.155, "Eskişehir": 0.085, "Gaziantep": 0.115, "Giresun": 0.098,
  "Gümüşhane": 0.098, "Hakkari": 0.245, "Hatay": 0.135, "Isparta": 0.105,
  "Mersin": 0.125, "İstanbul": 0.087, "İzmir": 0.091, "Kars": 0.192,
  "Kastamonu": 0.105, "Kayseri": 0.108, "Kırklareli": 0.095, "Kırşehir": 0.118,
  "Kocaeli": 0.065, "Konya": 0.108, "Kütahya": 0.102, "Malatya": 0.138,
  "Manisa": 0.102, "Kahramanmaraş": 0.142, "Mardin": 0.228, "Muğla": 0.098,
  "Muş": 0.232, "Nevşehir": 0.118, "Niğde": 0.118, "Ordu": 0.098,
  "Rize": 0.098, "Sakarya": 0.068, "Samsun": 0.110, "Siirt": 0.242,
  "Sinop": 0.105, "Sivas": 0.112, "Tekirdağ": 0.095, "Tokat": 0.112,
  "Trabzon": 0.098, "Tunceli": 0.125, "Şanlıurfa": 0.225, "Uşak": 0.102,
  "Van": 0.225, "Yozgat": 0.112, "Zonguldak": 0.108, "Aksaray": 0.118,
  "Bayburt": 0.148, "Karaman": 0.110, "Kırıkkale": 0.118, "Batman": 0.240,
  "Şırnak": 0.248, "Bartın": 0.108, "Ardahan": 0.198, "Iğdır": 0.195,
  "Yalova": 0.068, "Karabük": 0.108, "Kilis": 0.118, "Osmaniye": 0.138,
  "Düzce": 0.068,
};
const NATIONAL_BASE_UNEMPLOYMENT = 0.105;

export function computeProvinceStatsLive(
  currentSnap: DaySnapshot,
  _baselineSnap: DaySnapshot, // imza uyumu için tutuldu
): ProvinceStats[] {
  const currCity = currentSnap.cityUnemployment ?? {};

  return PROVINCES.map(p => {
    const pid      = parseInt(p.id);
    const cityName = p.name;

    const baseUnemp = PROVINCE_BASE_UNEMPLOYMENT[cityName] ?? NATIONAL_BASE_UNEMPLOYMENT;
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
