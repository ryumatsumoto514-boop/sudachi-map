import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { EmergencyBar } from "@/components/EmergencyBar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: "巣立ちマップ | Economix JP",
  description:
    "児童養護施設・里親家庭などを巣立つ人のための支援情報サイト。住まい・お金・仕事・進学・手続き・相談まで、自分に合った支援をかんたんに探せます。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${inter.variable} ${notoSansJP.variable}`}>
      <body className="flex min-h-screen flex-col bg-cream-100 font-sans text-ink-900 antialiased">
        <Header />
        <main className="flex-1 pb-16 sm:pb-14">{children}</main>
        <Footer />
        <EmergencyBar />
      </body>
    </html>
  );
}
