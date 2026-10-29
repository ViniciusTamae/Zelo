import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

// Contraste das cores do tema (WCAG 2.1): 4,5:1 para texto e 3:1 para o que
// não é texto (borda de foco, estrelas). Lê as cores direto do globals.css,
// para nenhuma troca de cor futura piorar a leitura sem ninguém perceber.

const css = readFileSync("src/app/globals.css", "utf8");

function cores(seletor: string) {
  const bloco = css.match(new RegExp(`${seletor.replace(".", "\\.")}\\s*\\{([\\s\\S]*?)\\n\\}`))![1];
  return Object.fromEntries([...bloco.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]));
}

function luminancia(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string) {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

const PARES: [string, string, string, number][] = [
  ["texto no fundo", "foreground", "background", 4.5],
  ["texto no cartão", "card-foreground", "card", 4.5],
  ["texto secundário no fundo", "muted-foreground", "background", 4.5],
  ["texto secundário no cartão", "muted-foreground", "card", 4.5],
  ["botão principal", "primary-foreground", "primary", 4.5],
  ["categoria escolhida", "secondary-foreground", "secondary", 4.5],
  ["mensagem de erro no cartão", "destructive", "card", 4.5],
  ["badge Urgente", "status-urgente-fg", "status-urgente-bg", 4.5],
  ["badge Novo", "status-novo-fg", "status-novo-bg", 4.5],
  ["badge Em andamento", "status-andamento-fg", "status-andamento-bg", 4.5],
  ["badge Resolvido", "status-resolvido-fg", "status-resolvido-bg", 4.5],
  ["mensagem de sucesso no cartão", "status-resolvido-fg", "card", 4.5],
  ["borda de foco no cartão", "ring", "card", 3],
  ["estrela da avaliação no cartão", "estrela", "card", 3],
];

const claro = cores(":root");
const escuro = { ...claro, ...cores(".dark") };

describe.each([
  ["claro", claro],
  ["escuro", escuro],
])("contraste no modo %s", (_modo, tema) => {
  it.each(PARES)("%s", (_nome, frente, fundo, minimo) => {
    expect(contraste(tema[frente], tema[fundo])).toBeGreaterThanOrEqual(minimo);
  });
});

it("o modo escuro nunca usa preto puro no fundo", () => {
  expect(escuro.background.toUpperCase()).not.toBe("#000000");
});
