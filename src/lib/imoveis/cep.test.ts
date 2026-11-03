import { describe, expect, it, vi } from "vitest";

import { buscarCep, formatarCep, limparCep } from "./cep";

const resposta = (corpo: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(corpo), { status })) as unknown as typeof fetch;

describe("limparCep e formatarCep", () => {
  it("deixa só os números, no máximo 8", () => {
    expect(limparCep("01.001-000")).toBe("01001000");
    expect(limparCep("01001-0009")).toBe("01001000");
    expect(limparCep("abc")).toBe("");
  });

  it("põe o traço depois do quinto número", () => {
    expect(formatarCep("01001")).toBe("01001");
    expect(formatarCep("010010")).toBe("01001-0");
    expect(formatarCep("01001000")).toBe("01001-000");
  });
});

describe("buscarCep", () => {
  it("devolve rua, bairro, cidade e UF do ViaCEP", async () => {
    const buscar = resposta({ logradouro: "Praça da Sé", bairro: "Sé", localidade: "São Paulo", uf: "SP" });
    expect(await buscarCep("01001-000", buscar)).toEqual({
      encontrado: true,
      endereco: { logradouro: "Praça da Sé", bairro: "Sé", cidade: "São Paulo", uf: "SP" },
    });
    expect(buscar).toHaveBeenCalledWith("https://viacep.com.br/ws/01001000/json/", expect.anything());
  });

  it("CEP da cidade toda vem sem rua e bairro", async () => {
    const buscar = resposta({ logradouro: "", bairro: "", localidade: "Borá", uf: "SP" });
    expect(await buscarCep("19740000", buscar)).toEqual({
      encontrado: true,
      endereco: { logradouro: "", bairro: "", cidade: "Borá", uf: "SP" },
    });
  });

  it("CEP que não existe", async () => {
    expect(await buscarCep("99999999", resposta({ erro: true }))).toEqual({ encontrado: false, motivo: "nao-existe" });
    expect(await buscarCep("99999999", resposta({ erro: "true" }))).toEqual({ encontrado: false, motivo: "nao-existe" });
    expect(await buscarCep("99999999", resposta({}, 400))).toEqual({ encontrado: false, motivo: "nao-existe" });
  });

  it("CEP incompleto nem chega a buscar", async () => {
    const buscar = resposta({});
    expect(await buscarCep("0100", buscar)).toEqual({ encontrado: false, motivo: "nao-existe" });
    expect(buscar).not.toHaveBeenCalled();
  });

  it("serviço fora do ar ou sem internet", async () => {
    expect(await buscarCep("01001000", resposta({}, 503))).toEqual({ encontrado: false, motivo: "falha" });
    const semInternet = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    expect(await buscarCep("01001000", semInternet)).toEqual({ encontrado: false, motivo: "falha" });
  });
});
