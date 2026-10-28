import { defineConfig } from "vitest/config";

// Testes unitários: rodam em Node, sem banco nem navegador (o Supabase é simulado).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
