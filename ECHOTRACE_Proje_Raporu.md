# ECHOTRACE — Yasaların Etkisini Simüle Eden Yapay Toplum

**Proje Türü:** Kamu Dijitalleşme & Yapay Zeka Hackathonu MVP'si
**Süre:** 12 saat
**Ekip:** 3 kişilik teknik ekip
**Hedef:** Birincilik

---

## 1. YÖNETİCİ ÖZETİ

ECHOTRACE, herhangi bir yasa tasarısı veya yönetmelik metninin Türkiye toplumu üzerindeki **olası sosyo-ekonomik etkilerini** önceden simüle eden bir multi-agent yapay zeka sistemidir. İçinde 10.000 sentetik vatandaş ajanı barındıran bir dijital toplum modelinde, 365 günlük bir süreç saniyeler içinde koşturulur ve sistem makro ekonomik göstergeleri, kazananları, kaybedenleri ve beklenmedik yan etkileri raporlar.

**Tek cümlelik pitch:** "Bir yasa metnini gir, sistem 10.000 sanal vatandaşın 1 yıllık tepkisini simüle etsin ve gerçek dünyada ne olacağını sana göstersin."

---

## 2. ÇÖZÜLEN GERÇEK KAMU PROBLEMİ

Türkiye'de yasalar **etki analizi olmadan** yürürlüğe giriyor. Asgari ücret, KDV, EYT, vergi reformları çıktıktan sonra beklenmedik sonuçlar doğuruyor: enflasyon sıçramaları, işsizlik artışları, kayıt-dışı kayışlar, sektörel çöküşler.

**Mevcut durum:** Yasa yapıcının elinde "ne olur" sorusuna sayısal cevap veren bir araç yok. Karar çoğu zaman sezgi ve tarihi benzetmelerle veriliyor.

**ECHOTRACE'in vaadi:** Yasa yapıcılara bir **"uçuş simülatörü"** sunmak — riski sahaya çıkmadan önce sanal toplumda test etmek.

---

## 3. PROJE AMACI VE HEDEF KİTLE

### Birincil Hedef Kitle
- Cumhurbaşkanlığı Strateji ve Bütçe Başkanlığı
- TBMM komisyonları ve yasa hazırlama daireleri
- Bakanlıklar (Hazine, Maliye, Çalışma, Tarım)
- Belediyeler (yerel yönetmelikler için)

### İkincil Hedef Kitle
- Akademik araştırmacılar (sosyo-ekonomik politika)
- Sivil toplum kuruluşları (politika savunuculuğu)
- Düşünce kuruluşları (TEPAV, SETA, vb.)

### Proje Amaçları
1. Yasa öncesi **kantitatif risk değerlendirmesi** sağlamak
2. Beklenmedik yan etkileri **önceden tespit etmek**
3. Politika seçenekleri arasında **karşılaştırma** imkanı sunmak
4. Karar süreçlerine **veri-tabanlılık** kazandırmak

---

## 4. SİSTEMİN ÇALIŞMA MANTIĞI (UÇTAN UCA)

```
KULLANICI → YASA METNİ GİRİŞİ
            ↓
    [LLM Yasa Parser]
            ↓
    YAPISAL POLİTİKA PARAMETRELERİ
    (vergi oranı, asgari ücret, vb.)
            ↓
    [SİMÜLASYON MOTORU]
    10.000 ajan × 365 gün
            ↓
    GÜNLÜK MAKRO METRİKLER
    (tüketim, işsizlik, gini, fiyat)
            ↓
    [LLM Yorumlama Katmanı]
            ↓
    İNSAN DİLİNDE ETKİ RAPORU
            ↓
    GÖRSEL DASHBOARD
    (canlı animasyon + grafikler)
```

### Akış Detayı

**1. Girdi Katmanı:** Kullanıcı serbest formatta yasa metni veya öneri yazar.

**2. Parse Katmanı:** LLM (Groq Llama 3.1 veya Gemini Flash) yasa metnini yapısal JSON parametrelere dönüştürür.

**3. Ajan İnşası:** 10.000 sentetik vatandaş TÜİK marjinal dağılımlarına uygun olarak üretilir (yaş, gelir, meslek, şehir, harcama profili).

**4. Simülasyon:** Her ajan günlük olarak utility function tabanlı kararlar verir (tüketim, tasarruf, iş arama, vb.). Politika parametreleri bu kararları etkiler.

**5. Toplama:** Her gün için makro metrikler hesaplanır.

