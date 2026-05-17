import numpy as np
from dataclasses import dataclass
from .provinces import PROVINCES, PROVINCE_WEIGHTS, PROVINCE_BY_IDX, PROVINCE_COUNT

N_AGENTS = 10_000
SEED = 42


@dataclass
class AgentPopulation:
    age: np.ndarray
    income: np.ndarray
    income_percentile: np.ndarray
    profession: np.ndarray
    savings: np.ndarray
    consumption: np.ndarray
    employed: np.ndarray
    price_sensitivity: np.ndarray
    city: np.ndarray              # integer → province index (0-80)
    can_work: np.ndarray
    gender: np.ndarray
    education_level: np.ndarray
    children_count: np.ndarray
    home_ownership: np.ndarray
    informal_employment: np.ndarray
    economic_sector: np.ndarray
    debt: np.ndarray


def create_population(seed: int = SEED) -> AgentPopulation:
    rng = np.random.default_rng(seed)

    # 1. Province ataması — nüfus ağırlıklarına göre (81 il)
    province_ids = np.arange(PROVINCE_COUNT)
    probs = np.array(PROVINCE_WEIGHTS, dtype=np.float64)
    probs /= probs.sum()
    city = rng.choice(province_ids, size=N_AGENTS, p=probs).astype(np.int8)

    # 2. Her ajan için kalibrasyondan yaş, gelir_çarpanı, işsizlik çek
    age_means  = np.array([PROVINCE_BY_IDX[c]["age_mean"]  for c in city])
    age_stds   = np.array([PROVINCE_BY_IDX[c]["age_std"]   for c in city])
    inc_mults  = np.array([PROVINCE_BY_IDX[c]["income_mult"] for c in city])
    base_unemp = np.array([PROVINCE_BY_IDX[c]["unemployment_rate"] for c in city])

    # 3. Yaş
    age = (rng.normal(0, 1, N_AGENTS) * age_stds + age_means).clip(18, 65).astype(np.int32)

    # 4. Gelir percentile + gelir
    income_percentile = rng.uniform(0, 1, N_AGENTS)
    income = _sample_income(income_percentile, inc_mults, rng)
    rank = np.argsort(np.argsort(income))
    income_percentile = rank / (N_AGENTS - 1)

    # 5. Meslek
    profession_probs = [0.20, 0.35, 0.15, 0.22, 0.08]
    profession = rng.choice(5, size=N_AGENTS, p=profession_probs).astype(np.int8)

    # 6. İstihdam — province bazlı
    employed = _sample_employment(city, profession, base_unemp, rng)

    # 7. Tasarruf & tüketim
    savings_months = 1.5 + income_percentile * 4.5
    savings = income * savings_months
    mpc = 0.85 - 0.25 * income_percentile
    consumption = income * mpc / 30
    price_sensitivity = 0.3 + 0.4 * (1 - income_percentile)

    # 8. Sosyo-ekonomik parametreler — kalibrasyondan
    gender          = rng.integers(0, 2, N_AGENTS, dtype=np.int8)
    education_level = _sample_education(city, rng)
    children_count  = _sample_children(city, education_level, income_percentile, rng)
    home_ownership  = _sample_home_ownership(city, income_percentile, age, rng)
    economic_sector = _sample_economic_sector(city, profession, rng)
    informal_employment = _sample_informal_employment(city, employed, education_level, economic_sector, rng)
    debt = _sample_debt(income, income_percentile, rng)

    return AgentPopulation(
        age=age, income=income, income_percentile=income_percentile,
        profession=profession, savings=savings, consumption=consumption,
        employed=employed, price_sensitivity=price_sensitivity,
        city=city, can_work=np.ones(N_AGENTS, dtype=np.bool_),
        gender=gender, education_level=education_level,
        children_count=children_count, home_ownership=home_ownership,
        informal_employment=informal_employment, economic_sector=economic_sector,
        debt=debt,
    )


