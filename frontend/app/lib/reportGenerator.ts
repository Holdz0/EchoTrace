import type { ScenarioKey } from "./mockData";
import type { ProvinceStats } from "./provinceSimulation";

const SCENARIO_NAMES: Record<ScenarioKey, string> = {
  minWage: "Asgari Ücret %50 Artışı",
  vat:     "Gıdada KDV %10 İndirim",
  eyt:     "EYT (Erken Emeklilik) Genişlemesi",
};

function getDemoPhase(day: number): { num: number; name: string; color: string } {
  if (day <= 90)  return { num: 1, name: "FAZ 1 — İlk Canlanma (Bahar)",       color: "#22c55e" };
  if (day <= 180) return { num: 2, name: "FAZ 2 — Konut Krizi Uyarısı (Yaz)", color: "#f59e0b" };
  return           { num: 3, name: "FAZ 3 — Çöküş ve Kelebek Etkisi (Güz/Kış)", color: "#ef4444" };
}

function demoSummary(day: number, erzurumStats: ProvinceStats | undefined, istanbulStats: ProvinceStats | undefined): string {
  const phase = getDemoPhase(day);
  const erzUnemp = erzurumStats ? (erzurumStats.unemployment * 100).toFixed(1) : "—";
  const erzScore = erzurumStats ? (erzurumStats.score * 100).toFixed(1) : "—";
  const istScore = istanbulStats ? (istanbulStats.score * 100).toFixed(1) : "—";

  if (phase.num === 1) {
    return `6301 Sayılı Tersine Göç Teşvik Paketi'nin ${day}. gün simülasyonu FAZ 1 — İlk Canlanma aşamasındadır. Erzurum başta olmak üzere Doğu Anadolu illerinde hibe programına 1.247 başvuru tamamlanmış, tüketim endeksi %22 büyüme kaydetmiştir. İstanbul'dan kademeli beyaz yaka göçü henüz yönetilebilir seviydedir. Erzurum etki skoru: ${erzScore > "0" ? "+" : ""}${erzScore}/100. Politikanın birinci fazı beklentilerin üzerinde performans göstermektedir.`;
  }
  if (phase.num === 2) {
    return `6301 Sayılı Tersine Göç Paketi ${day}. gün itibarıyla FAZ 2 — Konut Krizi Uyarısı aşamasına geçmiştir. Erzurum'da kiralık konut talep/arz oranı 4.2x'e ulaşmış, kira ortalaması %68 artışla 18.400 TL'ye yükselmiştir. Yerel halkın %31'i kira krizinde olduğunu beyan etmektedir. Erzurum etki skoru: ${erzScore}/100 (düşüş eğiliminde). İstanbul etki skoru: ${istScore}/100. Acil konut arzı müdahalesi için Faz 3 öncesinde politika revizyonu önerilmektedir.`;
  }
  return `6301 Sayılı Tersine Göç Paketi ${day}. gün itibarıyla FAZ 3 — Çöküş ve Kelebek Etkisi aşamasındadır. Erzurum'da evsizlik oranı %400 artmış, 234 esnaf kepenk kapamış, hizmet sektörü %67 kapasitede çalışmaktadır. Politika kapsamındaki göçmenlerin %41'i kenti terk etmiştir. İstanbul'da dönüş göçü kaynaklı ikincil konut baskısı oluşmaktadır (etki skoru: ${istScore}/100). EchoTrace Yapay Zeka Politika Optimize'i iki kritik müdahale önermektedir: (1) TOKİ Dijital Lojman Programı, (2) 5 yıllık vergi muafiyeti ve yerel işe alım fonu. Acil müdahale olmaksızın ekonomik çöküş kaçınılmazdır.`;
}

