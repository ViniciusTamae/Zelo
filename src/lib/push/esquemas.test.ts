import { describe, expect, it } from "vitest";

import { chaveParaBytes, inscricaoSchema } from "./esquemas";

const valida = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc",
  keys: { p256dh: "BNc...", auth: "xyz" },
};

describe("inscricaoSchema", () => {
  it("aceita a inscrição do navegador", () => {
    expect(inscricaoSchema.parse(valida)).toEqual(valida);
  });

  it("recusa endereço que não é HTTPS", () => {
    expect(inscricaoSchema.safeParse({ ...valida, endpoint: "http://exemplo.com/push" }).success).toBe(false);
  });

  it("recusa inscrição sem as chaves", () => {
    expect(inscricaoSchema.safeParse({ endpoint: valida.endpoint }).success).toBe(false);
  });
});

describe("chaveParaBytes", () => {
  it("converte base64url (sem preenchimento) em bytes", () => {
    // "Zelo" em base64url é "WmVsbw"
    expect(Array.from(chaveParaBytes("WmVsbw"))).toEqual([90, 101, 108, 111]);
  });

  it("converte os caracteres - e _ do base64url", () => {
    expect(Array.from(chaveParaBytes("-_8"))).toEqual([251, 255]);
  });
});
