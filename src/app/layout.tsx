import type { Metadata } from "next";
import { Noto_Sans_JP, Orbitron } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Footer from "@/components/Footer";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
});

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto",
});

export const metadata: Metadata = {
  title: "歌ウマVtuberガチャ | 毎日新しい歌声との出会い",
  description:
    "24時間ごとに歌が上手いVtuberをAIがピックアップ！新しい推しとの一期一会を体験しよう。みんなの応援でガチャ時間を短縮！",
  keywords: ["Vtuber", "歌ウマ", "ガチャ", "バーチャルシンガー", "歌ってみた"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${orbitron.variable} ${notoSansJP.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased flex flex-col"
        style={{ fontFamily: "var(--font-noto), sans-serif" }}
      >
        <Providers>
          <div className="flex-1">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
