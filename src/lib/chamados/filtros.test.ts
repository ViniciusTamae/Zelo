import { describe, expect, it } from "vitest";

import { combinaComBusca, contarFiltrosAtivos, linkDosChamados, lerFiltros, normalizar } from "./filtros";

const IMOVEL = "aaaaaaaa-0000-4000-8000-000000000001";

describe("lerFiltros", () => {
  it("lê os filtros da URL", () => {
    expect(lerFiltros({ imovel: IMOVEL, categoria: "eletrica", urgentes: "1", busca: "  tomada  " })).toEqual({
      imovelId: IMOVEL,
      categoria: "eletrica",
      urgentes: true,
      busca: "tomada",
    });
  });

  it("ignora valores inválidos ou repetidos", () => {
    expect(lerFiltros({ imovel: "nao-e-id", categoria: "jardim", urgentes: "sim", busca: ["a", "b"] })).toEqual({
      imovelId: undefined,
      categoria: undefined,
      urgentes: false,
      busca: "",
    });
  });

  it("corta buscas muito longas", () => {
    expect(lerFiltros({ busca: "x".repeat(300) }).busca).toHaveLength(100);
  });
});

describe("contarFiltrosAtivos e linkDosChamados", () => {
  it("conta só os filtros ligados", () => {
    expect(contarFiltrosAtivos({ urgentes: false, busca: "" })).toBe(0);
    expect(contarFiltrosAtivos({ categoria: "telhado", urgentes: true, busca: "goteira" })).toBe(3);
  });

  it("monta o link com os filtros e os extras", () => {
    expect(linkDosChamados({ urgentes: false, busca: "" })).toBe("/chamados");
    expect(linkDosChamados({ categoria: "eletrica", urgentes: true, busca: "sala" }, { aba: "resolvidos" })).toBe(
      "/chamados?aba=resolvidos&categoria=eletrica&urgentes=1&busca=sala",
    );
  });
});

describe("busca", () => {
  const chamado = {
    categoria: "eletrica" as const,
    descricao: "Tomada da sala sem energia",
    imoveis: { apelido: "Casa da Rua A" },
    inquilinos: { nome: "Maria Oliveira" },
  };

  it("ignora acentos e maiúsculas", () => {
    expect(normalizar("Elétrica ÁGUA")).toBe("eletrica agua");
    expect(combinaComBusca(chamado, "ELETRICA")).toBe(true);
  });

  it("procura na descrição, no imóvel, no inquilino e na categoria", () => {
    expect(combinaComBusca(chamado, "tomada")).toBe(true);
    expect(combinaComBusca(chamado, "rua a")).toBe(true);
    expect(combinaComBusca(chamado, "oliveira")).toBe(true);
    expect(combinaComBusca(chamado, "vazamento")).toBe(false);
  });

  it("com várias palavras, todas precisam aparecer", () => {
    expect(combinaComBusca(chamado, "maria tomada")).toBe(true);
    expect(combinaComBusca(chamado, "maria goteira")).toBe(false);
  });

  it("inquilino removido não quebra a busca", () => {
    expect(combinaComBusca({ ...chamado, inquilinos: null }, "tomada")).toBe(true);
  });
});
