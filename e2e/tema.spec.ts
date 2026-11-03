import { expect, test } from "@playwright/test";

import { clienteAdmin, idDoUsuario } from "./admin";
import { abrirChamado, adicionarInquilino, cadastrarImovel, entrar } from "./ajudantes";
import { emailDeTeste } from "./mailpit";

// Modo claro e escuro: o Zelo segue o modo do celular (colorScheme do navegador).
// Tira screenshots das telas principais nos dois modos para comparar
// (test-results/tema/<modo>-<tela>.png) e confere as cores do tema.

const FUNDO = { light: "rgb(250, 250, 249)", dark: "rgb(12, 10, 9)" };

for (const modo of ["light", "dark"] as const) {
  test.describe(`modo ${modo === "dark" ? "escuro" : "claro"}`, () => {
    test.use({ colorScheme: modo });

    test("telas principais seguem o modo do celular", async ({ page, browser }) => {
      test.slow();
      const pasta = `test-results/tema/${modo}`;

      // Tela de entrar
      await page.goto("/entrar");
      await expect(page.locator("html")).toHaveClass(modo === "dark" ? /\bdark\b/ : /^(?!.*\bdark\b)/);
      await expect(page.locator("body")).toHaveCSS("background-color", FUNDO[modo]);
      await page.screenshot({ path: `${pasta}-1-entrar.png` });

      // Chamados nos quatro status (para todos os StatusBadge aparecerem)
      const email = emailDeTeste(`tema-${modo}`);
      await entrar(page, email, "Ana Souza");
      await cadastrarImovel(page, "Casa da Rua A", { rua: "Rua A", numero: "10", bairro: "Centro" });
      const link = await adicionarInquilino(page, "Maria");
      const inquilina = await (await browser.newContext({ colorScheme: modo })).newPage();
      await inquilina.goto(link);
      for (const [categoria, descricao, urgente] of [
        ["Telhado", "Goteira no quarto", false],
        ["Elétrica", "Tomada da sala sem energia", false],
        ["Outros", "Porta do banheiro emperrada", false],
        ["Hidráulica", "Cano estourado na cozinha", true],
      ] as const) {
        await abrirChamado(inquilina, { categoria, descricao, urgente });
      }
      const supabase = clienteAdmin();
      // A chave admin enxerga tudo: filtra pelo imóvel deste teste para não
      // mexer nos chamados de outros testes que rodam ao mesmo tempo.
      const { data: imovel } = await supabase
        .from("imoveis")
        .select("id")
        .eq("dono_id", await idDoUsuario(email))
        .single();
      const chamadosDoTeste = (status: "em_andamento" | "resolvido", descricao: string) =>
        supabase.from("chamados").update({ status }).eq("imovel_id", imovel!.id).eq("descricao", descricao);
      await chamadosDoTeste("em_andamento", "Tomada da sala sem energia");
      await chamadosDoTeste("resolvido", "Goteira no quarto");

      await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Chamados" }).click();
      await expect(page.getByRole("link", { name: "Abertos (3)" })).toBeVisible();
      await page.screenshot({ path: `${pasta}-2-chamados.png`, fullPage: true });

      // Página do inquilino
      await inquilina.reload();
      await expect(inquilina.getByRole("region", { name: "Seus pedidos" }).getByRole("listitem")).toHaveCount(4);
      await inquilina.screenshot({ path: `${pasta}-3-inquilino.png`, fullPage: true });
    });
  });
}

// Conta quantas vezes a página pediu uma transição suave (View Transitions).
async function contarTransicoes(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const janela = window as unknown as { transicoes: number };
    janela.transicoes = 0;
    const original = document.startViewTransition?.bind(document);
    if (original) {
      document.startViewTransition = ((...args: Parameters<typeof original>) => {
        janela.transicoes++;
        return original(...args);
      }) as typeof document.startViewTransition;
    }
  });
  return () => page.evaluate(() => (window as unknown as { transicoes: number }).transicoes);
}

test.describe("escolha do tema em Ajustes", () => {
  test.use({ colorScheme: "light" });

  test("escolher Escuro vale mesmo com o celular no claro, e Automático volta a seguir o celular", async ({
    page,
  }) => {
    const transicoes = await contarTransicoes(page);
    await entrar(page, emailDeTeste("tema-escolha"));
    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Ajustes" }).click();
    const aparencia = page.getByLabel("Aparência");
    const html = page.locator("html");

    // Padrão: Automático, seguindo o celular (claro)
    await expect(aparencia.getByRole("radio", { name: "Automático" })).toBeChecked();
    await expect(html).not.toHaveClass(/\bdark\b/);

    // Escuro, com a troca suave (transição entre o antes e o depois)
    await aparencia.locator("label").filter({ hasText: "Escuro" }).click();
    await expect(html).toHaveClass(/\bdark\b/);
    expect(await transicoes()).toBe(1);
    await expect(page.locator("body")).toHaveCSS("background-color", FUNDO.dark);

    // A escolha continua depois de recarregar e em outras telas
    await page.reload();
    await expect(page.getByLabel("Aparência").getByRole("radio", { name: "Escuro" })).toBeChecked();
    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Chamados" }).click();
    await expect(html).toHaveClass(/\bdark\b/);

    // Automático volta a seguir o celular (claro)
    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Ajustes" }).click();
    await page.getByLabel("Aparência").locator("label").filter({ hasText: "Automático" }).click();
    await expect(html).not.toHaveClass(/\bdark\b/);
    await expect(page.locator("body")).toHaveCSS("background-color", FUNDO.light);
  });
});

test.describe("escolha do tema com \"reduzir movimento\" ligado no celular", () => {
  test.use({ colorScheme: "light", reducedMotion: "reduce" });

  test("troca na hora, sem animação", async ({ page }) => {
    const transicoes = await contarTransicoes(page);
    await entrar(page, emailDeTeste("tema-sem-animacao"));
    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Ajustes" }).click();

    await page.getByLabel("Aparência").locator("label").filter({ hasText: "Escuro" }).click();
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    expect(await transicoes()).toBe(0);
  });
});
