import { expect, test } from "@playwright/test";

import { entrar } from "./ajudantes";
import { emailDeTeste } from "./mailpit";

test("ajustes: nome, horário de silêncio e avisos no aparelho", async ({ browser }) => {
  // Navegador que permite notificações para o site
  const page = await (await browser.newContext({ permissions: ["notifications"] })).newPage();
  await entrar(page, emailDeTeste("ajustes"), "Ana");
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Ajustes" }).click();

  // Avisos: este navegador aceita Web Push, então oferece ligar
  const avisos = page.getByLabel("Avisos no celular");
  await expect(avisos.getByRole("button", { name: "Ligar avisos neste aparelho" })).toBeVisible();

  // Horário de silêncio vem com o padrão (21h às 8h)
  const silencio = page.getByLabel("Horário de silêncio");
  const das = silencio.getByLabel("Das");
  const ate = silencio.getByLabel("Até");
  await expect(das).toHaveValue("21:00");
  await expect(ate).toHaveValue("08:00");

  // Início igual ao fim é recusado
  await das.fill("08:00");
  await silencio.getByRole("button", { name: "Salvar horário" }).click();
  await expect(silencio.getByText("O início e o fim precisam ser diferentes.")).toBeVisible();

  // Novo horário salvo e mantido ao recarregar
  await das.fill("22:30");
  await ate.fill("07:00");
  await silencio.getByRole("button", { name: "Salvar horário" }).click();
  await expect(silencio.getByRole("status")).toHaveText("Horário de silêncio salvo.");
  await page.reload();
  await expect(page.getByLabel("Horário de silêncio").getByLabel("Das")).toHaveValue("22:30");
  await expect(page.getByLabel("Horário de silêncio").getByLabel("Até")).toHaveValue("07:00");

  // Nome: em branco é recusado; depois salva
  const conta = page.getByLabel("Sua conta");
  const nome = conta.getByRole("textbox", { name: "Nome", exact: true });
  await expect(nome).toHaveValue("Ana");
  await nome.fill("   ");
  await conta.getByRole("button", { name: "Salvar nome" }).click();
  await expect(conta.getByText("Informe seu nome.")).toBeVisible();
  await nome.fill("Ana Souza");
  await conta.getByRole("button", { name: "Salvar nome" }).click();
  await expect(conta.getByRole("status")).toHaveText("Nome salvo.");
  await page.reload();
  await expect(page.getByLabel("Sua conta").getByRole("textbox", { name: "Nome", exact: true })).toHaveValue(
    "Ana Souza",
  );
});

test("ajustes: com as notificações bloqueadas no navegador, explica como liberar", async ({ page }) => {
  // Simula quem já recusou as notificações (o Playwright não tem como "negar")
  await page.addInitScript(() => {
    const original = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = (descritor) =>
      descritor.name === "notifications"
        ? Promise.resolve({ state: "denied" } as PermissionStatus)
        : original(descritor);
  });
  await entrar(page, emailDeTeste("ajustes-bloqueado"));
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Ajustes" }).click();

  const avisos = page.getByLabel("Avisos no celular");
  await expect(avisos.getByText(/Os avisos estão bloqueados para o Zelo/)).toBeVisible();
  await expect(avisos.getByRole("button", { name: "Ligar avisos neste aparelho" })).toHaveCount(0);
});
