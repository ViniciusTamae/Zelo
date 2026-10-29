import { z } from "zod";

import { CATEGORIAS, type Categoria } from "./categorias";
import { lerValorEmReais } from "./valor";

// Regras do formulário de chamado do inquilino.

export const CAMPOS_CHAMADO = ["categoria", "descricao", "urgente", "melhor_horario"] as const;

export const chamadoSchema = z.object({
  categoria: z.enum(
    CATEGORIAS.map(({ valor }) => valor) as [Categoria, ...Categoria[]],
    "Escolha o tipo de problema.",
  ),
  descricao: z
    .string()
    .trim()
    .min(1, "Conte o que aconteceu.")
    .max(1000, "Use no máximo 1000 caracteres."),
  // Checkbox: só vem no formulário quando marcado.
  urgente: z.preprocess((valor) => valor === "on", z.boolean()),
  melhor_horario: z
    .string()
    .trim()
    .max(100, "Use no máximo 100 caracteres.")
    .transform((horario) => horario || null),
});

// A foto chega já reduzida pelo celular (lado maior de 1600 px); o limite
// cobre quem não conseguiu reduzir (ex.: formato que o navegador não abre).
export const TAMANHO_MAXIMO_FOTO = 3 * 1024 * 1024;

const ASSINATURAS: { tipo: string; extensao: string; confere: (b: Uint8Array) => boolean }[] = [
  { tipo: "image/jpeg", extensao: "jpg", confere: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    tipo: "image/png",
    extensao: "png",
    confere: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    tipo: "image/webp",
    extensao: "webp",
    confere: (b) =>
      String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP",
  },
];

export type FotoValidada = { bytes: Uint8Array; tipo: string; extensao: string };

// Confere a foto pelo conteúdo (os primeiros bytes), não pelo nome ou tipo
// que o navegador informou, que podem ser falsos.
export async function validarFoto(
  arquivo: FormDataEntryValue | null,
): Promise<{ foto: FotoValidada | null; erro?: string }> {
  if (!(arquivo instanceof File) || arquivo.size === 0) return { foto: null };
  if (arquivo.size > TAMANHO_MAXIMO_FOTO) {
    return { foto: null, erro: "A foto é muito grande. Tente tirar outra pela câmera." };
  }

  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const formato = ASSINATURAS.find(({ confere }) => confere(bytes));
  if (!formato) {
    return { foto: null, erro: "Formato de foto não aceito. Use uma foto JPG, PNG ou WebP." };
  }
  return { foto: { bytes, tipo: formato.tipo, extensao: formato.extensao } };
}

// Mudança de status pelo proprietário (com recado e custo opcionais).
export const mudancaStatusSchema = z.object({
  chamado_id: z.uuid(),
  status: z.enum(["aberto", "em_andamento", "resolvido"]),
  nota: z
    .string()
    .trim()
    .max(500, "Use no máximo 500 caracteres.")
    .transform((nota) => nota || null),
  valor: z
    .string()
    .transform((texto) => lerValorEmReais(texto))
    .refine((valor) => valor !== undefined, "Informe um valor como 150 ou 1.234,56.")
    .refine((valor) => valor === undefined || valor === null || valor < 100_000_000, "Valor alto demais."),
});

export const AGRADECIMENTO_AVALIACAO =
  "Obrigado pela avaliação! Ela ajuda o proprietário a cuidar melhor do imóvel.";

// Pesquisa de satisfação do inquilino (nota de 1 a 5 e comentário opcional).
export const avaliacaoSchema = z.object({
  nota: z.coerce
    .number("Escolha uma nota de 1 a 5.")
    .int("Escolha uma nota de 1 a 5.")
    .min(1, "Escolha uma nota de 1 a 5.")
    .max(5, "Escolha uma nota de 1 a 5."),
  comentario: z
    .string()
    .trim()
    .max(500, "Use no máximo 500 caracteres.")
    .transform((comentario) => comentario || null),
});
