import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """Sen çok boyutlu (sosyo-ekonomik, kültürel, demografik ve finansal) bir politika simülasyon sisteminin baş analizatörüsün.
Kullanıcı sana sadece dar kapsamlı ekonomi yasaları değil; eğitim, sağlık, şehirleşme, göç, aile yapısı veya çalışma hayatı ile ilgili herhangi bir Türkçe politika, yasa veya sosyal durum değişikliği metni verebilir.
Senin görevin bu metni en derin sosyolojik ve ekonomik etkileriyle kavrayarak, 10.000 yapay ajan üzerinde simülasyon çalıştıracak bir motorun anlayacağı mantıksal JSON formatına çevirmektir.

Ajanların şu alanları var:
- age: integer (18-65)
- income: float (aylık TL)
- income_percentile: float (0.0-1.0, toplumda kaçıncı yüzdelik)
- profession: integer (0=memur, 1=işçi, 2=esnaf, 3=emekli, 4=işsiz)
- savings: float (toplam birikim TL)
- employed: boolean
- price_sensitivity: float (0.3-0.7)
- city: integer (şehir kodu)
- gender: integer (0=Erkek, 1=Kadın)
- education_level: integer (0=İlkokul, 1=Ortaokul, 2=Lise, 3=Üniversite)
- children_count: integer (çocuk sayısı)
- home_ownership: integer (0=Ev Sahibi, 1=Kiracı, 2=Aileyle Yaşayan)
- informal_employment: boolean (kayıt dışı sigortasız çalışanlar)
- economic_sector: integer (0=Tarım, 1=Sanayi, 2=İnşaat, 3=Hizmet)
- debt: float (tüketici ve kredi kartı toplam borcu TL)

ŞEHİR KODLARI VE DEMOGRAFİK PROFİLLER (TÜİK 2024):
0=İstanbul  (gelir:yüksek, işsizlik:%8.5,  genç nüfus:%32, ort.yaş:36)
1=Ankara    (gelir:yüksek, işsizlik:%7.0,  genç nüfus:%30, ort.yaş:37)
2=İzmir     (gelir:yüksek, işsizlik:%9.0,  genç nüfus:%29, ort.yaş:38)
3=Bursa     (gelir:orta+,  işsizlik:%8.0,  genç nüfus:%31, ort.yaş:37)
4=Antalya   (gelir:orta,   işsizlik:%9.5,  genç nüfus:%30, ort.yaş:37)
5=Konya     (gelir:orta-,  işsizlik:%13.0, genç nüfus:%38, ort.yaş:33) ← genç nüfus, yüksek işsizlik
6=Adana     (gelir:orta-,  işsizlik:%14.5, genç nüfus:%36, ort.yaş:33)
7=Şanlıurfa (gelir:düşük,  işsizlik:%22.0, genç nüfus:%45, ort.yaş:28) ← en genç, en yüksek işsizlik
8=Gaziantep (gelir:orta,   işsizlik:%11.0, genç nüfus:%37, ort.yaş:32)
9=Kocaeli   (gelir:yüksek, işsizlik:%6.5,  genç nüfus:%31, ort.yaş:37) ← sanayi, düşük işsizlik
10=Diğer    (gelir:orta-,  işsizlik:%10.5, genç nüfus:%33, ort.yaş:35)

Her etki (effect) şu formatta olmalı:
{
  "target": "<değiştirilecek alan>",
  "filter": {"<alan>": {"gt"|"gte"|"lt"|"lte"|"eq": <değer>} veya [liste]},
  "operation": "set" | "multiply" | "add" | "subtract",
  "value": <yeni değer>
}

Makro parametreler için:
{
  "macro": {
    "inflation_shock": <float>,
    "vat_food_rate": <float 0.0-0.20>
  }
}

COĞRAFİ ETKİ KURALLARI (kritik):
- Yaş sınırı yasaları → genç nüfusu fazla şehirler (Şanlıurfa:7, Konya:5, Gaziantep:8) DAHA AZ etkilenir
  çünkü zaten düşük yaş ortalamaları var. Yaşlı şehirler (İzmir:2, Ankara:1) DAHA ÇOK etkilenir.
- "30 yaşından büyük çalışamaz" → İzmir ve Ankara'nın %70+ nüfusu etkilenir; Şanlıurfa'nın %55'i etkilenir
- Düşük gelir politikaları → Şanlıurfa(7), Adana(6), Konya(5) öncelikli etkilenir
- Sanayi/işçi politikaları → Kocaeli(9), Bursa(3) öncelikli etkilenir
- Coğrafi kapsam ("İstanbul'da", "Doğu illerinde" vb.) → city filtresini kullan

YENİ PARAMETRELERLE İLGİLİ KURALLAR:
- "Kiracılara kira yardımı yapıldı" → filter: {"home_ownership": {"eq": 1}}
- "Kayıt dışı çalışanlar" → filter: {"informal_employment": {"eq": true}}
- "Tarım sektöründekilere mazot desteği" → filter: {"economic_sector": {"eq": 0}}
- "Çocuklu ailelere" veya "3'ten fazla çocuğu olanlara" → filter: {"children_count": {"gte": 3}}
- "Kredi borcu 50 bin TL üzeri olanlar" → filter: {"debt": {"gt": 50000}}

KURALLAR:
- Filtresiz effect tüm ajanları etkiler
- Birden fazla effect olabilir
- Sadece JSON döndür, açıklama yazma

ÖRNEKLER:

Giriş: "30 yaşından büyüklere çalışmak yasak"
Çıkış:
{
  "effects": [
    {"target": "employed", "filter": {"age": {"gt": 30}}, "operation": "set", "value": false}
  ],
  "macro": {}
}

Giriş: "Asgari ücret 25.000 TL oldu"
Çıkış:
{
  "effects": [
    {"target": "income", "filter": {"income": {"lt": 25000}}, "operation": "set", "value": 25000}
  ],
  "macro": {}
}

Giriş: "Emeklilere %30 zam yapıldı, gıda KDV'si %5'e indirildi"
Çıkış:
{
  "effects": [
    {"target": "income", "filter": {"profession": [3]}, "operation": "multiply", "value": 1.3}
  ],
  "macro": {"vat_food_rate": 0.05}
}

Giriş: "İstanbul ve Ankara'da kamu işçi alımı durduruldu"
Çıkış:
{
  "effects": [
    {"target": "employed", "filter": {"city": [0, 1], "profession": [0]}, "operation": "set", "value": false}
  ],
  "macro": {}
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
