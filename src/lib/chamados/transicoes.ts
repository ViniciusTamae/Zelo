import type { Database } from "@/lib/supabase/database.types";

export type StatusChamado = Database["public"]["Enums"]["status_chamado"];

// O que o proprietário pode fazer em cada status. A mesma regra é conferida
// no banco (public.mudar_status_chamado); aqui ela decide os botões da tela.
// A primeira ação é a principal (botão na cor do Zelo).
export const ACOES: Record<StatusChamado, { para: StatusChamado; rotulo: string }[]> = {
  aberto: [
    { para: "em_andamento", rotulo: "Começar atendimento" },
    { para: "resolvido", rotulo: "Marcar como resolvido" },
  ],
  em_andamento: [{ para: "resolvido", rotulo: "Marcar como resolvido" }],
  resolvido: [{ para: "em_andamento", rotulo: "Reabrir chamado" }],
};

export function transicaoPermitida(de: StatusChamado, para: StatusChamado) {
  return ACOES[de].some((acao) => acao.para === para);
}
