import { expect, test, type Page } from "@playwright/test";

import { clienteAdmin } from "./admin";
import { adicionarInquilino, cadastrarImovel, entrar } from "./ajudantes";
import { emailDeTeste } from "./mailpit";

const FOTO = "e2e/fixtures/vazamento.jpg"; // 2000 x 1500

// Largura e altura de um JPEG, lidas do cabeçalho (marcador SOF).
function dimensoesJpeg(bytes: Uint8Array) {
  for (let i = 2; i < bytes.length; ) {
    const marcador = bytes[i + 1];
    const tamanho = (bytes[i + 2] << 8) | bytes[i + 3];
    if (marcador >= 0xc0 && marcador <= 0xc2) {
      return { altura: (bytes[i + 5] << 8) | bytes[i + 6], largura: (bytes[i + 7] << 8) | bytes[i + 8] };
    }
    i += 2 + tamanho;
  }
  throw new Error("JPEG sem dimensões");
}

// O rádio fica escondido; a pessoa toca no cartão da categoria.
async function escolherCategoria(page: Page, rotulo: string) {
  await page.locator("label").filter({ hasText: rotulo }).click();
  await expect(page.getByRole("radio", { name: new RegExp(rotulo) })).toBeChecked();
}

async function prepararInquilino(page: Page, prefixo: string) {
  await entrar(page, emailDeTeste(prefixo));
  await cadastrarImovel(page, "Casa da Rua A", { rua: "Rua A", numero: "10", bairro: "Centro" });
  return adicionarInquilino(page, "Maria");
}

test("inquilino abre chamados pelo link, com foto reduzida, e acompanha a lista", async ({
  page,
  browser,
}) => {
  const link = await prepararInquilino(page, "dono-chamado");
  const inquilino = await (await browser.newContext()).newPage();
  await inquilino.goto(link);

  // Chamado urgente, com foto e horário
  const descricao = `Vazamento embaixo da pia ${Date.now()}`;
  await escolherCategoria(inquilino, "Hidráulica");
  await inquilino.getByRole("textbox", { name: "O que aconteceu?" }).fill(descricao);
  await inquilino.locator('input[name="foto"]').setInputFiles(FOTO);
  await expect(inquilino.getByRole("img", { name: "Prévia da foto escolhida" })).toBeVisible();
  await inquilino.getByRole("checkbox", { name: /É urgente/ }).check();
  await inquilino
    .getByRole("textbox", { name: "Melhor horário para o conserto (opcional)" })
    .fill("Depois das 18h");
  await inquilino.getByRole("button", { name: "Enviar pedido" }).click();

  await expect(inquilino.getByRole("status")).toContainText("Pedido enviado!");
  const pedidos = inquilino.getByRole("region", { name: "Seus pedidos" });
  await expect(pedidos.getByRole("listitem")).toHaveCount(1);
  await expect(pedidos).toContainText("Hidráulica");
  await expect(pedidos).toContainText("Urgente");
  await expect(pedidos).toContainText(descricao);

  // No banco: dados certos, histórico "aberto" e a foto reduzida no celular
  const supabase = clienteAdmin();
  const { data: chamado } = await supabase
    .from("chamados")
    .select("id, imovel_id, categoria, urgente, melhor_horario, status, foto_path, eventos_chamado(autor, status_novo)")
    .eq("descricao", descricao)
    .single();
  expect(chamado).toMatchObject({
    categoria: "hidraulica",
    urgente: true,
    melhor_horario: "Depois das 18h",
    status: "aberto",
    eventos_chamado: [{ autor: "inquilino", status_novo: "aberto" }],
  });
  expect(chamado!.foto_path).toBe(`${chamado!.imovel_id}/${chamado!.id}/foto.jpg`);
  const { data: arquivo } = await supabase.storage.from("fotos-chamados").download(chamado!.foto_path!);
  const { largura, altura } = dimensoesJpeg(new Uint8Array(await arquivo!.arrayBuffer()));
  expect({ largura, altura }).toEqual({ largura: 1600, altura: 1200 });

  // Outro pedido, sem foto e sem urgência: entra no topo da lista como "Novo"
  await inquilino.getByRole("button", { name: "Abrir outro pedido" }).click();
  await escolherCategoria(inquilino, "Elétrica");
  await inquilino.getByRole("textbox", { name: "O que aconteceu?" }).fill("Tomada da sala sem energia");
  await inquilino.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(pedidos.getByRole("listitem")).toHaveCount(2);
  await expect(pedidos.getByRole("listitem").first()).toContainText("Elétrica");
  await expect(pedidos.getByRole("listitem").first()).toContainText("Novo");
});

test("link trocado enquanto a página estava aberta: o pedido não é aceito", async ({
  page,
  browser,
}) => {
  const link = await prepararInquilino(page, "dono-troca");
  const inquilino = await (await browser.newContext()).newPage();
  await inquilino.goto(link);

  // O dono gera um novo link nesse meio-tempo
  const maria = page.getByLabel("Inquilino Maria").filter({ visible: true });
  await maria.getByRole("button", { name: "Gerar e compartilhar novo link" }).click();
  await expect(maria.getByTestId("link-inquilino")).toBeVisible();

  await escolherCategoria(inquilino, "Telhado");
  await inquilino.getByRole("textbox", { name: "O que aconteceu?" }).fill("Goteira no quarto");
  await inquilino.getByRole("button", { name: "Enviar pedido" }).click();

  await expect(inquilino.locator("form").getByRole("alert")).toHaveText(
    "Este link não funciona mais. Peça um novo ao proprietário.",
  );
  await expect(inquilino.getByRole("region", { name: "Seus pedidos" })).toHaveCount(0);
});
