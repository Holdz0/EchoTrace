"use client";

interface Props {
  onClose: () => void;
  onRevise: () => void;
}

export default function AIPolicyModal({ onClose, onRevise }: Props) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "rgba(0,0,0,0.75)",
      backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 580,
        background: "rgba(4,8,22,0.88)",
        border: "1px solid #4f46e5",
        borderRadius: 18, padding: "32px 36px",
        backdropFilter: "blur(24px)",
        boxShadow: "0 0 70px #6366f155, 0 0 140px #4f46e522, inset 0 1px 0 rgba(255,255,255,0.06)",
        animation: "aiModalIn 0.4s cubic-bezier(.16,1,.3,1)",
        position: "relative",
      }}>
        <style>{`
          @keyframes aiModalIn {
            from { opacity:0; transform:scale(0.92) translateY(20px); }
            to   { opacity:1; transform:scale(1) translateY(0); }
          }
          @keyframes pulseNeon {
            0%,100% { box-shadow:0 0 70px #6366f155,0 0 140px #4f46e522; }
            50%     { box-shadow:0 0 100px #818cf888,0 0 200px #4f46e544; }
          }
        `}</style>

        {/* Kapat */}
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 16,
          background: "transparent", border: "none", color: "#4b5563",
          fontSize: 18, cursor: "pointer", lineHeight: 1,
        }}>✕</button>

        {/* Başlık */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg,#4338ca,#7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, boxShadow: "0 0 24px #6366f177", flexShrink: 0,
          }}>🧠</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#a5b4fc", letterSpacing: 2 }}>
              AI POLICY OPTIMIZER
            </div>
            <div style={{ fontSize: 10, color: "#4b5563", letterSpacing: 1, marginTop: 2 }}>
              OTONOM YASA REVİZYONU — 6301 ANALİZİ TAMAMLANDI
            </div>
          </div>
          <div style={{
            marginLeft: "auto", fontSize: 10, color: "#ef4444",
            background: "#7f1d1d22", border: "1px solid #7f1d1d",
            borderRadius: 20, padding: "3px 10px", fontWeight: 700,
            animation: "aiModalIn 0.5s",
          }}>● 12 AYLIK SİMÜLASYON TAMAMLANDI</div>
        </div>

        {/* Kriz tespiti */}
        <div style={{
          background: "rgba(127,29,29,0.15)",
          border: "1px solid rgba(239,68,68,0.35)",
          borderRadius: 10, padding: "12px 16px", marginBottom: 22,
        }}>
          <div style={{ fontSize: 11, color: "#fca5a5", fontWeight: 700, marginBottom: 6 }}>
            ● KRİZ TESPİTİ
          </div>
          <div style={{ fontSize: 12, color: "#f87171", lineHeight: 1.6 }}>
            Mevcut yasa uygulamasında yerel halkta hiper-enflasyon tespit edilmiştir.
            Erzurum ve çevresinde kiralar <strong>%340</strong> artmış,
            yerel halkın <strong>%23'ü</strong> konut erişimini yitirmiştir.
            Hizmet sektörü <strong>%67</strong> kapasitesine gerilemiştir.
          </div>
        </div>

        <div style={{ fontSize: 10, color: "#4b5563", letterSpacing: 1.5, marginBottom: 14 }}>
          ÖNERİLEN DÜZENLEMELER:
        </div>

        {[
          {
            n: "01",
            title: "Nakit Hibe → TOKİ Dijital Lojman Hakkı",
            desc: "150.000 TL nakit hibe, piyasa kiralarını spekülatif baskıdan korumak amacıyla TOKİ dijital göçmen lojmanı hakkına dönüştürülmelidir. Konut talebi mevcut stok üzerinden değil, kamu inşaat planı üzerinden karşılanır.",
            color: "#22d3ee",
            bg: "rgba(34,211,238,0.05)",
            border: "rgba(34,211,238,0.20)",
          },
          {
            n: "02",
            title: "Vergi Muafiyetinin %50'si → Yerel Ücret Sübvansiyon Fonu",
            desc: "Alınmayan gelir vergisinin %50'si otomatik olarak yerel asgari ücret sübvansiyon fonuna aktarılmalıdır. Yerli işgücünün piyasadan dışlanması önlenir, esnaf istihdam kapasitesini korur.",
            color: "#a78bfa",
            bg: "rgba(167,139,250,0.05)",
            border: "rgba(167,139,250,0.20)",
          },
        ].map(r => (
          <div key={r.n} style={{
            background: r.bg, border: `1px solid ${r.border}`,
            borderRadius: 12, padding: "14px 18px", marginBottom: 12,
          }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: `rgba(${r.color.slice(1).match(/.{2}/g)!.map(x=>parseInt(x,16)).join(",")},0.15)`,
                color: r.color, fontWeight: 800, fontSize: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: `1px solid ${r.border}`,
              }}>{r.n}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: r.color, marginBottom: 5 }}>
                  {r.title}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.6 }}>
                  {r.desc}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Butonlar */}
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button onClick={onRevise} style={{
            flex: 1, padding: "13px 0", borderRadius: 10,
            background: "linear-gradient(135deg,#4338ca,#7c3aed)",
            border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 700, color: "#fff",
            boxShadow: "0 0 24px #6366f133",
            letterSpacing: 0.5, transition: "opacity 0.2s",
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            🔄 Yasayı Güncelle ve Yeniden Simüle Et
          </button>
          <button onClick={onClose} style={{
            padding: "13px 18px", borderRadius: 10,
            background: "transparent", border: "1px solid #1f2937",
            cursor: "pointer", fontSize: 12, color: "#6b7280",
          }}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
