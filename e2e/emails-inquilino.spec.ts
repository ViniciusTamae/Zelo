import { expect, test, type Page } from "@playwright/test";

import { abrirChamado, adicionarInquilino, cadastrarImovel, entrar } from "./ajudantes";
import { aguardarEmailComAssunto, contarEmails, emailDeTeste } from "./mailpit";

// Na página do proprietário: abre o primeiro chamado da lista e muda o status.
async function mudarStatus(page: Page, botao: string, recado = "") {
  if (recado) await page.getByRole("textbox", { name: "Recado (opcional)" }).fill(recado);
  await page.getByRole("button", { name: botao }).click();
  await expect(page.getByRole("status")).toBeVisible();
}

async function abrirPrimeiroChamado(page: Page) {
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Chamados" }).click();
  await page.getByRole("list", { name: "Lista de chamados" }).getByRole("listitem").first().click();
}

// O rádio da estrela fica escondido; a pessoa toca na estrela.
async function darNota(page: Page, nota: number) {
  await page
    .locator("label")
    .filter({ has: page.getByRole("radio", { name: new RegExp(`^${nota} de 5`) }) })
    .click();
}

test("inquilino recebe e-mail a cada status, avalia pelo link do e-mail e o dono vê a nota", async ({
  page,
  browser,
}) => {
  test.slow();
  const emailMaria = emailDeTeste("inquilina");
  await entrar(page, emailDeTeste("dono-emails"), "Ana Souza");
  await cadastrarImovel(page, "Casa da Rua A", { rua: "Rua A", numero: "10", bairro: "Centro" });
  const link = await adicionarInquilino(page, "Maria", emailMaria);

  const inquilina = await (await browser.newContext()).newPage();
  await inquilina.goto(link);
  await abrirChamado(inquilina, { categoria: "Hidráulica", descricao: "Vazamento embaixo da pia" });
  // Abrir o chamado não manda e-mail para ela
  expect(await contarEmails(emailMaria)).toBe(0);

  // Em andamento, com recado
  await abrirPrimeiroChamado(page);
  await mudarStatus(page, "Começar atendimento", "O encanador passa na sexta.");
  const andamento = await aguardarEmailComAssunto(
    emailMaria,
    "Seu pedido está em andamento (Hidráulica, Casa da Rua A)",
  );
  expect(andamento.Text).toContain("Ana Souza começou a cuidar do seu pedido.");
  expect(andamento.Text).toContain("Recado: O encanador passa na sexta.");
  expect(andamento.Text).not.toContain("/avaliar/");

  // Resolvido: e-mail com o link de avaliação
  await mudarStatus(page, "Marcar como resolvido");
  const resolvido = await aguardarEmailComAssunto(emailMaria, "Seu pedido foi resolvido (Hidráulica, Casa da Rua A)");
  const linkAvaliacao = resolvido.Text.match(/https?:\/\/\S+\/avaliar\/[A-Za-z0-9_-]+/)![0];

  // Avalia pelo link do e-mail
  const avaliacao = await (await browser.newContext()).newPage();
  await avaliacao.goto(linkAvaliacao);
  await expect(avaliacao.getByText("Maria, seu pedido foi resolvido")).toBeVisible();
  await avaliacao.getByRole("button", { name: "Enviar avaliação" }).click();
  // Sem nota, o navegador pede para escolher (campo obrigatório)
  await expect(avaliacao.getByRole("radio", { name: /^1 de 5/ })).toHaveJSProperty("validity.valid", false);
  await darNota(avaliacao, 4);
  await avaliacao.getByRole("textbox", { name: "Comentário (opcional)" }).fill("Resolveram rápido.");
  await avaliacao.getByRole("button", { name: "Enviar avaliação" }).click();
  await expect(avaliacao.getByRole("status")).toContainText("Obrigado pela avaliação!");

  // O link é de uso único
  await avaliacao.goto(linkAvaliacao);
  await expect(avaliacao.getByText("Este link de avaliação não vale mais")).toBeVisible();

  // O dono vê a nota, o comentário e o histórico
  await page.reload();
  await expect(page.getByRole("definition").filter({ hasText: "4 de 5" })).toBeVisible();
  await expect(page.getByText('"Resolveram rápido."')).toBeVisible();
  await expect(page.getByText("Maria avaliou o conserto")).toBeVisible();
  await expect(page.getByText("Nota 4 de 5. Resolveram rápido.")).toBeVisible();

  // E a inquilina vê a própria avaliação na página dela
  await inquilina.reload();
  await expect(inquilina.getByText("Sua avaliação: 4 de 5")).toBeVisible();

  // Reabrir: e-mail de reaberto, sem link de avaliação
  await mudarStatus(page, "Reabrir chamado", "Voltou a pingar.");
  const reaberto = await aguardarEmailComAssunto(emailMaria, "Seu pedido foi reaberto (Hidráulica, Casa da Rua A)");
  expect(reaberto.Text).toContain("Recado: Voltou a pingar.");
  expect(reaberto.Text).not.toContain("/avaliar/");
});

test("inquilino sem e-mail avalia pela página de pedidos", async ({ page, browser }) => {
  await entrar(page, emailDeTeste("dono-sem-email"));
  await cadastrarImovel(page, "Apto Centro", { rua: "Rua B", numero: "20", bairro: "Centro" });
  const link = await adicionarInquilino(page, "João");

  const inquilino = await (await browser.newContext()).newPage();
  await inquilino.goto(link);
  await abrirChamado(inquilino, { categoria: "Elétrica", descricao: "Tomada sem energia" });

  await abrirPrimeiroChamado(page);
  await mudarStatus(page, "Marcar como resolvido");

  // Na página dele, o pedido resolvido pede a avaliação
  await inquilino.reload();
  const pedido = inquilino.getByRole("region", { name: "Seus pedidos" }).getByRole("listitem").first();
  await expect(pedido).toContainText("Resolvido");
  await darNota(inquilino, 5);
  await pedido.getByRole("button", { name: "Enviar avaliação" }).click();
  await expect(pedido.getByRole("status")).toContainText("Obrigado pela avaliação!");
  await inquilino.reload();
  await expect(inquilino.getByText("Sua avaliação: 5 de 5")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("definition").filter({ hasText: "5 de 5" })).toBeVisible();
});
