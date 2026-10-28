import type { MetadataRoute } from "next";

// Manifesto da PWA do proprietário: abre direto na lista de chamados.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zelo",
    short_name: "Zelo",
    description: "Pedidos de conserto dos seus imóveis, organizados em um só lugar.",
    lang: "pt-BR",
    start_url: "/chamados",
    display: "standalone",
    theme_color: "#0F766E",
    background_color: "#FAFAF9",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
