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
