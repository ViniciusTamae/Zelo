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

// Faz o login completo pela tela (código lido no Mailpit) e termina na lista de chamados.
export async function entrar(page: Page, email: string) {
  await pedirCodigo(page, email);
  await digitarCodigo(page, await aguardarCodigo(email));
  await expect(page).toHaveURL(/\/chamados$/);
}

// Campo pelo nome acessível (o que o leitor de tela anuncia; o * dos
// obrigatórios fica de fora). O getByRole ignora a tela anterior que o Next
// mantém montada e escondida.
export function campo(page: Page, rotulo: string) {
  return page.getByRole("textbox", { name: rotulo, exact: true });
}
