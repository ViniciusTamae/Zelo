import { defineConfig, devices } from "@playwright/test";

// Testes ponta a ponta: navegador de verdade contra o app e o Supabase local.
// Pré-requisito: Supabase local de pé (make db-start).
export default defineConfig({
  testDir: "./e2e",
  // O servidor de desenvolvimento compila cada página na primeira visita; com
  // vários testes em paralelo isso estoura os limites padrão (5 s e 30 s).
  expect: { timeout: 10_000 },
  timeout: 60_000,
  // Um servidor de desenvolvimento só atende todos os testes: mais que 4 ao
  // mesmo tempo deixa as páginas lentas e os testes estouram o tempo.
  workers: 4,
  reporter: "list",
  // Ao terminar: esvazia o Mailpit e apaga os usuários criados pelos testes.
  globalTeardown: "./e2e/limpeza.ts",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "pt-BR",
    trace: "retain-on-failure",
  },
  // Mobile-first: quase tudo é testado no celular. Os arquivos *.pc.spec.ts
  // testam o layout do computador (quadro de chamados, grade de imóveis).
  projects: [
    { name: "celular", use: { ...devices["Pixel 7"] }, testIgnore: /\.pc\.spec\.ts$/ },
    {
      name: "computador",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
      testMatch: /\.pc\.spec\.ts$/,
    },
  ],
  // Reaproveita o `make dev` se já estiver rodando; senão sobe um.
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
