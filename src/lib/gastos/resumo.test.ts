import { describe, expect, it } from "vitest";

import {
  gerarPlanilha,
  inicioDoPeriodo,
  lerFiltrosGastos,
  linkDosGastos,
  resumirGastos,
  rotuloDoMes,
  type ConsertoResolvido,
} from "./resumo";

const IMOVEL = "8f14e45f-ceea-4e5a-9e7e-1a2b3c4d5e6f";
// 7 de novembro de 2026, 12:00 em Brasília.
const AGORA = new Date("2026-11-07T15:00:00Z");

function conserto(dados: Partial<ConsertoResolvido> & { resolvido_em: string }): ConsertoResolvido {
  return {
    id: crypto.randomUUID(),
    categoria: "hidraulica",
    descricao: "Vazamento",
    valor: 100,
    imovel: { id: "a", apelido: "Casa A", arquivado: false },
    ...dados,
  };
}

describe("lerFiltrosGastos", () => {
  it("lê período, imóvel e categoria", () => {
    expect(lerFiltrosGastos({ periodo: "3m", imovel: IMOVEL, categoria: "eletrica" })).toEqual({
      periodo: "3m",
      imovelId: IMOVEL,
      categoria: "eletrica",
    });
  });

  it("ignora valores inválidos e usa os últimos 12 meses", () => {
    expect(lerFiltrosGastos({ periodo: "5anos", imovel: "x", categoria: "piscina" })).toEqual({
      periodo: "12m",
      imovelId: undefined,
      categoria: undefined,
    });
  });
});

describe("linkDosGastos", () => {
  it("deixa o período padrão fora da URL", () => {
    expect(linkDosGastos()).toBe("/gastos");
    expect(linkDosGastos({ imovelId: IMOVEL })).toBe(`/gastos?imovel=${IMOVEL}`);
    expect(linkDosGastos({ periodo: "tudo", categoria: "telhado" })).toBe("/gastos?periodo=tudo&categoria=telhado");
  });
});

describe("inicioDoPeriodo", () => {
  it("começa no dia 1 à meia-noite de Brasília", () => {
    expect(inicioDoPeriodo("mes", AGORA)?.toISOString()).toBe("2026-11-01T03:00:00.000Z");
    expect(inicioDoPeriodo("3m", AGORA)?.toISOString()).toBe("2026-09-01T03:00:00.000Z");
    expect(inicioDoPeriodo("12m", AGORA)?.toISOString()).toBe("2025-12-01T03:00:00.000Z");
    expect(inicioDoPeriodo("ano", AGORA)?.toISOString()).toBe("2026-01-01T03:00:00.000Z");
    expect(inicioDoPeriodo("tudo", AGORA)).toBeNull();
  });

  it("usa o mês de Brasília na virada (31/10 às 22h em Brasília já é novembro em UTC)", () => {
    expect(inicioDoPeriodo("mes", new Date("2026-11-01T01:00:00Z"))?.toISOString()).toBe("2026-10-01T03:00:00.000Z");
  });

  it("atravessa a virada do ano", () => {
    expect(inicioDoPeriodo("6m", new Date("2027-02-10T12:00:00Z"))?.toISOString()).toBe("2026-09-01T03:00:00.000Z");
  });
});

describe("rotuloDoMes", () => {
  it("abrevia e escreve por extenso", () => {
    expect(rotuloDoMes("2026-11")).toBe("nov/26");
    expect(rotuloDoMes("2026-03", true)).toBe("março de 2026");
  });
});

describe("resumirGastos", () => {
  const consertos = [
    conserto({ resolvido_em: "2026-11-05T12:00:00Z", valor: 0.1 }),
    conserto({ resolvido_em: "2026-11-02T12:00:00Z", valor: 0.2, categoria: "eletrica" }),
    conserto({
      resolvido_em: "2026-09-15T12:00:00Z",
      valor: 300,
      imovel: { id: "b", apelido: "Casa B", arquivado: true },
    }),
    conserto({ resolvido_em: "2026-09-20T12:00:00Z", valor: null, categoria: "telhado" }),
  ];

  it("soma em centavos e calcula a média só de quem tem valor", () => {
    const resumo = resumirGastos(consertos, "3m", AGORA);
    expect(resumo.total).toBe(300.3);
    expect(resumo.consertos).toBe(4);
    expect(resumo.semValor).toBe(1);
    expect(resumo.media).toBe(100.1);
  });

  it("agrupa por imóvel e categoria, do maior para o menor", () => {
    const resumo = resumirGastos(consertos, "3m", AGORA);
    expect(resumo.porImovel).toEqual([
      { chave: "b", rotulo: "Casa B (arquivado)", total: 300, consertos: 1 },
      { chave: "a", rotulo: "Casa A", total: 0.3, consertos: 3 },
    ]);
    expect(resumo.porCategoria.map(({ rotulo, total }) => [rotulo, total])).toEqual([
      ["Hidráulica", 300.1],
      ["Elétrica", 0.2],
      ["Telhado", 0],
    ]);
  });

  it("lista todos os meses do período, mesmo sem gasto", () => {
    const resumo = resumirGastos(consertos, "3m", AGORA);
    expect(resumo.porMes).toEqual([
      { chave: "2026-09", rotulo: "set/26", total: 300, consertos: 2 },
      { chave: "2026-10", rotulo: "out/26", total: 0, consertos: 0 },
      { chave: "2026-11", rotulo: "nov/26", total: 0.3, consertos: 2 },
    ]);
  });

  it("em todo o histórico, começa no mês do conserto mais antigo", () => {
    const resumo = resumirGastos(consertos, "tudo", AGORA);
    expect(resumo.porMes.map(({ chave }) => chave)).toEqual(["2026-09", "2026-10", "2026-11"]);
  });

  it("sem consertos: tudo zerado e sem média", () => {
    const resumo = resumirGastos([], "mes", AGORA);
    expect(resumo).toMatchObject({ total: 0, consertos: 0, media: null, porImovel: [], porCategoria: [] });
    expect(resumo.porMes).toEqual([{ chave: "2026-11", rotulo: "nov/26", total: 0, consertos: 0 }]);
  });
});

describe("gerarPlanilha", () => {
  it("gera CSV para o Excel brasileiro", () => {
    const planilha = gerarPlanilha([
      conserto({ resolvido_em: "2026-11-01T01:00:00Z", valor: 1234.5, descricao: 'Pia "nova"; sifão' }),
      conserto({ resolvido_em: "2026-10-10T12:00:00Z", valor: null, descricao: "=HIPERLINK(1)" }),
    ]);
    expect(planilha.startsWith("﻿")).toBe(true);
    expect(planilha.slice(1).split("\r\n")).toEqual([
      "Data;Imóvel;Categoria;Descrição;Valor (R$)",
      // 01:00 UTC ainda é 31/10 em Brasília.
      '31/10/2026;Casa A;Hidráulica;"Pia ""nova""; sifão";1234,50',
      "10/10/2026;Casa A;Hidráulica;'=HIPERLINK(1);",
      "",
    ]);
  });
});
