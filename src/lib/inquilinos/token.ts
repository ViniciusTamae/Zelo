import { createHash, randomBytes } from "node:crypto";

// Token do link exclusivo /c/[token]. Só o hash vai para o banco; o token puro
// existe apenas na hora em que é gerado (e no link que o dono compartilha).

// 32 bytes aleatórios em base64url: 43 caracteres, seguros para URL.
export function gerarToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashDoToken(token) };
}

// SHA-256 em hex, igual ao que a migração calculou para os links antigos
// (encode(digest(token, 'sha256'), 'hex')).
export function hashDoToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

// Aceita os tokens novos (base64url) e os antigos (hex de 64 caracteres).
// Qualquer outra coisa nem chega a consultar o banco.
export function tokenTemFormatoValido(token: string) {
  return /^[A-Za-z0-9_-]{43,64}$/.test(token);
}
