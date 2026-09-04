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
  title: "SigmaGo — Decision Governance Platform",
  description: "Enterprise approval and decision-record platform.",
};

export const viewport = {
  themeColor: "#182230",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-[#F7F8FA] text-[#182230] font-sans">
      <body className={`${inter.variable} font-sans antialiased h-full text-[#182230] bg-[#F7F8FA]`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

