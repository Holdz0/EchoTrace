"""
Türkiye 81 il kalibrasyonu.
Kaynak: TÜİK ADNKS 2024, SGK 2023, Gelir ve Yaşam Koşulları Araştırması 2024,
        NUTS2 bölge istatistikleri.
"""
import json, os

# ── NUTS2 bölge profilleri ─────────────────────────────────────────────────────
NUTS2 = {
    "TR10": dict(income_mult=1.38, unemp=0.087, univ=0.38, agri=0.01, ind=0.23, cons=0.07, svc=0.69, informal=0.19, debt=2.5, owner=0.40, renter=0.50, fam=0.10, age_mean=33.2, age_std=11.0, youth=0.32, children=1.3, female=0.499),
    "TR21": dict(income_mult=1.18, unemp=0.095, univ=0.28, agri=0.12, ind=0.28, cons=0.06, svc=0.54, informal=0.30, debt=2.0, owner=0.55, renter=0.35, fam=0.10, age_mean=37.5, age_std=11.5, youth=0.29, children=1.6, female=0.500),
    "TR22": dict(income_mult=1.02, unemp=0.092, univ=0.23, agri=0.20, ind=0.22, cons=0.06, svc=0.52, informal=0.35, debt=1.7, owner=0.60, renter=0.28, fam=0.12, age_mean=38.5, age_std=11.5, youth=0.28, children=1.7, female=0.500),
    "TR31": dict(income_mult=1.24, unemp=0.091, univ=0.35, agri=0.05, ind=0.22, cons=0.07, svc=0.66, informal=0.22, debt=2.2, owner=0.45, renter=0.44, fam=0.11, age_mean=37.8, age_std=11.0, youth=0.30, children=1.4, female=0.501),
    "TR32": dict(income_mult=1.07, unemp=0.098, univ=0.24, agri=0.18, ind=0.20, cons=0.06, svc=0.56, informal=0.34, debt=1.8, owner=0.58, renter=0.31, fam=0.11, age_mean=39.0, age_std=11.5, youth=0.28, children=1.6, female=0.501),
    "TR33": dict(income_mult=0.93, unemp=0.102, univ=0.19, agri=0.22, ind=0.26, cons=0.06, svc=0.46, informal=0.38, debt=1.5, owner=0.62, renter=0.26, fam=0.12, age_mean=38.5, age_std=11.5, youth=0.29, children=1.8, female=0.500),
    "TR41": dict(income_mult=1.14, unemp=0.082, univ=0.27, agri=0.05, ind=0.38, cons=0.07, svc=0.50, informal=0.24, debt=2.0, owner=0.52, renter=0.37, fam=0.11, age_mean=37.0, age_std=11.0, youth=0.31, children=1.6, female=0.499),
    "TR42": dict(income_mult=1.20, unemp=0.068, univ=0.26, agri=0.06, ind=0.40, cons=0.07, svc=0.47, informal=0.22, debt=2.1, owner=0.53, renter=0.36, fam=0.11, age_mean=36.5, age_std=11.0, youth=0.31, children=1.6, female=0.499),
    "TR51": dict(income_mult=1.28, unemp=0.072, univ=0.38, agri=0.02, ind=0.18, cons=0.07, svc=0.73, informal=0.18, debt=2.2, owner=0.48, renter=0.41, fam=0.11, age_mean=37.2, age_std=11.0, youth=0.30, children=1.4, female=0.500),
    "TR52": dict(income_mult=0.89, unemp=0.110, univ=0.20, agri=0.20, ind=0.25, cons=0.06, svc=0.49, informal=0.36, debt=1.5, owner=0.63, renter=0.25, fam=0.12, age_mean=36.0, age_std=11.5, youth=0.32, children=1.9, female=0.500),
    "TR61": dict(income_mult=1.04, unemp=0.105, univ=0.26, agri=0.15, ind=0.18, cons=0.06, svc=0.61, informal=0.32, debt=1.8, owner=0.57, renter=0.31, fam=0.12, age_mean=37.5, age_std=11.5, youth=0.30, children=1.7, female=0.501),
    "TR62": dict(income_mult=0.91, unemp=0.130, univ=0.20, agri=0.18, ind=0.22, cons=0.07, svc=0.53, informal=0.38, debt=1.5, owner=0.58, renter=0.30, fam=0.12, age_mean=34.5, age_std=11.5, youth=0.34, children=2.0, female=0.499),
    "TR63": dict(income_mult=0.84, unemp=0.138, univ=0.17, agri=0.22, ind=0.20, cons=0.07, svc=0.51, informal=0.42, debt=1.3, owner=0.60, renter=0.27, fam=0.13, age_mean=33.0, age_std=11.5, youth=0.36, children=2.3, female=0.498),
    "TR71": dict(income_mult=0.80, unemp=0.118, univ=0.17, agri=0.28, ind=0.20, cons=0.06, svc=0.46, informal=0.42, debt=1.3, owner=0.66, renter=0.22, fam=0.12, age_mean=37.0, age_std=12.0, youth=0.30, children=2.0, female=0.499),
    "TR72": dict(income_mult=0.88, unemp=0.112, univ=0.20, agri=0.22, ind=0.24, cons=0.06, svc=0.48, informal=0.40, debt=1.4, owner=0.64, renter=0.24, fam=0.12, age_mean=36.5, age_std=12.0, youth=0.31, children=1.9, female=0.499),
    "TR81": dict(income_mult=0.86, unemp=0.108, univ=0.18, agri=0.14, ind=0.30, cons=0.06, svc=0.50, informal=0.35, debt=1.4, owner=0.65, renter=0.24, fam=0.11, age_mean=39.5, age_std=11.5, youth=0.26, children=1.7, female=0.500),
    "TR82": dict(income_mult=0.74, unemp=0.105, univ=0.14, agri=0.30, ind=0.18, cons=0.06, svc=0.46, informal=0.46, debt=1.1, owner=0.70, renter=0.18, fam=0.12, age_mean=42.5, age_std=11.0, youth=0.23, children=1.9, female=0.500),
    "TR83": dict(income_mult=0.82, unemp=0.112, univ=0.17, agri=0.26, ind=0.20, cons=0.06, svc=0.48, informal=0.43, debt=1.2, owner=0.66, renter=0.22, fam=0.12, age_mean=37.5, age_std=12.0, youth=0.30, children=1.9, female=0.500),
    "TR90": dict(income_mult=0.84, unemp=0.098, univ=0.17, agri=0.28, ind=0.16, cons=0.06, svc=0.50, informal=0.44, debt=1.2, owner=0.68, renter=0.20, fam=0.12, age_mean=40.5, age_std=11.5, youth=0.25, children=1.8, female=0.501),
    "TRA1": dict(income_mult=0.66, unemp=0.155, univ=0.13, agri=0.38, ind=0.15, cons=0.06, svc=0.41, informal=0.54, debt=0.9, owner=0.70, renter=0.16, fam=0.14, age_mean=32.5, age_std=11.5, youth=0.37, children=2.6, female=0.498),
    "TRA2": dict(income_mult=0.54, unemp=0.195, univ=0.10, agri=0.42, ind=0.12, cons=0.06, svc=0.40, informal=0.60, debt=0.8, owner=0.72, renter=0.14, fam=0.14, age_mean=26.5, age_std=10.5, youth=0.42, children=3.2, female=0.497),
    "TRB1": dict(income_mult=0.71, unemp=0.145, univ=0.15, agri=0.30, ind=0.18, cons=0.07, svc=0.45, informal=0.50, debt=1.0, owner=0.68, renter=0.18, fam=0.14, age_mean=33.5, age_std=12.0, youth=0.36, children=2.4, female=0.498),
    "TRB2": dict(income_mult=0.50, unemp=0.220, univ=0.09, agri=0.38, ind=0.12, cons=0.06, svc=0.44, informal=0.62, debt=0.7, owner=0.72, renter=0.13, fam=0.15, age_mean=26.0, age_std=10.0, youth=0.44, children=3.6, female=0.496),
    "TRC1": dict(income_mult=0.90, unemp=0.118, univ=0.18, agri=0.18, ind=0.28, cons=0.07, svc=0.47, informal=0.40, debt=1.3, owner=0.60, renter=0.26, fam=0.14, age_mean=30.5, age_std=11.5, youth=0.38, children=2.5, female=0.498),
    "TRC2": dict(income_mult=0.60, unemp=0.225, univ=0.10, agri=0.32, ind=0.14, cons=0.07, svc=0.47, informal=0.58, debt=0.8, owner=0.65, renter=0.19, fam=0.16, age_mean=27.0, age_std=10.5, youth=0.43, children=3.8, female=0.496),
    "TRC3": dict(income_mult=0.53, unemp=0.240, univ=0.09, agri=0.28, ind=0.14, cons=0.07, svc=0.51, informal=0.60, debt=0.7, owner=0.63, renter=0.20, fam=0.17, age_mean=24.5, age_std=10.0, youth=0.45, children=4.1, female=0.495),
}

