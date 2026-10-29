import { describe, expect, it } from "vitest";

import { montarAviso, type ChamadoDoAviso } from "./aviso.ts";

const chamado: ChamadoDoAviso = {
  id: "c1",
  categoria: "hidraulica",
  descricao: "Vazamento embaixo da pia",
  urgente: false,
  apelidoImovel: "Casa da Rua A",
  nomeInquilino: "Maria",
};

describe("montarAviso", () => {
  it("chamado novo: categoria, imóvel, quem pediu e link para o chamado", () => {
    expect(montarAviso("chamado_novo", chamado)).toEqual({
      titulo: "Novo chamado · Hidráulica · Casa da Rua A",
      corpo: "Maria: Vazamento embaixo da pia",
      url: "/chamados/c1",
      tag: "chamado-c1",
      urgencia: "normal",
    });
  });

  it("urgente: destaque no título e prioridade alta", () => {
    const aviso = montarAviso("chamado_novo", { ...chamado, urgente: true });
    expect(aviso?.titulo).toBe("Urgente · Hidráulica · Casa da Rua A");
    expect(aviso?.urgencia).toBe("high");
  });

  it("descrição longa é cortada e as quebras de linha somem", () => {
    const aviso = montarAviso("chamado_novo", {
      ...chamado,
      nomeInquilino: null,
      descricao: `Linha 1\n\nLinha 2 ${"x".repeat(200)}`,
    });
    expect(aviso!.corpo.length).toBe(120);
    expect(aviso!.corpo.startsWith("Linha 1 Linha 2")).toBe(true);
    expect(aviso!.corpo.endsWith("…")).toBe(true);
  });

  it("aviso de teste leva para Ajustes", () => {
    expect(montarAviso("teste", null)).toMatchObject({ url: "/ajustes", tag: "teste" });
  });

  it("tipo desconhecido ou chamado apagado: nada a enviar", () => {
    expect(montarAviso("outra_coisa", chamado)).toBeNull();
    expect(montarAviso("chamado_novo", null)).toBeNull();
  });
});
