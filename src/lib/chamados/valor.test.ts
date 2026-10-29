import { describe, expect, it } from "vitest";

import { formatarReais, lerValorEmReais } from "./valor";

describe("lerValorEmReais", () => {
  it.each([
    ["150", 150],
    ["150,5", 150.5],
    ["150,50", 150.5],
    ["1.234,56", 1234.56],
    ["R$ 80,00", 80],
    [" 12 ", 12],
    ["0", 0],
  ])("%j → %s", (texto, valor) => {
    expect(lerValorEmReais(texto)).toBe(valor);
  });

  it("em branco é sem custo (null)", () => {
    expect(lerValorEmReais("  ")).toBeNull();
  });

  it.each(["abc", "-50", "1,2,3", "12,345", "1.23,00", "150.50"])(
    "%j é inválido (undefined)",
    (texto) => {
      expect(lerValorEmReais(texto)).toBeUndefined();
    },
  );
});

describe("formatarReais", () => {
  it("formata em reais", () => {
    expect(formatarReais(1234.5)).toBe("R$ 1.234,50");
  });
});
