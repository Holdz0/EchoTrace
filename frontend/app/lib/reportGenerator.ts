import type { ScenarioKey } from "./mockData";
import type { ProvinceStats } from "./provinceSimulation";

const SCENARIO_NAMES: Record<ScenarioKey, string> = {
  minWage: "Asgari Ücret %50 Artışı",
  vat:     "Gıdada KDV %10 İndirim",
  eyt:     "EYT (Erken Emeklilik) Genişlemesi",
};

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
): void {
  const top5W = [...provinceStats].sort((a, b) => b.score - a.score).slice(0, 5);
  const top5L = [...provinceStats].sort((a, b) => a.score - b.score).slice(0, 5);
  const winCount  = provinceStats.filter(s => s.score > 0.15).length;
  const loseCount = provinceStats.filter(s => s.score < -0.15).length;
  const avgU = ((provinceStats.reduce((s, p) => s + p.unemployment, 0) / provinceStats.length) * 100).toFixed(1);
  const avgG = (provinceStats.reduce((s, p) => s + p.gini, 0) / provinceStats.length).toFixed(3);
  const today = new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
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
