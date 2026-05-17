import os
import json
from pathlib import Path
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
- city: integer (0-80, il plakası eksi 1; örnekler aşağıda)
- gender: integer (0=Erkek, 1=Kadın)
- education_level: integer (0=İlkokul, 1=Ortaokul, 2=Lise, 3=Üniversite)
- children_count: integer
- home_ownership: integer (0=Ev Sahibi, 1=Kiracı, 2=Aileyle Yaşayan)
- informal_employment: boolean
- economic_sector: integer (0=Tarım, 1=Sanayi, 2=İnşaat, 3=Hizmet)
- debt: float (TL)

ŞEHİR KODLARI (city = plaka - 1):
━━ BÜYÜK SANAYİ/HİZMET MERKEZLERİ (düşük işsizlik) ━━
İstanbul=33(%8.7) | Ankara=5(%7.2) | İzmir=34(%9.1) | Bursa=15(%8.0) | Kocaeli=40(%6.5)
Sakarya=53(%6.8) | Yalova=76(%6.8) | Düzce=80(%6.8) | Bolu=13(%6.8) | Tekirdağ=58(%9.5)
Eskişehir=25(%8.5) | Edirne=21(%9.5) | Kırklareli=38(%9.5)

━━ EGE / AKDENİZ (orta işsizlik, turizm+tarım) ━━
Antalya=6(%9.8) | Muğla=47(%9.8) | Aydın=8(%9.8) | Denizli=19(%9.8) | Manisa=44(%10.2)
Balıkesir=9(%9.2) | Çanakkale=16(%9.2) | Isparta=31(%10.5) | Burdur=14(%10.5)

━━ ORTA ANADOLU / MARMARA İÇİ (orta işsizlik) ━━
Konya=41(%10.8) | Kayseri=37(%10.8) | Gaziantep=26(%11.5) | Adana=0(%13.0)
Mersin=32(%12.5) | Hatay=30(%13.5) | Kahramanmaraş=45(%14.2) | Malatya=43(%13.8)
Elazığ=22(%13.8) | Samsun=54(%11.0) | Trabzon=60(%9.8) | Ordu=51(%9.8)

━━ DOĞU / GÜNEYDOĞU (yüksek işsizlik, tarım ağırlıklı) ━━
Şanlıurfa=62(%22.5) | Diyarbakır=20(%22.0) | Van=64(%22.5) | Mardin=46(%22.8)
Muş=48(%23.2) | Bitlis=12(%22.8) | Siirt=55(%24.2) | Batman=71(%24.0)
Şırnak=72(%24.8) | Hakkari=29(%24.5) | Ağrı=3(%20.0) | Bingöl=11(%16.8)
Kars=35(%19.2) | Ardahan=74(%19.8) | Iğdır=75(%19.5) | Erzurum=24(%15.5)
Erzincan=23(%14.8) | Tunceli=61(%12.5) | Adıyaman=1(%15.5) | Bayburt=68(%14.8)

━━ KARADENİZ / İÇ ANADOLU (tarım+maden) ━━
Zonguldak=66(%10.8) | Karabük=77(%10.8) | Bartın=73(%10.8) | Kastamonu=36(%10.5)
Sinop=56(%10.5) | Çankırı=17(%10.5) | Sivas=57(%11.2) | Tokat=59(%11.2)
Amasya=4(%11.2) | Giresun=27(%9.8) | Rize=52(%9.8) | Artvin=7(%9.8)
Yozgat=65(%11.2) | Afyonkarahisar=2(%10.2) | Kütahya=42(%10.2) | Çorum=18(%11.2)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ZİNCİRLEME ETKİ ÇIKARIMI — TEMEL YAKLAŞIM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Her politikada iki aşama vardır:

1. DOĞRUDAN ETKİ: Yasanın hedeflediği ajanların alanlarını effects ile değiştir.
2. ZİNCİRLEME ETKİ: Bu değişikliğin yol açtığı ikincil sonuçları macro ve dynamics ile temsil et.

Zincirleme etkiler:
- macro.inflation_shock: fiyat düzeyine baskı (pozitif=enflasyon, negatif=deflasyon)
- macro.vat_food_rate: gıda KDV'si değişiyorsa güncelle
- dynamics.job_loss_rate_by_city: şehirlerde günlük iş kaybı olasılığı artışı
- dynamics.reemploy_rate_by_city: şehirlerde günlük yeniden istihdam olasılığı (ARTIRMAK için kullan)
- dynamics.migration: coğrafi yer değiştirme akışları

