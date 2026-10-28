import { expect, test, type Browser } from "@playwright/test";

import { adicionarInquilino, cadastrarImovel, entrar } from "./ajudantes";
import { aguardarLinkDoInquilino, contarEmails, emailDeTeste } from "./mailpit";

// Abre o link numa janela à parte, como o inquilino abriria no celular dele.
async function abrirComoInquilino(browser: Browser, link: string) {
  const contexto = await browser.newContext();
  const page = await contexto.newPage();
  const resposta = await page.goto(link);
  return { page, resposta, fechar: () => contexto.close() };
}

test("inquilino abre o link, o dono vê o acesso e um link trocado deixa de valer", async ({
  page,
  browser,
}) => {
  await entrar(page, emailDeTeste("dono-link"));
  await cadastrarImovel(page, "Casa da Rua A", { rua: "Rua A", numero: "10", bairro: "Centro" });
  const link = await adicionarInquilino(page, "Maria");

  // O inquilino abre o link, sem login
  const inquilino = await abrirComoInquilino(browser, link);
  await expect(inquilino.page.getByText("Olá, Maria!")).toBeVisible();
  await expect(inquilino.page.getByText("Imóvel: Casa da Rua A")).toBeVisible();
  // O token da URL não vaza por Referer, e a página não é indexada
  expect(inquilino.resposta?.headers()["referrer-policy"]).toBe("no-referrer");
  expect(inquilino.resposta?.headers()["x-robots-tag"]).toBe("noindex, nofollow");

  // O dono passa a ver "Visto em ..."
  const maria = page.getByLabel("Inquilino Maria").filter({ visible: true });
  await expect(async () => {
    await page.reload();
    await expect(maria.getByText(/^Visto em \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}$/)).toBeVisible({
      timeout: 1000,
    });
  }).toPass();

  // Gerar novo link: o antigo para de funcionar na hora
  await maria.getByRole("button", { name: "Gerar e compartilhar novo link" }).click();
  const novoLink = await maria.getByTestId("link-inquilino").textContent();
  await inquilino.page.reload();
  await expect(inquilino.page.getByText("Este link não funciona mais")).toBeVisible();
  await expect(inquilino.page.getByRole("heading", { name: "Perdi meu link" })).toBeVisible();

  await inquilino.page.goto(novoLink!);
  await expect(inquilino.page.getByText("Olá, Maria!")).toBeVisible();
  await inquilino.fechar();

  // Link inventado também cai na tela de link inválido
  const qualquer = await abrirComoInquilino(browser, "/c/link-que-nao-existe-mas-tem-o-tamanho-certo1");
  await expect(qualquer.page.getByText("Este link não funciona mais")).toBeVisible();
  await qualquer.fechar();
});

test("perdi meu link: resposta sempre igual e o link novo chega por e-mail", async ({
  page,
  browser,
}) => {
  const emailMaria = emailDeTeste("inquilina");
  await entrar(page, emailDeTeste("dono-perdi"));
  await cadastrarImovel(page, "Apto Centro", { rua: "Rua B", numero: "20", bairro: "Centro" });
  const linkAntigo = await adicionarInquilino(page, "Maria", emailMaria);

  const tela = await abrirComoInquilino(browser, "/c/link-perdido-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  const pedir = async (email: string) => {
    await tela.page.goto("/c/link-perdido-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    await tela.page.getByRole("textbox", { name: "Seu e-mail" }).fill(email);
    await tela.page.getByRole("button", { name: "Receber meu link por e-mail" }).click();
    await expect(tela.page.getByRole("status")).toHaveText(
      /^Se o e-mail estiver cadastrado, enviamos o link\./,
    );
  };

  // E-mail cadastrado (digitado com maiúsculas): recebe o link novo
  await pedir(emailMaria.toUpperCase());
  const linkNovo = await aguardarLinkDoInquilino(emailMaria);
  expect(linkNovo).not.toBe(linkAntigo);

  await tela.page.goto(linkNovo);
  await expect(tela.page.getByText("Olá, Maria!")).toBeVisible();
  // O link antigo deixou de valer
  await tela.page.goto(linkAntigo);
  await expect(tela.page.getByText("Este link não funciona mais")).toBeVisible();

  // Pedir de novo logo em seguida: mesma resposta, mas nenhum e-mail novo
  // (espera de 10 min entre reenvios) e o link recebido continua valendo
  await pedir(emailMaria);
  await tela.page.waitForTimeout(1500);
  expect(await contarEmails(emailMaria)).toBe(1);
  await tela.page.goto(linkNovo);
  await expect(tela.page.getByText("Olá, Maria!")).toBeVisible();

  // E-mail não cadastrado: a mesma resposta, e nada é enviado
  const desconhecido = emailDeTeste("ninguem");
  await pedir(desconhecido);
  await tela.page.waitForTimeout(1500);
  expect(await contarEmails(desconhecido)).toBe(0);

  await tela.fechar();
});