**6. Yorumlama:** LLM final çıktıları insan diliyle özetler ve risk uyarıları üretir.

**7. Görselleştirme:** Three.js ile 10.000 nokta canlı animasyonu + Recharts ile 6 paralel grafik.

---

## 5. YAPAY ZEKANIN YERİ

Sistem **hibrit** bir mimari kullanır. Yapay zekayı doğru noktalarda kullanmak hem kalite hem hız için kritik:

| Katman | AI Bileşeni | Neden? |
|--------|-------------|--------|
| Yasa parsing | LLM (Groq/Gemini) | Doğal dil → yapısal parametre dönüşümü |
| Ajan inşası | Bayesian sampling | TÜİK dağılımlarına uygun sentetik nüfus |
| Ajan davranışı | Parametrik utility + olasılıksal seçim | Hızlı + açıklanabilir + ölçeklenebilir |
| Anomali tespiti | Statistical (z-score, change point) | Beklenmedik etkileri yakalama |
| Rapor üretimi | LLM | Sayıların insan diline çevrilmesi |

**Kritik mimari karar:** LLM **inner loop'ta DEĞİL**. Her ajan için LLM çağrısı yapmıyoruz. Bu hem maliyet hem ölçeklenebilirlik açısından doğru karar. LLM sadece "compilation" ve "interpretation" katmanlarında çalışır.

---

## 6. OTONOM KARAR MEKANİZMASI

Sistem üç katmanda otonom karar verir:

**Katman 1 — Politika Yorumlama:** LLM, yasa metnini gördüğünde **hangi parametreyi nasıl değiştireceğine** otonom karar verir. (Örn: "asgari ücret %20 artar" → `min_wage *= 1.20`)

**Katman 2 — Ajan Davranışı:** Her ajan kendi durumuna bakarak günlük olarak otonom karar verir: harcayacak mı, tasarruf edecek mi, iş bırakacak mı, fiyat değişimine nasıl tepki verecek.

**Katman 3 — Risk Tespiti:** Sistem simülasyon sonrası otonom olarak anomalileri belirler ve önem sırasına dizer: "Bu yasa 4. ayda işsizliği şu kadar artırabilir."

---

## 7. KULLANILACAK TEKNOLOJİLER

### Backend & Simülasyon
- **Python 3.11+**
- **NumPy / Pandas:** Vektörize hesaplama (asıl simülasyon motoru)
- **SciPy:** İstatistiksel dağılımlar, kalibrasyon
- **FastAPI:** REST + WebSocket API katmanı
- **Mesa (opsiyonel):** Agent-based modeling framework — eğer zaman izin verirse, izin vermezse saf NumPy

### LLM Servisleri (Ücretsiz Tier)
- **Groq API:** Llama 3.1 70B — yasa parsing için (ücretsiz, çok hızlı)
- **Google AI Studio:** Gemini 1.5 Flash — yedek/rapor üretimi (ücretsiz tier)
- **Anthropic Claude (opsiyonel):** Kaliteli rapor için, $5 starter kredisi yeter

### Frontend & Görselleştirme
- **Next.js 14 (App Router):** Ana web uygulaması
- **TypeScript:** Tip güvenliği
- **Three.js + React Three Fiber:** 10.000 ajan WebGL animasyonu
- **Recharts:** 6 paralel canlı grafik
- **Tailwind CSS:** Hızlı UI
- **WebSocket:** Backend ile gerçek zamanlı iletişim

### Veri Kaynakları
- **TÜİK Açık Veri:** Hanehalkı Bütçe Anketi, ADNKS, TÜFE sepet ağırlıkları
- **TCMB:** Tarihsel makro veriler (kalibrasyon için)
- Hepsi açık ve ücretsiz

### Geliştirme Araçları
- **Git + GitHub:** Versiyon kontrolü
- **Docker (opsiyonel):** Demo deployment için
- **VS Code + Cursor:** Geliştirme ortamı
- **Postman / Thunder Client:** API test

---

## 8. SİSTEM MİMARİSİ (BİLEŞENLER)

