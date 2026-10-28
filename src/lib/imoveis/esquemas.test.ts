import { describe, expect, it } from "vitest";

import { formatarEndereco } from "./endereco";
import { idSchema, imovelSchema, inquilinoSchema } from "./esquemas";

function primeiroErro(resultado: { success: boolean; error?: { issues: { message: string }[] } }) {
  return resultado.error?.issues[0]?.message;
}

const imovelValido = {
  apelido: "Casa A",
  logradouro: "Rua A",
  numero: "10",
  complemento: "",
  bairro: "Centro",
};

describe("imovelSchema", () => {
  it("aceita, limpa espaços e transforma complemento vazio em null", () => {
    expect(
      imovelSchema.parse({
        apelido: "  Casa A ",
        logradouro: " Rua A ",
        numero: " 10A ",
        complemento: "   ",
        bairro: " Centro ",
      }),
    ).toEqual({
      apelido: "Casa A",
      logradouro: "Rua A",
      numero: "10A",
      complemento: null,
      bairro: "Centro",
    });
  });

  it("mantém o complemento quando preenchido", () => {
    expect(
      imovelSchema.parse({ ...imovelValido, complemento: " Apto 2 " }).complemento,
    ).toBe("Apto 2");
  });

  it("aceita s/n como número", () => {
    expect(imovelSchema.parse({ ...imovelValido, numero: "s/n" }).numero).toBe("s/n");
  });

  it.each([
    ["apelido", "   ", "Dê um apelido para o imóvel (ex.: Casa da Rua A)."],
    ["logradouro", "", "Informe a rua."],
    ["numero", " ", "Informe o número (ou s/n)."],
    ["bairro", "", "Informe o bairro."],
    ["apelido", "x".repeat(61), "Use no máximo 60 caracteres."],
    ["logradouro", "x".repeat(121), "Use no máximo 120 caracteres."],
    ["numero", "x".repeat(11), "Use no máximo 10 caracteres."],
    ["complemento", "x".repeat(61), "Use no máximo 60 caracteres."],
    ["bairro", "x".repeat(81), "Use no máximo 80 caracteres."],
  ])("recusa %s = %j", (campo, valor, mensagem) => {
    expect(
      primeiroErro(imovelSchema.safeParse({ ...imovelValido, [campo]: valor })),
    ).toBe(mensagem);
  });
});

describe("formatarEndereco", () => {
  it("monta o endereço com complemento", () => {
    expect(
      formatarEndereco({
        logradouro: "Rua A",
        numero: "10",
        complemento: "Apto 2",
        bairro: "Centro",
      }),
    ).toBe("Rua A, 10 - Apto 2 - Centro");
  });

  it("omite o complemento quando não existe", () => {
    expect(
      formatarEndereco({
        logradouro: "Rua A",
        numero: "s/n",
        complemento: null,
        bairro: "Centro",
      }),
    ).toBe("Rua A, s/n - Centro");
  });
});

describe("inquilinoSchema", () => {
  it("normaliza o e-mail", () => {
    expect(
      inquilinoSchema.parse({ nome: " Maria ", email: " Maria@Exemplo.COM " }),
    ).toEqual({ nome: "Maria", email: "maria@exemplo.com" });
  });

  it("e-mail em branco vira null (é opcional)", () => {
    expect(inquilinoSchema.parse({ nome: "Maria", email: "  " })).toEqual({
      nome: "Maria",
      email: null,
    });
  });

  it("recusa e-mail inválido", () => {
    expect(
      primeiroErro(inquilinoSchema.safeParse({ nome: "Maria", email: "maria@" })),
    ).toBe("Informe um e-mail válido ou deixe em branco.");
  });

  it("recusa nome vazio", () => {
    expect(
      primeiroErro(inquilinoSchema.safeParse({ nome: " ", email: "" })),
    ).toBe("Informe o nome do inquilino.");
  });
});

describe("idSchema", () => {
  it("aceita UUID e recusa o resto", () => {
    expect(idSchema.safeParse("aaaaaaaa-0000-4000-8000-000000000001").success).toBe(true);
    expect(idSchema.safeParse("123").success).toBe(false);
    expect(idSchema.safeParse("'; drop table imoveis; --").success).toBe(false);
  });
});
