import { defineConfig } from "vitest/config";

// Testes unitários: rodam em Node, sem banco nem navegador (o Supabase é simulado).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    // supabase/functions/_shared: código puro das Edge Functions (sem APIs do Deno).
    include: ["src/**/*.test.ts", "supabase/functions/_shared/**/*.test.ts"],
  },
});
