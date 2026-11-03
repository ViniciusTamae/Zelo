import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  adicionarInquilino,
  cadastrarImovel,
  campo,
  entrar,
  LINK_INQUILINO,
} from "./ajudantes";
import { clienteAdmin } from "./admin";
import { emailDeTeste } from "./mailpit";

function rotuloVisivel(page: Page, texto: string) {
  return page.locator("label").filter({ hasText: texto, visible: true });
}

// O Next mantém a tela anterior montada (escondida): pega o campo do formulário visível.
function campoFoto(page: Page) {
  return page.locator("form").filter({ visible: true }).locator('input[name="foto"]');
}

function cartaoDoInquilino(page: Page, nome: string) {
  return page.getByLabel(`Inquilino ${nome}`).filter({ visible: true });
}

// "Mais opções" continua aberto depois de uma ação; só abre se estiver fechado.
async function abrirMaisOpcoes(cartao: Locator) {
  const detalhes = cartao.locator("details");
  if ((await detalhes.getAttribute("open")) === null) {
    await cartao.getByText("Mais opções").click();
  }
}

test("cadastro de imóvel e inquilinos com link exclusivo", async ({ page }) => {
  // Fluxo longo (validação, cadastro, edição, dois inquilinos, links e desativação).
  test.slow();
  await entrar(page, emailDeTeste("imoveis"));
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Imóveis" }).click();
  await expect(page.getByText("Você ainda não cadastrou imóveis.")).toBeVisible();

  // Obrigatórios marcados com *; o opcional, não
  await page.getByRole("link", { name: "Novo imóvel" }).click();
  for (const rotulo of ["Apelido", "Rua", "Número", "Bairro"]) {
    await expect(rotuloVisivel(page, rotulo)).toHaveText(`${rotulo}*`);
  }
  await expect(rotuloVisivel(page, "Complemento (opcional)")).not.toContainText("*");

  // Validação: obrigatórios só com espaços mostram as mensagens do servidor
  for (const rotulo of ["Apelido", "Rua", "Número", "Bairro"]) {
    await campo(page, rotulo).fill("   ");
  }
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(
    page.getByText("Dê um apelido para o imóvel (ex.: Casa da Rua A)."),
  ).toBeVisible();
  await expect(page.getByText("Informe a rua.")).toBeVisible();
  await expect(page.getByText("Informe o número (ou s/n).")).toBeVisible();
  await expect(page.getByText("Informe o bairro.")).toBeVisible();
  // O que foi digitado continua no formulário
  await expect(campo(page, "Rua")).toHaveValue("   ");

  // Cadastro do imóvel, sem complemento
  await cadastrarImovel(page, "Casa da Rua A", {
    rua: "Rua A",
    numero: "10",
    bairro: "Centro",
  });
  await expect(page.getByText("Rua A, 10 - Centro")).toBeVisible();
  await expect(page.getByText("Nenhum inquilino ainda.")).toBeVisible();

  // Edição: muda o apelido e inclui complemento; os campos vêm preenchidos
  await page.getByRole("link", { name: "Editar" }).click();
  await expect(campo(page, "Rua")).toHaveValue("Rua A");
  await expect(campo(page, "Número")).toHaveValue("10");
  await expect(campo(page, "Bairro")).toHaveValue("Centro");
  await campo(page, "Apelido").fill("Casa Azul");
  await campo(page, "Complemento (opcional)").fill("Fundos");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("heading", { name: "Casa Azul" })).toBeVisible();
  await expect(page.getByText("Rua A, 10 - Fundos - Centro")).toBeVisible();

  // Inquilino com e-mail inválido é recusado
  await campo(page, "Nome").fill("Maria");
  await campo(page, "E-mail (opcional)").fill("maria@");
  await page.getByRole("button", { name: "Adicionar inquilino" }).click();
  // O navegador valida type="email"; se passar, o servidor também recusa.
  await expect(campo(page, "E-mail (opcional)")).toHaveJSProperty(
    "validity.valid",
    false,
  );

  // Inquilinos: um com e-mail e outro sem; cada um recebe um link diferente
  const linkOriginal = await adicionarInquilino(page, "Maria", "maria@exemplo.test");
  const linkJoao = await adicionarInquilino(page, "João");
  expect(linkJoao).not.toBe(linkOriginal);

  // O link só aparece na hora: os cartões não mostram link nenhum
  const maria = cartaoDoInquilino(page, "Maria");
  await expect(maria.getByText("maria@exemplo.test")).toBeVisible();
  await expect(maria.getByText("Ainda não abriu o link")).toBeVisible();
  await expect(maria.getByTestId("link-inquilino")).toHaveCount(0);

  // Gerar novo link mostra outro token, uma vez
  await maria.getByRole("button", { name: "Gerar e compartilhar novo link" }).click();
  await expect(maria.getByRole("status")).toContainText("O anterior parou de funcionar.");
  await expect(maria.getByTestId("link-inquilino")).toHaveText(LINK_INQUILINO);
  await expect(maria.getByTestId("link-inquilino")).not.toHaveText(linkOriginal);
  await expect(maria.getByRole("button", { name: "Compartilhar link" })).toBeVisible();

  // Recarregando a página, o link some (o banco não tem como montá-lo de novo)
  await page.reload();
  await expect(maria.getByText("Ainda não abriu o link")).toBeVisible();
  await expect(page.getByTestId("link-inquilino").filter({ visible: true })).toHaveCount(0);

  // Desativar tira a opção de gerar link; reativar traz de volta
  await abrirMaisOpcoes(maria);
  await maria.getByRole("button", { name: "Desativar inquilino" }).click();
  await expect(maria.getByText("(desativado)")).toBeVisible();
  await expect(
    maria.getByRole("button", { name: "Gerar e compartilhar novo link" }),
  ).toHaveCount(0);

  await maria.getByRole("button", { name: "Reativar inquilino" }).click();
  await expect(maria.getByText("(desativado)")).toHaveCount(0);
  await expect(
    maria.getByRole("button", { name: "Gerar e compartilhar novo link" }),
  ).toBeVisible();

  // A lista de imóveis mostra o imóvel com os inquilinos ativos
  await page.getByRole("link", { name: "← Seus imóveis" }).click();
  const cartaoImovel = page.getByRole("link", { name: /Casa Azul/ });
  await expect(cartaoImovel).toContainText("Rua A, 10 - Fundos - Centro");
  await expect(cartaoImovel).toContainText("2 inquilinos");
});