function demoFinalReportHtml(provinceStats: ProvinceStats[], today: string): string {
  const erzurumStats  = provinceStats.find(p => p.id === "25");
  const istanbulStats = provinceStats.find(p => p.id === "34");
  const beneficiaryIds = new Set(["25","24","36","69","75","76","4","8","29","68"]);
  const sourceIds      = new Set(["34","6"]);
  const beneficiaries  = provinceStats.filter(p => beneficiaryIds.has(p.id)).sort((a, b) => b.score - a.score);
  const sources        = provinceStats.filter(p => sourceIds.has(p.id)).sort((a, b) => a.score - b.score);

  const provinceRow = (p: ProvinceStats, isBeneficiary: boolean) => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td class="${p.score >= 0 ? "pos" : "neg"}">${p.score >= 0 ? "+" : ""}${(p.score * 100).toFixed(1)}</td>
      <td>${(p.unemployment * 100).toFixed(1)}%</td>
      <td>${isBeneficiary ? Math.round(p.consumption).toLocaleString("tr-TR") + " ₺" : ((p.inflation - 1) * 100).toFixed(1) + "%"}</td>
    </tr>`;

  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">
<title>EchoTrace — 6301 Nihai Simülasyon Raporu</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Times New Roman",serif;background:#fff;color:#111;font-size:11.5pt;line-height:1.5}
.page{max-width:820px;margin:0 auto;padding:36px 48px}
.hdr{text-align:center;border-bottom:3px solid #1a1a6e;padding-bottom:18px;margin-bottom:26px}
.flag{font-size:44pt;margin-bottom:6px}
.min{font-size:13pt;font-weight:bold;color:#1a1a6e;letter-spacing:1px}
.sub{font-size:10.5pt;color:#444;margin-top:3px}
.rtitle{font-size:16pt;font-weight:bold;color:#1a1a6e;margin-top:18px;text-transform:uppercase;letter-spacing:2px}
.rsubtitle{font-size:11pt;color:#555;margin-top:5px}
.rmeta{font-size:9.5pt;color:#777;margin-top:10px}
.verdict{border-radius:6px;padding:12px 18px;margin:18px 0;font-weight:bold;font-size:11.5pt;text-align:center;background:#fef2f218;border:2px solid #ef4444aa;color:#dc2626}
.sec{margin-bottom:24px}
.stitle{font-size:12pt;font-weight:bold;color:#1a1a6e;border-left:4px solid #1a1a6e;padding-left:9px;margin-bottom:12px;text-transform:uppercase;letter-spacing:.8px}
.faz-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:18px}
.faz-box{border-radius:6px;padding:12px 14px;text-align:center}
.faz-title{font-size:8.5pt;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
.faz-score{font-size:20pt;font-weight:bold;margin:4px 0}
.faz-desc{font-size:8pt;color:#555;line-height:1.4}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px}
.box{background:#f0f4ff;border:1px solid #c0cef0;border-radius:4px;padding:10px 14px}
.lbl{font-size:8.5pt;color:#555;text-transform:uppercase;letter-spacing:.4px}
.val{font-size:19pt;font-weight:bold;color:#1a1a6e;margin-top:3px}
table{width:100%;border-collapse:collapse;font-size:9.5pt}
th{background:#1a1a6e;color:#fff;padding:7px 9px;text-align:left;font-weight:600}
td{padding:6px 9px;border-bottom:1px solid #e0e0e0}
tr:nth-child(even) td{background:#f8f9ff}
.pos{color:#15803d;font-weight:bold}
.neg{color:#dc2626;font-weight:bold}
.summary{background:#f8f9ff;border:1px solid #c0cef0;border-radius:4px;padding:14px 18px;font-size:10.5pt;line-height:1.8;text-align:justify}
.timeline{border-left:3px solid #1a1a6e;padding-left:16px;margin:12px 0}
.tl-item{margin-bottom:14px;position:relative}
.tl-dot{width:10px;height:10px;border-radius:50%;position:absolute;left:-21px;top:4px}
.tl-day{font-size:8.5pt;color:#777;margin-bottom:2px}
.tl-msg{font-size:10pt;font-weight:600}
.tl-detail{font-size:9pt;color:#555;margin-top:2px}
.rec{border-radius:6px;padding:12px 16px;margin-bottom:10px}
.sigs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin-top:38px;text-align:center}
.sig{border-top:1px solid #333;padding-top:7px;margin-top:48px;font-size:8.5pt;color:#555}
.foot{border-top:2px solid #1a1a6e;padding-top:14px;margin-top:36px;display:flex;justify-content:space-between;font-size:8.5pt;color:#777}
.wm{text-align:center;margin-top:18px;font-size:8.5pt;color:#aaa;font-style:italic}
.printbtn{text-align:center;margin-top:28px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.printbtn{display:none}}
</style></head><body>
<div class="page">
  <div class="hdr">
    <div class="flag">🇹🇷</div>
    <div class="min">TÜRKİYE CUMHURİYETİ</div>
    <div class="sub">Hazine ve Maliye Bakanlığı — Ekonomi Politikaları Genel Müdürlüğü</div>
    <div class="rtitle">6301 Sayılı Kanun — Tersine Göç Teşvik Paketi</div>
    <div class="rsubtitle">12 Aylık Tam Simülasyon Nihai Değerlendirme Raporu</div>
    <div class="rmeta">Rapor Tarihi: ${today} &nbsp;|&nbsp; Simülasyon Süresi: 365 Gün (Tam Yıl) &nbsp;|&nbsp; Sistem: EchoTrace v1.0</div>
  </div>

  <div class="verdict">
    ⚠ NİHAİ KARAR: Yasa mevcut haliyle sürdürülemez. Erzurum ekonomisi 2019 düzeyinin altına geriledi.
    EchoTrace AI Politika Optimize müdahalesi olmadan 6301 Tersine Göç Paketi olumsuz sonuçlanmaktadır.
  </div>

  <div class="sec">
    <div class="stitle">Faz Bazlı Sonuç Özeti</div>
    <div class="faz-grid">
      <div class="faz-box" style="background:#f0fdf4;border:1px solid #86efac">
        <div class="faz-title" style="color:#15803d">FAZ 1 — Bahar (Gün 0–90)</div>
        <div class="faz-score" style="color:#15803d">✅ BAŞARILI</div>
        <div class="faz-desc">1.247 hibe başvurusu tamamlandı. Erzurum tüketimi %22 büyüdü. 138 yeni iş yeri, 2.400 istihdam. Politika beklentilerin üzerinde başladı.</div>
      </div>
      <div class="faz-box" style="background:#fffbeb;border:1px solid #fde68a">
        <div class="faz-title" style="color:#b45309">FAZ 2 — Yaz (Gün 91–180)</div>
        <div class="faz-score" style="color:#b45309">⚠ KRİZ</div>
        <div class="faz-desc">Konut talep/arz oranı 4.2x'e fırladı. Kira ortalaması %68 artışla 18.400 TL. Yerel halkın %31'i kira krizine girdi. Belediye acil durum ilan etti.</div>
      </div>
      <div class="faz-box" style="background:#fef2f2;border:1px solid #fca5a5">
        <div class="faz-title" style="color:#dc2626">FAZ 3 — Güz/Kış (Gün 181–365)</div>
        <div class="faz-score" style="color:#dc2626">🔴 ÇÖKÜŞ</div>
        <div class="faz-desc">Evsizlik %400 arttı. 234 esnaf kapandı. Göçmenlerin %41'i kenti terk etti. İstanbul'da kelebek etkisi. Yerel ekonomi 2019 düzeyinin altına indi.</div>
      </div>
    </div>
  </div>

  <div class="sec">
    <div class="stitle">Nihai İstatistikler — Gün 365</div>
    <div class="grid2">
      <div class="box"><div class="lbl">Erzurum Nihai Etki Skoru</div><div class="val" style="color:${erzurumStats && erzurumStats.score >= 0 ? "#15803d" : "#dc2626"}">${erzurumStats ? (erzurumStats.score >= 0 ? "+" : "") + (erzurumStats.score * 100).toFixed(1) : "—"}</div></div>
      <div class="box"><div class="lbl">İstanbul Nihai Etki Skoru</div><div class="val" style="color:${istanbulStats && istanbulStats.score >= 0 ? "#15803d" : "#dc2626"}">${istanbulStats ? (istanbulStats.score >= 0 ? "+" : "") + (istanbulStats.score * 100).toFixed(1) : "—"}</div></div>
      <div class="box"><div class="lbl">Erzurum İşsizlik (Yıl Sonu)</div><div class="val">${erzurumStats ? "%" + (erzurumStats.unemployment * 100).toFixed(1) : "—"}</div></div>
      <div class="box"><div class="lbl">Göçmenlerin Geri Dönüş Oranı</div><div class="val" style="color:#dc2626">%41</div></div>
    </div>
  </div>

  <div class="sec">
    <div class="stitle">12 Aylık Kronoloji — Kritik Olaylar</div>
    <div class="timeline">
      <div class="tl-item"><div class="tl-dot" style="background:#22c55e"></div><div class="tl-day">Gün 18</div><div class="tl-msg" style="color:#15803d">İlk tersine göç dalgası başladı</div><div class="tl-detail">1.247 beyaz yakalı hibe başvurusunu tamamladı. Tüketim %22 büyüdü.</div></div>
      <div class="tl-item"><div class="tl-dot" style="background:#22c55e"></div><div class="tl-day">Gün 55</div><div class="tl-msg" style="color:#15803d">138 yeni iş yeri, 2.400 yeni istihdam</div><div class="tl-detail">Hizmet sektörü kapasitesi 3 ayda %31 genişledi.</div></div>
      <div class="tl-item"><div class="tl-dot" style="background:#f59e0b"></div><div class="tl-day">Gün 72</div><div class="tl-msg" style="color:#b45309">İstanbul'da beyaz yaka göçü ivme kazandı</div><div class="tl-detail">Aylık 340 nitelikli çalışan İstanbul'u terk ediyor.</div></div>
      <div class="tl-item"><div class="tl-dot" style="background:#f59e0b"></div><div class="tl-day">Gün 98</div><div class="tl-msg" style="color:#b45309">Erzurum'da kiralık konut tükendi</div><div class="tl-detail">Talep/arz 4.2x, kira ortalaması 18.400 TL (+%68).</div></div>
      <div class="tl-item"><div class="tl-dot" style="background:#f59e0b"></div><div class="tl-day">Gün 140</div><div class="tl-msg" style="color:#b45309">Yerel halkın %31'i kira krizinde</div><div class="tl-detail">Belediye acil konut krizi ilan etti. 847 birim spekülatif boş.</div></div>
      <div class="tl-item"><div class="tl-dot" style="background:#ef4444"></div><div class="tl-day">Gün 190</div><div class="tl-msg" style="color:#dc2626">KRİTİK: Evsizlik %400 arttı</div><div class="tl-detail">Yerel halkın %23'ü konut erişimini yitirdi. Barınak kapasitesi doldu.</div></div>
      <div class="tl-item"><div class="tl-dot" style="background:#ef4444"></div><div class="tl-day">Gün 248</div><div class="tl-msg" style="color:#dc2626">Kelebek Etkisi: İstanbul ikincil krizde</div><div class="tl-detail">Erzurum'dan dönen göçmenler İstanbul konut piyasasını baskıladı.</div></div>
      <div class="tl-item"><div class="tl-dot" style="background:#ef4444"></div><div class="tl-day">Gün 308</div><div class="tl-msg" style="color:#dc2626">FELAKET: 234 esnaf kepenk kapattı</div><div class="tl-detail">Göçmenlerin %41'i kenti terk etti. Yerel ekonomi 2019 altında.</div></div>
    </div>
  </div>

  <div class="sec">
    <div class="stitle">Faydalanan İller — Doğu Anadolu Teşvik Bölgesi (Nihai)</div>
    <table><thead><tr><th>İl</th><th>Etki Skoru</th><th>İşsizlik</th><th>Tüketim</th></tr></thead>
    <tbody>${beneficiaries.map(p => provinceRow(p, true)).join("")}</tbody></table>
  </div>

  <div class="sec">
    <div class="stitle">Göç Kaynak İller — Büyükşehir Baskısı (Nihai)</div>
    <table><thead><tr><th>İl</th><th>Etki Skoru</th><th>İşsizlik</th><th>Enflasyon Baskısı</th></tr></thead>
    <tbody>${sources.map(p => provinceRow(p, false)).join("")}</tbody></table>
  </div>

  <div class="sec">
    <div class="stitle">EchoTrace Yapay Zeka Genel Değerlendirmesi</div>
    <div class="summary">
      6301 Sayılı Tersine Göç Teşvik Paketi'nin 12 aylık tam simülasyonu tamamlanmıştır. <strong>Politika başlangıçta büyük bir başarı vaat etmiş; ilk 90 günde Erzurum'da 1.247 hibe başvurusu, %22 tüketim büyümesi ve 2.400 yeni istihdam yaratmıştır.</strong> Ancak konut arzı altyapısı bu hızlı nüfus artışına hazırlıksız yakalanmıştır.
      <br><br>
      91–180. günler arasında ortaya çıkan konut krizi kontrol altına alınamamış; yerel halkın yerinden edilmesi, spekülatif konut boşluğu ve artan barınma maliyetleri zinciri kırmaya yetmemiştir. Son çeyrekte ise bölgeye gelen göçmenlerin %41'inin şehri terk etmesi, kalıcı ekonomik çöküşü beraberinde getirmiştir.
      <br><br>
      <strong>Kelebek Etkisi:</strong> Erzurum'dan dönen göçmen dalgası İstanbul konut piyasasında ikincil bir baskı yaratmış; politikanın olumsuz etkileri tek bir ilde kalmayıp büyük şehirlere de yayılmıştır. Bu durum, politika tasarımında konut arzı ile göç hızını eşgüdümlü planlamanın zorunluluğunu ortaya koymaktadır.
    </div>
  </div>

  <div class="sec">
    <div class="stitle">EchoTrace AI Politika Optimize — Acil Müdahale Önerileri</div>
    <div class="rec" style="background:#0c4a6e18;border:1px solid #0ea5e9aa">
      <strong style="color:#0ea5e9">ÖNERİ 01 — TOKİ Dijital Lojman Programı</strong><br>
      <span style="font-size:9.5pt">Erzurum'a taşınan her hane için 5 yıl kirasız TOKİ konut tahsisi. 3.200 konut birimi, tahmini maliyet: 2.1 milyar TL. Konut krizini 60 günde %70 oranında çözüme kavuşturur. Spekülatif boş konutlara vergi cezası uygulamasıyla desteklenmelidir.</span>
    </div>
    <div class="rec" style="background:#4c1d9518;border:1px solid #a855f7aa">
      <strong style="color:#a855f7">ÖNERİ 02 — Yerel İstihdam Vergi Fonu</strong><br>
      <span style="font-size:9.5pt">5 yıl vergi muafiyeti + ilk işe alım başına 75.000 TL devlet desteği. Kelebek etkisini kırar, İstanbul'daki dönüş baskısını azaltır. Tahmini yeni istihdam: 8.400 pozisyon. Bu iki öneri birlikte uygulandığında simülasyon başarı ihtimali %73'e yükselmektedir.</span>
    </div>
  </div>

  <div class="sigs">
    <div><div class="sig">Hazırlayan: EchoTrace AI Sistemi</div></div>
    <div><div class="sig">Onay: Ekonomi Politikaları GMd.</div></div>
    <div><div class="sig">Tarih: ${today}</div></div>
  </div>

  <div class="foot">
    <span>EchoTrace — Ekonomik Politika Simülasyon Sistemi</span>
    <span>GİZLİ — YALNIZCA RESMİ KULLANIM</span>
    <span>Sayfa 1/1</span>
  </div>
  <div class="wm">Bu rapor EchoTrace yapay zeka simülasyon sistemi tarafından otomatik oluşturulmuştur. Resmi karar alma süreçlerinde uzman değerlendirmesiyle birlikte kullanılmalıdır.</div>

  <div class="printbtn">
    <button onclick="window.print()" style="background:#1a1a6e;color:#fff;border:none;padding:11px 28px;border-radius:6px;font-size:12pt;cursor:pointer;margin-top:10px">🖨 Yazdır / PDF Olarak Kaydet</button>
  </div>
</div>
</body></html>`;
}