# ── İl listesi: (plaka, ad, nuts2, nüfus, override) ───────────────────────────
PROVINCES = [
    (1,  "Adana",          "TR62", 2274106, {}),
    (2,  "Adıyaman",       "TRC1", 632362,  {"income_mult":0.72,"unemp":0.155,"agri":0.28,"ind":0.18,"svc":0.48,"age_mean":30.0,"youth":0.39,"children":2.8}),
    (3,  "Afyonkarahisar", "TR33", 748145,  {"agri":0.28,"ind":0.22,"svc":0.44}),
    (4,  "Ağrı",           "TRA2", 507590,  {"income_mult":0.52,"unemp":0.200,"age_mean":24.4,"age_std":9.5,"youth":0.44,"children":3.8,"informal":0.63}),
    (5,  "Amasya",         "TR83", 336323,  {"age_mean":39.5,"youth":0.27}),
    (6,  "Ankara",         "TR51", 5864049, {"income_mult":1.28,"unemp":0.072,"univ":0.38,"age_mean":37.0}),
    (7,  "Antalya",        "TR61", 2619832, {"income_mult":1.08,"unemp":0.098,"univ":0.28,"agri":0.08,"svc":0.68,"informal":0.28}),
    (8,  "Artvin",         "TR90", 169543,  {"age_mean":41.5,"youth":0.24,"agri":0.32}),
    (9,  "Aydın",          "TR32", 1155684, {"income_mult":1.05,"agri":0.22,"svc":0.55,"age_mean":40.0}),
    (10, "Balıkesir",      "TR22", 1266462, {}),
    (11, "Bilecik",        "TR41", 226862,  {"ind":0.42,"agri":0.04,"svc":0.48}),
    (12, "Bingöl",         "TRB1", 298777,  {"income_mult":0.62,"unemp":0.168,"age_mean":29.0,"youth":0.42,"children":3.0,"agri":0.38}),
    (13, "Bitlis",         "TRB2", 332638,  {"income_mult":0.48,"unemp":0.228,"age_mean":25.5,"youth":0.44,"children":3.8}),
    (14, "Bolu",           "TR42", 330386,  {"income_mult":1.10,"agri":0.12,"ind":0.32,"svc":0.50}),
    (15, "Burdur",         "TR61", 275003,  {"agri":0.22,"ind":0.18,"svc":0.55,"age_mean":40.0,"youth":0.26}),
    (16, "Bursa",          "TR41", 3147818, {"income_mult":1.16,"unemp":0.080,"ind":0.42,"agri":0.04,"svc":0.47,"informal":0.20}),
    (17, "Çanakkale",      "TR22", 583786,  {"income_mult":1.06,"agri":0.18,"svc":0.58}),
    (18, "Çankırı",        "TR82", 200114,  {"age_mean":40.5,"youth":0.25,"agri":0.28}),
    (19, "Çorum",          "TR83", 521905,  {"agri":0.28,"ind":0.22,"svc":0.44}),
    (20, "Denizli",        "TR32", 1054958, {"income_mult":1.08,"ind":0.30,"agri":0.12,"svc":0.52,"informal":0.28}),
    (21, "Diyarbakır",     "TRC2", 1804880, {"income_mult":0.62,"unemp":0.220,"age_mean":26.5,"youth":0.44,"children":3.6,"informal":0.58}),
    (22, "Edirne",         "TR21", 418895,  {"income_mult":1.15,"agri":0.14,"svc":0.58}),
    (23, "Elazığ",         "TRB1", 605399,  {"income_mult":0.74,"unemp":0.138,"age_mean":33.0,"youth":0.36,"children":2.2}),
    (24, "Erzincan",       "TRA1", 222786,  {"income_mult":0.68,"unemp":0.148,"age_mean":34.0,"youth":0.34}),
    (25, "Erzurum",        "TRA1", 762321,  {"income_mult":0.66,"unemp":0.155,"age_mean":32.0,"youth":0.38,"children":2.7,"agri":0.40}),
    (26, "Eskişehir",      "TR41", 913255,  {"income_mult":1.10,"unemp":0.085,"univ":0.30,"ind":0.30,"svc":0.60}),
    (27, "Gaziantep",      "TRC1", 2154051, {"income_mult":0.92,"unemp":0.115,"ind":0.32,"agri":0.12,"svc":0.49,"age_mean":29.5,"youth":0.40,"children":2.6}),
    (28, "Giresun",        "TR90", 428968,  {"age_mean":42.9,"youth":0.23,"agri":0.35,"income_mult":0.80}),
    (29, "Gümüşhane",      "TR90", 169701,  {"income_mult":0.72,"agri":0.34,"age_mean":38.0,"youth":0.28}),
    (30, "Hakkari",        "TRB2", 282948,  {"income_mult":0.46,"unemp":0.245,"age_mean":24.0,"youth":0.46,"children":4.2,"informal":0.65}),
    (31, "Hatay",          "TR63", 1644994, {"income_mult":0.86,"unemp":0.135,"agri":0.20,"svc":0.53,"age_mean":33.5,"youth":0.35,"children":2.2}),
    (32, "Isparta",        "TR61", 432395,  {"agri":0.20,"svc":0.58,"age_mean":38.5,"youth":0.27}),
    (33, "Mersin",         "TR62", 1892027, {"income_mult":0.94,"unemp":0.125,"agri":0.16,"svc":0.56,"age_mean":35.0}),
    (34, "İstanbul",       "TR10", 15840900,{"income_mult":1.38,"unemp":0.087,"univ":0.38,"age_mean":33.2,"age_std":11.0,"youth":0.32,"children":1.3,"informal":0.19,"debt":2.5}),
    (35, "İzmir",          "TR31", 4489165, {"income_mult":1.24,"unemp":0.091,"univ":0.35,"age_mean":37.8,"youth":0.30,"children":1.4,"informal":0.22}),
    (36, "Kars",           "TRA2", 285704,  {"income_mult":0.55,"unemp":0.192,"age_mean":28.0,"youth":0.40,"children":3.0,"agri":0.40}),
    (37, "Kastamonu",      "TR82", 362461,  {"income_mult":0.74,"age_mean":44.1,"youth":0.20,"agri":0.32,"informal":0.47}),
    (38, "Kayseri",        "TR72", 1441523, {"income_mult":0.92,"unemp":0.108,"ind":0.30,"agri":0.14,"svc":0.50,"age_mean":36.0}),
    (39, "Kırklareli",     "TR21", 372910,  {"income_mult":1.16,"agri":0.14,"ind":0.30,"svc":0.50}),
    (40, "Kırşehir",       "TR71", 235258,  {"agri":0.30,"ind":0.18,"svc":0.46,"age_mean":37.5}),
    (41, "Kocaeli",        "TR42", 2026941, {"income_mult":1.22,"unemp":0.065,"ind":0.46,"agri":0.03,"svc":0.44,"informal":0.18,"debt":2.2}),
    (42, "Konya",          "TR52", 2320608, {"income_mult":0.90,"unemp":0.108,"agri":0.22,"ind":0.24,"svc":0.48,"age_mean":35.5}),
    (43, "Kütahya",        "TR33", 566706,  {"agri":0.24,"ind":0.28,"svc":0.42}),
    (44, "Malatya",        "TRB1", 804499,  {"income_mult":0.74,"unemp":0.138,"age_mean":34.5,"youth":0.34,"agri":0.28,"children":2.3}),
    (45, "Manisa",         "TR33", 1468279, {"income_mult":0.98,"ind":0.30,"agri":0.22,"svc":0.42}),
    (46, "Kahramanmaraş",  "TR63", 1177436, {"income_mult":0.82,"unemp":0.142,"agri":0.24,"ind":0.22,"svc":0.47,"age_mean":32.0,"youth":0.37,"children":2.5}),
    (47, "Mardin",         "TRC2", 863657,  {"income_mult":0.58,"unemp":0.228,"age_mean":26.0,"youth":0.44,"children":3.8,"agri":0.34,"informal":0.60}),
    (48, "Muğla",          "TR32", 1076293, {"income_mult":1.12,"agri":0.10,"svc":0.68,"informal":0.28,"age_mean":40.5}),
    (49, "Muş",            "TRB2", 407764,  {"income_mult":0.48,"unemp":0.232,"age_mean":25.0,"youth":0.46,"children":3.9,"agri":0.42}),
    (50, "Nevşehir",       "TR71", 306638,  {"agri":0.22,"svc":0.56,"age_mean":37.0,"income_mult":0.84}),
    (51, "Niğde",          "TR71", 376476,  {"agri":0.26,"ind":0.20,"svc":0.48}),
    (52, "Ordu",           "TR90", 733611,  {"agri":0.32,"income_mult":0.81,"age_mean":39.5,"youth":0.26}),
    (53, "Rize",           "TR90", 341492,  {"income_mult":0.88,"agri":0.26,"svc":0.54,"age_mean":40.5,"youth":0.24}),
    (54, "Sakarya",        "TR42", 1085914, {"income_mult":1.14,"ind":0.38,"agri":0.08,"svc":0.48}),
    (55, "Samsun",         "TR83", 1348542, {"income_mult":0.86,"unemp":0.110,"agri":0.22,"svc":0.52,"age_mean":37.0}),
    (56, "Siirt",          "TRC3", 345547,  {"income_mult":0.52,"unemp":0.242,"age_mean":24.5,"youth":0.46,"children":4.0,"informal":0.62}),
    (57, "Sinop",          "TR82", 204133,  {"income_mult":0.72,"age_mean":44.3,"youth":0.19,"agri":0.32,"informal":0.48}),
    (58, "Sivas",          "TR72", 596390,  {"agri":0.28,"ind":0.20,"svc":0.46,"age_mean":37.5,"income_mult":0.82}),
    (59, "Tekirdağ",       "TR21", 1098879, {"income_mult":1.22,"ind":0.36,"agri":0.10,"svc":0.48,"informal":0.22}),
    (60, "Tokat",          "TR83", 594266,  {"agri":0.30,"ind":0.18,"svc":0.46,"age_mean":38.0}),
    (61, "Trabzon",        "TR90", 804165,  {"income_mult":0.88,"agri":0.22,"svc":0.58,"age_mean":40.2,"youth":0.25}),
    (62, "Tunceli",        "TRB1", 86612,   {"income_mult":0.68,"unemp":0.125,"age_mean":37.0,"youth":0.28,"children":1.8,"agri":0.22,"univ":0.22}),
    (63, "Şanlıurfa",      "TRC2", 2143994, {"income_mult":0.60,"unemp":0.225,"age_mean":25.5,"youth":0.46,"children":4.2,"agri":0.32,"informal":0.60}),
    (64, "Uşak",           "TR33", 375792,  {"ind":0.30,"agri":0.20,"svc":0.44}),
    (65, "Van",            "TRB2", 1170234, {"income_mult":0.50,"unemp":0.225,"age_mean":25.5,"youth":0.45,"children":3.8,"agri":0.30,"informal":0.62}),
    (66, "Yozgat",         "TR72", 398925,  {"agri":0.34,"ind":0.16,"svc":0.44,"age_mean":37.0,"income_mult":0.76}),
    (67, "Zonguldak",      "TR81", 595462,  {"income_mult":0.90,"ind":0.32,"agri":0.12,"svc":0.50}),
    (68, "Aksaray",        "TR71", 433920,  {"agri":0.30,"ind":0.18,"svc":0.46,"children":2.2}),
    (69, "Bayburt",        "TRA1", 83676,   {"income_mult":0.64,"unemp":0.148,"age_mean":34.0,"agri":0.36,"youth":0.34}),
    (70, "Karaman",        "TR52", 254136,  {"agri":0.24,"ind":0.22,"svc":0.48}),
    (71, "Kırıkkale",      "TR71", 271767,  {"income_mult":0.85,"ind":0.24,"svc":0.54,"agri":0.16}),
    (72, "Batman",         "TRC3", 645267,  {"income_mult":0.54,"unemp":0.240,"age_mean":24.0,"youth":0.46,"children":4.0,"informal":0.62}),
    (73, "Şırnak",         "TRC3", 570948,  {"income_mult":0.52,"unemp":0.248,"age_mean":22.9,"age_std":9.0,"youth":0.48,"children":4.4,"informal":0.62}),
    (74, "Bartın",         "TR81", 201736,  {"agri":0.18,"ind":0.28,"svc":0.48,"age_mean":40.0}),
    (75, "Ardahan",        "TRA2", 99111,   {"income_mult":0.52,"unemp":0.198,"age_mean":28.0,"youth":0.39,"agri":0.44}),
    (76, "Iğdır",          "TRA2", 200067,  {"income_mult":0.54,"unemp":0.195,"age_mean":27.5,"youth":0.41,"agri":0.38,"children":3.0}),
    (77, "Yalova",         "TR42", 301397,  {"income_mult":1.18,"agri":0.04,"ind":0.32,"svc":0.58,"informal":0.20}),
    (78, "Karabük",        "TR81", 247849,  {"income_mult":0.88,"ind":0.36,"agri":0.08,"svc":0.50}),
    (79, "Kilis",          "TRC1", 151996,  {"income_mult":0.82,"agri":0.24,"ind":0.20,"svc":0.49,"age_mean":30.0,"youth":0.40,"children":2.8}),
    (80, "Osmaniye",       "TR63", 561720,  {"income_mult":0.82,"agri":0.24,"ind":0.22,"svc":0.47,"children":2.2}),
    (81, "Düzce",          "TR42", 414469,  {"income_mult":1.06,"agri":0.12,"ind":0.34,"svc":0.48}),
]