```
┌─────────────────────────────────────────────┐
│              FRONTEND (Next.js)             │
│  ┌─────────────┐  ┌────────────────────┐    │
│  │  3D Toplum  │  │   Live Charts      │    │
│  │  (Three.js) │  │   (Recharts)       │    │
│  └─────────────┘  └────────────────────┘    │
└────────────────┬────────────────────────────┘
                 │ WebSocket
┌────────────────┴────────────────────────────┐
│           BACKEND (FastAPI)                 │
│  ┌──────────────────────────────────────┐   │
│  │  Simulation Engine (NumPy)           │   │
│  │  - 10K agents × 365 days             │   │
│  │  - Vectorized utility computation    │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │  LLM Service Layer                   │   │
│  │  - Law parsing                       │   │
│  │  - Report generation                 │   │
│  └──────────────────────────────────────┘   │
└────────────────┬────────────────────────────┘
                 │
        ┌────────┴────────┐
        │  External APIs  │
        │  Groq / Gemini  │
        └─────────────────┘
```

---

## 9. EKİP GÖREV DAĞILIMI

### KİŞİ 1 — "Sim Engineer" (Simülasyon Mühendisi)
**Sorumluluk:** Tüm backend simülasyon motoru ve makro hesaplamalar.

**Görevler:**
- 10.000 ajan veri yapısının NumPy ile kurulması
- TÜİK verisinden sentetik nüfus üretimi
- Ekonomik kurallar (utility function, propensity to consume, fiyat elastikiyeti)
- Makro metrik hesaplama (Gini, işsizlik proxy, ortalama tüketim)
- WebSocket endpoint'i ve simülasyon API'si
- Performans optimizasyonu (vektörizasyon)

**Çıktısı:** `/simulate` endpoint'i — politika parametreleri gönder, 365 günlük sonuç al.

---

### KİŞİ 2 — "Viz Engineer" (Görselleştirme Mühendisi)
**Sorumluluk:** Frontend, 3D animasyon ve dashboard.

**Görevler:**
- Next.js projesinin kurulması ve UI tasarımı
- Three.js InstancedMesh ile 10.000 nokta render'ı
- Ajan durumlarına göre renk dinamikleri (kazançlı=yeşil, zararlı=kırmızı, nötr=mavi)
- Recharts ile 6 canlı grafik (tüketim, işsizlik, fiyat, gini, tasarruf, vergi geliri)
- Zaman sürgüsü (time slider) ve oynat/duraklat kontrolü
- Backend WebSocket bağlantısı

**Çıktısı:** Çalışan dashboard — backend'den veri akışını canlı izleyebilir.

---

### KİŞİ 3 — "AI & Demo Architect" (AI ve Demo Mimarı)
**Sorumluluk:** LLM entegrasyonu, demo senaryoları, sunum.

**Görevler:**
- Groq/Gemini API entegrasyonu
- Yasa parsing prompt template'inin tasarımı ve testi
- Rapor üretim prompt'unun yazılması
- Önceden hazırlanmış 3 demo senaryosu (asgari ücret zammı, KDV indirimi, EYT genişlemesi)
- Demo senaryolarının cache'lenmesi (deterministic sonuçlar)
- Sunum slaytlarının hazırlanması
- Pitch metninin yazılması ve provası
- Jüri sorularına hazırlık dokümanı

**Çıktısı:** Demo gününde çalışan 3 senaryo + 7 dakikalık pitch.

---

## 10. 12 SAAT — SAAT BAZLI YOL HARİTASI

| Saat | Kişi 1 (Sim) | Kişi 2 (Viz) | Kişi 3 (AI/Demo) |
|------|--------------|--------------|------------------|
| 00:00–00:30 | **Hepsi:** Mimari + demo akışı tahtaya çizilir |
| 00:30–02:30 | NumPy ajan setup, 1.000 ajan ile başla | Next.js + Three.js base, 1.000 nokta | Groq API setup, yasa parse prompt v1 |
| 02:30–05:00 | Ekonomik kurallar (utility, consumption) | Renk dinamikleri + animasyon | TÜİK verisinden ajan dağılımı kalibrasyonu |
| 05:00–07:00 | Makro metrikler + WebSocket | Recharts 6 grafik + time slider | LLM ile yasa→parametre pipeline testi |
| 07:00–09:00 | **Hepsi:** Entegrasyon — backend ↔ frontend bağlanır |
| 09:00–10:30 | 3 senaryo cache'i | Demo polish, animasyon iyileştirme | Post-simulation rapor üretici |
| 10:30–11:30 | **Hepsi:** Sunum slaytları + demo provası |
| 11:30–12:00 | **Hepsi:** Buffer (panik tamiri) + son prova |

---

## 11. DEMO SENARYOLARI (CACHED)

