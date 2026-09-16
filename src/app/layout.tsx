import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SigmaGo — Organizational Decision Intelligence",
  description: "Turn decisions into organizational intelligence.",
};

export const viewport = {
  themeColor: "#012F6B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-[#F7FAFC] text-[#132238] font-sans antialiased">
      <body className={`${inter.variable} font-sans antialiased h-full text-[#132238] bg-[#F7FAFC]`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