EXACT_NUTS2 = {"TR10","TR31","TR51","TR41","TR42"}


def build(plate, name, nuts2, pop, override):
    p = dict(NUTS2[nuts2])
    p.update(override)
    m = p["income_mult"]

    # Eğitim dağılımı
    univ    = round(p["univ"], 2)
    primary = round(max(0.08, 0.40 - univ), 2)
    middle  = 0.22
    high    = round(max(0.05, 1.0 - univ - primary - middle), 2)

    # Sektör ağırlıkları normalize
    agri = p["agri"]; ind = p["ind"]; cons = p["cons"]; svc = p["svc"]
    total = agri + ind + cons + svc
    agri /= total; ind /= total; cons /= total; svc /= total

    return {
        "plate":      plate,
        "name":       name,
        "nuts2":      nuts2,
        "population": pop,
        "age_mean":   round(p["age_mean"], 1),
        "age_std":    round(p.get("age_std", 11.0), 1),
        "youth_share": round(p["youth"], 2),
        "female_pct":  round(p["female"], 3),
        "income_mult": round(m, 2),
        "income_p20":  int(round(9000  * m / 100) * 100),
        "income_p50":  int(round(17000 * m / 100) * 100),
        "income_p80":  int(round(42000 * m / 100) * 100),
        "unemployment_rate": round(p["unemp"], 3),
        "education_dist": {
            "primary_or_less": primary,
            "middle_school":   middle,
            "high_school":     high,
            "university":      univ,
        },
        "children_mean": round(p["children"], 1),
        "home_ownership_dist": {
            "owner":       round(p["owner"], 2),
            "renter":      round(p["renter"], 2),
            "with_family": round(p["fam"], 2),
        },
        "sector_weights": {
            "agriculture":  round(agri, 3),
            "industry":     round(ind, 3),
            "construction": round(cons, 3),
            "services":     round(svc, 3),
        },
        "informal_employment_rate": round(p["informal"], 2),
        "debt_to_income_ratio":     round(p["debt"], 1),
        "estimated": nuts2 not in EXACT_NUTS2,
    }


if __name__ == "__main__":
    data = [build(*row) for row in PROVINCES]
    out_path = os.path.join(os.path.dirname(__file__), "provinces_calibration.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"OK {len(data)} il yazildi: {out_path}")
    ist = next(d for d in data if d["plate"] == 34)
    sirnak = next(d for d in data if d["plate"] == 73)
    print(f"  Istanbul  mult={ist['income_mult']}  unemp={ist['unemployment_rate']}  age={ist['age_mean']}")
    print(f"  Sirnak    mult={sirnak['income_mult']}  unemp={sirnak['unemployment_rate']}  age={sirnak['age_mean']}")
