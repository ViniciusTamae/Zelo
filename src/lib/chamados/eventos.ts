import type { Database } from "@/lib/supabase/database.types";

import type { StatusChamado } from "./transicoes";

type Evento = {
  autor: Database["public"]["Enums"]["autor_evento"];
  status_anterior: StatusChamado | null;
  status_novo: StatusChamado | null;
};

const NOME_DO_STATUS: Record<StatusChamado, string> = {
  aberto: "Novo",
  em_andamento: "Em andamento",
  resolvido: "Resolvido",
};

// Frase do histórico do chamado, do ponto de vista do proprietário.
export function descreverEvento(evento: Evento, nomeInquilino?: string | null) {
  if (evento.autor === "inquilino") {
    return `${nomeInquilino ?? "O inquilino"} abriu o chamado`;
  }
  if (!evento.status_novo) return "Recado";
  if (evento.status_anterior === "resolvido") return "Você reabriu o chamado";
  if (evento.status_novo === "resolvido") return "Você marcou como resolvido";
  return `Você mudou para "${NOME_DO_STATUS[evento.status_novo]}"`;
}
