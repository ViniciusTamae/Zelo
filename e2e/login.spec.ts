import { expect, test } from "@playwright/test";

import { digitarCodigo, pedirCodigo } from "./ajudantes";
import { aguardarCodigo, contarEmails, emailDeTeste } from "./mailpit";

for (const rota of ["/chamados", "/imoveis", "/ajustes"]) {
  test(`sem login, ${rota} manda para a tela de entrar`, async ({ page }) => {
    await page.goto(rota);

    await expect(page).toHaveURL(/\/entrar$/);
    await expect(page.getByLabel("E-mail")).toBeVisible();
  });
}

test("a página inicial leva para entrar quando não há sessão", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/entrar$/);
});

test("login completo: código errado, código certo, sessão e sair", async ({ page }) => {
  const email = emailDeTeste("login");

  await pedirCodigo(page, email);
  const codigo = await aguardarCodigo(email);

  // Código errado mostra o erro e continua na etapa do código
  const errado = codigo === "000000" ? "111111" : "000000";
  await digitarCodigo(page, errado);
  // Restringe ao formulário: o Next também tem um role="alert" (anunciador de rotas).
  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "Código inválido ou expirado. Confira o número ou peça um novo.",
  );

  // Código certo abre a lista de chamados
  await digitarCodigo(page, codigo);
  await expect(page).toHaveURL(/\/chamados$/);
  await expect(page.getByRole("heading", { name: "Chamados" })).toBeVisible();

  // Já logado, /entrar volta para os chamados
  await page.goto("/entrar");
  await expect(page).toHaveURL(/\/chamados$/);

  // A navegação de baixo leva às outras seções
  const navegacao = page.getByRole("navigation", { name: "Principal" });
  await navegacao.getByRole("link", { name: "Imóveis" }).click();
  await expect(page.getByRole("heading", { name: "Seus imóveis" })).toBeVisible();
  await navegacao.getByRole("link", { name: "Ajustes" }).click();
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByText("Das 21h às 8h")).toBeVisible();

  // Sair (em Ajustes) encerra a sessão: o app volta a exigir login
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.goto("/chamados");
  await expect(page).toHaveURL(/\/entrar$/);
});

test("reenviar código: o código novo funciona", async ({ page }) => {
  const email = emailDeTeste("reenvio");

  await pedirCodigo(page, email);
  await aguardarCodigo(email);
  const recebidos = await contarEmails(email);

  // O Supabase exige um intervalo entre envios (1 s no local, 60 s na nuvem).
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Reenviar código" }).click();
  await expect(page.getByRole("status")).toHaveText("Enviamos um novo código.");

  const codigoNovo = await aguardarCodigo(email, recebidos);
  await digitarCodigo(page, codigoNovo);
  await expect(page).toHaveURL(/\/chamados$/);
});

test("usar outro e-mail volta para a primeira etapa com o e-mail preenchido", async ({ page }) => {
  const email = emailDeTeste("trocar");

  await pedirCodigo(page, email);
  await page.getByRole("button", { name: "Usar outro e-mail" }).click();

  await expect(page.getByLabel("E-mail")).toHaveValue(email);
  await expect(
    page.getByRole("button", { name: "Receber código por e-mail" }),
  ).toBeVisible();
});
