import { describe, expect, it } from "vitest";

import { montarQuadro } from "./quadro";

const chamado = (id: string, status: "aberto" | "em_andamento" | "resolvido", extra = {}) => ({
  id,
  status,
  urgente: false,
  criado_em: "2026-10-01T10:00:00Z",
  resolvido_em: null as string | null,
  ...extra,
});

describe("montarQuadro", () => {
  it("separa por status, com urgentes novos no topo e o mais antigo primeiro", () => {
    const quadro = montarQuadro([
      chamado("novo-recente", "aberto", { criado_em: "2026-10-03T10:00:00Z" }),
      chamado("andamento", "em_andamento"),
      chamado("urgente", "aberto", { urgente: true, criado_em: "2026-10-04T10:00:00Z" }),
      chamado("novo-antigo", "aberto", { criado_em: "2026-10-02T10:00:00Z" }),
    ]);

    expect(quadro.aberto.map(({ id }) => id)).toEqual(["urgente", "novo-antigo", "novo-recente"]);
    expect(quadro.em_andamento.map(({ id }) => id)).toEqual(["andamento"]);
    expect(quadro.resolvido).toEqual([]);
  });

  it("resolvidos: o mais recente primeiro", () => {
    const quadro = montarQuadro([
      chamado("antigo", "resolvido", { resolvido_em: "2026-10-01T10:00:00Z" }),
      chamado("recente", "resolvido", { resolvido_em: "2026-10-20T10:00:00Z" }),
    ]);

    expect(quadro.resolvido.map(({ id }) => id)).toEqual(["recente", "antigo"]);
  });
});
