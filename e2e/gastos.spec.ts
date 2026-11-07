import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { entrar } from "./ajudantes";
import { prepararGastos } from "./gastos-dados";
import { emailDeTeste } from "./mailpit";

// Histórico de gastos no celular: totais, filtros, divisão por imóvel e
// categoria, planilha e o resumo na página do imóvel.

test("gastos: total do período, filtros, planilha e resumo no imóvel", async ({ page }) => {
  test.slow();
  const email = emailDeTeste("dono-gastos");
  await entrar(page, email, "Ana Souza");
  const { casaA } = await prepararGastos(email);

  // Chega pelo menu de baixo
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Gastos" }).click();
  await expect(page).toHaveURL(/\/gastos$/);
  const resumo = page.getByRole("region", { name: "Resumo" });
  await expect(resumo).toContainText("Gasto nos últimos 12 meses");
  await expect(resumo).toContainText("R$ 450,50");
  await expect(resumo).toContainText("4 consertos resolvidos · média de R$ 150,17");
  await expect(resumo).toContainText("1 conserto sem valor informado não entra no total.");
  // O chamado em aberto não aparece
  const lista = page.getByRole("list", { name: "Lista de consertos" });
  await expect(lista.getByRole("listitem")).toHaveCount(4);
  await expect(lista).not.toContainText("Porta emperrada");
  await expect(lista).toContainText("Sem valor");
  await expect(page.getByRole("list", { name: "Gasto por imóvel" })).toContainText("Casa B (arquivado)");

  // Período: este mês deixa de fora o conserto de 2 meses atrás
  await page.getByRole("combobox", { name: "Período" }).selectOption({ label: "Este mês" });
  await expect(page).toHaveURL(/\?periodo=mes$/);
  await expect(resumo).toContainText("Gasto neste mês");
  await expect(resumo).toContainText("R$ 150,50");

  // Clicar numa categoria filtra (e a divisão por categoria some)
  await page.getByRole("list", { name: "Gasto por categoria" }).getByRole("link", { name: /Elétrica/ }).click();
  await expect(page).toHaveURL(/\?periodo=mes&categoria=eletrica$/);
  await expect(resumo).toContainText("R$ 50,50");
  await expect(page.getByRole("list", { name: "Gasto por categoria" })).toBeHidden();

  // Planilha do que está filtrado
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Baixar planilha" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^gastos-zelo-\d{4}-\d{2}-\d{2}\.csv$/);
  const planilha = await readFile((await download.path())!, "utf8");
  expect(planilha).toContain("Data;Imóvel;Categoria;Descrição;Valor (R$)");
  expect(planilha).toContain("Casa A;Elétrica;Tomada queimada;50,50");
  expect(planilha).not.toContain("Vazamento na pia");

  // Filtros sem resultado
  await page.getByRole("combobox", { name: "Imóvel" }).selectOption({ label: "Casa B" });
  await expect(page.getByText("Nenhum conserto resolvido neste mês com esses filtros.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Baixar planilha" })).toBeHidden();

  // Página do imóvel: gasto dos últimos 12 meses, com link para Gastos filtrado
  await page.goto(`/imoveis/${casaA}`);
  await expect(page.getByText("Gasto nos últimos 12 meses: R$ 150,50 em 3 consertos.")).toBeVisible();
  await page.getByRole("link", { name: "Ver gastos" }).click();
  await expect(page).toHaveURL(new RegExp(`/gastos\\?imovel=${casaA}$`));
  await expect(resumo).toContainText("R$ 150,50");
});

test("gastos: sem imóveis, explica de onde vêm os valores", async ({ page }) => {
  await entrar(page, emailDeTeste("dono-sem-gastos"));
  await page.goto("/gastos");
  await expect(page.getByText(/Nenhum gasto ainda\. Cadastre um imóvel/)).toBeVisible();
});
