import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

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
  title: "SigmaGo — Decision Governance Platform",
  description: "Enterprise approval and decision-record platform.",
};

export const viewport = {
  themeColor: "#101828",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-bg text-ink font-sans">
      <body className={`${ibmSans.variable} ${ibmMono.variable} font-sans antialiased h-full text-ink bg-bg`}>
        {children}
      </body>
    </html>
  );
}
