import { expect, test } from "@playwright/test";

import { entrar } from "./ajudantes";
import { prepararGastos } from "./gastos-dados";
import { emailDeTeste } from "./mailpit";

// Gastos no computador: tabela, gráfico mês a mês com dica e o "Ver todos" da
// coluna Resolvidos do quadro.

test("gastos no computador: tabela, mês a mês e Ver todos do quadro", async ({ page }) => {
  test.slow();
  const email = emailDeTeste("dono-gastos-pc");
  await entrar(page, email, "Ana Souza");
  await prepararGastos(email);
  await page.reload();

  // "Ver todos" da coluna Resolvidos leva para Gastos
  await page.getByRole("region", { name: "Resolvidos", exact: true }).getByRole("link", { name: "Ver todos" }).click();
  await expect(page).toHaveURL(/\/gastos$/);
  await expect(page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Gastos" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  // Tabela no lugar da lista do celular
  await expect(page.getByRole("list", { name: "Lista de consertos" })).toBeHidden();
  const tabela = page.getByRole("table");
  await expect(tabela.getByRole("columnheader")).toHaveText(["Resolvido em", "Imóvel", "Categoria", "Descrição", "Valor"]);
  await expect(tabela.getByRole("row")).toHaveCount(5);
  await expect(tabela.getByRole("row", { name: /Pintura da sala/ })).toContainText("Casa B (arquivado)");

  // Mês a mês: os 12 meses, com o valor de cada um para o leitor de tela e na dica
  const meses = page.getByRole("list", { name: "Gasto por mês" }).getByRole("listitem");
  await expect(meses).toHaveCount(12);
  await expect(meses.last()).toHaveAccessibleName(/: R\$ 150,50, 3 consertos$/);
  await meses.last().hover();
  await expect(meses.last()).toContainText("R$ 150,50 · 3 consertos");

  // Clicar num imóvel filtra; a descrição abre o chamado
  await page.getByRole("list", { name: "Gasto por imóvel" }).getByRole("link", { name: /Casa A/ }).click();
  await expect(page).toHaveURL(/\/gastos\?imovel=[0-9a-f-]{36}$/);
  await expect(tabela.getByRole("row")).toHaveCount(4);
  await tabela.getByRole("link", { name: "Vazamento na pia" }).click();
  await expect(page).toHaveURL(/\/chamados\/[0-9a-f-]{36}$/);
});
