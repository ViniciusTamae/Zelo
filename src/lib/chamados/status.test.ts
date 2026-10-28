import { describe, expect, it } from "vitest";

import { statusVisual } from "./status";

describe("statusVisual", () => {
  it("chamado aberto aparece como novo", () => {
    expect(statusVisual({ status: "aberto", urgente: false })).toBe("novo");
  });

  it("chamado aberto e urgente aparece como urgente", () => {
    expect(statusVisual({ status: "aberto", urgente: true })).toBe("urgente");
  });

  it("depois de aberto, o status vale mais que a urgência", () => {
    expect(statusVisual({ status: "em_andamento", urgente: true })).toBe("em_andamento");
    expect(statusVisual({ status: "resolvido", urgente: true })).toBe("resolvido");
  });
});
