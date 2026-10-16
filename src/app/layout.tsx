import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#020617",
};

export const metadata: Metadata = {
  title: "Al-Afhhihram House - POS & Inventory System",
  description:
    "Point of Sale and Inventory Management System for Al-Afhhihram House (Ihram sets, Islamic clothing, and accessories)",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo-icon.png",
    apple: "/logo-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.variable} ${inter.className} h-full bg-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white overflow-x-hidden`}>
        <Navbar />
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-14 md:pb-0">{children}</main>
      </body>
    </html>
  );
}
