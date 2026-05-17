import numpy as np
from typing import Generator

from .agents import AgentPopulation, create_population
from .metrics import compute_daily_metrics
from .policy_engine import apply_effects
from .calibration import TUIK_2024
from .provinces import PROVINCE_BY_IDX, PROVINCE_COUNT

# Precomputed per-province reemployment rate calibrated to equilibrium unemployment.
# Formula: reemploy = job_loss_prob * (1 - u) / u  where job_loss_prob = 0.0005
_PROVINCE_REEMPLOY = np.array([
    0.0005 * (1.0 - PROVINCE_BY_IDX[i]["unemployment_rate"]) / PROVINCE_BY_IDX[i]["unemployment_rate"]
    for i in range(PROVINCE_COUNT)
])

# Şehre özgü denge işsizlik oranlarına göre kalibre edilmiş yeniden istihdam oranları.
# Formül: reemploy = job_loss * (1 - u) / u  →  denge unemployment ≈ u
# job_loss_rate = 0.0005/gün baz alınarak hesaplandı (TÜİK 2024)
_CITY_REEMPLOY = np.array([
    0.00538,  # 0  İstanbul  %8.5
    0.00664,  # 1  Ankara    %7.0
    0.00506,  # 2  İzmir     %9.0
    0.00575,  # 3  Bursa     %8.0
    0.00476,  # 4  Antalya   %9.5
    0.00335,  # 5  Konya     %13.0
    0.00295,  # 6  Adana     %14.5
    0.00177,  # 7  Şanlıurfa %22.0
    0.00405,  # 8  Gaziantep %11.0
    0.00719,  # 9  Kocaeli   %6.5
    0.00426,  # 10 Diğer     %10.5
])


def run_simulation(
    effects: list[dict] | None = None,
    inflation_shock: float = 0.0,
    vat_food_rate: float | None = None,
    duration_days: int = 365,
    seed: int = 42,
    dynamics: dict | None = None,
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
        _step(agents, price_level, effective_vat, rng, dynamics)
        results.append(compute_daily_metrics(agents, baseline_consumption, effective_vat, day))

    return {"results": results, "effect_log": effect_log}


def run_simulation_chunked(
    effects: list[dict] | None = None,
    inflation_shock: float = 0.0,
    vat_food_rate: float | None = None,
    duration_days: int = 365,
    chunk_size: int = 10,
    seed: int = 42,
    dynamics: dict | None = None,
) -> Generator[list[dict], None, None]:
    agents = create_population(seed)
    baseline_consumption = agents.consumption.copy()

    effective_vat = vat_food_rate if vat_food_rate is not None else TUIK_2024["vat_food_rate"]
    daily_inflation = (TUIK_2024["inflation_annual"] + inflation_shock) / 365

    effect_log = []
    if effects:
        effect_log = apply_effects(agents, effects)

    rng = np.random.default_rng(seed + 99)
    price_level = 1.0
    chunk: list[dict] = []

    for day in range(1, duration_days + 1):
        price_level *= (1 + daily_inflation)
        _step(agents, price_level, effective_vat, rng, dynamics)
        chunk.append(compute_daily_metrics(agents, baseline_consumption, effective_vat, day))

        if len(chunk) == chunk_size:
            yield chunk
            chunk = []

    if chunk:
        yield chunk


def _step(agents: AgentPopulation, price_level: float, vat_rate: float, rng: np.random.Generator, dynamics: dict | None = None) -> None:
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

    N = len(agents.age)
    job_loss_prob = np.full(N, 0.0005)

    reemploy_base = _PROVINCE_REEMPLOY[agents.city.astype(np.int32)]

    if dynamics:
        for city_str, rate in dynamics.get("job_loss_rate_by_city", {}).items():
            job_loss_prob[agents.city == int(city_str)] = float(rate)
        for city_str, rate in dynamics.get("reemploy_rate_by_city", {}).items():
            reemploy_base[agents.city == int(city_str)] = float(rate)

    # Çalışanlar: iş kaybı (varsayılan %0.05/gün, dinamik override mümkün)
    job_loss = employed_mask & (rng.random(N) < job_loss_prob)
    agents.employed[job_loss] = False
    agents.income[job_loss] = 0.0

    # İşsizler: iş bulma — can_work=False olanlar iş bulamaz; broke olanlar çok düşük ihtimal
    reemploy_prob = np.where(broke_mask, 0.0005, reemploy_base)
    found_job = unemployed_mask & agents.can_work & (rng.random(N) < reemploy_prob)
    agents.employed[found_job] = True
    agents.income[found_job] = TUIK_2024["min_wage_monthly"] * (
        0.9 + 0.4 * agents.income_percentile[found_job]
    )

    # --- GÖÇ DİNAMİĞİ ---
    if dynamics:
        for m in dynamics.get("migration", []):
            from_c = int(m["from_city"])
            to_c   = int(m["to_city"])
            rate   = float(m["daily_rate"])
            from_mask = unemployed_mask & (agents.city == from_c)
            migrate = from_mask & (rng.random(N) < rate)
            agents.city[migrate] = to_c
            # Coğrafi yasak: ajanlar yasak bölgeden çıkınca yeniden çalışabilir
            agents.can_work[migrate] = True

    _apply_dynamic_migration(agents, rng, broke_mask)

def _apply_dynamic_migration(agents: AgentPopulation, rng: np.random.Generator, broke_mask: np.ndarray) -> None:
    # Province indices = plate - 1:
    #   İstanbul=33, İzmir=34, Kocaeli=40, Bursa=15, Konya=41, Şanlıurfa=62, Adana=0
    N = len(agents.city)
    mig_chance = rng.random(N)
    can_migrate = broke_mask & (mig_chance < 0.002)

    # Tarım sektörü → tarım illeri; Şanlıurfa dahil edilmiyor (düşük reemploy oranı)
    # Konya=41, Gaziantep=26, Samsun=54
    agri_mask = can_migrate & (agents.economic_sector == 0)
    if agri_mask.any():
        agents.city[agri_mask] = rng.choice([41, 26, 54], size=agri_mask.sum())

    # Sanayi/hizmet → büyük sanayi merkezleri (İstanbul=33, Kocaeli=40, Bursa=15)
    ind_srv_mask = can_migrate & ((agents.economic_sector == 1) | (agents.economic_sector == 3))
    if ind_srv_mask.any():
        agents.city[ind_srv_mask] = rng.choice([33, 40, 15], size=ind_srv_mask.sum())

    # İstanbul/İzmir'deki düşük gelirli kiracılar → çevre iller (Sakarya=53, Bursa=15, Tekirdağ=58)
    poor_renters = (agents.city == 33) | (agents.city == 34)
    poor_renters &= (agents.home_ownership == 1) & (agents.income_percentile < 0.2)
    poor_renters &= (mig_chance < 0.001)
    if poor_renters.any():
        agents.city[poor_renters] = rng.choice([53, 15, 58], size=poor_renters.sum())

    young_edu_agri = (agents.age < 30) & (agents.education_level >= 2) & (agents.economic_sector == 0)
    change_sector = young_edu_agri & (rng.random(N) < 0.005)
    if change_sector.any():
        agents.economic_sector[change_sector] = rng.choice([1, 3], size=change_sector.sum())
        agents.employed[change_sector] = False
        agents.income[change_sector] = 0.0

    low_income_formal = agents.employed & (~agents.informal_employment) & (agents.income_percentile < 0.3)
    go_informal = low_income_formal & (rng.random(N) < 0.0005)
    if go_informal.any():
        agents.informal_employment[go_informal] = True


