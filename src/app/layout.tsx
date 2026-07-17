import type { Metadata } from "next";
import { Inter, Outfit, JetBrains_Mono, IBM_Plex_Serif, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const ibmSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-ibm-serif",
  display: "swap",
});

const ibmSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-sans",
  display: "swap",
});

const ibmMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-ibm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SigmaGo Workflow Portal",
  description: "Enterprise approval workflow system for SigmaGo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-paper">
      <body
        className={`${inter.variable} ${outfit.variable} ${jetbrains.variable} ${ibmSerif.variable} ${ibmSans.variable} ${ibmMono.variable} font-body antialiased h-full text-ink`}
      >
        {children}
      </body>
    </html>
  );
}
