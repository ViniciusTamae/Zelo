import { z } from "zod";

// Regras de validação dos cadastros de imóvel e inquilino.

export const idSchema = z.uuid();

function textoObrigatorio(mensagem: string, maximo: number) {
  return z
    .string()
    .trim()
    .min(1, mensagem)
    .max(maximo, `Use no máximo ${maximo} caracteres.`);
}

export const imovelSchema = z.object({
  apelido: textoObrigatorio(
    "Dê um apelido para o imóvel (ex.: Casa da Rua A).",
    60,
  ),
  logradouro: textoObrigatorio("Informe a rua.", 120),
  // Texto, para aceitar "123A" ou "s/n".
  numero: textoObrigatorio("Informe o número (ou s/n).", 10),
  // Opcional: em branco vira null.
  complemento: z
    .string()
    .trim()
    .max(60, "Use no máximo 60 caracteres.")
    .transform((complemento) => complemento || null),
  bairro: textoObrigatorio("Informe o bairro.", 80),
});

export const CAMPOS_IMOVEL = [
  "apelido",
  "logradouro",
  "numero",
  "complemento",
  "bairro",
] as const;

export const inquilinoSchema = z.object({
  nome: textoObrigatorio("Informe o nome do inquilino.", 80),
  // Opcional: sem e-mail, o inquilino só não recebe os avisos de andamento.
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(
      z.union([
        z.literal(""),
        z.email("Informe um e-mail válido ou deixe em branco."),
      ]),
    )
    .transform((email) => email || null),
});
