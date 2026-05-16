import numpy as np
from dataclasses import dataclass
from .cities import CITIES, CITY_WEIGHTS, CITY_BY_ID

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
    city: np.ndarray              # integer → cities.CITY_BY_ID


def create_population(seed: int = SEED) -> AgentPopulation:
    rng = np.random.default_rng(seed)

    # 1. Şehir ataması — nüfus ağırlıklarına göre
    city_ids = np.array([c["id"] for c in CITIES])
    city_probs = np.array(CITY_WEIGHTS)
    city_probs /= city_probs.sum()
    city = rng.choice(city_ids, size=N_AGENTS, p=city_probs).astype(np.int8)

    # 2. Şehre özgü yaş dağılımı
    age = _sample_age_by_city(city, rng)

    # 3. Şehre özgü gelir dağılımı (ulusal dilimlere şehir çarpanı uygulanır)
    income_percentile = rng.uniform(0, 1, size=N_AGENTS)
    income = _sample_income(income_percentile, city, rng)

    # 4. Meslek dağılımı
    profession_probs = [0.20, 0.35, 0.15, 0.22, 0.08]
    profession = rng.choice(5, size=N_AGENTS, p=profession_probs).astype(np.int8)

    # 5. İstihdam: şehre özgü başlangıç işsizliği
    employed = _sample_employment(city, profession, rng)

    # 6. Tasarruf ve başlangıç tüketim
    savings_months = 1.5 + income_percentile * 4.5
    savings = income * savings_months

    mpc = 0.85 - 0.25 * income_percentile
    consumption = income * mpc / 30

    price_sensitivity = 0.3 + 0.4 * (1 - income_percentile)

    return AgentPopulation(
        age=age,
        income=income,
        income_percentile=income_percentile,
        profession=profession,
        savings=savings,
        consumption=consumption,
        employed=employed,
        price_sensitivity=price_sensitivity,
        city=city,
    )


def _sample_age_by_city(city: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    age = np.zeros(len(city), dtype=np.int32)
    for c in CITIES:
        mask = city == c["id"]
        n = mask.sum()
        if n == 0:
            continue
        age[mask] = rng.normal(c["age_mean"], c["age_std"], size=n).clip(18, 65).astype(np.int32)
    return age


def _sample_income(
    percentile: np.ndarray,
    city: np.ndarray,
    rng: np.random.Generator,
) -> np.ndarray:
    """Beş dilimli parçalı normal + şehir gelir çarpanı."""
    bands = [
        (0.00, 0.20, 7_000,  2_000),
        (0.20, 0.40, 13_000, 3_000),
        (0.40, 0.60, 22_000, 5_000),
        (0.60, 0.80, 38_000, 9_000),
        (0.80, 1.00, 65_000, 20_000),
    ]
    income = np.zeros(len(percentile))

    # Şehre göre gelir çarpanı dizisi
    city_mult = np.array([CITY_BY_ID[c]["income_mult"] for c in city])

    for lo, hi, mean, std in bands:
        mask = (percentile >= lo) & (percentile < hi)
        n = mask.sum()
        if n > 0:
            base = rng.normal(mean, std, size=n).clip(4_000, 200_000)
            income[mask] = base * city_mult[mask]

    return income.clip(4_000, 250_000)


def _sample_employment(
    city: np.ndarray,
    profession: np.ndarray,
    rng: np.random.Generator,
) -> np.ndarray:
    """Şehre özgü işsizlik oranına göre istihdam durumu."""
    # Meslek=4 (işsiz) her zaman işsiz
    employed = (profession != 4).astype(np.bool_)

    # Şehre göre ek işsizlik şoku
    city_unemp = np.array([CITY_BY_ID[c]["base_unemployment"] for c in city])
    base_unemp = 0.085  # ulusal başlangıç
    extra_unemp_prob = np.maximum(0, city_unemp - base_unemp)

    extra_unemployed = (rng.random(len(city)) < extra_unemp_prob) & employed
    employed[extra_unemployed] = False

    return employed
