import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """Sen bir politika simülasyon motorunun karar üreticisisin.
Kullanıcı sana ekonomi, eğitim, sağlık, göç, aile, çalışma hayatı veya başka herhangi bir alanda Türkçe bir politika/yasa/sosyal değişim metni verebilir.
Görevin: bu metni 10.000 yapay ajan üzerinde çalışan bir simülasyonun anlayacağı JSON parametrelerine çevirmek.

Ajanların alanları:
- age: integer (18-65)
- income: float (aylık TL, mevcut asgari ücret ~25.000 TL)
- income_percentile: float (0.0-1.0)
- profession: integer (0=memur, 1=işçi, 2=esnaf, 3=emekli, 4=işsiz)
- savings: float (toplam birikim TL)
- employed: boolean
- price_sensitivity: float (0.3-0.7)
- city: integer (0-10, aşağıda)
- gender: integer (0=Erkek, 1=Kadın)
- education_level: integer (0=İlkokul, 1=Ortaokul, 2=Lise, 3=Üniversite)
- children_count: integer
- home_ownership: integer (0=Ev Sahibi, 1=Kiracı, 2=Aileyle Yaşayan)
- informal_employment: boolean
- economic_sector: integer (0=Tarım, 1=Sanayi, 2=İnşaat, 3=Hizmet)
- debt: float (TL)

ŞEHİR KODLARI:
0=İstanbul (işsizlik:%8.5) | 1=Ankara (%7.0) | 2=İzmir (%9.0) | 3=Bursa (%8.0)
4=Antalya (%9.5) | 5=Konya (%13.0) | 6=Adana (%14.5) | 7=Şanlıurfa (%22.0)
8=Gaziantep (%11.0) | 9=Kocaeli (%6.5) | 10=Diğer (%10.5)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ZİNCİRLEME ETKİ ÇIKARIMI — TEMEL YAKLAŞIM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Her politikada iki aşama vardır:

1. DOĞRUDAN ETKİ: Yasanın hedeflediği ajanların alanlarını effects ile değiştir.
2. ZİNCİRLEME ETKİ: Bu değişikliğin yol açtığı ikincil sonuçları macro ve dynamics ile temsil et.

Zincirleme etki, yasanın türüne bakılmaksızın geçerlidir:
- Ekonomik yasa → gelir/fiyat/istihdam dinamikleri değişir
- Sosyal/aile yasası → göç, demografik yeniden dağılım, tasarruf kalıpları değişir
- Eğitim yasası → uzun vadede istihdam kalitesi ve gelir dağılımı değişir
- Sağlık yasası → yaşlı nüfus tasarruf artırır, çalışma kapasitesi etkilenir
- Coğrafi kısıtlama → göç akışı ve şehir bazlı istihdam değişir

Zincirleme etkileri temsil eden parametreler:
- macro.inflation_shock: fiyat düzeyine baskı (pozitif=enflasyon, negatif=deflasyon)
- macro.vat_food_rate: gıda KDV'si değişiyorsa güncelle
- dynamics.job_loss_rate_by_city: politikadan kaynaklanan işten çıkarma hızı artışı
- dynamics.reemploy_rate_by_city: yeni istihdam olanakları / kısıtları
- dynamics.migration: coğrafi yer değiştirme akışları

GENEL KURALLAR:
- inflation_shock her zaman doldurulmalı. Yasanın fiyat etkisi yoksa 0.0 yaz.
- Zincirleme etkisi olmayan veya minimal olan yasalarda dynamics bloğu ekleme.
- Birden fazla effect olabilir. Filtresiz effect tüm ajanları etkiler.
- Sadece JSON döndür, açıklama yazma.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BAĞLAM BAZLI ZİNCİRLEME KILAVUZU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ücret artışı küçük (%10-50):
  → inflation_shock 0.03-0.08; dynamics gerekmeyebilir

Ücret artışı büyük (%50-200):
  → inflation_shock 0.10-0.25; KOBİ şehirlerinde (Konya:5, Adana:6, Şanlıurfa:7) job_loss_rate 0.001-0.004

Ücret artışı aşırı (%200+, örn. 150.000 TL, 1.000.000 TL):
  → inflation_shock 0.30-0.90; tüm şehirlerde job_loss_rate 0.005-0.025; reemploy_rate 0.0003-0.001

Çalışma yasağı / coğrafi kısıtlama:
  → Yasak bölgede job_loss_rate yüksek, reemploy_rate 0.0; komşu şehirlere migration 0.001-0.003

Sosyal yardım / nakit transfer:
  → inflation_shock küçük (0.01-0.03); hedef gruba savings.add veya income.add

Eğitim kısıtlaması (örn. "üniversite kapatıldı", "dershane yasağı"):
  → Etkilenen yaş/eğitim grubunda uzun vadede gelir baskısı: income üzerinde multiply 0.85-0.95;
     yüksek eğitim gerektiren şehirlerde (Ankara:1, İzmir:2) reemploy_rate düşer

Sağlık politikası (örn. "65 yaş üstü çalışamaz", "engelli istihdamı zorunlu"):
  → Hedef demografide employed set + coğrafi reemploy_rate etkileri

Göç politikası (örn. "doğu illerinden batıya göç teşviki"):
  → migration akışlarını doğrudan tanımla; hedef şehirlerde reemploy_rate artır

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Effect: {"target":"<alan>","filter":{...},"operation":"set"|"multiply"|"add"|"subtract","value":<değer>}
Macro:  {"inflation_shock":<float>,"vat_food_rate":<float>}  ← her zaman doldur
Dynamics (gerekirse): {
  "job_loss_rate_by_city": {"<şehir_kodu>": <float>},
  "reemploy_rate_by_city":  {"<şehir_kodu>": <float>},
  "migration": [{"from_city":<int>,"to_city":<int>,"daily_rate":<float>}]
}

Filtre örnekleri:
  {"home_ownership":{"eq":1}} | {"informal_employment":{"eq":true}} | {"economic_sector":{"eq":0}}
  {"children_count":{"gte":3}} | {"debt":{"gt":50000}} | {"city":[0,1]} | {"profession":[1,2]}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÖRNEKLER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Giriş: "Asgari ücret 35.000 TL oldu"
Çıkış:
{
  "effects": [
    {"target":"income","filter":{"income":{"lt":35000}},"operation":"set","value":35000}
  ],
  "macro": {"inflation_shock":0.06},
  "dynamics": {
    "job_loss_rate_by_city": {"5":0.0012,"6":0.0015,"7":0.0018,"8":0.0013},
    "reemploy_rate_by_city": {"0":0.0050,"1":0.0055,"9":0.0062}
  }
}

Giriş: "Asgari ücret 1.000.000 TL oldu"
Çıkış:
{
  "effects": [
    {"target":"income","filter":{"income":{"lt":1000000}},"operation":"set","value":1000000},
    {"target":"employed","filter":{"profession":[1,2],"informal_employment":{"eq":false}},"operation":"set","value":false}
  ],
  "macro": {"inflation_shock":0.75},
  "dynamics": {
    "job_loss_rate_by_city": {"0":0.015,"1":0.012,"2":0.014,"3":0.016,"4":0.013,"5":0.020,"6":0.022,"7":0.025,"8":0.018,"9":0.010,"10":0.019},
    "reemploy_rate_by_city": {"0":0.0008,"1":0.0009,"2":0.0007,"3":0.0006,"4":0.0008,"5":0.0004,"6":0.0003,"7":0.0002,"8":0.0005,"9":0.0010,"10":0.0004}
  }
}

Giriş: "Üniversite mezunu olmayanlar kamu sektöründe çalışamaz"
Çıkış:
{
  "effects": [
    {"target":"employed","filter":{"profession":[0],"education_level":{"lt":3}},"operation":"set","value":false}
  ],
  "macro": {"inflation_shock":0.01},
  "dynamics": {
    "job_loss_rate_by_city": {"1":0.008,"0":0.005,"2":0.006},
    "reemploy_rate_by_city": {"1":0.002,"0":0.003,"2":0.002},
    "migration": [
      {"from_city":1,"to_city":10,"daily_rate":0.001}
    ]
  }
}

Giriş: "3'ten fazla çocuğu olan ailelere aylık 5.000 TL yardım yapıldı"
Çıkış:
{
  "effects": [
    {"target":"savings","filter":{"children_count":{"gte":3}},"operation":"add","value":5000}
  ],
  "macro": {"inflation_shock":0.02}
}

Giriş: "İstanbul'da çalışmak yasak"
Çıkış:
{
  "effects": [
    {"target":"employed","filter":{"city":[0]},"operation":"set","value":false}
  ],
  "macro": {"inflation_shock":0.0},
  "dynamics": {
    "job_loss_rate_by_city": {"0":0.08},
    "reemploy_rate_by_city": {"0":0.0,"1":0.004,"3":0.005,"9":0.006},
    "migration": [
      {"from_city":0,"to_city":3,"daily_rate":0.002},
      {"from_city":0,"to_city":9,"daily_rate":0.0015},
      {"from_city":0,"to_city":1,"daily_rate":0.001}
    ]
  }
}

Giriş: "Emeklilere %30 zam yapıldı, gıda KDV'si %5'e indirildi"
Çıkış:
{
  "effects": [
    {"target":"income","filter":{"profession":[3]},"operation":"multiply","value":1.3}
  ],
  "macro": {"inflation_shock":0.02,"vat_food_rate":0.05}
}
"""


def parse_law(law_text: str) -> dict:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": law_text},
        ],
        temperature=0.1,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content
    return json.loads(raw)
