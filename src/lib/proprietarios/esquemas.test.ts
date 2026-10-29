import { describe, expect, it } from "vitest";

import { nomeProprietarioSchema, silencioSchema } from "./esquemas";

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

describe("silencioSchema", () => {
  it("aceita um intervalo que passa da meia-noite", () => {
    expect(silencioSchema.parse({ silencio_inicio: "21:00", silencio_fim: "08:00" })).toEqual({
      silencio_inicio: "21:00",
      silencio_fim: "08:00",
    });
  });

  it("recusa horário inválido", () => {
    const resultado = silencioSchema.safeParse({ silencio_inicio: "25:00", silencio_fim: "08:00" });
    expect(resultado.error?.issues[0].message).toBe("Informe um horário como 21:00.");
  });

  it("recusa início igual ao fim", () => {
    const resultado = silencioSchema.safeParse({ silencio_inicio: "08:00", silencio_fim: "08:00" });
    expect(resultado.error?.issues[0]).toMatchObject({
      message: "O início e o fim precisam ser diferentes.",
      path: ["silencio_fim"],
    });
  });
});
