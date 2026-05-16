import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ECHOTRACE — Yasanın Yankısını Duy",
  description: "Ekonomik politika simülasyonu ve görselleştirme platformu",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
