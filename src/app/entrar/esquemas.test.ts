import { describe, expect, it } from "vitest";

import { estadoDoLink } from "./esquemas";

describe("estadoDoLink", () => {
  it("sem parâmetros, começa pela etapa do e-mail", () => {
    expect(estadoDoLink({})).toEqual({ etapa: "email" });
  });

  it("com e-mail e código, abre a etapa do código já preenchida", () => {
    expect(estadoDoLink({ email: "Dono@Exemplo.com", codigo: "123456" })).toEqual({
      etapa: "codigo",
      email: "dono@exemplo.com",
      codigo: "123456",
    });
  });

  it("código malformado é ignorado, mas o e-mail é aproveitado", () => {
    expect(estadoDoLink({ email: "dono@exemplo.com", codigo: "12ab" })).toEqual({
      etapa: "codigo",
      email: "dono@exemplo.com",
      codigo: undefined,
    });
  });

  it("e-mail inválido ou repetido na URL volta para a etapa do e-mail", () => {
    expect(estadoDoLink({ email: "nao-e-email", codigo: "123456" })).toEqual({ etapa: "email" });
    expect(estadoDoLink({ email: ["a@b.com", "c@d.com"] })).toEqual({ etapa: "email" });
  });
});
