import type { ScenarioKey } from "./mockData";

export interface AlertDef {
  id: string;
  provinceId: string;
  provinceName: string;
  lat: number;
  lon: number;
  message: string;
  detail: string;
  triggerDay: number;
  severity: "critical" | "warning" | "success";
}

const ALERTS: Record<ScenarioKey, AlertDef[]> = {
  minWage: [
    {
      id: "mw-1",
      provinceId: "34", provinceName: "İstanbul", lat: 41.01, lon: 28.95,
      message: "KRİTİK: İstanbul'da kira ödeyememe oranı %24'ü aştı!",
      detail: "Hanelerin %38'i kirasını karşılamakta güçlük çekiyor. Konut bütçe payı %52'ye ulaştı.",
      triggerDay: 210, severity: "critical",
    },
    {
      id: "mw-2",
      provinceId: "6", provinceName: "Ankara", lat: 39.91, lon: 32.85,
      message: "UYARI: Ankara'da informal sektör istihdamı %12 arttı",
      detail: "Asgari ücret artışı küçük işletmelerde kayıt dışı çalışmayı tetikledi.",
      triggerDay: 150, severity: "warning",
    },
    {
      id: "mw-3",
      provinceId: "35", provinceName: "İzmir", lat: 38.42, lon: 27.13,
      message: "KRİTİK: İzmir'de tüketim balonlanması tespit edildi!",
      detail: "İthal tüketim malları talebinde ani yükseliş. Döviz baskısı riski oluşuyor.",
      triggerDay: 270, severity: "critical",
    },
  ],
  vat: [
    {
      id: "vat-1",
      provinceId: "34", provinceName: "İstanbul", lat: 41.01, lon: 28.95,
      message: "UYARI: İstanbul'da kayıt dışı gıda satışı artıyor",
      detail: "KDV indirimi beklentisi bazı ürünlerde stok birikimine yol açtı.",
      triggerDay: 60, severity: "warning",
    },
    {
      id: "vat-2",
      provinceId: "63", provinceName: "Şanlıurfa", lat: 37.16, lon: 38.80,
      message: "KRİTİK: Şanlıurfa'da gıda güvencesi kriz eşiğinde!",
      detail: "KDV indirimi bölgeye ulaşmadı. Dağıtım zinciri aksaklıkları sürüyor.",
      triggerDay: 120, severity: "critical",
    },
    {
      id: "vat-3",
      provinceId: "9", provinceName: "Aydın", lat: 37.84, lon: 27.84,
      message: "UYARI: Aydın'da tarımsal enflasyon %18'e ulaştı",
      detail: "Gıda KDV indirimine karşın hammadde maliyetleri sektörü baskı altında tutuyor.",
      triggerDay: 200, severity: "warning",
    },
  ],
  eyt: [
    {
      id: "eyt-1",
      provinceId: "6", provinceName: "Ankara", lat: 39.91, lon: 32.85,
      message: "KRİTİK: SGK prim tahsilatı kritik seviyenin altına düştü!",
      detail: "EYT kapsamının genişlemesi sosyal güvenlik sisteminde kısa vadeli finansman baskısı yaratıyor.",
      triggerDay: 90, severity: "critical",
    },
    {
      id: "eyt-2",
      provinceId: "7", provinceName: "Antalya", lat: 36.90, lon: 30.70,
      message: "UYARI: Antalya'da işgücü arzı hızla daralıyor",
      detail: "EYT kapsamındaki çalışanların %22'si emekliliğe ayrılmayı planlıyor.",
      triggerDay: 150, severity: "warning",
    },
    {
      id: "eyt-3",
      provinceId: "34", provinceName: "İstanbul", lat: 41.01, lon: 28.95,
      message: "KRİTİK: İstanbul sanayisinde üretim kapasitesi daralıyor!",
      detail: "Deneyimli işgücünün erken emekliliği bazı sektörlerde üretim açığı yaratıyor.",
      triggerDay: 240, severity: "critical",
    },
  ],
};

export function getActiveAlerts(day: number, scenario: ScenarioKey): AlertDef[] {
  return ALERTS[scenario].filter(a => day >= a.triggerDay && day < a.triggerDay + 65);
}

