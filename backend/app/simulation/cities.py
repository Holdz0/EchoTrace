"""
Türkiye il bazlı demografik profiller — TÜİK 2024 yaklaşımı.

Her şehir için:
  population_share : Türkiye nüfusundaki payı
  income_mult      : Ulusal ortalamaya göre gelir çarpanı
  base_unemployment: Başlangıç işsizlik oranı
  youth_share      : 18-30 yaş arası oranı (işgücündeki genç payı)
  age_mean         : Çalışma çağı nüfusunun ortalama yaşı
  age_std          : Yaş standart sapması
"""

CITIES: list[dict] = [
    {
        "id": 0,
        "name": "İstanbul",
        "population_share": 0.185,
        "income_mult": 1.35,
        "base_unemployment": 0.085,
        "youth_share": 0.32,
        "age_mean": 36,
        "age_std": 11,
    },
    {
        "id": 1,
        "name": "Ankara",
        "population_share": 0.065,
        "income_mult": 1.25,
        "base_unemployment": 0.070,
        "youth_share": 0.30,
        "age_mean": 37,
        "age_std": 11,
    },
    {
        "id": 2,
        "name": "İzmir",
        "population_share": 0.053,
        "income_mult": 1.20,
        "base_unemployment": 0.090,
        "youth_share": 0.29,
        "age_mean": 38,
        "age_std": 11,
    },
    {
        "id": 3,
        "name": "Bursa",
        "population_share": 0.036,
        "income_mult": 1.10,
        "base_unemployment": 0.080,
        "youth_share": 0.31,
        "age_mean": 37,
        "age_std": 11,
    },
    {
        "id": 4,
        "name": "Antalya",
        "population_share": 0.029,
        "income_mult": 1.05,
        "base_unemployment": 0.095,
        "youth_share": 0.30,
        "age_mean": 37,
        "age_std": 11,
    },
    {
        "id": 5,
        "name": "Konya",
        "population_share": 0.026,
        "income_mult": 0.85,
        "base_unemployment": 0.130,  # genç işsizliği yüksek
        "youth_share": 0.38,          # genç nüfus fazla
        "age_mean": 33,
        "age_std": 12,
    },
    {
        "id": 6,
        "name": "Adana",
        "population_share": 0.022,
        "income_mult": 0.90,
        "base_unemployment": 0.145,
        "youth_share": 0.36,
        "age_mean": 33,
        "age_std": 12,
    },
    {
        "id": 7,
        "name": "Şanlıurfa",
        "population_share": 0.022,
        "income_mult": 0.65,
        "base_unemployment": 0.220,   # en yüksek işsizlik
        "youth_share": 0.45,           # en genç nüfus
        "age_mean": 28,
        "age_std": 10,
    },
    {
        "id": 8,
        "name": "Gaziantep",
        "population_share": 0.022,
        "income_mult": 0.95,
        "base_unemployment": 0.110,
        "youth_share": 0.37,
        "age_mean": 32,
        "age_std": 11,
    },
    {
        "id": 9,
        "name": "Kocaeli",
        "population_share": 0.021,
        "income_mult": 1.20,
        "base_unemployment": 0.065,   # sanayi şehri, düşük işsizlik
        "youth_share": 0.31,
        "age_mean": 37,
        "age_std": 11,
    },
    {
        "id": 10,
        "name": "Diğer",
        "population_share": 0.469,    # kalan tüm iller
        "income_mult": 0.90,
        "base_unemployment": 0.105,
        "youth_share": 0.33,
        "age_mean": 35,
        "age_std": 12,
    },
]

CITY_IDS   = [c["id"] for c in CITIES]
CITY_NAMES = [c["name"] for c in CITIES]
CITY_BY_ID = {c["id"]: c for c in CITIES}

CITY_WEIGHTS = [c["population_share"] for c in CITIES]