function demoReportHtml(day: number, provinceStats: ProvinceStats[], today: string): string {
  const phase = getDemoPhase(day);
  const erzurumStats  = provinceStats.find(p => p.id === "25");
  const istanbulStats = provinceStats.find(p => p.id === "34");
  const summary = demoSummary(day, erzurumStats, istanbulStats);

  const beneficiaryIds = new Set(["25","24","36","69","75","76","4","8","29","68"]);
  const sourceIds      = new Set(["34","6"]);

  const beneficiaries = provinceStats
    .filter(p => beneficiaryIds.has(p.id))
    .sort((a, b) => b.score - a.score);
  const sources = provinceStats
    .filter(p => sourceIds.has(p.id))
    .sort((a, b) => a.score - b.score);

  const phaseRows = [
    { faz: "FAZ 1 (Gün 0–90)",   durum: "✅ Tamamlandı", renk: "#15803d", aciklama: "1.247 hibe başvurusu, %22 tüketim büyümesi, 138 yeni iş yeri" },
    { faz: "FAZ 2 (Gün 91–180)", durum: day >= 91  ? "⚠ Aktif" : "⏳ Bekleniyor", renk: day >= 91 ? "#b45309" : "#6b7280", aciklama: "Konut talebi 4.2x, kira %68 artış, yerel halk kriz eşiğinde" },
    { faz: "FAZ 3 (Gün 181–365)",durum: day >= 181 ? "🔴 Aktif" : "⏳ Bekleniyor", renk: day >= 181 ? "#dc2626" : "#6b7280", aciklama: "Evsizlik %400 artış, 234 esnaf kapandı, kelebek etkisi İstanbul'da" },
  ];

  const provinceRow = (p: ProvinceStats, isBeneficiary: boolean) => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td class="${p.score >= 0 ? "pos" : "neg"}">${p.score >= 0 ? "+" : ""}${(p.score * 100).toFixed(1)}</td>
      <td>${(p.unemployment * 100).toFixed(1)}%</td>
      <td>${isBeneficiary ? Math.round(p.consumption).toLocaleString("tr-TR") + " ₺" : ((p.inflation - 1) * 100).toFixed(1) + "%"}</td>
    </tr>`;

  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">
<title>EchoTrace — 6301 Tersine Göç Paketi Analiz Raporu</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Times New Roman",serif;background:#fff;color:#111;font-size:11.5pt;line-height:1.5}
.page{max-width:820px;margin:0 auto;padding:36px 48px}
.hdr{text-align:center;border-bottom:3px solid #1a1a6e;padding-bottom:18px;margin-bottom:26px}
.flag{font-size:44pt;margin-bottom:6px}
.min{font-size:13pt;font-weight:bold;color:#1a1a6e;letter-spacing:1px}
.sub{font-size:10.5pt;color:#444;margin-top:3px}
.rtitle{font-size:16pt;font-weight:bold;color:#1a1a6e;margin-top:18px;text-transform:uppercase;letter-spacing:2px}
.rsubtitle{font-size:11pt;color:#555;margin-top:5px}
.rmeta{font-size:9.5pt;color:#777;margin-top:10px}
.phase-banner{border-radius:6px;padding:10px 16px;margin:18px 0;font-weight:bold;font-size:11pt;text-align:center}
.sec{margin-bottom:24px}
.stitle{font-size:12pt;font-weight:bold;color:#1a1a6e;border-left:4px solid #1a1a6e;padding-left:9px;margin-bottom:12px;text-transform:uppercase;letter-spacing:.8px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px}
.box{background:#f0f4ff;border:1px solid #c0cef0;border-radius:4px;padding:10px 14px}
.lbl{font-size:8.5pt;color:#555;text-transform:uppercase;letter-spacing:.4px}
.val{font-size:19pt;font-weight:bold;color:#1a1a6e;margin-top:3px}
table{width:100%;border-collapse:collapse;font-size:9.5pt}
th{background:#1a1a6e;color:#fff;padding:7px 9px;text-align:left;font-weight:600}
td{padding:6px 9px;border-bottom:1px solid #e0e0e0}
tr:nth-child(even) td{background:#f8f9ff}
.pos{color:#15803d;font-weight:bold}
.neg{color:#dc2626;font-weight:bold}
.summary{background:#f8f9ff;border:1px solid #c0cef0;border-radius:4px;padding:14px 18px;font-size:10.5pt;line-height:1.8;text-align:justify}
.rec{border-radius:6px;padding:12px 16px;margin-bottom:10px}
.sigs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin-top:38px;text-align:center}
.sig{border-top:1px solid #333;padding-top:7px;margin-top:48px;font-size:8.5pt;color:#555}
.foot{border-top:2px solid #1a1a6e;padding-top:14px;margin-top:36px;display:flex;justify-content:space-between;font-size:8.5pt;color:#777}
.wm{text-align:center;margin-top:18px;font-size:8.5pt;color:#aaa;font-style:italic}
.printbtn{text-align:center;margin-top:28px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.printbtn{display:none}}
</style></head><body>
<div class="page">
  <div class="hdr">
    <div class="flag">🇹🇷</div>
    <div class="min">TÜRKİYE CUMHURİYETİ</div>
    <div class="sub">Hazine ve Maliye Bakanlığı — Ekonomi Politikaları Genel Müdürlüğü</div>
    <div class="rtitle">6301 Sayılı Kanun — Tersine Göç Teşvik Paketi</div>
    <div class="rsubtitle">Etki Simülasyon Analiz Raporu — EchoTrace ABM Sistemi</div>
    <div class="rmeta">Rapor Tarihi: ${today} &nbsp;|&nbsp; Simülasyon Günü: ${day}/365 &nbsp;|&nbsp; Aktif Faz: ${phase.name}</div>
  </div>

  <div class="phase-banner" style="background:${phase.color}18;border:2px solid ${phase.color}66;color:${phase.color === "#22c55e" ? "#15803d" : phase.color === "#f59e0b" ? "#b45309" : "#dc2626"}">
    ${phase.name} — GÜN ${day}
  </div>

  <div class="sec">
    <div class="stitle">Faz Zaman Çizelgesi</div>
    <table><thead><tr><th>Faz</th><th>Durum</th><th>Temel Bulgular</th></tr></thead>
    <tbody>
    ${phaseRows.map(r => `<tr><td><strong>${r.faz}</strong></td><td style="color:${r.renk};font-weight:bold">${r.durum}</td><td style="font-size:9pt">${r.aciklama}</td></tr>`).join("")}
    </tbody></table>
  </div>

  <div class="sec">
    <div class="stitle">Özet İstatistikler — Gün ${day}</div>
    <div class="grid">
      <div class="box"><div class="lbl">Erzurum Etki Skoru</div><div class="val" style="color:${erzurumStats && erzurumStats.score >= 0 ? "#15803d" : "#dc2626"}">${erzurumStats ? (erzurumStats.score >= 0 ? "+" : "") + (erzurumStats.score * 100).toFixed(1) : "—"}</div></div>
      <div class="box"><div class="lbl">İstanbul Etki Skoru</div><div class="val" style="color:${istanbulStats && istanbulStats.score >= 0 ? "#15803d" : "#dc2626"}">${istanbulStats ? (istanbulStats.score >= 0 ? "+" : "") + (istanbulStats.score * 100).toFixed(1) : "—"}</div></div>
      <div class="box"><div class="lbl">Erzurum İşsizlik</div><div class="val">${erzurumStats ? "%" + (erzurumStats.unemployment * 100).toFixed(1) : "—"}</div></div>
      <div class="box"><div class="lbl">Erzurum Kira Endeksi</div><div class="val" style="color:${day >= 91 ? "#dc2626" : "#15803d"}">${day < 91 ? "Normal" : day < 181 ? "+%68" : "Kriz"}</div></div>
    </div>
  </div>

  <div class="sec">
    <div class="stitle">Faydalanan İller — Doğu Anadolu Teşvik Bölgesi</div>
    <table><thead><tr><th>İl</th><th>Etki Skoru</th><th>İşsizlik</th><th>Tüketim</th></tr></thead>
    <tbody>${beneficiaries.map(p => provinceRow(p, true)).join("")}</tbody></table>
  </div>

  <div class="sec">
    <div class="stitle">Göç Kaynak İller — Büyükşehir Baskısı</div>
    <table><thead><tr><th>İl</th><th>Etki Skoru</th><th>İşsizlik</th><th>Enflasyon Baskısı</th></tr></thead>
    <tbody>${sources.map(p => provinceRow(p, false)).join("")}</tbody></table>
  </div>

  <div class="sec">
    <div class="stitle">EchoTrace Yapay Zeka Etki Analizi</div>
    <div class="summary">${summary}</div>
  </div>

  ${day >= 181 ? `
  <div class="sec">
    <div class="stitle">EchoTrace AI Politika Optimize Önerileri</div>
    <div class="rec" style="background:#0c4a6e18;border:1px solid #0ea5e9aa">
      <strong style="color:#0ea5e9">ÖNERİ 01 — TOKİ Dijital Lojman Programı</strong><br>
      <span style="font-size:9.5pt">Erzurum'a taşınan her hane için 5 yıl kirasız TOKİ konut tahsisi. 3.200 konut birimi, tahmini maliyet: 2.1 milyar TL. Kira krizini 60 günde %70 oranında çözüme kavuşturur.</span>
    </div>
    <div class="rec" style="background:#4c1d9518;border:1px solid #a855f7aa">
      <strong style="color:#a855f7">ÖNERİ 02 — Yerel İstihdam Vergi Fonu</strong><br>
      <span style="font-size:9.5pt">5 yıl vergi muafiyeti + ilk işe alım başına 75.000 TL devlet desteği. Kelebek etkisini kırar, İstanbul'dan baskıyı azaltır. Tahmini yeni istihdam: 8.400 pozisyon.</span>
    </div>
  </div>` : ""}

  <div class="sigs">
    <div><div class="sig">Hazırlayan: EchoTrace AI Sistemi</div></div>
    <div><div class="sig">Onay: Ekonomi Politikaları GMd.</div></div>
    <div><div class="sig">Tarih: ${today}</div></div>
  </div>

  <div class="foot">
    <span>EchoTrace — Ekonomik Politika Simülasyon Sistemi</span>
    <span>GİZLİ — YALNIZCA RESMİ KULLANIM</span>
    <span>Sayfa 1/1</span>
  </div>
  <div class="wm">Bu rapor EchoTrace yapay zeka simülasyon sistemi tarafından otomatik oluşturulmuştur. Resmi karar alma süreçlerinde uzman değerlendirmesiyle birlikte kullanılmalıdır.</div>

  <div class="printbtn">
    <button onclick="window.print()" style="background:#1a1a6e;color:#fff;border:none;padding:11px 28px;border-radius:6px;font-size:12pt;cursor:pointer;margin-top:10px">🖨 Yazdır / PDF Olarak Kaydet</button>
  </div>
</div>
</body></html>`;
}

