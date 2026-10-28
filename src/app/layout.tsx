import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Só os pesos 400 (texto) e 600 (títulos e botões).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Zelo",
  description: "Pedidos de conserto dos seus imóveis, organizados em um só lugar.",
  // O favicon.ico fica em src/app e o manifesto em src/app/manifest.ts.
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { title: "Zelo", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F766E",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
