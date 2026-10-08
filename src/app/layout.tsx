import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Al-Afhhihram House - POS & Inventory System",
  description:
    "Point of Sale and Inventory Management System for Al-Afhhihram House (Ihram sets, Islamic clothing, and accessories)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${inter.className} min-h-screen bg-slate-100 flex flex-col font-sans`}>
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
