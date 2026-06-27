import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LifeOS — Yaşam Yönetim Platformu",
  description:
    "Finans, emlak ve araç yönetimi tek platformda. Banka hesapları, kredi kartları, krediler, varlıklar, gelir-gider takibi, kira yönetimi ve araç bakımının modern yönetim paneli.",
  keywords: [
    "LifeOS",
    "kişisel finans",
    "bütçe",
    "emlak yönetimi",
    "araç takibi",
    "finansal panel",
  ],
  authors: [{ name: "LifeOS" }],
  icons: {
    icon: "/lifeos-logo.svg",
    apple: "/lifeos-logo.svg",
  },
  openGraph: {
    title: "LifeOS — Yaşam Yönetim Platformu",
    description: "Finans, emlak ve araç yönetimi tek platformda.",
    siteName: "LifeOS",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