def _sample_income(percentile: np.ndarray, inc_mults: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    bands = [
        (0.00, 0.20,  7_000,  2_000),
        (0.20, 0.40, 13_000,  3_000),
        (0.40, 0.60, 22_000,  5_000),
        (0.60, 0.80, 38_000,  9_000),
        (0.80, 1.00, 65_000, 20_000),
    ]
    income = np.zeros(len(percentile))
    for lo, hi, mean, std in bands:
        mask = (percentile >= lo) & (percentile < hi)
        n = mask.sum()
        if n > 0:
            base = rng.normal(mean, std, n).clip(4_000, 200_000)
            income[mask] = base * inc_mults[mask]
    return income.clip(4_000, 250_000)


def _sample_employment(city: np.ndarray, profession: np.ndarray,
                       base_unemp: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    employed = (profession != 4).astype(np.bool_)
    extra_unemp_prob = np.maximum(0, base_unemp - 0.085)
    extra_unemployed = (rng.random(len(city)) < extra_unemp_prob) & employed
    employed[extra_unemployed] = False
    return employed


def _sample_education(city: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """Province kalibrasyonundaki education_dist kullanır."""
    edu = np.zeros(len(city), dtype=np.int8)
    r   = rng.random(len(city))
    for prov_idx in range(PROVINCE_COUNT):
        mask = city == prov_idx
        if not mask.any():
            continue
        d = PROVINCE_BY_IDX[prov_idx]["education_dist"]
        p0 = d["primary_or_less"]
        p1 = d["middle_school"]
        p2 = d["high_school"]
        rv = r[mask]
        s  = np.zeros(mask.sum(), dtype=np.int8)  # ilkokul
        s[rv >= p0]           = 1                  # ortaokul
        s[rv >= p0 + p1]      = 2                  # lise
        s[rv >= p0 + p1 + p2] = 3                  # üniversite
        edu[mask] = s
    return edu


def _sample_children(city: np.ndarray, edu: np.ndarray,
                     inc_perc: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """Province kalibrasyonundaki children_mean kullanır."""
    base_lambda = np.array([PROVINCE_BY_IDX[int(c)]["children_mean"] for c in city], dtype=np.float64)
    edu_effect  = edu * 0.30
    inc_effect  = inc_perc * 0.60
    final_lambda = np.maximum(0.1, base_lambda - edu_effect - inc_effect)
    return rng.poisson(final_lambda).astype(np.int8)


def _sample_home_ownership(city: np.ndarray, inc_perc: np.ndarray,
                           age: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """Province kalibrasyonundaki home_ownership_dist kullanır."""
    ownership = np.ones(len(city), dtype=np.int8)  # kiracı default
    r = rng.random(len(city))
    for prov_idx in range(PROVINCE_COUNT):
        mask = city == prov_idx
        if not mask.any():
            continue
        ho  = PROVINCE_BY_IDX[prov_idx]["home_ownership_dist"]
        rv  = r[mask]
        ag  = age[mask]
        ip  = inc_perc[mask]
        s   = np.ones(mask.sum(), dtype=np.int8)  # kiracı

        # Gençler ve düşük gelirli → aileyle
        fam_prob = ho["with_family"] * 1.5
        fam      = (ag <= 25) & (ip < 0.4) & (rv < fam_prob)
        s[fam]   = 2

        # Yaşlı + yüksek gelirli → ev sahibi
        owner_prob = ho["owner"] * (0.5 + ip * 0.5)
        own        = (~fam) & (rv < owner_prob)
        s[own]     = 0

        ownership[mask] = s
    return ownership


def _sample_economic_sector(city: np.ndarray, prof: np.ndarray,
                             rng: np.random.Generator) -> np.ndarray:
    """Province kalibrasyonundaki sector_weights kullanır."""
    sector = np.full(len(city), 3, dtype=np.int8)  # hizmet default
    r = rng.random(len(city))
    for prov_idx in range(PROVINCE_COUNT):
        mask = city == prov_idx
        if not mask.any():
            continue
        sw   = PROVINCE_BY_IDX[prov_idx]["sector_weights"]
        a    = sw["agriculture"]
        i    = sw["industry"]
        c    = sw["construction"]
        rv   = r[mask]
        s    = np.full(mask.sum(), 3, dtype=np.int8)
        s[rv < a]                   = 0  # tarım
        s[(rv >= a) & (rv < a+i)]   = 1  # sanayi
        s[(rv >= a+i) & (rv < a+i+c)] = 2  # inşaat
        sector[mask] = s
    sector[prof == 0] = 3  # memurlar her zaman hizmet
    return sector


def _sample_informal_employment(city: np.ndarray, employed: np.ndarray,
                                 edu: np.ndarray, sector: np.ndarray,
                                 rng: np.random.Generator) -> np.ndarray:
    """Province informal_employment_rate + sektörel düzeltme."""
    informal = np.zeros(len(city), dtype=np.bool_)
    base_rate = np.array([PROVINCE_BY_IDX[int(c)]["informal_employment_rate"] for c in city])
    # Eğitim etkisi
    edu_adj = np.where(edu == 3, -0.15, np.where(edu == 0, +0.15, 0.0))
    final_rate = np.clip(base_rate + edu_adj, 0, 0.95)
    is_informal = employed & (rng.random(len(city)) < final_rate)
    informal[is_informal] = True
    return informal


def _sample_debt(income: np.ndarray, inc_perc: np.ndarray,
                  rng: np.random.Generator) -> np.ndarray:
    debt_mult = 3.0 - inc_perc * 2.5
    debt = income * debt_mult * rng.lognormal(0, 0.5, len(income))
    no_debt = rng.random(len(income)) < 0.20
    debt[no_debt] = 0.0
    return debt