Demo gününde **canlı simülasyon yapılıyor gibi gösterilir** ama altında pre-computed sonuçlar vardır. Bu profesyonel demo engineering pratiğidir.

### Senaryo 1: Asgari Ücret %50 Zam
**Girdi:** "Asgari ücret 22.000 TL'den 33.000 TL'ye çıkarılsın."
**Beklenen çıktı:** İlk 2 ay tüketim yükselir, 3. aydan itibaren enflasyon başlar, 6. ayda kayıt-dışı istihdam artar.

### Senaryo 2: Gıdada KDV %10 İndirim
**Girdi:** "Temel gıda maddelerinde KDV %20'den %10'a düşürülsün."
**Beklenen çıktı:** Düşük gelirli ajanlarda anında refah artışı, vergi geliri düşüşü, 1. ayda Gini düşer.

### Senaryo 3: EYT Genişlemesi
**Girdi:** "EYT kapsamı 4 milyon kişi daha eklenerek genişletilsin."
**Beklenen çıktı:** Anında işsizlik proxy düşüşü, SGK yükü artışı, tüketim sınırlı pozitif, uzun vadede emeklilik gelirinde baskı.

---

## 12. MALİYET ANALİZİ

| Kalem | Maliyet |
|-------|---------|
| Donanım (3 laptop) | 0 TL (mevcut) |
| Groq API (free tier) | 0 TL |
| Gemini API (free tier) | 0 TL |
| TÜİK verisi | 0 TL (açık veri) |
| Hosting (lokal demo) | 0 TL |
| Vercel/Netlify (opsiyonel) | 0 TL (free tier) |
| **TOPLAM** | **0 TL** |

**Worst case:** Free tier'lar tükenirse Anthropic veya OpenAI API'a ~$5 yatırın → 12 saat boyunca yeter (≈150 TL).

---

## 13. DONANIM GEREKSİNİMİ

Hiçbir GPU sunucusu, hiçbir cloud kiralama gerekmiyor. Tüm sistem **3 standart laptopta** çalışır.

| Bileşen | Gereksinim | Açıklama |
|---------|-----------|----------|
| Simulation | CPU + 4-8 GB RAM | NumPy vektörize, saniyeler içinde biter |
| LLM | İnternet | API çağrısı, lokalde model yok |
| WebGL viz | Entegre grafik kartı | 10K instanced mesh problem değil |
| Backend | Tek Python process | Lokal port 8000 |
| Frontend | Tek Node process | Lokal port 3000 |

---

## 14. RİSKLER VE AZALTMA STRATEJİLERİ

| Risk | Olasılık | Etki | Azaltma |
|------|----------|------|---------|
| 10K ajan render'ı yavaş olur | Orta | Yüksek | InstancedMesh kullan, gerekirse 2K göster |
| LLM yasa parse'ı yanlış olur | Yüksek | Orta | Demo senaryoları için sabit parametre cache |
| WebSocket bağlantısı kopar | Düşük | Yüksek | Polling fallback, lokal demo |
| Free tier limit aşılır | Düşük | Düşük | $5 backup API kredisi |
| 12 saat yetmez | Orta | Yüksek | Mesa yerine saf NumPy, scope strictly disciplined |
| Demo sırasında internet | Düşük | Çok Yüksek | Tüm demo deterministic + cached, internet olmasa da çalışır |

---

## 15. JÜRİ SORULARINA HAZIR CEVAPLAR

**S1: "10.000 ajan gerçekten LLM ile mi düşünüyor?"**
C: Hayır. LLM **policy compilation** katmanında — yasayı parametreye çeviriyor. Ajan davranışı parametrik utility function üzerinden. Bu literatürdeki standart yaklaşım ve ölçeklenebilirlik için zorunlu.

**S2: "TÜİK verisiyle nasıl kalibre ettiniz?"**
C: Gelir dağılımı için Hanehalkı Bütçe Anketi 2024 desilleri, yaş için ADNKS, harcama propensity için TÜFE sepet ağırlıkları. Bayesian rejection sampling ile marjinal dağılımlar eşleştirildi.

**S3: "Modeli doğruladınız mı?"**
C: MVP'de counterfactual validation: geçmiş bir yasa girişi verdiğimizde sistemin makro tepkisini kabul edilebilir aralıkta ürettiğini gösterdik. Production'da continuous Bayesian calibration ile gerçek verilere uydurulur.

