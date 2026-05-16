import numpy as np
from .calibration import TUIK_2024
from .cities import CITY_BY_ID, CITY_NAMES


def gini_coefficient(incomes: np.ndarray) -> float:
    sorted_inc = np.sort(incomes)
    n = len(sorted_inc)
    index = np.arange(1, n + 1)
    return float((2 * (index * sorted_inc).sum()) / (n * sorted_inc.sum()) - (n + 1) / n)


def unemployment_rate(employed: np.ndarray) -> float:
    return float(1.0 - employed.mean())


def avg_consumption(consumption: np.ndarray) -> float:
    return float(consumption.mean())


def avg_savings(savings: np.ndarray) -> float:
    return float(savings.mean())


def tax_revenue(
    consumption: np.ndarray,
    income: np.ndarray,
    vat_rate: float,
    income_tax_rate: float = 0.15,
) -> float:
    vat = (consumption * vat_rate).sum()
    income_tax = (income * income_tax_rate / 30).sum()
    return float(vat + income_tax)


def winner_loser_neutral(
    consumption: np.ndarray,
    baseline_consumption: np.ndarray,
    threshold: float = 0.02,
) -> dict:
    delta = (consumption - baseline_consumption) / (baseline_consumption + 1e-9)
    winners = int((delta > threshold).sum())
    losers = int((delta < -threshold).sum())
    neutral = int(len(delta) - winners - losers)
    return {"winners": winners, "losers": losers, "neutral": neutral}


def city_unemployment_breakdown(city: np.ndarray, employed: np.ndarray) -> dict:
    result = {}
    for city_id, city_name in enumerate(CITY_NAMES):
        mask = city == city_id
        if mask.sum() == 0:
            continue
        unemp = float(1.0 - employed[mask].mean())
        result[city_name] = round(unemp, 4)
    return result


def compute_daily_metrics(
    agents,
    baseline_consumption: np.ndarray,
    vat_rate: float,
    day: int,
) -> dict:
    return {
        "day": day,
        "gini": round(gini_coefficient(agents.consumption), 4),
        "unemployment_rate": round(unemployment_rate(agents.employed), 4),
        "avg_consumption": round(avg_consumption(agents.consumption), 2),
        "avg_savings": round(avg_savings(agents.savings), 2),
        "tax_revenue": round(tax_revenue(agents.consumption, agents.income, vat_rate), 2),
        "agent_status": winner_loser_neutral(agents.consumption, baseline_consumption),
        "city_unemployment": city_unemployment_breakdown(agents.city, agents.employed),
    }
