import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Amiri } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Namaz Vakitleri",
  description: "Hibrit namaz vakitleri — Fazilet & Diyanet",
  metadataBase: new URL("https://hibritvakit.com"),
  openGraph: {
    title: "Hibrit Vakit — Namaz Vakitleri",
    description:
      "Fazilet ve Diyanet vakitlerini bir arada kullanan ihtiyatlı namaz vakitleri",
    url: "https://hibritvakit.com",
    siteName: "Hibrit Vakit",
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Hibrit Vakit — Namaz Vakitleri",
    description:
      "Fazilet ve Diyanet vakitlerini bir arada kullanan ihtiyatlı namaz vakitleri",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} ${amiri.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("theme")==="dark"){document.documentElement.classList.add("dark")}}catch(e){}`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Hibrit Vakit",
              url: "https://hibritvakit.com",
              description:
                "Fazilet ve Diyanet vakitlerini bir arada kullanan ihtiyatlı namaz vakitleri",
              applicationCategory: "LifestyleApplication",
              operatingSystem: "All",
              inLanguage: ["tr", "en"],
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
