import { expect, test, type Browser } from "@playwright/test";

// Demonstração por visitante. No computador ela fica desligada (o botão não
// existe); a parte ligada roda contra a Vercel:
//   E2E_BASE_URL=https://zelo-demo-five.vercel.app E2E_DEMONSTRACAO=ligada \
//     pnpm exec playwright test demonstracao --project=celular
const ligada = process.env.E2E_DEMONSTRACAO === "ligada";

test("sem a demonstração ligada, a tela de entrar não oferece o botão", async ({ page }) => {
  test.skip(ligada, "só no computador");
  await page.goto("/entrar");
  await expect(page.getByRole("button", { name: "Receber código por e-mail" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar na demonstração" })).toHaveCount(0);
});

async function novoVisitante(browser: Browser) {
  const contexto = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await contexto.newPage();
  await page.goto("/entrar");
  await page.getByRole("button", { name: "Entrar na demonstração" }).click();
  await expect(page).toHaveURL(/\/chamados$/, { timeout: 20_000 });
  return { contexto, page };
}

test("cada visitante entra numa conta só dele, já com os dados de exemplo", async ({ browser }) => {
  test.skip(!ligada, "só com a demonstração ligada");

  const a = await novoVisitante(browser);
  await expect(a.page.getByRole("link", { name: "Abertos (12)" })).toBeVisible();

  // O visitante A troca o nome da conta em Ajustes.
  await a.page.goto("/ajustes");
  const nomeDeA = a.page.getByLabel("Sua conta").getByRole("textbox", { name: "Nome", exact: true });
  await expect(nomeDeA).toHaveValue("Marta Oliveira");
  await nomeDeA.fill("Visitante A");
  await a.page.getByRole("button", { name: "Salvar nome" }).click();
  await expect(a.page.getByLabel("Sua conta").getByRole("status")).toHaveText("Nome salvo.");

  // O visitante B não vê a mudança: tem a própria conta, com os mesmos dados.
  const b = await novoVisitante(browser);
  await expect(b.page.getByRole("link", { name: "Abertos (12)" })).toBeVisible();
  await b.page.goto("/ajustes");
  await expect(b.page.getByLabel("Sua conta").getByRole("textbox", { name: "Nome", exact: true })).toHaveValue(
    "Marta Oliveira",
  );

  await a.contexto.close();
  await b.contexto.close();
});
