import { expect, test, type Page } from "@playwright/test";

import { entrar } from "./ajudantes";
import { emailDeTeste } from "./mailpit";

// App instalável: tela "Sem internet" (service worker) e a dica de instalar
// no Android e no iPhone.

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

// O Chrome só oferece a instalação em condições que o navegador de teste não
// tem; simula o evento que ele dispara (com o resultado escolhido).
async function oferecerInstalacao(page: Page, resultado: "accepted" | "dismissed") {
  // Só depois de os scripts do app carregarem (antes disso ninguém escuta o evento).
  await page.waitForLoadState("load");
  await page.evaluate((outcome) => {
    const evento = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(evento, {
      prompt: async () => {
        (window as unknown as { instalacaoAberta: boolean }).instalacaoAberta = true;
      },
      userChoice: Promise.resolve({ outcome }),
    });
    window.dispatchEvent(evento);
  }, resultado);
}

test("sem internet, mostra a tela do Zelo e volta sozinho quando a conexão volta", async ({ page, context }) => {
  await page.goto("/entrar");
  // Espera o service worker assumir a página.
  await page.waitForFunction(async () => {
    await navigator.serviceWorker.ready;
    return Boolean(navigator.serviceWorker.controller);
  });

  await context.setOffline(true);
  await page.goto("/chamados").catch(() => {});
  await expect(page.getByRole("heading", { name: "Você está sem internet" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible();
  await expect(page).toHaveTitle("Sem internet | Zelo");

  // A conexão volta: a página pedida carrega sozinha (sem sessão, vai para /entrar).
  await context.setOffline(false);
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole("button", { name: "Receber código por e-mail" })).toBeVisible();
});

test("Android: faixa em Chamados abre a instalação e some depois de instalar", async ({ page }) => {
  await entrar(page, emailDeTeste("dono-instalar"));
  const faixa = page.getByRole("region", { name: "Instale o Zelo no celular" });
  // Sem o navegador oferecer a instalação, nada aparece.
  await expect(page.getByRole("heading", { name: "Chamados" })).toBeVisible();
  await expect(faixa).toBeHidden();

  await oferecerInstalacao(page, "accepted");
  await expect(faixa).toBeVisible();
  await expect(faixa).toContainText("recebe os avisos de pedidos novos");
  await faixa.getByRole("button", { name: "Instalar o Zelo" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { instalacaoAberta?: boolean }).instalacaoAberta)).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(faixa).toBeHidden();
});

test("Android: Agora não esconde a faixa, mas Ajustes continua oferecendo", async ({ page }) => {
  await entrar(page, emailDeTeste("dono-agora-nao"));
  await oferecerInstalacao(page, "dismissed");
  const faixa = page.getByRole("region", { name: "Instale o Zelo no celular" });
  await faixa.getByRole("button", { name: "Agora não" }).click();
  await expect(faixa).toBeHidden();

  // Continua escondida depois de recarregar, mesmo com o navegador oferecendo de novo.
  await page.reload();
  await oferecerInstalacao(page, "dismissed");
  await expect(page.getByRole("heading", { name: "Chamados" })).toBeVisible();
  await expect(faixa).toBeHidden();

  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Ajustes" }).click();
  await expect(page.getByRole("heading", { name: "Ajustes" })).toBeVisible();
  // O Chrome volta a oferecer a instalação a cada página.
  await oferecerInstalacao(page, "dismissed");
  const cartao = page.getByLabel("Instalar o app");
  await expect(cartao).toBeVisible();
  await expect(cartao.getByRole("button", { name: "Instalar o Zelo" })).toBeVisible();
});

test("iPhone: a dica ensina o caminho pelo Compartilhar", async ({ browser }) => {
  const contexto = await browser.newContext({
    userAgent: IPHONE,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await contexto.newPage();
  await entrar(page, emailDeTeste("dono-iphone"));

  const faixa = page.getByRole("region", { name: "Instale o Zelo no celular" });
  await expect(faixa).toBeVisible();
  await expect(faixa).toContainText("No iPhone, os avisos só funcionam com ele instalado.");
  await expect(faixa.getByRole("listitem")).toHaveText([/Toque em Compartilhar/, /Escolha Adicionar à Tela de Início/]);
  // No iPhone não há botão de instalar.
  await expect(faixa.getByRole("button", { name: "Instalar o Zelo" })).toBeHidden();

  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Ajustes" }).click();
  await expect(page.getByLabel("Instalar o app")).toContainText("Adicionar à Tela de Início");
  await contexto.close();
});
