import { describe, expect, it } from "vitest";

import { ordenarAbertos } from "./ordem";

describe("ordenarAbertos", () => {
  it("urgentes novos, depois novos, depois em andamento; o mais antigo primeiro", () => {
    const chamados = [
      { id: "andamento", status: "em_andamento", urgente: true, criado_em: "2026-10-01T10:00:00Z" },
      { id: "novo-recente", status: "aberto", urgente: false, criado_em: "2026-10-03T10:00:00Z" },
      { id: "urgente", status: "aberto", urgente: true, criado_em: "2026-10-04T10:00:00Z" },
      { id: "novo-antigo", status: "aberto", urgente: false, criado_em: "2026-10-02T10:00:00Z" },
    ] as const;

    expect(ordenarAbertos([...chamados]).map(({ id }) => id)).toEqual([
      "urgente",
      "novo-antigo",
      "novo-recente",
      "andamento",
    ]);
  });
});
