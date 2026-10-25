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
  themeColor: "#17324D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-[#F6F8F9] text-[#182B3D] font-sans antialiased">
      <body className={`${inter.variable} font-sans antialiased h-full text-[#182B3D] bg-[#F6F8F9]`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
