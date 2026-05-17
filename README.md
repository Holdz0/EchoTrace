# EchoTrace

> **"Yasanın yankısını, yasa çıkmadan duy."**

EchoTrace, herhangi bir yasa veya yönetmelik metninin 10.000 sentetik Türk vatandaşı üzerindeki sosyoekonomik etkisini — yasa yürürlüğe girmeden önce — simüle eden yapay zeka destekli bir politika analiz platformudur.

12 saatlik bir kamu dijitalleşme hackathonunda geliştirilmiştir.

---

## Ne Yapıyor?

Türkçe bir yasa metni girersiniz. EchoTrace:

1. Metni LLM ile yapısal simülasyon parametrelerine dönüştürür
2. 81 il üzerinde 365 günlük ajan tabanlı bir model çalıştırır
3. Kazananları, kaybedenleri, işsizlik değişimlerini, enflasyonu ve Gini katsayısını il bazında interaktif haritada gösterir
4. Eşikler aşıldığında gerçek zamanlı uyarılar fırlatır
5. Resmi bir devlet belgesi formatında PDF etki raporu üretir

---

## Problem

Türkiye'de yasalar **etki analizi yapılmadan** yürürlüğe giriyor. Asgari ücret zamları, KDV düzenlemeleri, EYT genişlemeleri beklenmedik sonuçlar doğuruyor: enflasyon sıçramaları, kayıt dışı istihdamın artması, bölgesel çöküşler. Karar alıcılar sezgiye ve tarihi benzerliklere dayanmak zorunda kalıyor.

EchoTrace, yasa yapıcılara bir **uçuş simülatörü** sunuyor — riski gerçek dünyaya çıkmadan önce sanal toplumda test etmek için.

---

## Demo Senaryosu — 6301 Sayılı Kanun: Tersine Göç Teşvik Paketi

Ana demo, beyaz yakalı çalışanları İstanbul'dan Erzurum gibi doğu illerine taşımayı teşvik eden kurgusal bir tersine göç yasasının tamamen yazılı ve deterministik 12 aylık simülasyonunu çalıştırır.

Simülasyon üç fazda ilerler:

| Faz | Günler | Renk | Ne Olur? |
|-----|--------|------|----------|
| **Faz 1 — Bahar** | 0–90 | 🟢 Yeşil | 1.247 hibe başvurusu, Erzurum'da %22 tüketim artışı, 138 yeni iş yeri |
| **Faz 2 — Yaz** | 91–180 | 🟡 Sarı | Konut talep/arz oranı 4.2×, kiralar %68 artar, yerel halkın %31'i krizde |
| **Faz 3 — Güz/Kış** | 181–365 | 🔴 Kırmızı | Evsizlik %400 artar, 234 esnaf kapanır, göçmenlerin %41'i ayrılır — kelebek etkisi İstanbul'u vurur |

Demo sonunda **Yapay Zeka Politika Optimize Modalı** iki müdahale önerir:
- **TOKİ Dijital Lojman Programı** — 5 yıl kirasız 3.200 konut birimi
- **Yerel İstihdam Vergi Fonu** — 5 yıl vergi muafiyeti + işe alım başına 75.000 TL destek

---

## Mimari

```
┌─────────────────────────────────────────────────────┐
│                  Frontend (Next.js)                 │
│                                                     │
│  TurkeyMap (react-simple-maps) ◄── SVG Marker ping  │
│  Dashboard — zaman çizelgesi — hız kontrolü         │
│  CityDashboard — parçacık canvas — mini grafikler   │
│  DemoTerminal — faz banner — log akışı              │
│  AIPolicyModal — glassmorphism — öneriler           │
│  AlertToast — sağ üst köşe uyarı bildirimleri       │
│  ReportGenerator — yazdırılabilir HTML rapor        │
└────────────────────┬────────────────────────────────┘
                     │  REST + WebSocket
┌────────────────────▼────────────────────────────────┐
│                  Backend (FastAPI)                   │
│                                                     │
│  /api/simulate        — 365 günlük tam simülasyon   │
│  /api/simulate/stream — parçalı WebSocket akışı     │
│  /api/city-agents/:id — il bazlı ajan örneklemi     │
│                                                     │
│  LLM Katmanı (OpenAI)                               │
│    law_parser.py — metin → JSON politika parametresi│
│                                                     │
│  Simülasyon Motoru (NumPy)                          │
│    agents.py        — 10.000 ajan popülasyonu       │
│    engine.py        — günlük adım döngüsü           │
│    policy_engine.py — LLM çıktısını uygular         │
│    metrics.py       — il bazında agregasyon         │
│    provinces.py     — 81 il kalibrasyonu            │
│    calibration.py   — TÜİK/TCMB 2024 baz verileri  │
└─────────────────────────────────────────────────────┘
```

---

## Ajan Modeli

10.000 ajanın her biri şu alanları taşır:

