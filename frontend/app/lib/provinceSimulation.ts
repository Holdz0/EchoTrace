import { PROVINCES } from "./turkeyData";

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