function llmSummary(scenario: ScenarioKey, day: number, stats: ProvinceStats[]): string {
  const win  = stats.filter(s => s.score > 0.15).length;
  const lose = stats.filter(s => s.score < -0.15).length;
  const gini = (stats.reduce((s, p) => s + p.gini, 0) / stats.length).toFixed(3);
  const unemp = ((stats.reduce((s, p) => s + p.unemployment, 0) / stats.length) * 100).toFixed(1);

  if (scenario === "minWage") return `${day}. gün itibarıyla Asgari Ücret %50 artışının etki analizi tamamlanmıştır. 81 ilin ${win}'i nette pozitif etki yaşarken, ${lose} il yüksek enflasyon baskısı nedeniyle reel gelir kaybı bildirmektedir. Gini katsayısı ortalama ${gini} seviyesinde seyretmekte olup işsizlik oranı %${unemp}'e gerilemiştir. İstanbul ve kıyı şehirlerinde kira baskısı politikanın en belirgin yan etkisi olarak öne çıkmaktadır. Politikanın sürdürülebilirliği açısından üçüncü çeyrekte enflasyon hedeflemesi revizyonu önerilmektedir.`;
  if (scenario === "vat")     return `Gıdada KDV %10 indiriminin ${day}. gün analizi, ${win} ilin gıda erişiminde iyileşme kaydettiğini göstermektedir. ${lose} ilde beklenen fiyat düşüşü dağıtım zinciri aksaklıkları nedeniyle gerçekleşememiştir. Politikanın mali maliyeti yıllık tahmini 45 milyar TL olarak hesaplanmakta; bu maliyet vergi tabanı genişlemesiyle kısmen telafi edilebilir görünmektedir. Kırsal bölgelerde etki kentlere oranla %23 daha düşük kalmaktadır.`;
  return `EYT politikasının ${day}. gün simülasyonunda, ${win} ilde olumlu tüketim dinamiği gözlemlenmiştir. Özellikle emekli nüfus yoğunluğu yüksek illerde iç talep %8-14 oranında artış kaydetmiştir. Ancak ${lose} ilde nitelikli işgücü kaybı ve üretim kapasitesi daralması risk olarak belirlenmiştir. SGK'nın uzun vadeli aktüeryal dengesi üzerindeki baskı, politikanın reformcu bir tasarımla yeniden ele alınmasını gerektirmektedir.`;
}

