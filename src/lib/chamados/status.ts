import type { Database } from "@/lib/supabase/database.types";

type StatusChamado = Database["public"]["Enums"]["status_chamado"];

// Como o chamado aparece para o proprietário. "Urgente" não é um status no
// banco, é uma marca do chamado: só se destaca enquanto ninguém mexeu nele.
export type StatusVisual = "urgente" | "novo" | "em_andamento" | "resolvido";

export function statusVisual(chamado: {
  status: StatusChamado;
  urgente: boolean;
}): StatusVisual {
  if (chamado.status === "aberto") return chamado.urgente ? "urgente" : "novo";
  return chamado.status;
}
