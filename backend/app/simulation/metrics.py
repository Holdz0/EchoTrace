import numpy as np
from .calibration import TUIK_2024
from .provinces import PROVINCE_NAMES, PROVINCE_COUNT


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
    agents,
    vat_rate: float,
    income_tax_rate: float = 0.15,
) -> float:
    # Tüketim üzerinden herkes KDV öder
    vat = (agents.consumption * vat_rate).sum()
    
    # Sadece kayıtlı (formal) çalışanlar gelir vergisi öder
    formal_employed = (agents.employed) & (~agents.informal_employment)
    income_tax = (agents.income[formal_employed] * income_tax_rate / 30).sum()
    
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
    for prov_idx in range(PROVINCE_COUNT):
        mask = city == prov_idx
        n = mask.sum()
        if n < 5:
            continue
        unemp = float(1.0 - employed[mask].mean())
        result[PROVINCE_NAMES[prov_idx]] = round(unemp, 4)
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
        "tax_revenue": round(tax_revenue(agents, vat_rate), 2),
        "agent_status": winner_loser_neutral(agents.consumption, baseline_consumption),
        "city_unemployment": city_unemployment_breakdown(agents.city, agents.employed),
    }