// ── DEMO SENARYOSU: 6301 Tersine Göç Paketi ──────────────────────────────────
const DEMO_ALERTS: AlertDef[] = [
  // FAZ 1: Bahar — Yeşil canlanma
  {
    id: "d-1", provinceId: "25", provinceName: "Erzurum", lat: 39.90, lon: 41.27,
    message: "CANLANMA: İlk tersine göç dalgası başladı!",
    detail: "1.247 beyaz yakalı hibe başvurusunu tamamladı. Erzurum'da tüketim %22 büyüdü.",
    triggerDay: 18, severity: "success",
  },
  {
    id: "d-2", provinceId: "25", provinceName: "Erzurum", lat: 39.90, lon: 41.27,
    message: "BÜYÜME: 138 yeni iş yeri, 2.400 yeni istihdam!",
    detail: "Hizmet sektörü kapasitesi 3 ayda %31 genişledi. Ekonomik canlanma hedefi aşıldı.",
    triggerDay: 55, severity: "success",
  },
  {
    id: "d-3", provinceId: "34", provinceName: "İstanbul", lat: 41.01, lon: 28.95,
    message: "UYARI: İstanbul'da beyaz yaka göçü ivme kazandı",
    detail: "Aylık ortalama 340 nitelikli çalışan İstanbul'u terk ediyor. Bazı sektörlerde personel baskısı oluşuyor.",
    triggerDay: 72, severity: "warning",
  },
  // FAZ 2: Sarı Alarm — Konut krizi
  {
    id: "d-4", provinceId: "25", provinceName: "Erzurum", lat: 39.90, lon: 41.27,
    message: "UYARI: Erzurum'da kiralık konut tükeniyor!",
    detail: "Talep/arz oranı 4.2x'e ulaştı. Kira ortalaması %68 artışla 18.400 TL'ye yükseldi.",
    triggerDay: 98, severity: "warning",
  },
  {
    id: "d-5", provinceId: "25", provinceName: "Erzurum", lat: 39.90, lon: 41.27,
    message: "UYARI: Yerel halkın %31'i kira krizinde!",
    detail: "Belediye acil konut krizi ilan etti. 847 bağımsız birim spekülatif amaçlı boş tutuluyor.",
    triggerDay: 140, severity: "warning",
  },
  // FAZ 3: Kırmızı Çöküş
  {
    id: "d-6", provinceId: "25", provinceName: "Erzurum", lat: 39.90, lon: 41.27,
    message: "KRİTİK: Evsizlik %400 arttı! Barınak kapasitesi doldu.",
    detail: "Yerel halkın %23'ü konut erişimini yitirdi. Hizmet sektörü %67 kapasitede çalışıyor.",
    triggerDay: 190, severity: "critical",
  },
  {
    id: "d-7", provinceId: "34", provinceName: "İstanbul", lat: 41.01, lon: 28.95,
    message: "KRİTİK KELEBEK ETKİSİ: İstanbul ikincil krizde!",
    detail: "Erzurum'dan dönen göçmenler İstanbul konut piyasasında yeni baskı yaratıyor.",
    triggerDay: 248, severity: "critical",
  },
  {
    id: "d-8", provinceId: "25", provinceName: "Erzurum", lat: 39.90, lon: 41.27,
    message: "FELAKET: Hizmet sektörü çöktü. 234 esnaf kepenk kapattı.",
    detail: "Yasa kapsamındaki göçmenlerin %41'i kenti terk etti. Yerel ekonomi 2019 düzeyinin altında.",
    triggerDay: 308, severity: "critical",
  },
];

export function getDemoAlerts(day: number): AlertDef[] {
  return DEMO_ALERTS.filter(a => day >= a.triggerDay && day < a.triggerDay + 70);
}

export function getAllTriggeredAlerts(day: number, scenario: ScenarioKey): AlertDef[] {
  return ALERTS[scenario].filter(a => day >= a.triggerDay);
}

// Convert lat/lon to approximate % position in the SVG map container
// Calibrated for react-simple-maps geoMercator rotate[-35,-38.5,0] scale 3200
export function latLonToMapPct(lat: number, lon: number): { x: number; y: number } {
  const x = 0.05 + 0.87 * (lon - 25.7) / 19.1;
  const y = 0.05 + 0.83 * (42.1 - lat) / 6.3;
  return { x: Math.max(0.04, Math.min(0.93, x)), y: Math.max(0.04, Math.min(0.93, y)) };
}
