import { z } from "zod";

// Primeiro acesso: o único dado pedido ao proprietário é o nome.
export const nomeProprietarioSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, "Informe seu nome.")
    .max(80, "Use no máximo 80 caracteres."),
});

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário como 21:00.");

// Horário de silêncio: só chamados urgentes avisam na hora nesse intervalo.
export const silencioSchema = z
  .object({ silencio_inicio: hora, silencio_fim: hora })
  .refine(({ silencio_inicio, silencio_fim }) => silencio_inicio !== silencio_fim, {
    message: "O início e o fim precisam ser diferentes.",
    path: ["silencio_fim"],
  });
