import { expect, test } from "@playwright/test";

// Cabeçalhos de segurança (next.config.ts) em todas as respostas.

test("cabeçalhos de segurança nas páginas e no link do inquilino", async ({ request }) => {
  const pagina = await request.get("/entrar");
  const cabecalhos = pagina.headers();
  expect(cabecalhos["x-frame-options"]).toBe("DENY");
  expect(cabecalhos["x-content-type-options"]).toBe("nosniff");
  expect(cabecalhos["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(cabecalhos["permissions-policy"]).toContain("camera=()");
  expect(cabecalhos["strict-transport-security"]).toContain("max-age=");
  expect(cabecalhos["x-powered-by"]).toBeUndefined();

  // O link do inquilino leva o token na URL: nada de Referer nem indexação.
  const inquilino = (await request.get("/c/token-que-nao-existe-000000000000000000000")).headers();
  expect(inquilino["referrer-policy"]).toBe("no-referrer");
  expect(inquilino["x-robots-tag"]).toBe("noindex, nofollow");
  expect(inquilino["x-frame-options"]).toBe("DENY");
});
