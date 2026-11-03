import { expect, test, type Locator, type Page } from "@playwright/test";

import { abrirChamado, adicionarInquilino, cadastrarImovel, entrar } from "./ajudantes";
import { emailDeTeste } from "./mailpit";

// Layout do computador: quadro (kanban) de chamados com painel lateral e
// arrastar entre colunas; grade de imóveis.

const coluna = (page: Page, titulo: string) => page.getByRole("region", { name: titulo, exact: true });
const cartao = (page: Page, titulo: string, texto: string) =>
  coluna(page, titulo).getByRole("link").filter({ hasText: texto });

// Arrasta com o mouse, como uma pessoa: segura, mexe um pouco (para virar
// arraste) e solta sobre a coluna de destino.
async function arrastar(page: Page, origem: Locator, destino: Locator) {
  // Só dá para arrastar depois que a página carregou no navegador.
  await expect(page.locator("[data-pronto]")).toBeAttached();
  const de = (await origem.boundingBox())!;
  const para = (await destino.boundingBox())!;
  await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2);
  await page.mouse.down();
  await page.mouse.move(de.x + de.width / 2 + 15, de.y + de.height / 2, { steps: 3 });
  await page.mouse.move(para.x + para.width / 2, para.y + 80, { steps: 12 });
  await page.mouse.up();
}

async function prepararQuadro(page: Page, browser: import("@playwright/test").Browser) {
  await entrar(page, emailDeTeste("dono-quadro"), "Ana Souza");
  await cadastrarImovel(page, "Casa da Rua A", { rua: "Rua A", numero: "10", bairro: "Centro" });
  const link = await adicionarInquilino(page, "Maria");
  const inquilina = await (await browser.newContext()).newPage();
  await inquilina.goto(link);
  await abrirChamado(inquilina, { categoria: "Elétrica", descricao: "Tomada da sala sem energia" });
  await abrirChamado(inquilina, { categoria: "Outros", descricao: "Porta emperrada" });
  await abrirChamado(inquilina, {
    categoria: "Hidráulica",
    descricao: "Cano estourado",
    urgente: true,
    foto: "e2e/fixtures/vazamento.jpg",
  });
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Chamados" }).click();
  await expect(coluna(page, "Novos").getByRole("listitem")).toHaveCount(3);
}

