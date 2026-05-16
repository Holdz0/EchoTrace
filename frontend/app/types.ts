export type AgentStatus = "winner" | "loser" | "neutral";

export interface AgentState {
  id: number;
  x: number;
  y: number;
  z: number;
  status: AgentStatus;
  consumption: number;
  savings: number;
}

export interface DaySnapshot {
  day: number;
  avgConsumption: number;
  unemploymentRate: number;
  avgPrice: number;
  gini: number;
  avgSavings: number;
  taxRevenue: number;
  agents: AgentState[];
  cityUnemployment?: Record<string, number>;
}
