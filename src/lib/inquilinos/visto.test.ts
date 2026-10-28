import { describe, expect, it } from "vitest";

import { textoVistoEm } from "./visto";

describe("textoVistoEm", () => {
  it("sem acesso registrado", () => {
    expect(textoVistoEm(null)).toBe("Ainda não abriu o link");
  });

  it("mostra a data e a hora no horário de Brasília", () => {
    // 17:05 UTC = 14:05 em São Paulo
    expect(textoVistoEm("2026-10-28T17:05:00+00:00")).toBe("Visto em 28/10/2026 às 14:05");
  });

  it("vira o dia pelo fuso de Brasília, não pelo UTC", () => {
    // 01:30 UTC do dia 29 ainda é 22:30 do dia 28 em São Paulo
    expect(textoVistoEm("2026-10-29T01:30:00Z")).toBe("Visto em 28/10/2026 às 22:30");
  });
});
