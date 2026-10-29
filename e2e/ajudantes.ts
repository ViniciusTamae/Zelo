import { expect, type Page } from "@playwright/test";

import { aguardarCodigo } from "./mailpit";

export async function pedirCodigo(page: Page, email: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Receber código por e-mail" }).click();
  await expect(
    page.getByText("Enviamos um código de 6 números para"),
  ).toBeVisible();
}

export async function digitarCodigo(page: Page, codigo: string) {
  await page.getByLabel("Código").fill(codigo);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

// Faz o login completo pela tela (código lido no Mailpit) e termina na lista
// de chamados. No primeiro acesso, informa o nome na tela de boas-vindas.
export async function entrar(page: Page, email: string, nome = "Proprietário de Teste") {
  await pedirCodigo(page, email);
  await digitarCodigo(page, await aguardarCodigo(email));
  await expect(page).toHaveURL(/\/(chamados|boas-vindas)$/);
  if (page.url().endsWith("/boas-vindas")) {
    await informarNome(page, nome);
  }
  await expect(page).toHaveURL(/\/chamados$/);
}

export async function informarNome(page: Page, nome: string) {
  await campo(page, "Seu nome").fill(nome);
  await page.getByRole("button", { name: "Continuar" }).click();
}

// Campo pelo nome acessível (o que o leitor de tela anuncia; o * dos
// obrigatórios fica de fora). O getByRole ignora a tela anterior que o Next
// mantém montada e escondida.
export function campo(page: Page, rotulo: string) {
  return page.getByRole("textbox", { name: rotulo, exact: true });
}

export const LINK_INQUILINO = /^http:\/\/localhost:3000\/c\/[A-Za-z0-9_-]{43}$/;

export type Endereco = { rua: string; numero: string; complemento?: string; bairro: string };

export async function cadastrarImovel(page: Page, apelido: string, endereco: Endereco) {
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Imóveis" }).click();
  await page.getByRole("link", { name: "Novo imóvel" }).click();
  await campo(page, "Apelido").fill(apelido);
  await campo(page, "Rua").fill(endereco.rua);
  await campo(page, "Número").fill(endereco.numero);
  await campo(page, "Complemento (opcional)").fill(endereco.complemento ?? "");
  await campo(page, "Bairro").fill(endereco.bairro);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("heading", { name: apelido })).toBeVisible();
}

// Adiciona e devolve o link, que aparece uma única vez abaixo do formulário.
export async function adicionarInquilino(page: Page, nome: string, email = "") {
  await campo(page, "Nome").fill(nome);
  await campo(page, "E-mail (opcional)").fill(email);
  await page.getByRole("button", { name: "Adicionar inquilino" }).click();
  await expect(page.getByRole("status")).toHaveText(
    `Inquilino adicionado: ${nome}. Compartilhe o link abaixo, ele só aparece agora.`,
  );
  const link = page
    .getByLabel("Adicionar inquilino", { exact: true })
    .filter({ visible: true })
    .getByTestId("link-inquilino");
  await expect(link).toHaveText(LINK_INQUILINO);
  return (await link.textContent())!;
}

// O rádio da categoria fica escondido; a pessoa toca no cartão.
export async function escolherCategoria(page: Page, rotulo: string) {
  await page.locator("label").filter({ hasText: rotulo }).click();
  await expect(page.getByRole("radio", { name: new RegExp(rotulo) })).toBeChecked();
}

// Inquilino abre um chamado na página do link (já aberta em `page`).
export async function abrirChamado(
  page: Page,
  chamado: { categoria: string; descricao: string; urgente?: boolean; foto?: string; horario?: string },
) {
  await escolherCategoria(page, chamado.categoria);
  await page.getByRole("textbox", { name: "O que aconteceu?" }).fill(chamado.descricao);
  if (chamado.foto) {
    await page.locator('input[name="foto"]').setInputFiles(chamado.foto);
    await expect(page.getByRole("img", { name: "Prévia da foto escolhida" })).toBeVisible();
  }
  if (chamado.urgente) await page.getByRole("checkbox", { name: /É urgente/ }).check();
  if (chamado.horario) {
    await page
      .getByRole("textbox", { name: "Melhor horário para o conserto (opcional)" })
      .fill(chamado.horario);
  }
  await page.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(page.getByRole("status")).toContainText("Pedido enviado!");
  await page.getByRole("button", { name: "Abrir outro pedido" }).click();
}