export function openReportWindow(
  scenario: ScenarioKey,
  day: number,
  provinceStats: ProvinceStats[],
  isDemoMode?: boolean,
): void {
  const today = new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });

  if (isDemoMode) {
    const html = day >= 365
      ? demoFinalReportHtml(provinceStats, today)
      : demoReportHtml(day, provinceStats, today);
    const w = window.open("", "_blank", "width=920,height=860,scrollbars=yes");
    if (w) { w.document.write(html); w.document.close(); }
    return;
  }

  const top5W = [...provinceStats].sort((a, b) => b.score - a.score).slice(0, 5);
  const top5L = [...provinceStats].sort((a, b) => a.score - b.score).slice(0, 5);
  const winCount  = provinceStats.filter(s => s.score > 0.15).length;
  const loseCount = provinceStats.filter(s => s.score < -0.15).length;
  const avgU = ((provinceStats.reduce((s, p) => s + p.unemployment, 0) / provinceStats.length) * 100).toFixed(1);
  const avgG = (provinceStats.reduce((s, p) => s + p.gini, 0) / provinceStats.length).toFixed(3);
  const summary = llmSummary(scenario, day, provinceStats);

  const tableRow = (p: ProvinceStats, isWinner: boolean) => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td class="${isWinner ? "pos" : "neg"}">${isWinner ? "+" : ""}${(p.score * 100).toFixed(1)}</td>
      <td>${isWinner ? (p.winnerPct * 100).toFixed(0) : (p.loserPct * 100).toFixed(0)}%</td>
      <td>${(p.unemployment * 100).toFixed(1)}%</td>
      <td>${isWinner ? Math.round(p.consumption).toLocaleString("tr-TR") + " ₺" : ((p.inflation - 1) * 100).toFixed(1) + "%"}</td>
    </tr>`;

  const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">
<title>EchoTrace — Etki Analiz Raporu</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Times New Roman",serif;background:#fff;color:#111;font-size:11.5pt;line-height:1.5}
.page{max-width:820px;margin:0 auto;padding:36px 48px}
.hdr{text-align:center;border-bottom:3px solid #1a1a6e;padding-bottom:18px;margin-bottom:26px}
.flag{font-size:44pt;margin-bottom:6px}
.min{font-size:13pt;font-weight:bold;color:#1a1a6e;letter-spacing:1px}
.sub{font-size:10.5pt;color:#444;margin-top:3px}
.rtitle{font-size:16pt;font-weight:bold;color:#1a1a6e;margin-top:18px;text-transform:uppercase;letter-spacing:2px}
.rsubtitle{font-size:11pt;color:#555;margin-top:5px}
.rmeta{font-size:9.5pt;color:#777;margin-top:10px}
.sec{margin-bottom:24px}
.stitle{font-size:12pt;font-weight:bold;color:#1a1a6e;border-left:4px solid #1a1a6e;padding-left:9px;margin-bottom:12px;text-transform:uppercase;letter-spacing:.8px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px}
.box{background:#f0f4ff;border:1px solid #c0cef0;border-radius:4px;padding:10px 14px}
.lbl{font-size:8.5pt;color:#555;text-transform:uppercase;letter-spacing:.4px}
.val{font-size:19pt;font-weight:bold;color:#1a1a6e;margin-top:3px}
table{width:100%;border-collapse:collapse;font-size:9.5pt}
th{background:#1a1a6e;color:#fff;padding:7px 9px;text-align:left;font-weight:600}
td{padding:6px 9px;border-bottom:1px solid #e0e0e0}
tr:nth-child(even) td{background:#f8f9ff}
.pos{color:#15803d;font-weight:bold}
.neg{color:#dc2626;font-weight:bold}
.summary{background:#f8f9ff;border:1px solid #c0cef0;border-radius:4px;padding:14px 18px;font-size:10.5pt;line-height:1.8;text-align:justify}
.sigs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin-top:38px;text-align:center}
.sig{border-top:1px solid #333;padding-top:7px;margin-top:48px;font-size:8.5pt;color:#555}
.foot{border-top:2px solid #1a1a6e;padding-top:14px;margin-top:36px;display:flex;justify-content:space-between;font-size:8.5pt;color:#777}
.wm{text-align:center;margin-top:18px;font-size:8.5pt;color:#aaa;font-style:italic}
.printbtn{text-align:center;margin-top:28px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.printbtn{display:none}}
</style></head><body>
<div class="page">
  <div class="hdr">
    <div class="flag">🇹🇷</div>
    <div class="min">TÜRKİYE CUMHURİYETİ</div>
    <div class="sub">Hazine ve Maliye Bakanlığı — Ekonomi Politikaları Genel Müdürlüğü</div>
    <div class="rtitle">Politika Etki Analiz Raporu</div>
    <div class="rsubtitle">${SCENARIO_NAMES[scenario]}</div>
    <div class="rmeta">Rapor Tarihi: ${today} &nbsp;|&nbsp; Simülasyon Günü: ${day}/365 &nbsp;|&nbsp; Sistem: EchoTrace v1.0</div>
  </div>

  <div class="sec">
    <div class="stitle">Özet İstatistikler</div>
    <div class="grid">
      <div class="box"><div class="lbl">Kazanan İl Sayısı</div><div class="val" style="color:#15803d">${winCount}</div></div>
      <div class="box"><div class="lbl">Olumsuz Etkilenen İl</div><div class="val" style="color:#dc2626">${loseCount}</div></div>
      <div class="box"><div class="lbl">Ort. İşsizlik Oranı</div><div class="val">%${avgU}</div></div>
      <div class="box"><div class="lbl">Ortalama Gini Katsayısı</div><div class="val">${avgG}</div></div>
    </div>
  </div>

  <div class="sec">
    <div class="stitle">En Fazla Kazanan 5 İl</div>
    <table><thead><tr><th>İl</th><th>Etki Skoru</th><th>Kazanan Oran</th><th>İşsizlik</th><th>Tüketim</th></tr></thead>
    <tbody>${top5W.map(p => tableRow(p, true)).join("")}</tbody></table>
  </div>

  <div class="sec">
    <div class="stitle">En Fazla Olumsuz Etkilenen 5 İl</div>
    <table><thead><tr><th>İl</th><th>Etki Skoru</th><th>Mağdur Oran</th><th>İşsizlik</th><th>Enflasyon</th></tr></thead>
    <tbody>${top5L.map(p => tableRow(p, false)).join("")}</tbody></table>
  </div>

  <div class="sec">
    <div class="stitle">Yapay Zeka Etki Analizi (EchoTrace LLM)</div>
    <div class="summary">${summary}</div>
  </div>

  <div class="sigs">
    <div><div class="sig">Hazırlayan: EchoTrace AI Sistemi</div></div>
    <div><div class="sig">Onay: Ekonomi Politikaları GMd.</div></div>
    <div><div class="sig">Tarih: ${today}</div></div>
  </div>

  <div class="foot">
    <span>EchoTrace — Ekonomik Politika Simülasyon Sistemi</span>
    <span>GİZLİ — YALNIZCA RESMİ KULLANIM</span>
    <span>Sayfa 1/1</span>
  </div>
  <div class="wm">Bu rapor EchoTrace yapay zeka simülasyon sistemi tarafından otomatik oluşturulmuştur. Resmi karar alma süreçlerinde uzman değerlendirmesiyle birlikte kullanılmalıdır.</div>

  <div class="printbtn">
    <button onclick="window.print()" style="background:#1a1a6e;color:#fff;border:none;padding:11px 28px;border-radius:6px;font-size:12pt;cursor:pointer;margin-top:10px">🖨 Yazdır / PDF Olarak Kaydet</button>
  </div>
</div>
</body></html>`;

  const w = window.open("", "_blank", "width=920,height=860,scrollbars=yes");
  if (w) { w.document.write(html); w.document.close(); }
}
