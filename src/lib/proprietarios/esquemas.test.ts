import { describe, expect, it } from "vitest";

import { nomeProprietarioSchema } from "./esquemas";

describe("nomeProprietarioSchema", () => {
  it("limpa os espaços das pontas", () => {
    expect(nomeProprietarioSchema.parse({ nome: "  Ana Souza " })).toEqual({ nome: "Ana Souza" });
  });

  it("recusa nome em branco", () => {
    const resultado = nomeProprietarioSchema.safeParse({ nome: "   " });
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0].message).toBe("Informe seu nome.");
  });

  it("recusa nome com mais de 80 caracteres", () => {
    expect(nomeProprietarioSchema.safeParse({ nome: "a".repeat(81) }).success).toBe(false);
  });
});
