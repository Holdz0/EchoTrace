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
    gender: np.ndarray            # 0: Erkek, 1: Kadın
    education_level: np.ndarray   # 0: İlkokul/Altı, 1: Ortaokul, 2: Lise, 3: Üniversite
    children_count: np.ndarray    # integer
    home_ownership: np.ndarray    # 0: Ev Sahibi, 1: Kiracı, 2: Aileyle Yaşayan
    informal_employment: np.ndarray # boolean (Kayıt dışı istihdam)
    economic_sector: np.ndarray   # 0: Tarım, 1: Sanayi, 2: İnşaat, 3: Hizmet
    debt: np.ndarray              # float (TL cinsinden tüketici/kredi borcu)


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
    
    # Şehir çarpanlarından sonra gerçek yüzdeliği (percentile) düzelt
    rank = np.argsort(np.argsort(income))
    income_percentile = rank / (N_AGENTS - 1)

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

    # 7. Yeni Sosyo-Ekonomik Parametreler
    gender = rng.integers(0, 2, size=N_AGENTS, dtype=np.int8)
    education_level = rng.choice(4, size=N_AGENTS, p=[0.30, 0.25, 0.25, 0.20]).astype(np.int8)
    
    # Kullanıcının talebine göre: Doğu illerinde çocuk sayısı yüksek, gelir ve eğitim arttıkça düşer
    children_count = _sample_children(city, education_level, income_percentile, rng)
    
    home_ownership = _sample_home_ownership(income_percentile, age, rng)
    economic_sector = _sample_economic_sector(city, profession, rng)
    informal_employment = _sample_informal_employment(employed, education_level, economic_sector, rng)
    debt = _sample_debt(income, income_percentile, rng)

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
        gender=gender,
        education_level=education_level,
        children_count=children_count,
        home_ownership=home_ownership,
        informal_employment=informal_employment,
        economic_sector=economic_sector,
        debt=debt,
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


def _sample_children(city: np.ndarray, edu: np.ndarray, inc_perc: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """Doğu illerinde baz çocuk oranı yüksektir. Ancak eğitim ve gelir arttıkça bu oran düşer."""
    base_lambda = np.ones(len(city)) * 1.5
    
    # Şanlıurfa (7), Gaziantep (8), Adana (6), Konya (5) gibi yerlerde temel çocuk sayısını artırıyoruz.
    base_lambda[city == 7] = 3.8
    base_lambda[city == 8] = 3.0
    base_lambda[city == 6] = 2.4
    base_lambda[city == 5] = 2.3
    
    # İzmir (2), İstanbul (0) gibi yerlerde düşürüyoruz.
    base_lambda[city == 2] = 1.1
    base_lambda[city == 0] = 1.2

    # Eğitim arttıkça çocuk oranı ciddi şekilde düşer (0=İlkokul -> 0 etki, 3=Üniversite -> -0.9 etki)
    edu_effect = edu * 0.30
    
    # Gelir seviyesi arttıkça çocuk oranı düşer (inc_perc=1.0 -> -0.6 etki)
    inc_effect = inc_perc * 0.60
    
    # Lambda hiçbir zaman 0.1'in altına düşmesin
    final_lambda = np.maximum(0.1, base_lambda - edu_effect - inc_effect)
    
    return rng.poisson(final_lambda).astype(np.int8)


def _sample_home_ownership(inc_perc: np.ndarray, age: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    # 0: Ev Sahibi, 1: Kiracı, 2: Aileyle Yaşayan
    ownership = np.ones(len(inc_perc), dtype=np.int8)  # Herkes varsayılan kiracı
    
    # Gençler (25 yaş altı) yüksek ihtimalle aileyle yaşar
    youth_mask = age <= 25
    ownership[youth_mask & (rng.random(len(inc_perc)) < 0.60)] = 2
    
    # Yaş ve gelir arttıkça ev sahibi olma ihtimali artar
    # 35 yaş üstü ve gelir yüzdeliği > %50 olanlarda ihtimal belirgin şekilde yüksektir
    owner_prob = inc_perc * 0.5 + (age > 35) * 0.3
    is_owner = (rng.random(len(inc_perc)) < owner_prob) & (ownership != 2)
    ownership[is_owner] = 0
    
    return ownership


def _sample_economic_sector(city: np.ndarray, prof: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    # 0: Tarım, 1: Sanayi, 2: İnşaat, 3: Hizmet
    sector = np.full(len(city), 3, dtype=np.int8)  # Varsayılan hizmet sektörü
    
    # Kocaeli (9) ve Bursa (3) sanayi ağırlıklıdır
    is_industry_city = (city == 9) | (city == 3)
    sector[is_industry_city & (rng.random(len(city)) < 0.45)] = 1
    
    # Konya (5), Şanlıurfa (7) tarım ağırlıklıdır
    is_agri_city = (city == 5) | (city == 7)
    sector[is_agri_city & (rng.random(len(city)) < 0.35)] = 0
    
    # Memurlar (prof==0) genelde kamudadır, hizmet sektörü sayılır
    sector[prof == 0] = 3
    
    # Kalan kesime ülke geneli oranlarında sanayi ve inşaat dağıtılır
    rand_vals = rng.random(len(city))
    can_change = (sector == 3) & (prof != 0)
    sector[can_change & (rand_vals < 0.18)] = 1        # %18 Sanayi
    sector[can_change & (rand_vals >= 0.18) & (rand_vals < 0.25)] = 2  # %7 İnşaat
    
    return sector


def _sample_informal_employment(employed: np.ndarray, edu: np.ndarray, sector: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    informal = np.zeros(len(employed), dtype=np.bool_)
    
    prob = np.zeros(len(employed))
    # Sektörel etki: Tarım ve İnşaatta kayıt dışılık çok yüksektir
    prob[sector == 0] += 0.50
    prob[sector == 2] += 0.30
    
    # Eğitim etkisi: İlkokul mezunlarında yüksek, üniversitelilerde düşüktür
    prob[edu == 0] += 0.25
    prob[edu == 3] -= 0.20
    
    # Sadece çalışanlar kayıt dışı olabilir
    is_informal = employed & (rng.random(len(employed)) < prob)
    informal[is_informal] = True
    
    return informal


def _sample_debt(income: np.ndarray, inc_perc: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    # Düşük gelir grubunda borçluluk oranı gelire kıyasla daha fazladır (2-3 katı).
    # Yüksek gelirlilerde bu çarpan 0.5'e kadar düşer.
    debt_mult = 3.0 - (inc_perc * 2.5)
    debt = income * debt_mult * rng.lognormal(mean=0, sigma=0.5, size=len(income))
    
    # Toplumun %20'sinin hiç tüketici veya kredi kartı borcu yoktur
    no_debt = rng.random(len(income)) < 0.20
    debt[no_debt] = 0.0
    
    return debt
