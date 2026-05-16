from typing import Any
from pydantic import BaseModel, Field


class PolicyEffect(BaseModel):
    target: str = Field(description="Değiştirilecek ajan alanı: income, employed, savings, profession, price_sensitivity, debt, children_count, vs.")
    filter: dict[str, Any] = Field(default={}, description="Hangi ajanlar etkilensin: {age: {gt: 30}}")
    operation: str = Field(description="set | multiply | add | subtract | min | max")
    value: Any = Field(description="Operasyonun değeri")


class SimulationRequest(BaseModel):
    effects: list[PolicyEffect] = Field(default=[], description="LLM'den gelen etki listesi")
    inflation_shock: float = Field(default=0.0, ge=-0.5, le=2.0)
    vat_food_rate: float | None = Field(default=None, ge=0.0, le=0.20)
    duration_days: int = Field(default=365, ge=1, le=365)


class AgentStatusCounts(BaseModel):
    winners: int
    losers: int
    neutral: int


class DayResult(BaseModel):
    day: int
    gini: float
    unemployment_rate: float
    avg_consumption: float
    avg_savings: float
    tax_revenue: float
    agent_status: AgentStatusCounts
    city_unemployment: dict[str, float]


class SimulationResponse(BaseModel):
    total_days: int
    effect_log: list[str]
    results: list[DayResult]
