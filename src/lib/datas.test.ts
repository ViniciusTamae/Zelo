import { describe, expect, it } from "vitest";

import { formatarDataHora, tempoDesde } from "./datas";

const agora = new Date("2026-10-28T20:00:00-03:00");

describe("tempoDesde", () => {
  it.each([
    ["2026-10-28T19:59:40-03:00", "agora"],
    ["2026-10-28T19:50:00-03:00", "há 10 min"],
    ["2026-10-28T17:00:00-03:00", "há 3 h"],
    ["2026-10-27T19:00:00-03:00", "há 1 dia"],
    ["2026-10-25T20:00:00-03:00", "há 3 dias"],
    ["2026-10-12T09:00:00-03:00", "12/10/2026"],
  ])("%s → %s", (iso, texto) => {
    expect(tempoDesde(iso, agora)).toBe(texto);
  });
});

describe("formatarDataHora", () => {
  it("usa o horário de Brasília", () => {
    expect(formatarDataHora("2026-10-28T17:05:00Z")).toBe("28/10/2026 às 14:05");
  });
});
