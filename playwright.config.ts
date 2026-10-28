import { defineConfig, devices } from "@playwright/test";

// Testes ponta a ponta: navegador de verdade contra o app e o Supabase local.
// Pré-requisito: Supabase local de pé (make db-start).
export default defineConfig({
  testDir: "./e2e",
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "pt-BR",
    trace: "retain-on-failure",
  },
  // Mobile-first: o proprietário usa o app no celular.
  projects: [{ name: "celular", use: { ...devices["Pixel 7"] } }],
  // Reaproveita o `make dev` se já estiver rodando; senão sobe um.
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
