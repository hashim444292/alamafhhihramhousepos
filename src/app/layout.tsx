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
    <html lang="en">
      <body className={`${inter.variable} ${inter.className} min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white`}>
        <Navbar />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
      </body>
    </html>
  );
}