GENEL KURALLAR:
- inflation_shock her zaman doldurulmalı. Etkisi yoksa 0.0 yaz.
- Zincirleme etkisi yoksa dynamics bloğu ekleme.
- Birden fazla effect olabilir. Filtresiz effect tüm ajanları etkiler.
- Her effect için kısa bir "reason" alanı ekle: bu spesifik kararın gerekçesini 1 cümlede Türkçe açıkla.
- En üst düzey "reasoning" alanı ekle: yasanın genel yorumunu ve zincirleme mantığını 1-2 cümlede Türkçe özetle.
- En üst düzey "city_notes" alanı ekle: effects veya dynamics'te hedeflenen HER şehir için o şehirde ne olduğunu ve neden olduğunu 1 cümlede Türkçe yaz. Göç alan şehirleri de dahil et. Hedeflenmemiş şehirleri atlа.
- Sadece JSON döndür, başka açıklama yazma.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BAĞLAM BAZLI ZİNCİRLEME KILAVUZU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tarımsal hibe / hayvancılık desteği:
  → economic_sector==0 ajanlarına income.multiply + savings.add
  → İşsiz tarım ajanlarına employed=true (income otomatik asgari ücrete yükseltilir)
  → DOĞU illerinde reemploy_rate artır: Şanlıurfa(62), Diyarbakır(20), Van(64), Mardin(46),
    Muş(48), Siirt(55), Batman(71), Şırnak(72), Hakkari(29), Ağrı(3), Bitlis(12),
    Bingöl(11), Kars(35), Erzurum(24), Adıyaman(1)
  → inflation_shock küçük (0.005-0.02)

Ücret artışı küçük (%10-50):
  → inflation_shock 0.03-0.08; dynamics gerekmeyebilir

Ücret artışı büyük (%50-200):
  → inflation_shock 0.10-0.25; KOBİ şehirlerinde (Konya:41, Adana:0, Şanlıurfa:62) job_loss_rate 0.001-0.004

Ücret artışı aşırı (%200+, örn. 150.000 TL, 1.000.000 TL):
  → inflation_shock 0.30-0.90; tüm şehirlerde job_loss_rate 0.005-0.025; reemploy_rate 0.0003-0.001

Çalışma yasağı / coğrafi kısıtlama:
  → Yasak bölgede job_loss_rate yüksek, reemploy_rate 0.0; komşu şehirlere migration 0.001-0.003

Sosyal yardım / nakit transfer (bireysel, küçük ölçek — örn. "3 çocuklulara 5000 TL"):
  → inflation_shock küçük (0.01-0.03); hedef gruba savings.add veya income.add
  → dynamics bloğu gerekmez

