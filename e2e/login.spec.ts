import { expect, test } from "@playwright/test";

import { campo, digitarCodigo, informarNome, pedirCodigo } from "./ajudantes";
import {
  aguardarCodigo,
  aguardarLinkDoCodigo,
  contarEmails,
  emailDeTeste,
} from "./mailpit";

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

test("login completo: código errado, primeiro acesso com nome, sessão e sair", async ({ page }) => {
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

  // Código certo no primeiro acesso: pede só o nome
  await digitarCodigo(page, codigo);
  await expect(page).toHaveURL(/\/boas-vindas$/);
  await informarNome(page, "   ");
  await expect(page.getByText("Informe seu nome.")).toBeVisible();
  await informarNome(page, "Ana Souza");
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
  await expect(page.getByText("Ana Souza")).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByText("Das 21h às 8h")).toBeVisible();

  // Sair (em Ajustes) encerra a sessão: o app volta a exigir login
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.goto("/chamados");
  await expect(page).toHaveURL(/\/entrar$/);

  // Segundo acesso: já tem nome, vai direto para os chamados
  const recebidos = await contarEmails(email);
  await page.waitForTimeout(1100); // intervalo mínimo entre envios no local
  await pedirCodigo(page, email);
  await digitarCodigo(page, await aguardarCodigo(email, recebidos));
  await expect(page).toHaveURL(/\/chamados$/);
});

test("botão do e-mail abre a tela com o código preenchido, sem entrar sozinho", async ({ browser }) => {
  // Com "+", para conferir que o e-mail vai codificado no link
  const email = emailDeTeste("link").replace("@", "+tag@");
  const pedido = await browser.newPage();
  await pedirCodigo(pedido, email);
  const link = await aguardarLinkDoCodigo(email);
  const codigo = await aguardarCodigo(email);
  await pedido.close();

  // Abre o link como se fosse no leitor de e-mail (outra aba, sem estado)
  const page = await browser.newPage();
  await page.goto(link);

  await expect(page.getByText(email)).toBeVisible();
  await expect(campo(page, "Código")).toHaveValue(codigo);
  // E-mail e código saem da barra de endereço
  await expect(page).toHaveURL(/\/entrar$/);
  // Abrir o link não faz login: só o toque em "Entrar"
  await page.goto("/chamados");
  await expect(page).toHaveURL(/\/entrar$/);

  await page.goto(link);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/boas-vindas$/);
  await page.close();
});

test("reenviar código: liberado após 60 s e o código novo funciona", async ({ page }) => {
  // Relógio controlado pelo teste, para não esperar 60 s de verdade
  await page.clock.install();
  const email = emailDeTeste("reenvio");

  await pedirCodigo(page, email);
  await aguardarCodigo(email);
  const recebidos = await contarEmails(email);

  const reenviar = page.getByRole("button", { name: /Reenviar código/ });
  await expect(reenviar).toBeDisabled();
  await expect(reenviar).toHaveText("Reenviar código em 60 s");

  await page.clock.runFor(30_000);
  await expect(reenviar).toHaveText("Reenviar código em 30 s");
  await page.clock.runFor(30_000);
  await expect(reenviar).toBeEnabled();
  await expect(reenviar).toHaveText("Reenviar código");

  // O Supabase local também exige 1 s (de verdade) entre envios
  await page.waitForTimeout(1100);
  await reenviar.click();
  await expect(page.getByRole("status")).toHaveText("Enviamos um novo código.");
  // O novo envio reinicia a espera
  await expect(reenviar).toBeDisabled();

  const codigoNovo = await aguardarCodigo(email, recebidos);
  await digitarCodigo(page, codigoNovo);
  await expect(page).toHaveURL(/\/boas-vindas$/);
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
