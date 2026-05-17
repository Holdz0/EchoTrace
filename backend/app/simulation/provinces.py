"""
Türkiye 81 il demografik profilleri.
Kaynak: backend/app/data/provinces_calibration.json
"""
import json, os

_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "provinces_calibration.json")

with open(_PATH, encoding="utf-8") as _f:
    PROVINCES: list[dict] = json.load(_f)

_total_pop       = sum(p["population"] for p in PROVINCES)
PROVINCE_COUNT   = len(PROVINCES)                                          # 81
PROVINCE_NAMES   = [p["name"]   for p in PROVINCES]
PROVINCE_WEIGHTS = [p["population"] / _total_pop for p in PROVINCES]
PROVINCE_BY_IDX  = {i: p for i, p in enumerate(PROVINCES)}
PLATE_TO_IDX     = {p["plate"]: i for i, p in enumerate(PROVINCES)}
NAME_TO_IDX      = {p["name"]:  i for i, p in enumerate(PROVINCES)}

# Backward-compat aliases (metrics.py, engine.py hâlâ CITY_NAMES kullanıyor)
CITY_NAMES  = PROVINCE_NAMES
CITY_BY_ID  = PROVINCE_BY_IDX
CITY_WEIGHTS = PROVINCE_WEIGHTS