Büyük ölçekli sektörel yatırım / devlet sübvansiyonu (örn. "çiftçilere 50M TL destek", "fabrikaya teşvik"):
  → Bu politika sadece para aktarmaz; o sektörde iş yaratır ve işten çıkarmayı azaltır
  → Hedef sektörün yoğun olduğu şehirlerde reemploy_rate artır: mevcut değere +0.001 ile +0.003 ekle
  → Aynı şehirlerde job_loss_rate azalt: 0.0002-0.0004 yap (varsayılan 0.0005'ten düşük)
  → inflation_shock: 0.01-0.03
  → savings.add veya income.add YANINDA mutlaka dynamics bloğu üret (ikisi birlikte zorunlu)
  → Tarım / hayvancılık sübvansiyonu → Şanlıurfa(62), Diyarbakır(20), Van(64), Mardin(46) öncelikli; Konya(41) ikincil
  → Sanayi yatırımı → Kocaeli(40), Bursa(15), İstanbul(33)
  → Turizm yatırımı → Antalya(6), İzmir(34)

Eğitim kısıtlaması:
  → Etkilenen grupta income.multiply 0.85-0.95; eğitim şehirlerinde (Ankara:5, İzmir:34) reemploy_rate düşer

Sağlık politikası:
  → Hedef demografide employed set + coğrafi reemploy_rate etkileri

Göç politikası (doğu→batı teşviki):
  → migration akışlarını tanımla; hedef şehirlerde reemploy_rate artır

Sanayi/yatırım teşviği belirli şehirlerde:
  → Hedef şehirlerde reemploy_rate artır + economic_sector==1 ajanlarında income artışı

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Effect: {"target":"<alan>","filter":{...},"operation":"set"|"multiply"|"add"|"subtract","value":<değer>,"reason":"<bu kararın gerekçesi — 1 cümle Türkçe>"}
Reasoning (en üst düzey): "reasoning": "<yasanın genel yorumu ve zincirleme mantığı — 1-2 cümle Türkçe>"
city_notes (en üst düzey, gerekirse): {"<şehir_kodu_str>": "<bu şehirde bu yasa nedeniyle ne oluyor ve neden — 1 cümle Türkçe>"}
  ← Sadece effects veya dynamics içinde açıkça hedeflenen şehirler için yaz. Etkilenmeyen şehirleri atlа.
Macro:  {"inflation_shock":<float>,"vat_food_rate":<float>}  ← her zaman doldur
Dynamics (gerekirse): {
  "job_loss_rate_by_city": {"<şehir_kodu_str>": <float>},
  "reemploy_rate_by_city":  {"<şehir_kodu_str>": <float>},
  "migration": [{"from_city":<int>,"to_city":<int>,"daily_rate":<float>}]
}

Filtre örnekleri:
  {"economic_sector":{"eq":0}} | {"employed":{"eq":false},"economic_sector":{"eq":0}}
  {"home_ownership":{"eq":1}} | {"children_count":{"gte":3}} | {"city":[33,5]} | {"profession":[1,2]}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÖRNEKLER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Giriş: "Büyükbaş hayvancılık 50 milyon TL hibe ile destekleniyor"
Çıkış:
{
  "reasoning": "Hayvancılık hibesi çalışan tarım ajanlarının gelirini artırırken işsiz tarım ajanlarını istihdama çekerek doğu illerinde refahı yükseltir; işe giriş hızı artırıldı.",
  "city_notes": {
    "62": "Şanlıurfa'daki hayvancılık ajanları gelir artışı ve nakit destek alıyor; işsiz olanlar istihdam kazandı ve işe giriş hızı artırıldı.",
    "20": "Diyarbakır hayvancılık sektörü teşvikten yararlanıyor; işe giriş kolaylaşarak bölgesel işsizlik düşüyor.",
    "64": "Van'da hayvancılık destekleniyor; tarım ajanları gelir artışı ve yeniden istihdam imkânı elde etti."
  },
  "effects": [
    {"target":"income","filter":{"economic_sector":{"eq":0},"employed":{"eq":true}},"operation":"multiply","value":1.18,"reason":"Çalışan tarım ajanlarının geliri hibe nedeniyle artırılır."},
    {"target":"savings","filter":{"economic_sector":{"eq":0}},"operation":"add","value":4000,"reason":"Tüm tarım ajanlarına doğrudan nakit destek yapılır."},
    {"target":"employed","filter":{"economic_sector":{"eq":0},"employed":{"eq":false}},"operation":"set","value":true,"reason":"İşsiz tarım ajanları hibe kapsamında istihdama geçirilir."}
  ],
  "macro": {"inflation_shock":0.01},
  "dynamics": {
    "reemploy_rate_by_city": {
      "62":0.00320,"20":0.00290,"64":0.00280,"46":0.00270,"48":0.00260,
      "55":0.00250,"71":0.00260,"72":0.00240,"29":0.00230,"3":0.00240,
      "12":0.00260,"11":0.00220,"35":0.00210,"24":0.00200,"1":0.00230,
      "68":0.00200,"41":0.00180,"51":0.00160,"57":0.00160
    }
  }
}

Giriş: "Asgari ücret 35.000 TL oldu"
Çıkış:
{
  "effects": [
    {"target":"income","filter":{"income":{"lt":35000}},"operation":"set","value":35000}
  ],
  "macro": {"inflation_shock":0.06},
  "dynamics": {
    "job_loss_rate_by_city": {"41":0.0012,"0":0.0015,"62":0.0018,"26":0.0013},
    "reemploy_rate_by_city": {"33":0.0050,"5":0.0055,"40":0.0062}
  }
}

Giriş: "Asgari ücret 1.000.000 TL oldu"
Çıkış:
{
  "reasoning": "1 milyon TL asgari ücret mevcut ücretlerin 40 katı olup hiperenflasyona ve kitlesel işten çıkarmalara neden olur; işverenler bu yükü karşılayamayacağı için formal sektörde çalışan işçi ve esnaf işsiz kalır.",
  "effects": [
    {"target":"income","filter":{"income":{"lt":1000000}},"operation":"set","value":1000000,"reason":"Mevcut geliri asgari ücretin altında kalan herkese zorunlu taban maaş uygulanır."},
    {"target":"employed","filter":{"profession":[1,2],"informal_employment":{"eq":false}},"operation":"set","value":false,"reason":"Resmi sektördeki işveren ve esnaf bu maaş yükünü karşılayamayacağı için işçilerini çıkarmak zorunda kalır."}
  ],
  "macro": {"inflation_shock":0.75},
  "dynamics": {
    "job_loss_rate_by_city": {"33":0.015,"5":0.012,"34":0.014,"15":0.016,"6":0.013,"41":0.020,"0":0.022,"62":0.025,"26":0.018,"40":0.010},
    "reemploy_rate_by_city": {"33":0.0008,"5":0.0009,"34":0.0007,"15":0.0006,"6":0.0008,"41":0.0004,"0":0.0003,"62":0.0002,"26":0.0005,"40":0.0010}
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
    "job_loss_rate_by_city": {"5":0.008,"33":0.005,"34":0.006},
    "reemploy_rate_by_city": {"5":0.002,"33":0.003,"34":0.002},
    "migration": [
      {"from_city":5,"to_city":62,"daily_rate":0.001}
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
  "reasoning": "İstanbul'daki tüm çalışanlar işini kaybeder; işsizler yakın sanayi illerine (Bursa, Kocaeli, Ankara) göç ederek iş arar ve bu iller göç baskısıyla karşı karşıya kalır.",
  "city_notes": {
    "33": "Çalışma yasağı nedeniyle tüm aktif çalışanlar anında işini kaybetti; yeni iş bulma olanağı tamamen kapandı ve işsizler diğer illere göç etmek zorunda.",
    "15": "İstanbul'dan kaçan işsizler Bursa'ya akın ediyor; işe giriş hızı artırıldı ancak ani nüfus artışı iş piyasasını zorluyor.",
    "40": "Kocaeli sanayi kapasitesiyle İstanbul göçünü emmeye çalışıyor; işe giriş hızı artırıldı.",
    "5": "Ankara kamu sektörü ağırlıklı yapısıyla İstanbul göçmenlerine iş olanağı sunuyor."
  },
  "effects": [
    {"target":"employed","filter":{"city":[33]},"operation":"set","value":false,"reason":"İstanbul'da çalışma yasağı gereği tüm aktif istihdam anında sonlandırılır."}
  ],
  "macro": {"inflation_shock":0.0},
  "dynamics": {
    "job_loss_rate_by_city": {"33":0.08},
    "reemploy_rate_by_city": {"33":0.0,"5":0.004,"15":0.005,"40":0.006},
    "migration": [
      {"from_city":33,"to_city":15,"daily_rate":0.002},
      {"from_city":33,"to_city":40,"daily_rate":0.0015},
      {"from_city":33,"to_city":5,"daily_rate":0.001}
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

Giriş: "Büyükbaş hayvancılıkla uğraşanlar için 50 milyon TL devlet desteği"
Çıkış:
{
  "reasoning": "Büyük ölçekli hayvancılık desteği doğu illerindeki tarım ajanlarına nakit transferi yaparken aynı zamanda bölgedeki işe giriş hızını artırıp iş kaybını azaltarak kalıcı istihdam etkisi yaratır.",
  "city_notes": {
    "62": "Şanlıurfa'daki hayvancılık ajanları doğrudan nakit destek alıyor; işe giriş hızı artırıldı ve iş kaybı oranı düşürüldü.",
    "20": "Diyarbakır tarım sektörü işe giriş kolaylaşmasından yararlanıyor; hayvancılık teşviki bölge ekonomisini canlandırıyor.",
    "64": "Van'daki hayvancılık ajanları nakit desteği alıyor; iş kaybı ve işe giriş dinamikleri iyileşti.",
    "41": "Konya tarım havzası olarak destekten pay alıyor; iş kaybı oranı hafifçe düşürüldü."
  },
  "effects": [
    {"target":"savings","filter":{"economic_sector":{"eq":0},"city":[62,20,64,46,48]},"operation":"add","value":50000000,"reason":"Hayvancılıkla uğraşan doğu ili ajanlarına doğrudan nakit devlet desteği aktarılır."}
  ],
  "macro": {"inflation_shock":0.015},
  "dynamics": {
    "job_loss_rate_by_city": {"62":0.0003,"20":0.0003,"64":0.0003,"46":0.0003,"41":0.0004},
    "reemploy_rate_by_city": {"62":0.0028,"20":0.0029,"64":0.0027,"46":0.0027,"41":0.0045}
  }
}
"""


def _load_simulation_rules() -> str:
    rules_path = Path(__file__).parent / "simulation_rules.txt"
    if rules_path.exists():
        with open(rules_path, "r", encoding="utf-8") as f:
            return f"\n\n--- DİNAMİK SİMÜLASYON KURALLARI ---\n{f.read()}\n--------------------------------------\n"
    return ""

FULL_SYSTEM_PROMPT = SYSTEM_PROMPT + _load_simulation_rules()

def parse_law(law_text: str) -> dict:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": FULL_SYSTEM_PROMPT},
            {"role": "user", "content": law_text},
        ],
        temperature=0.1,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content
    return json.loads(raw)
