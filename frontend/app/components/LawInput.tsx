"use client";

import { useState } from "react";

interface Props {
  onSubmit: (lawText: string, onError?: () => void, onSuccess?: () => void) => void;
  onClose: () => void;
  mode: "live" | "mock";
}

const EXAMPLES = [
  "Asgari ücret 25.000 TL'ye yükseltildi",
  "Emeklilere %30 zam yapıldı, gıda KDV'si %5'e indirildi",
  "30 yaşından büyüklere kamu sektöründe çalışmak yasak",
  "İstanbul ve Ankara'da kamu işçi alımı durduruldu",
];

export default function LawInput({ onSubmit, onClose, mode }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (!text.trim() || loading || mode !== "live") return;
    setLoading(true);
    setError(false);
    onSubmit(
      text.trim(),
      () => { setLoading(false); setError(true); },  // onError: modal açık kalır, hata gösterilir
      () => { setLoading(false); onClose(); },        // onSuccess: modal kapanır
    );
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(1,5,15,0.92)",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(6px)",
      animation: "fadeIn 0.3s ease",
    }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>

      <div style={{
        background: "#030f1e", border: "1px solid #1e3a5f",
        borderRadius: 16, padding: "28px 32px",
        width: "min(600px, 92vw)",
        boxShadow: "0 0 60px #2563eb22",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#60a5fa", margin: 0 }}>
              ⚡ Yasa / Politika Gir
            </h2>
            <p style={{ fontSize: 11, color: "#4b5563", margin: "4px 0 0" }}>
              LLM politikayı parse eder → simülasyon çalışır
            </p>
            {mode !== "live" && (
              <div style={{
                marginTop: 8, padding: "6px 12px", borderRadius: 6,
                background: "#450a0a", border: "1px solid #7f1d1d",
                color: "#fca5a5", fontSize: 11, fontWeight: 600,
              }}>
                ⚠ Backend bağlı değil — simülasyon çalıştırmak için önce backend'i başlat (uvicorn)
              </div>
            )}
            {error && (
              <div style={{
                marginTop: 8, padding: "6px 12px", borderRadius: 6,
                background: "#450a0a", border: "1px solid #7f1d1d",
                color: "#fca5a5", fontSize: 11,
              }}>
                ✕ Simülasyon başarısız oldu. Backend çalışıyor mu? OpenAI API key ayarlı mı?
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "1px solid #1e3a5f", color: "#4b5563",
            borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 13,
          }}>✕</button>
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Örn: Asgari ücret 25.000 TL'ye yükseltildi ve gıda KDV'si %5'e indirildi..."
          rows={4}
          style={{
            width: "100%", background: "#0a1628", border: "1px solid #1e3a5f",
            borderRadius: 8, padding: "10px 14px", color: "#e2e8f0", fontSize: 13,
            resize: "vertical", outline: "none", fontFamily: "system-ui, sans-serif",
          }}
          onKeyDown={e => { if (e.key === "Enter" && e.metaKey && mode === "live") handleSubmit(); }}
        />

        <div style={{ marginTop: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: "#374151", marginBottom: 6 }}>HAZIR ÖRNEKLER:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => setText(ex)}
                style={{
                  padding: "3px 10px", borderRadius: 12, border: "1px solid #1e3a5f",
                  background: "#0a1628", color: "#6b7280", fontSize: 10,
                  cursor: "pointer", textAlign: "left",
                }}
              >{ex}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "8px 18px", borderRadius: 8, border: "1px solid #1e3a5f",
            background: "transparent", color: "#6b7280", cursor: "pointer", fontSize: 12,
          }}>İptal</button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || loading || mode !== "live"}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none",
              background: text.trim() && !loading && mode === "live" ? "#2563eb" : "#0f2240",
              color: text.trim() && !loading && mode === "live" ? "#fff" : "#374151",
              cursor: text.trim() && !loading && mode === "live" ? "pointer" : "not-allowed",
              fontSize: 12, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {loading ? "⏳ Analiz ediliyor..." : mode !== "live" ? "⚡ Backend Bağlı Değil" : "🚀 Simüle Et (⌘↵)"}
          </button>
        </div>
      </div>
    </div>
  );
}
