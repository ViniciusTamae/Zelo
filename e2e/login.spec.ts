import { expect, test } from "@playwright/test";

import { digitarCodigo, pedirCodigo } from "./ajudantes";
import { aguardarCodigo, contarEmails, emailDeTeste } from "./mailpit";

test("sem login, o painel manda para a tela de entrar", async ({ page }) => {
  await page.goto("/painel");

  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByLabel("E-mail")).toBeVisible();
});

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

  // Código certo abre o painel
  await digitarCodigo(page, codigo);
  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByRole("heading", { name: "Seus imóveis" })).toBeVisible();

  // Já logado, /entrar volta para o painel
  await page.goto("/entrar");
  await expect(page).toHaveURL(/\/painel$/);

  // Sair encerra a sessão: o painel volta a exigir login
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.goto("/painel");
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
  await expect(page).toHaveURL(/\/painel$/);
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
