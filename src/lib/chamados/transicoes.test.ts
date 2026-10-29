import { describe, expect, it } from "vitest";

import { ACOES, transicaoPermitida } from "./transicoes";

describe("transições de status", () => {
  it.each([
    ["aberto", "em_andamento"],
    ["aberto", "resolvido"],
    ["em_andamento", "resolvido"],
    ["resolvido", "em_andamento"],
  ] as const)("permite %s → %s", (de, para) => {
    expect(transicaoPermitida(de, para)).toBe(true);
  });

  it.each([
    ["em_andamento", "aberto"],
    ["resolvido", "aberto"],
    ["aberto", "aberto"],
    ["resolvido", "resolvido"],
  ] as const)("não permite %s → %s", (de, para) => {
    expect(transicaoPermitida(de, para)).toBe(false);
  });

  it("a ação principal de um chamado novo é começar o atendimento", () => {
    expect(ACOES.aberto[0].rotulo).toBe("Começar atendimento");
  });
});
