import { expect, test } from "@playwright/test";

import { abrirChamado, adicionarInquilino, cadastrarImovel, entrar } from "./ajudantes";
import { emailDeTeste } from "./mailpit";

test("proprietário vê os chamados, abre o detalhe com foto e leva até resolvido", async ({
  page,
  browser,
}) => {
  // Fluxo longo (dois pedidos, foto e quatro mudanças de status).
  test.slow();
  await entrar(page, emailDeTeste("dono-painel"));
  await cadastrarImovel(page, "Casa da Rua A", { rua: "Rua A", numero: "10", bairro: "Centro" });
  const link = await adicionarInquilino(page, "Maria");
  await cadastrarImovel(page, "Apto Centro", { rua: "Rua B", numero: "20", bairro: "Centro" });

  // A inquilina abre dois pedidos: um comum e, depois, um urgente com foto
  const inquilina = await (await browser.newContext()).newPage();
  await inquilina.goto(link);
  await abrirChamado(inquilina, { categoria: "Elétrica", descricao: "Tomada da sala sem energia" });
  await abrirChamado(inquilina, {
    categoria: "Hidráulica",
    descricao: "Vazamento embaixo da pia",
    urgente: true,
    foto: "e2e/fixtures/vazamento.jpg",
    horario: "Depois das 18h",
  });

  // Lista: o urgente vem primeiro, mesmo sendo o mais recente
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Chamados" }).click();
  await expect(page.getByRole("link", { name: "Abertos (2)" })).toBeVisible();
  // No celular, a lista com abas (o quadro é só do computador)
  await expect(page.getByRole("region", { name: "Novos", exact: true })).toBeHidden();
  const lista = page.getByRole("list", { name: "Lista de chamados" });
  await expect(lista.getByRole("listitem")).toHaveCount(2);
  await expect(lista.getByRole("listitem").first()).toContainText("Hidráulica · Casa da Rua A");
  await expect(lista.getByRole("listitem").first()).toContainText("Urgente");
  await expect(lista.getByRole("listitem").nth(1)).toContainText("Novo");

  // Filtro pelo outro imóvel: nada em aberto
  await page.getByRole("combobox", { name: "Imóvel" }).selectOption({ label: "Apto Centro" });
  await expect(page.getByText("Nenhum chamado em aberto.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Abertos (0)" })).toBeVisible();
  await page.getByRole("combobox", { name: "Imóvel" }).selectOption({ label: "Todos os imóveis" });

  // Detalhe do urgente: dados, foto e histórico
  await lista.getByRole("listitem").first().click();
  await expect(page.getByRole("heading", { name: "Hidráulica" })).toBeVisible();
  // O Next mantém a lista montada (escondida): confere só o que está visível
  await expect(
    page.getByRole("region", { name: "Descrição do problema" }).getByText("Vazamento embaixo da pia"),
  ).toBeVisible();
  await expect(page.getByText("Depois das 18h").filter({ visible: true })).toBeVisible();
  const foto = page.getByRole("img", { name: "Foto enviada pelo inquilino" });
  await expect(foto).toBeVisible();
  await expect.poll(() => foto.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1600);
  await expect(page.getByText("Maria abriu o chamado")).toBeVisible();

  // Começar atendimento com recado
  await page.getByRole("textbox", { name: "Recado (opcional)" }).fill("O encanador passa na sexta.");
  await page.getByRole("button", { name: "Começar atendimento" }).click();
  await expect(page.getByRole("status")).toHaveText("Atendimento iniciado.");
  await expect(page.getByText("Em andamento").first()).toBeVisible();
  await expect(page.getByText('Você mudou para "Em andamento"')).toBeVisible();
  await expect(page.getByText("O encanador passa na sexta.")).toBeVisible();

  // A inquilina vê o novo status na lista dela
  await inquilina.reload();
  const pedidos = inquilina.getByRole("region", { name: "Seus pedidos" });
  await expect(pedidos.getByRole("listitem").first()).toContainText("Em andamento");

  // Custo inválido é recusado; depois resolve com custo
  await page.getByRole("textbox", { name: "Custo do conserto (opcional)" }).fill("muito caro");
  await page.getByRole("button", { name: "Marcar como resolvido" }).click();
  await expect(page.getByText("Informe um valor como 150 ou 1.234,56.")).toBeVisible();
  await page.getByRole("textbox", { name: "Custo do conserto (opcional)" }).fill("150,50");
  await page.getByRole("button", { name: "Marcar como resolvido" }).click();
  await expect(page.getByRole("status")).toHaveText("Chamado marcado como resolvido.");
  await expect(page.getByText("R$ 150,50")).toBeVisible();
  await expect(page.getByText("Você marcou como resolvido")).toBeVisible();
  // Resolvido: só sobra reabrir
  await expect(page.getByRole("button", { name: "Reabrir chamado" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Marcar como resolvido" })).toHaveCount(0);

  // Abas: 1 em aberto, e o resolvido na outra aba
  await page.getByRole("link", { name: "← Chamados" }).click();
  await expect(page.getByRole("link", { name: "Abertos (1)" })).toBeVisible();
  await page.getByRole("link", { name: "Resolvidos" }).click();
  await expect(lista.getByRole("listitem")).toHaveCount(1);
  await expect(lista.getByRole("listitem").first()).toContainText("Resolvido em");

  // Reabrir devolve para "Em andamento"
  await lista.getByRole("listitem").first().click();
  await page.getByRole("textbox", { name: "Recado (opcional)" }).fill("Voltou a pingar.");
  await page.getByRole("button", { name: "Reabrir chamado" }).click();
  await expect(page.getByText("Você reabriu o chamado")).toBeVisible();
  await expect(page.getByRole("button", { name: "Marcar como resolvido" })).toBeVisible();
});

test("um proprietário não abre o chamado de outro", async ({ page, browser }) => {
  await entrar(page, emailDeTeste("dono-a"));
  await cadastrarImovel(page, "Casa A", { rua: "Rua A", numero: "1", bairro: "Centro" });
  const link = await adicionarInquilino(page, "Maria");
  const inquilina = await (await browser.newContext()).newPage();
  await inquilina.goto(link);
  await abrirChamado(inquilina, { categoria: "Telhado", descricao: "Goteira no quarto" });

  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Chamados" }).click();
  await page.getByRole("list", { name: "Lista de chamados" }).getByRole("listitem").first().click();
  await expect(page.getByRole("heading", { name: "Telhado" })).toBeVisible();
  const urlDoChamado = page.url();

  const outro = await (await browser.newContext()).newPage();
  await entrar(outro, emailDeTeste("dono-b"));
  await outro.goto(urlDoChamado);
  await expect(outro.getByRole("heading", { name: "Chamado não encontrado" })).toBeVisible();
  await expect(outro.getByText("Goteira no quarto")).toHaveCount(0);

  // E a lista dele não mostra o chamado
  await outro.goto("/chamados");
  await expect(outro.getByText("Goteira no quarto")).toHaveCount(0);
});
