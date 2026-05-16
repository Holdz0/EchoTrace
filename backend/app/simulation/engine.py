import numpy as np
from typing import Generator

from .agents import AgentPopulation, create_population
from .metrics import compute_daily_metrics
from .policy_engine import apply_effects
from .calibration import TUIK_2024


def run_simulation(
    effects: list[dict] | None = None,
    inflation_shock: float = 0.0,
    vat_food_rate: float | None = None,
    duration_days: int = 365,
    seed: int = 42,
) -> dict:
    agents = create_population(seed)
    baseline_consumption = agents.consumption.copy()

    effective_vat = vat_food_rate if vat_food_rate is not None else TUIK_2024["vat_food_rate"]
    daily_inflation = (TUIK_2024["inflation_annual"] + inflation_shock) / 365

    effect_log = []
    if effects:
        effect_log = apply_effects(agents, effects)

    rng = np.random.default_rng(seed + 99)
    results = []
    price_level = 1.0

    for day in range(1, duration_days + 1):
        price_level *= (1 + daily_inflation)
        _step(agents, price_level, effective_vat, rng)
        results.append(compute_daily_metrics(agents, baseline_consumption, effective_vat, day))

    return {"results": results, "effect_log": effect_log}


def run_simulation_chunked(
    effects: list[dict] | None = None,
    inflation_shock: float = 0.0,
    vat_food_rate: float | None = None,
    duration_days: int = 365,
    chunk_size: int = 10,
    seed: int = 42,
) -> Generator[list[dict], None, None]:
    agents = create_population(seed)
    baseline_consumption = agents.consumption.copy()

    effective_vat = vat_food_rate if vat_food_rate is not None else TUIK_2024["vat_food_rate"]
    daily_inflation = (TUIK_2024["inflation_annual"] + inflation_shock) / 365

    if effects:
        apply_effects(agents, effects)

    rng = np.random.default_rng(seed + 99)
    price_level = 1.0
    chunk: list[dict] = []

    for day in range(1, duration_days + 1):
        price_level *= (1 + daily_inflation)
        _step(agents, price_level, effective_vat, rng)
        chunk.append(compute_daily_metrics(agents, baseline_consumption, effective_vat, day))

        if len(chunk) == chunk_size:
            yield chunk
            chunk = []

    if chunk:
        yield chunk


def _step(agents: AgentPopulation, price_level: float, vat_rate: float, rng: np.random.Generator = None) -> None:
    if rng is None:
        rng = np.random.default_rng()

    employed_mask = agents.employed
    unemployed_mask = ~employed_mask

    mpc = 0.85 - 0.25 * agents.income_percentile
    food_weight = 0.248
    vat_drag = 1.0 - food_weight * vat_rate * agents.price_sensitivity

    # --- ÇALIŞANLAR: gelirden tüketir ---
    real_income = agents.income / price_level
    agents.consumption[employed_mask] = (
        real_income[employed_mask] * mpc[employed_mask] / 30 * vat_drag[employed_mask]
    )
    # Tasarruf güncelle: gelir - tüketim
    daily_income = real_income / 30
    agents.savings[employed_mask] = np.maximum(
        0, agents.savings[employed_mask] + daily_income[employed_mask] - agents.consumption[employed_mask]
    )

    # --- İŞSİZLER: tasarruftan tüketir (gelir yok) ---
    # Günlük harcama kapasitesi: tasarrufun %1.5'i, max asgari ücret seviyesi
    min_daily = (TUIK_2024["min_wage_monthly"] / price_level / 30)
    max_daily = min_daily * (0.5 + agents.income_percentile[unemployed_mask])
    savings_draw = agents.savings[unemployed_mask] * 0.015
    agents.consumption[unemployed_mask] = np.minimum(savings_draw, max_daily)

    # Tasarruf erir
    agents.savings[unemployed_mask] = np.maximum(
        0, agents.savings[unemployed_mask] - agents.consumption[unemployed_mask]
    )

    # Birikimi sıfırlanan işsizler: geçim asgari düzeyi
    broke_mask = unemployed_mask & (agents.savings <= 0)
    agents.consumption[broke_mask] = min_daily * 0.2

    # --- İSTİHDAM DİNAMİĞİ ---

    # Çalışanlar: küçük iş kaybı olasılığı (%0.05/gün ≈ yıllık %17 churn)
    job_loss = employed_mask & (rng.random(len(agents.employed)) < 0.0005)
    agents.employed[job_loss] = False
    agents.income[job_loss] = 0.0

    # İşsizler: iş bulma olasılığı (birikimi bitenler çok daha zor bulur)
    reemploy_prob = np.where(broke_mask, 0.0005, 0.003)
    found_job = unemployed_mask & (rng.random(len(agents.employed)) < reemploy_prob)
    agents.employed[found_job] = True
    agents.income[found_job] = TUIK_2024["min_wage_monthly"] * (
        0.9 + 0.4 * agents.income_percentile[found_job]
    )


def _apply_min_wage(agents: AgentPopulation, increase_rate: float) -> None:
    from .calibration import TUIK_2024
    threshold = TUIK_2024["min_wage_monthly"] * 1.5
    low_income_mask = agents.income <= threshold
    agents.income[low_income_mask] *= (1 + increase_rate)
    # Gelir yüzdeliğini yeniden hesapla
    rank = np.argsort(np.argsort(agents.income))
    agents.income_percentile[:] = rank / (len(agents.income) - 1)


def _apply_eyt(agents: AgentPopulation, n_retiring: int, seed: int) -> None:
    rng = np.random.default_rng(seed + 1)
    # İleri yaşlı çalışanlar önce emekliye ayrılır
    eligible = np.where((agents.age >= 50) & agents.employed)[0]
    n = min(n_retiring, len(eligible))
    chosen = rng.choice(eligible, size=n, replace=False)
    agents.profession[chosen] = 3  # emekli
    agents.employed[chosen] = False
    # Emekli maaşı: önceki gelirin %60'ı
    agents.income[chosen] *= 0.60
