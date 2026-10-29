import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera um servidor enxuto em .next/standalone, usado pela imagem Docker.
  output: "standalone",
  // A entrada do app é a lista de chamados; o proxy manda para /entrar quem não está logado.
  async redirects() {
    return [
      { source: "/", destination: "/chamados", permanent: false },
      // Endereços antigos, de antes das rotas /chamados, /imoveis e /ajustes.
      { source: "/painel", destination: "/imoveis", permanent: false },
      { source: "/painel/imoveis/:caminho*", destination: "/imoveis/:caminho*", permanent: false },
    ];
  },
  // Página do inquilino: o token está na URL. Sem Referer, ele não vaza para
  // sites externos; e o link pessoal não deve ser indexado.
  async headers() {
    return [
      // Service worker sempre atualizado e só com scripts do próprio Zelo.
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
      {
        source: "/c/:token*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      // A foto do chamado vai junto do formulário (já reduzida no celular,
      // até 3 MB). Fica abaixo do limite de 4,5 MB por requisição da Vercel.
      bodySizeLimit: "4mb",
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
