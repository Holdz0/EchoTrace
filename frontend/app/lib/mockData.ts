import type { DaySnapshot, AgentState, AgentStatus } from "../types";

export type ScenarioKey = "minWage" | "vat" | "eyt";

const AGENT_COUNT = 10_000;
const DAYS = 365;
const SEED = 42;

function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function buildScenario(
  key: ScenarioKey,
  params: { minWageMultiplier: number; vatMultiplier: number; retirementBoost: number }
): DaySnapshot[] {
  const rng = lcg(SEED + (key === "minWage" ? 0 : key === "vat" ? 1 : 2));
  const snapshots: DaySnapshot[] = [];

  const baseAgents: AgentState[] = Array.from({ length: AGENT_COUNT }, (_, i) => ({
    id: i,
    x: (rng() - 0.5) * 200,
    y: (rng() - 0.5) * 200,
    z: (rng() - 0.5) * 200,
    status: "neutral" as AgentStatus,
    consumption: 3000 + rng() * 7000,
    savings: rng() * 5000,
  }));

  for (let day = 1; day <= DAYS; day++) {
    const t = day / DAYS;
    const wageEffect = (params.minWageMultiplier - 1) * t * 0.6;
    const vatEffect  = (1 - params.vatMultiplier) * t * 0.4;
    const eytEffect  = params.retirementBoost * t * 0.3;
    const totalEffect = wageEffect + vatEffect + eytEffect;

    const inflation = 1 + totalEffect * 0.25 + 0.02 * t;

    const agents: AgentState[] = baseAgents.map((a, i) => {
      const luck = ((i * 2654435761) >>> 0) / 0xffffffff;
      const isWinner = luck > 0.55 + totalEffect * 0.1;
      const isLoser  = luck < 0.35 - totalEffect * 0.1;
      const status: AgentStatus = isWinner ? "winner" : isLoser ? "loser" : "neutral";
      return {
        ...a,
        status,
        consumption: a.consumption * (1 + totalEffect * (isWinner ? 0.3 : isLoser ? -0.2 : 0.05)),
        savings: a.savings * (1 + totalEffect * (isWinner ? 0.15 : isLoser ? -0.3 : 0)),
      };
    });

    const avgConsumption = agents.reduce((s, a) => s + a.consumption, 0) / AGENT_COUNT;
    const avgSavings = agents.reduce((s, a) => s + a.savings, 0) / AGENT_COUNT;
    const winnerCount = agents.filter(a => a.status === "winner").length;
    const unemploymentRate = Math.max(0.08, 0.14 - totalEffect * 0.08 - t * 0.02);
    const gini = 0.42 + totalEffect * 0.03 - winnerCount / AGENT_COUNT * 0.05;
    const avgPrice = 100 * inflation;
    const taxRevenue = avgConsumption * AGENT_COUNT * 0.18;

    snapshots.push({ day, avgConsumption, unemploymentRate, avgPrice, gini, avgSavings, taxRevenue, agents });
  }
  return snapshots;
}

export const SCENARIOS: Record<ScenarioKey, DaySnapshot[]> = {
  minWage: buildScenario("minWage", { minWageMultiplier: 1.5, vatMultiplier: 1, retirementBoost: 0 }),
  vat:     buildScenario("vat",     { minWageMultiplier: 1,   vatMultiplier: 0.5, retirementBoost: 0 }),
  eyt:     buildScenario("eyt",     { minWageMultiplier: 1,   vatMultiplier: 1,   retirementBoost: 1 }),
};
