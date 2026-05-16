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

    # 1. BORÇ, KİRA VE DİĞER GÜNLÜK SABİT GİDERLER
    # Borç faizi işlet (%40 yıllık) ve günlük ödeme al
    has_debt = agents.debt > 0
    if has_debt.any():
        agents.debt[has_debt] *= (1 + 0.40 / 365)
        debt_payment = agents.debt * 0.001 # Günde binde 1 ödeme (~ayda %3)
        can_pay = agents.savings > debt_payment
        agents.savings[can_pay] -= debt_payment[can_pay]
        agents.debt[can_pay] -= debt_payment[can_pay]

    # Kiracılar (home_ownership == 1) günlük kira öder
    renters = agents.home_ownership == 1
    daily_rent = (TUIK_2024["min_wage_monthly"] * 0.40 / 30) / price_level
    agents.savings[renters] -= daily_rent
    agents.savings[agents.savings < 0] = 0

    # Çocuk sayısına göre günlük asgari yaşam maliyeti artar
    base_min_daily = (TUIK_2024["min_wage_monthly"] / price_level / 30)
    adjusted_min_daily = base_min_daily * (1 + agents.children_count * 0.15)

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
    # Günlük harcama kapasitesi: tasarrufun %1.5'i, max asgari ücret seviyesi (çocuk eklenmiş hali)
    max_daily = adjusted_min_daily[unemployed_mask] * (0.5 + agents.income_percentile[unemployed_mask])
    savings_draw = agents.savings[unemployed_mask] * 0.015
    agents.consumption[unemployed_mask] = np.minimum(savings_draw, max_daily)

    # Tasarruf erir
    agents.savings[unemployed_mask] = np.maximum(
        0, agents.savings[unemployed_mask] - agents.consumption[unemployed_mask]
    )

    # Birikimi sıfırlanan işsizler: geçim asgari düzeyi (yine çocuğa endeksli)
    broke_mask = unemployed_mask & (agents.savings <= 0)
    agents.consumption[broke_mask] = adjusted_min_daily[broke_mask] * 0.2

    # --- İSTİHDAM DİNAMİĞİ ---
    job_changed = False

    # Çalışanlar: küçük iş kaybı olasılığı (%0.05/gün ≈ yıllık %17 churn)
    job_loss = employed_mask & (rng.random(len(agents.employed)) < 0.0005)
    if job_loss.any():
        agents.employed[job_loss] = False
        agents.income[job_loss] = 0.0
        job_changed = True

    # İşsizler: iş bulma olasılığı (birikimi bitenler çok daha zor bulur)
    reemploy_prob = np.where(broke_mask, 0.0005, 0.003)
    found_job = unemployed_mask & (rng.random(len(agents.employed)) < reemploy_prob)
    if found_job.any():
        agents.employed[found_job] = True
        # Eğitim ve mesleğe göre başlangıç maaşı belirlenir (önceden sadece asgari ücretti)
        wage_mult = 1.0 + agents.education_level[found_job] * 0.20 + (agents.profession[found_job] == 0) * 0.30
        agents.income[found_job] = TUIK_2024["min_wage_monthly"] * wage_mult
        job_changed = True

    if job_changed:
        _recalculate_percentiles(agents)


def _recalculate_percentiles(agents: AgentPopulation) -> None:
    """Tüm ajanların gelir sıralamasını (percentile) yeniden hesaplar."""
    rank = np.argsort(np.argsort(agents.income))
    agents.income_percentile[:] = rank / (len(agents.income) - 1)


def _apply_min_wage(agents: AgentPopulation, increase_rate: float) -> None:
    from .calibration import TUIK_2024
    threshold = TUIK_2024["min_wage_monthly"] * 1.5
    low_income_mask = agents.income <= threshold
    agents.income[low_income_mask] *= (1 + increase_rate)
    _recalculate_percentiles(agents)


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