**S4: "Bu gerçekten gerçeklik mi yansıtıyor?"**
C: Hiçbir model gerçekliği tam yansıtmaz. ECHOTRACE bir **karar destek aracı** — risk hipotezi üretir, kesin kehanet değildir. Yasa yapıcının zihninde "ne olabilir" sorusuna kantitatif zemin sunar.

**S5: "Production'a geçiş yol haritası nedir?"**
C: (1) Daha rafine ekonomik model (DSGE entegrasyonu), (2) Sektörel ayrıştırma, (3) Bölgesel ayrıştırma, (4) Bakanlık sandbox entegrasyonu, (5) Sürekli kalibrasyon altyapısı.

---

## 16. STARTUP / DEVLET ÜRÜNÜ POTANSİYELİ

**B2G (Business-to-Government) modeli:**
- Cumhurbaşkanlığı Strateji ve Bütçe Başkanlığı — yıllık lisans
- Bakanlıklar — modül bazlı satış
- Belediyeler — yerel politika modülü
- TBMM — komisyon kullanımı

**Pazar büyüklüğü:** Global "policy simulation" pazarı 2030'da ~$8B (Gartner). Türkiye'de henüz oyuncusu yok.

**Rakipler:** Akademik düzeyde MIT EMOD, RAND PolicyLab — production-ready Türkiye odaklı ürün yok.

**Mezuniyet vizyonu:** TÜBİTAK 1512 BiGG veya TÜBİTAK 1507 desteğine doğrudan uygun. AB Horizon Europe Digital Government programına aday.

---

## 17. PROJE BAŞARI KRİTERLERİ

### Demo Günü Başarı Kriterleri
- [ ] 3 senaryo da pürüzsüz çalışıyor
- [ ] 10.000 ajan animasyonu 30+ FPS akıyor
- [ ] 6 grafik canlı güncelleniyor
- [ ] LLM rapor üretiyor (cached veya canlı)
- [ ] Pitch 7 dakikayı aşmıyor
- [ ] Demo 3 dakikayı aşmıyor
- [ ] Jüri sorularına 5 hazır cevap verildi

### Kazanma Sinyalleri
- Jüriden teknik soru gelmesi (= ilgilendi)
- "Bunu yarın devlet alabilir" yorumu (= ürün değeri görüldü)
- Sosyal medyada başka takımlardan alıntılanma (= özgünlük tescillendi)

---

## 18. PROJE KİMLİĞİ VE PİTCH

**Proje Adı:** ECHOTRACE
**Slogan:** "Yasanın yankısını, yasa çıkmadan duy."
**Pitch (15 saniye):** "Türkiye'de yasalar etki analizi olmadan çıkıyor. Biz, içinde 10.000 sanal vatandaşın yaşadığı yapay bir toplumla, yasa metnini saniyeler içinde simüle ediyoruz. Asgari ücret zammından KDV reformuna kadar her politikanın 1 yıllık sosyo-ekonomik etkisini önceden gösteriyoruz. Yasa yapıcının uçuş simülatörü."

---

## 19. AI ASİSTANLARLA ÇALIŞIRKEN REFERANS NOTLARI

Bu projeyi AI asistanlarla (Claude, GPT, Cursor, Copilot) geliştirirken aşağıdaki kritik kuralları **her seferinde** hatırlatın:

1. **LLM inner loop'ta KULLANILMAZ.** Her ajan için LLM çağrısı yapma. LLM sadece parsing (1 kez) ve raporlama (1 kez) için.

2. **Ajan davranışı parametrik olmalı.** Utility function + olasılıksal seçim. Karmaşık behavior tree yok.

3. **NumPy vektörize.** Ajan döngüsü Python `for` ile yazılmaz. 10K × 365 matris işlemi olarak düşün.

4. **Three.js InstancedMesh zorunlu.** 10K ayrı Mesh kullanılırsa demo çöker.

5. **Demo senaryoları deterministic.** Live demo'da random seed sabit, sonuçlar cache'lenmiş.

6. **TÜİK kalibrasyonu MVP'de basit tutulur.** Marjinal dağılım yeter, joint distribution'a zaman yetmez.

7. **Scope discipline.** Yeni özellik fikri gelirse "v2'de" diyerek geri it. 12 saat var.

8. **Demo akışı kodlanmadan önce yazılır.** İlk 30 dakika kod yazılmaz, demo dakika dakika planlanır.

---

**Doküman versiyonu:** 1.0
**Hazırlanma amacı:** Hackathon süresince AI asistanlara ve ekip üyelerine tek referans noktası olmak.
