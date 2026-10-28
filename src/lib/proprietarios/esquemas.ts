import { z } from "zod";

// Primeiro acesso: o único dado pedido ao proprietário é o nome.
export const nomeProprietarioSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, "Informe seu nome.")
    .max(80, "Use no máximo 80 caracteres."),
});
