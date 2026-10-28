import { describe, expect, it } from "vitest";

import { formatarHora, formatarSilencio } from "./horario";

describe("formatarHora", () => {
  it("hora cheia fica só com o h", () => {
    expect(formatarHora("21:00:00")).toBe("21h");
  });

  it("tira o zero à esquerda", () => {
    expect(formatarHora("08:00:00")).toBe("8h");
  });

  it("mantém os minutos quando não é hora cheia", () => {
    expect(formatarHora("22:30:00")).toBe("22h30");
  });
});

describe("formatarSilencio", () => {
  it("monta o intervalo do horário de silêncio", () => {
    expect(formatarSilencio("21:00:00", "08:00:00")).toBe("Das 21h às 8h");
  });
});
