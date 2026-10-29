import { describe, expect, it } from "vitest";

import { descreverEvento } from "./eventos";

describe("descreverEvento", () => {
  it("abertura pelo inquilino, com o nome dele", () => {
    expect(
      descreverEvento({ autor: "inquilino", status_anterior: null, status_novo: "aberto" }, "Maria"),
    ).toBe("Maria abriu o chamado");
  });

  it("inquilino já removido", () => {
    expect(descreverEvento({ autor: "inquilino", status_anterior: null, status_novo: "aberto" }, null)).toBe(
      "O inquilino abriu o chamado",
    );
  });

  it.each([
    ["aberto", "em_andamento", 'Você mudou para "Em andamento"'],
    ["em_andamento", "resolvido", "Você marcou como resolvido"],
    ["resolvido", "em_andamento", "Você reabriu o chamado"],
  ] as const)("%s → %s", (de, para, texto) => {
    expect(descreverEvento({ autor: "proprietario", status_anterior: de, status_novo: para })).toBe(texto);
  });
});