test("foto do imóvel: cadastrar, trocar e remover; sem foto, a imagem padrão", async ({ page }) => {
  test.slow();
  await entrar(page, emailDeTeste("foto-imovel"));
  // Sem foto: imagem padrão na lista e na página do imóvel
  await cadastrarImovel(page, "Kitnet", { rua: "Rua K", numero: "5", bairro: "Centro" });
  await expect(page.locator("main [data-sem-foto]").filter({ visible: true })).toHaveCount(1);

  // Com foto: escolhe no cadastro e vê a prévia antes de salvar
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Imóveis" }).click();
  await page.getByRole("link", { name: "Novo imóvel" }).click();
  await campo(page, "Apelido").fill("Casa com foto");
  await campo(page, "Rua").fill("Rua A");
  await campo(page, "Número").fill("1");
  await campo(page, "Bairro").fill("Centro");
  await campoFoto(page).setInputFiles("e2e/fixtures/vazamento.jpg");
  await expect(page.getByRole("img", { name: "Prévia da foto escolhida" })).toBeVisible();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("heading", { name: "Casa com foto" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Foto de Casa com foto" })).toBeVisible();
  const imovelId = page.url().split("/").pop()!;

  // Lista: a foto de um e a imagem padrão do outro
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Imóveis" }).click();
  const lista = page.getByRole("main").getByRole("list");
  await expect(lista.getByRole("img", { name: "Foto de Casa com foto" })).toBeVisible();
  await expect(lista.locator("[data-sem-foto]")).toHaveCount(1);

  // Trocar: a foto nova substitui a antiga (só um arquivo fica guardado)
  const fotos = () => clienteAdmin().storage.from("fotos-imoveis").list(imovelId);
  const primeira = (await fotos()).data!.map((arquivo) => arquivo.name);
  expect(primeira).toHaveLength(1);
  await lista.getByRole("link", { name: /Casa com foto/ }).click();
  await page.getByRole("link", { name: "Editar" }).click();
  await expect(page.getByRole("img", { name: "Foto atual de Casa com foto" })).toBeVisible();
  await campoFoto(page).setInputFiles("e2e/fixtures/vazamento.jpg");
  await expect(page.getByRole("img", { name: "Prévia da foto escolhida" })).toBeVisible();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("img", { name: "Foto de Casa com foto" })).toBeVisible();
  await expect.poll(async () => (await fotos()).data!.map((arquivo) => arquivo.name)).toEqual([
    expect.not.stringMatching(primeira[0]),
  ]);

  // Remover: volta para a imagem padrão e o arquivo é apagado
  await page.getByRole("link", { name: "Editar" }).click();
  await page.getByRole("button", { name: "Remover foto" }).click();
  await expect(page.getByRole("img", { name: "Foto atual de Casa com foto" })).toBeHidden();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("heading", { name: "Casa com foto" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Foto de Casa com foto" })).toHaveCount(0);
  await expect(page.locator("main [data-sem-foto]").filter({ visible: true })).toHaveCount(1);
  await expect.poll(async () => (await fotos()).data!.length).toBe(0);
});

test("foto do imóvel: arquivo que não é imagem é recusado", async ({ page }) => {
  await entrar(page, emailDeTeste("foto-imovel-ruim"));
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Imóveis" }).click();
  await page.getByRole("link", { name: "Novo imóvel" }).click();
  await campo(page, "Apelido").fill("Casa");
  await campo(page, "Rua").fill("Rua A");
  await campo(page, "Número").fill("1");
  await campo(page, "Bairro").fill("Centro");
  await campoFoto(page).setInputFiles({
    name: "foto.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("isto não é uma foto"),
  });
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Formato de foto não aceito. Use uma foto JPG, PNG ou WebP.")).toBeVisible();
  // Nada foi cadastrado
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Imóveis" }).click();
  await expect(page.getByText("Você ainda não cadastrou imóveis.")).toBeVisible();
});

test("CEP preenche rua e bairro; CEP inexistente ou serviço fora do ar avisam", async ({ page }) => {
  // O ViaCEP é simulado: o teste não depende da internet nem do serviço.
  const respostas: Record<string, { status?: number; json: unknown }> = {
    "01001000": { json: { logradouro: "Praça da Sé", bairro: "Sé", localidade: "São Paulo", uf: "SP" } },
    "99999999": { json: { erro: "true" } },
    "11111111": { status: 503, json: {} },
  };
  const buscados: string[] = [];
  await page.route("https://viacep.com.br/ws/**", async (rota) => {
    const cep = rota.request().url().match(/ws\/(\d{8})\//)![1];
    buscados.push(cep);
    const { status = 200, json } = respostas[cep];
    await rota.fulfill({ status, json, headers: { "access-control-allow-origin": "*" } });
  });

  await entrar(page, emailDeTeste("cep"));
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Imóveis" }).click();
  await page.getByRole("link", { name: "Novo imóvel" }).click();
  const cep = campo(page, "CEP (opcional)");
  const aviso = page.getByRole("status").filter({ visible: true });

  // Inexistente: avisa e não mexe em nada
  await cep.fill("99999-999");
  await expect(aviso).toHaveText("CEP não encontrado. Confira os números ou preencha o endereço à mão.");
  await expect(campo(page, "Rua")).toHaveValue("");

  // Serviço fora do ar: avisa para preencher à mão
  await cep.fill("11111111");
  await expect(aviso).toHaveText("Não deu para buscar o CEP agora. Preencha o endereço à mão.");

  // Encontrado: máscara, rua e bairro preenchidos e o cursor no número
  await cep.fill("");
  await cep.pressSequentially("01001000");
  await expect(cep).toHaveValue("01001-000");
  await expect(campo(page, "Rua")).toHaveValue("Praça da Sé");
  await expect(campo(page, "Bairro")).toHaveValue("Sé");
  await expect(aviso).toHaveText("Endereço encontrado em São Paulo/SP. Confira e informe o número.");
  await expect(campo(page, "Número")).toBeFocused();
  // CEP incompleto não busca
  expect(buscados).toEqual(["99999999", "11111111", "01001000"]);

  // Salva normalmente (o CEP só ajudou a preencher)
  await campo(page, "Apelido").fill("Casa da Sé");
  await campo(page, "Número").fill("100");
  // A prévia do cartão acompanha o que foi digitado
  const previa = page.locator("form").filter({ visible: true });
  await expect(previa.getByText("Casa da Sé", { exact: true })).toBeVisible();
  await expect(previa.getByText("Praça da Sé, 100 - Sé", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Salvar imóvel" }).click();
  await expect(page.getByRole("heading", { name: "Casa da Sé" })).toBeVisible();
  await expect(page.getByText("Praça da Sé, 100 - Sé")).toBeVisible();
});

test("um proprietário não abre o imóvel de outro", async ({ browser }) => {
  // Ana cadastra um imóvel
  const contextoAna = await browser.newContext();
  const ana = await contextoAna.newPage();
  await entrar(ana, emailDeTeste("ana"));
  await cadastrarImovel(ana, "Casa da Ana", {
    rua: "Rua da Ana",
    numero: "1",
    bairro: "Centro",
  });
  const urlImovelAna = ana.url();
  await contextoAna.close();

  // Beto, logado, tenta abrir a página do imóvel da Ana pelo endereço
  const contextoBeto = await browser.newContext();
  const beto = await contextoBeto.newPage();
  await entrar(beto, emailDeTeste("beto"));

  await beto.goto(urlImovelAna);
  await expect(beto.getByRole("heading", { name: "Imóvel não encontrado" })).toBeVisible();
  await expect(beto.getByText("Casa da Ana")).toHaveCount(0);

  await beto.goto(`${urlImovelAna}/editar`);
  await expect(beto.getByRole("heading", { name: "Imóvel não encontrado" })).toBeVisible();

  // Id que não é UUID também cai na página de não encontrado
  await beto.goto("/imoveis/nao-existe");
  await expect(beto.getByRole("heading", { name: "Imóvel não encontrado" })).toBeVisible();

  // E a lista do Beto continua vazia
  await beto.goto("/imoveis");
  await expect(beto.getByText("Você ainda não cadastrou imóveis.")).toBeVisible();
  await contextoBeto.close();
});
