import { PROVINCES } from "./turkeyData";
import type { ProvinceStats } from "./provinceSimulation";

export interface DemoLogEntry {
  day: number;
  level: "info" | "warn" | "critical";
  msg: string;
}

// İstanbul (34), Ankara (6) → Erzurum (25) bölgesi demo için log akışı
export const DEMO_LOGS: DemoLogEntry[] = [
  // ── BAHAR (1-90) ──────────────────────────────────────
  { day: 3,   level: "info",     msg: "6301 Tersine Göç Paketi onaylandı. Sistem devreye alınıyor... [OK]" },
  { day: 8,   level: "info",     msg: "İlk başvuru dalgası: 1.247 beyaz yakalı hibe talebinde bulundu." },
  { day: 18,  level: "info",     msg: "Erzurum konut satışları %340 arttı. Tüketim harcamaları canlanıyor." },
  { day: 29,  level: "info",     msg: "Yerel perakende satışları %22 büyüme kaydetti. 138 yeni iş yeri açıldı." },
  { day: 42,  level: "info",     msg: "Erzurum üniversitesi çevresinde lüks konut projeleri başladı." },
  { day: 55,  level: "info",     msg: "İstihdam artışı: Hizmet sektöründe 2.400 yeni pozisyon oluştu." },
  { day: 67,  level: "info",     msg: "Tersine göç ivme kazanıyor. Aylık 340 yeni beyaz yaka Erzurum'a yerleşiyor." },
  { day: 80,  level: "info",     msg: "Tüketim endeksi: Erzurum Türkiye ortalamasını %18 aştı. Ekonomi canlandı." },
  // ── SARI ALARM (91-180) ───────────────────────────────
  { day: 93,  level: "warn",     msg: "Kiralık konut stoku kritik seviyelere geriledi. Talep/Arz oranı: 4.2x" },
  { day: 106, level: "warn",     msg: "Erzurum merkez kira ortalaması %68 artışla 18.400 TL'ye ulaştı." },
  { day: 118, level: "warn",     msg: "UYARI: Yerel halkın %31'i kira yükünü karşılayamadığını bildirdi." },
  { day: 132, level: "warn",     msg: "UYARI: Konut spekülasyonu ivme kazandı. 847 bağımsız birim boş tutuluyor." },
  { day: 145, level: "warn",     msg: "UYARI: Erzurum belediyesi 'acil konut krizi' ilan etti." },
  { day: 158, level: "warn",     msg: "UYARI: Esnaf personel bulmakta zorlanıyor. Maaş talebi karşılanamıyor." },
  { day: 171, level: "warn",     msg: "UYARI: İlk yerinden edilme vakaları. 340 yerel hane kirasını ödeyemedi." },
  // ── KIRMIZI ÇÖKÜŞ (181-365) ───────────────────────────
  { day: 185, level: "critical", msg: "KRİTİK: Yerel halkta evsizlik %400 arttı. Barınak kapasitesi doldu." },
  { day: 198, level: "critical", msg: "KRİTİK: Hizmet sektörü çöküyor. 234 esnaf kepenk kapattı." },
  { day: 215, level: "critical", msg: "KRİTİK: Sosyal çatışma endeksi kritik eşiği aştı. Protesto olayları başladı." },
  { day: 235, level: "critical", msg: "KRİTİK: Göç dalgası tersine döndü. Gelenlerin %18'i kenti terk ediyor." },
  { day: 252, level: "critical", msg: "KRİTİK: Erzurum ekonomisi durgunluk sarmalına girdi. GDP sapması: -12.3%" },
  { day: 270, level: "critical", msg: "KRİTİK: Hibe alan beyaz yakaların %41'i ilk yıl içinde kenti terk etti." },
  { day: 288, level: "critical", msg: "KRİTİK: Yerel asgari ücretli hanelerin %67'si harcama kesintisine gitti." },
  { day: 310, level: "critical", msg: "KRİTİK: Toplumsal refah endeksi 2019 düzeyinin altına geriledi." },
  { day: 335, level: "critical", msg: "KRİTİK KELEBEK ETKİSİ: İstanbul'da da ikincil mağduriyetler gözlemleniyor." },
  { day: 355, level: "critical", msg: "Simülasyon tamamlandı. AI Policy Optimizer analizi hazır. ██████████ %100" },
];

// Erzurum bölgesi hedef iller
const BENEFICIARY = new Set(["25","24","36","69","75","76","4","8","29","68"]);
// Komşu spillover iller
const SPILLOVER    = new Set(["23","18","19","5","60","12","66","57","37"]);
// Kaynak büyük şehirler
const SOURCE       = new Set(["34","6"]);
// İkincil etkilenen
const SEC_SOURCE   = new Set(["16","26","41","35"]);

function s(id: number, n: number) { return Math.abs(Math.sin(id * 127.1 + n * 311.7)) % 1; }

export function computeDemoProvinceStats(day: number): ProvinceStats[] {
  const t1 = Math.min(1, day / 90);
  const t2 = Math.max(0, Math.min(1, (day - 90)  / 90));
  const t3 = Math.max(0, Math.min(1, (day - 180) / 185));

  return PROVINCES.map(p => {
    const pid  = parseInt(p.id);
    const n1   = (s(pid, 3) - 0.5) * 0.03;
    const n2   = (s(pid, 7) - 0.5) * 0.02;
    let score  = n1;

    if (BENEFICIARY.has(p.id)) {
      // Faz 1: yükseliş → faz 2: düşüş → faz 3: çöküş
      score = 0.38 * t1 - 0.53 * t2 - 0.32 * t3 + n1;
    } else if (SPILLOVER.has(p.id)) {
      score = 0.16 * t1 - 0.22 * t2 - 0.14 * t3 + n1;
    } else if (SOURCE.has(p.id)) {
      // İstanbul/Ankara: yetenek kaybı ile başlar, sonra ikincil kriz
      score = -0.22 * t1 * (1 - t2 * 0.4) - 0.10 * t3 + n1;
    } else if (SEC_SOURCE.has(p.id)) {
      score = -0.06 * t1 - 0.04 * t3 + n1;
    }

    score = Math.max(-0.5, Math.min(0.5, score));
    const winnerPct    = Math.max(0.05, Math.min(0.90, 0.30 + score * 0.6));
    const loserPct     = Math.max(0.05, Math.min(0.90, 0.30 - score * 0.6));
    const baseUnemp    = 0.08 + s(pid, 9) * 0.15;
    const unemployment = Math.max(0.04, baseUnemp - score * 0.06);

    return {
      id: p.id, name: p.name, score, winnerPct, loserPct, unemployment,
      consumption: 5500 * (1 + score * 0.4),
      inflation:   1.15 - score * 0.08 + t3 * 0.15,
      gini:        0.41 + t3 * 0.04 + n2,
      agentCount:  Math.max(50, Math.round(p.population / 100000) * 10),
    };
  });
}

export function getDemoPhaseLabel(day: number): { label: string; color: string } {
  if (day <= 90)  return { label: "🌱 BAHAR — Ekonomik Canlanma",   color: "#22c55e" };
  if (day <= 180) return { label: "⚠️ SARI ALARM — Konut Krizi",    color: "#facc15" };
  return              { label: "🔴 KIRMIZI ÇÖKÜŞ — Barınma Felaketi", color: "#ef4444" };
}
