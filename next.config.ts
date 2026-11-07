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
  // Não anuncia "X-Powered-By: Next.js" em toda resposta.
  poweredByHeader: false,
  async headers() {
    return [
      // Proteções básicas em todas as respostas. Vem primeiro: as regras
      // abaixo, mais específicas, substituem a mesma chave quando precisam.
      {
        source: "/:caminho*",
        headers: [
          // Nenhum outro site abre o Zelo dentro de uma moldura (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Para outros sites vai só o domínio, nunca o caminho da página.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // A foto do chamado usa o seletor de arquivos, não a câmera direta.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Só HTTPS por 2 anos (o navegador ignora em http://localhost).
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
      // Service worker sempre atualizado e só com scripts do próprio Zelo.
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
      // Página do inquilino: o token está na URL. Sem Referer, ele não vaza para
      // sites externos; e o link pessoal não deve ser indexado.
      {
        source: "/(c|avaliar)/:token*",
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
  // Sem o botão "N" do modo de desenvolvimento (não existe em produção): em
  // qualquer canto ele cobria algo (Chamados na barra do celular, o X do painel
  // do PC). A tela de erro do Next continua aparecendo quando há erro.
  devIndicators: false,
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