test("quadro: colunas por status, urgente no topo e painel lateral do detalhe", async ({ page, browser }) => {
  test.slow();
  await prepararQuadro(page, browser);

  // No computador não aparecem as abas do celular
  await expect(page.getByRole("navigation", { name: "Situação dos chamados" })).toBeHidden();
  await expect(coluna(page, "Em andamento")).toContainText("Nenhum chamado");
  await expect(coluna(page, "Novos").getByRole("listitem").first()).toContainText("Hidráulica · Casa da Rua A");
  await expect(coluna(page, "Novos").getByRole("listitem").first()).toContainText("Urgente");
  // Etiquetas: o status sempre e, no urgente, também "Urgente"
  await expect(coluna(page, "Novos").getByRole("listitem").first()).toContainText("Novo");
  await expect(coluna(page, "Novos").getByRole("listitem").nth(1)).toContainText("Novo");
  await expect(coluna(page, "Novos").getByRole("listitem").nth(1)).not.toContainText("Urgente");

  // Clique abre o painel com o detalhe (e a foto); Esc fecha
  await cartao(page, "Novos", "Cano estourado").click();
  const painel = page.getByRole("dialog", { name: "Hidráulica" });
  await expect(painel).toBeVisible();
  await expect(page).toHaveURL(/\?chamado=[0-9a-f-]{36}$/);
  await expect(painel.getByRole("img", { name: "Foto enviada pelo inquilino" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(painel).toBeHidden();
  await expect(page).toHaveURL(/\/chamados$/);

  // Os botões do painel também mudam o status e o quadro acompanha
  await cartao(page, "Novos", "Porta emperrada").click();
  await page.getByRole("dialog").getByRole("button", { name: "Começar atendimento" }).click();
  await expect(cartao(page, "Em andamento", "Porta emperrada")).toBeVisible();
  // Fecha pelo X
  await page.getByRole("dialog").getByRole("link", { name: "Fechar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("quadro: arrastar muda o status, com as mesmas regras e o custo ao resolver", async ({ page, browser }) => {
  test.slow();
  await prepararQuadro(page, browser);

  // Novos → Em andamento
  await arrastar(page, cartao(page, "Novos", "Tomada da sala"), coluna(page, "Em andamento"));
  await expect(cartao(page, "Em andamento", "Tomada da sala")).toBeVisible();
  await expect(page.getByText("Elétrica · Casa da Rua A: Atendimento iniciado.")).toBeVisible();
  // Arrastar não abre o painel
  await expect(page.getByRole("dialog")).toBeHidden();
  // Ficou salvo
  await page.reload();
  await expect(cartao(page, "Em andamento", "Tomada da sala")).toBeVisible();

  // Em andamento → Novos não é permitido: aviso e o cartão fica onde estava
  await arrastar(page, cartao(page, "Em andamento", "Tomada da sala"), coluna(page, "Novos"));
  await expect(page.getByText("Um chamado não volta para Novos.", { exact: false })).toBeVisible();
  await expect(cartao(page, "Em andamento", "Tomada da sala")).toBeVisible();

  // Para Resolvidos: pede recado e custo; custo inválido é recusado
  await arrastar(page, cartao(page, "Em andamento", "Tomada da sala"), coluna(page, "Resolvidos"));
  const dialogo = page.getByRole("dialog", { name: "Marcar como resolvido" });
  await expect(dialogo).toBeVisible();
  await dialogo.getByRole("textbox", { name: "Custo do conserto (opcional)" }).fill("muito");
  await dialogo.getByRole("button", { name: "Marcar como resolvido" }).click();
  await expect(dialogo.getByText("Informe um valor como 150 ou 1.234,56.")).toBeVisible();
  await dialogo.getByRole("textbox", { name: "Recado (opcional)" }).fill("Trocamos a tomada.");
  await dialogo.getByRole("textbox", { name: "Custo do conserto (opcional)" }).fill("180");
  await dialogo.getByRole("button", { name: "Marcar como resolvido" }).click();
  await expect(dialogo).toBeHidden();
  await expect(cartao(page, "Resolvidos", "Tomada da sala")).toContainText("R$ 180,00");

  // Cancelar a janela não muda nada
  await arrastar(page, cartao(page, "Novos", "Porta emperrada"), coluna(page, "Resolvidos"));
  await page.getByRole("dialog", { name: "Marcar como resolvido" }).getByRole("button", { name: "Cancelar" }).click();
  await expect(cartao(page, "Novos", "Porta emperrada")).toBeVisible();

  // Pelo teclado: espaço pega, seta para a direita troca de coluna, espaço solta
  await expect(page.locator("[data-pronto]")).toBeAttached();
  // (espera cada anúncio do leitor de tela antes da próxima tecla, como quem usa)
  const anuncio = page.locator("[id^=DndLiveRegion]");
  await cartao(page, "Novos", "Porta emperrada").focus();
  await page.keyboard.press("Space");
  // ("Pegou o chamado..." é logo seguido por "Sobre a coluna...": o campo guarda o último)
  await expect(anuncio).toContainText("Sobre a coluna Novos.");
  // O dnd-kit passa a ouvir as setas logo depois de pegar (num setTimeout);
  // uma pessoa nunca é tão rápida, o teste com a máquina carregada é.
  await page.waitForTimeout(300);
  await page.keyboard.press("ArrowRight");
  await expect(anuncio).toContainText("Sobre a coluna Em andamento.");
  await page.keyboard.press("Space");
  await expect(anuncio).toContainText("Chamado solto na coluna Em andamento.");
  await expect(cartao(page, "Em andamento", "Porta emperrada")).toBeVisible();

  // Urgente em andamento continua marcado (ainda é prioridade); ao resolver, sai
  await arrastar(page, cartao(page, "Novos", "Cano estourado"), coluna(page, "Em andamento"));
  await expect(cartao(page, "Em andamento", "Cano estourado")).toContainText("Urgente");
  await expect(cartao(page, "Em andamento", "Cano estourado")).toContainText("Em andamento");
  await page.reload();
  await expect(cartao(page, "Em andamento", "Cano estourado")).toContainText("Urgente");
  await arrastar(page, cartao(page, "Em andamento", "Cano estourado"), coluna(page, "Resolvidos"));
  await page.getByRole("dialog", { name: "Marcar como resolvido" }).getByRole("button", { name: "Marcar como resolvido" }).click();
  await expect(cartao(page, "Resolvidos", "Cano estourado")).toBeVisible();
  await expect(cartao(page, "Resolvidos", "Cano estourado")).toContainText("Resolvido");
  await expect(cartao(page, "Resolvidos", "Cano estourado")).not.toContainText("Urgente");
});

test("quadro: título e filtro na mesma linha e colunas da mesma altura", async ({ page }) => {
  await entrar(page, emailDeTeste("dono-topo"));
  await cadastrarImovel(page, "Casa A", { rua: "Rua A", numero: "1", bairro: "Centro" });
  await cadastrarImovel(page, "Casa B", { rua: "Rua B", numero: "2", bairro: "Centro" });
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Chamados" }).click();

  // O rótulo some da tela, mas o leitor de tela continua anunciando o campo
  const filtro = (await page.getByRole("combobox", { name: "Imóvel" }).boundingBox())!;
  const titulo = (await page.getByRole("heading", { name: "Chamados" }).boundingBox())!;
  expect(filtro.y).toBeLessThan(titulo.y + titulo.height);
  expect(filtro.x).toBeGreaterThan(titulo.x + titulo.width);

  const novos = (await coluna(page, "Novos").boundingBox())!;
  const resolvidos = (await coluna(page, "Resolvidos").boundingBox())!;
  expect(resolvidos.height).toBe(novos.height);
  expect(resolvidos.x).toBeGreaterThan(novos.x + novos.width);
});

test("inquilino: formulário sozinho e, com pedidos, lista ao lado", async ({ page, browser }) => {
  await entrar(page, emailDeTeste("dono-inquilino-pc"));
  await cadastrarImovel(page, "Casa A", { rua: "Rua A", numero: "1", bairro: "Centro" });
  const link = await adicionarInquilino(page, "Maria");
  const inquilina = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await inquilina.goto(link);
  const formulario = inquilina.getByLabel("Pedir um conserto");

  // Sem pedidos: formulário centralizado
  const sozinho = (await formulario.boundingBox())!;
  expect(Math.abs(sozinho.x + sozinho.width / 2 - 720)).toBeLessThan(2);

  await abrirChamado(inquilina, { categoria: "Elétrica", descricao: "Tomada da sala sem energia" });
  await inquilina.reload();

  // Com pedidos: a lista fica à direita, à vista sem rolar
  const pedidos = inquilina.getByRole("region", { name: "Seus pedidos" });
  await expect(pedidos.getByRole("listitem")).toHaveCount(1);
  const caixaForm = (await formulario.boundingBox())!;
  const caixaPedidos = (await pedidos.boundingBox())!;
  expect(caixaPedidos.x).toBeGreaterThan(caixaForm.x + caixaForm.width - 1);
  await expect(pedidos.getByRole("listitem")).toBeInViewport();
});

test("ajustes: cartões em pares no computador", async ({ page }) => {
  await entrar(page, emailDeTeste("dono-ajustes-pc"));
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Ajustes" }).click();
  const conta = page.getByLabel("Sua conta");
  await expect(conta).toBeVisible();

  const caixa = async (nome: string) => (await page.getByLabel(nome, { exact: true }).boundingBox())!;
  const [avisos, silencio, dados, aparencia] = await Promise.all(
    ["Avisos no celular", "Horário de silêncio", "Sua conta", "Aparência"].map(caixa),
  );
  expect(silencio.y).toBe(avisos.y);
  expect(silencio.x).toBeGreaterThan(avisos.x + avisos.width);
  expect(aparencia.y).toBe(dados.y);
  expect(dados.y).toBeGreaterThan(avisos.y + avisos.height);
});

test("imóveis: grade no computador e, no imóvel, inquilinos ao lado do cadastro", async ({ page }) => {
  await entrar(page, emailDeTeste("dono-grade"));
  for (const apelido of ["Apto Centro", "Casa A", "Casa B", "Kitnet"]) {
    await cadastrarImovel(page, apelido, { rua: "Rua A", numero: "1", bairro: "Centro" });
  }
  await adicionarInquilino(page, "Maria");

  // Página do imóvel: o cadastro de inquilino fica à direita da lista
  const lista = (await page.getByRole("region", { name: "Inquilinos" }).boundingBox())!;
  const cadastro = (await page.getByLabel("Adicionar inquilino", { exact: true }).boundingBox())!;
  expect(cadastro.x).toBeGreaterThan(lista.x + lista.width - 1);

  // Lista de imóveis: três por linha
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Imóveis" }).click();
  const cartoes = page.getByRole("main").getByRole("listitem");
  await expect(cartoes).toHaveCount(4);
  const caixas = await Promise.all([0, 1, 2, 3].map(async (i) => (await cartoes.nth(i).boundingBox())!));
  expect(caixas[1].y).toBe(caixas[0].y);
  expect(caixas[2].y).toBe(caixas[0].y);
  expect(caixas[3].y).toBeGreaterThan(caixas[0].y);
});
