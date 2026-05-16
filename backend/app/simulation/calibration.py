"""
TÜİK ve TCMB kaynaklı makroekonomik başlangıç parametreleri.
Gerçek veri yerine 2024 yaklaşık değerler kullanılmaktadır.
"""

TUIK_2024 = {
    "unemployment_rate": 0.085,
    "inflation_annual": 0.65,
    "gdp_per_capita_tl": 450_000,
    "min_wage_monthly": 17_002,
    "avg_wage_monthly": 28_000,
    "gini_coefficient": 0.415,
    "household_savings_rate": 0.12,
    "food_cpi_weight": 0.248,
    "vat_standard_rate": 0.20,
    "vat_food_rate": 0.10,
}

INCOME_DECILES_TL = [
    5_500,
    8_000,
    11_000,
    14_500,
    18_500,
    24_000,
    31_000,
    42_000,
    60_000,
    110_000,
]

PROFESSION_LABELS = {
    0: "Memur",
    1: "İşçi",
    2: "Esnaf",
    3: "Emekli",
    4: "İşsiz",
}

PRICE_ELASTICITY = {
    "food": -0.35,
    "housing": -0.15,
    "transport": -0.55,
    "clothing": -0.80,
    "health": -0.20,
}

CONSUMPTION_BASKET_WEIGHTS = {
    "food": 0.248,
    "housing": 0.195,
    "transport": 0.145,
    "clothing": 0.065,
    "health": 0.045,
    "other": 0.302,
}
