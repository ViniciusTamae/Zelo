import { describe, expect, it } from "vitest";

import { gerarToken, hashDoToken, tokenTemFormatoValido } from "./token";

describe("gerarToken", () => {
  it("gera um token de 43 caracteres seguro para URL", () => {
    const { token } = gerarToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(tokenTemFormatoValido(token)).toBe(true);
  });

  it("devolve o hash do próprio token", () => {
    const { token, hash } = gerarToken();
    expect(hash).toBe(hashDoToken(token));
  });

  it("cada chamada gera um token diferente", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => gerarToken().token));
    expect(tokens.size).toBe(100);
  });
});

describe("hashDoToken", () => {
  it("é o SHA-256 em hex (o mesmo que o Postgres calcula)", () => {
    // select encode(extensions.digest('abc', 'sha256'), 'hex')
    expect(hashDoToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("o hash nunca é igual ao token", () => {
    const { token, hash } = gerarToken();
    expect(hash).not.toBe(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("tokenTemFormatoValido", () => {
  it("aceita o formato antigo (hex de 64)", () => {
    expect(tokenTemFormatoValido("a".repeat(64))).toBe(true);
  });

  it.each(["", "curto", "a".repeat(65), "com espaço".padEnd(43, "x"), "../../etc/passwd".padEnd(43, "x")])(
    "recusa %j",
    (token) => {
      expect(tokenTemFormatoValido(token)).toBe(false);
    },
  );
});