| Alan | Tür | Açıklama |
|------|-----|----------|
| `age` | int | 18–65 |
| `income` | float | Aylık gelir (TL) |
| `income_percentile` | float | Gelir dilimi (0–1) |
| `profession` | int | 0=Memur, 1=İşçi, 2=Esnaf, 3=Emekli, 4=İşsiz |
| `savings` | float | Toplam birikim (TL) |
| `employed` | bool | İstihdam durumu |
| `city` | int | İl kodu (plaka − 1), 0–80 arası |
| `gender` | int | 0=Erkek, 1=Kadın |
| `education_level` | int | 0=İlkokul → 3=Üniversite |
| `children_count` | int | Çocuk sayısı |
| `home_ownership` | int | 0=Ev Sahibi, 1=Kiracı, 2=Aileyle |
| `informal_employment` | bool | Kayıt dışı çalışma |
| `economic_sector` | int | 0=Tarım, 1=Sanayi, 2=İnşaat, 3=Hizmet |
| `debt` | float | Borç (TL) |
| `price_sensitivity` | float | 0.3–0.7 arası fiyat duyarlılığı |

**Kalibrasyon:** Başlangıç işsizlik oranları, gelir dağılımları ve yeniden istihdam olasılıkları TÜİK ve TCMB 2024 verileriyle il bazında kalibre edilmiştir. Yeniden istihdam oranı denklemi: `reemploy = 0.0005 × (1 − u) / u`.

---

## LLM Politika Ayrıştırıcı

Serbest metin Türkçe yasa girişi tek bir OpenAI çağrısıyla yapısal JSON'a dönüştürülür:

```json
{
  "effects": [
    {
      "target": "income",
      "filter": { "profession": { "eq": 1 }, "employed": { "eq": true } },
      "operation": "multiply",
      "value": 1.5
    }
  ],
  "macro": {
    "inflation_shock": 0.12
  },
  "dynamics": {
    "reemploy_rate_by_city": {
      "33": 0.0048,
      "5": 0.0043
    },
    "migration": {
      "from_cities": [33, 5],
      "to_cities": [24, 25],
      "fraction": 0.04,
      "income_threshold": 30000
    }
  }
}
```

Sistem promptu tüm 81 il kodunu (plaka − 1), bölgesel işsizlik referans değerlerini ve tarım, konut, KDV, ücret, emeklilik konularında örnek politikaları içerir.

---

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript |
| Harita | react-simple-maps (geoMercator, SVG Marker) |
| Grafikler | Recharts |
| Canvas | Ham Canvas API (parçacık simülasyonu) |
| Backend | FastAPI, Python 3.11 |
| ABM Motoru | NumPy (vektörleştirilmiş, döngüsüz) |
| LLM | OpenAI GPT-4o |
| Streaming | WebSocket (parçalı simülasyon akışı) |

---

## Kurulum

### Gereksinimler

- Python 3.11+
- Node.js 18+
- OpenAI API anahtarı

### Backend

```bash
cd backend
pip install -r requirements.txt
echo "OPENAI_API_KEY=sk-..." > .env
uvicorn app.api.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) adresini açın.

---

## Özellikler

### İnteraktif Harita
- 81 il etki skoruna göre renklendirilmiş koropleth (yeşil = kazanan, kırmızı = kaybeden)
- Herhangi bir ile tıklayarak **Şehir Paneli** açılır: parçacık canvas, demografik çubuk grafikler, zaman serisi grafikleri
- Aktif uyarılar için SVG Marker ping'leri — haritanın kendi geoMercator projeksiyonu kullanılır, konum kayması yaşanmaz

### Simülasyon Modları
- **Hazır senaryolar:** Asgari ücret +%50, Gıda KDV −%10, EYT genişlemesi
- **Özel yasa girişi:** Türkçe politika metni yapıştırın → LLM ayrıştırır → simülasyon canlı çalışır
- **Büyük Demo:** 6301 Sayılı Kanun'un yazılı ve deterministik 12 aylık animasyonu

### Demo Terminali
- Sol altta sabit terminal penceresi, faz damgalı log girişleri
- Seviyeye göre renk: INFO (yeşil), UYARI (sarı), KRİTİK (kırmızı)
- Faz banner'ı simülasyon üç perdeden geçerken renk değiştirir

### Uyarı Sistemi
- Toast bildirimleri tetiklenme günlerinde görünür
- Önem seviyeleri: kritik (kırmızı), uyarı (sarı), canlanma (yeşil)
- Her uyarının görünür kalma süresi tetikleme gününden itibaren 65 gündür

### Rapor Üretici
- Simülasyon sırasında: aktif faza özel analiz (anlık Erzurum/İstanbul skorları)
- Demo tamamlanınca (365. gün): faz zaman çizelgesi, olay kronolojisi, yapay zeka önerileri ve yazdırılabilir düzen içeren tam yıl nihai raporu

---

## İl Sistemi

Tüm 81 Türkiye ili `plaka − 1` indeksiyle tanımlanır:

```
İstanbul=33  Ankara=5   İzmir=34   Erzurum=24
Şanlıurfa=62  Antalya=6  Konya=41   Van=64
```

İl bazlı işsizlik oranları TÜİK bölgesel verilerinden alınmış olup hem ABM motorunun hem de frontend görselleştirme katmanının kalibrasyonunda kullanılmaktadır.

---

## Proje Raporu

Tam problem tanımı, paydaş analizi ve teknik mimari dokümantasyonu için [`ECHOTRACE_Proje_Raporu.md`](./ECHOTRACE_Proje_Raporu.md) dosyasına bakınız.

---

## Ekip

3 kişilik bir ekip tarafından 12 saatlik kamu dijitalleşme ve yapay zeka hackathonunda geliştirilmiştir.

---

## Lisans

MIT
