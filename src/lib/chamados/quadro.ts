import { ordenarAbertos } from "./ordem";
import type { StatusChamado } from "./transicoes";

// Quadro (kanban) do computador: uma coluna por status.
export const COLUNAS: { status: StatusChamado; titulo: string }[] = [
  { status: "aberto", titulo: "Novos" },
  { status: "em_andamento", titulo: "Em andamento" },
  { status: "resolvido", titulo: "Resolvidos" },
];

// A coluna de resolvidos mostra só os recentes, senão cresce para sempre.
export const DIAS_RESOLVIDOS_NO_QUADRO = 30;

type ChamadoDoQuadro = {
  status: StatusChamado;
  urgente: boolean;
  criado_em: string;
  resolvido_em: string | null;
};

// Novos e em andamento: urgentes primeiro e, depois, o que espera há mais
// tempo. Resolvidos: o mais recente primeiro.
export function montarQuadro<T extends ChamadoDoQuadro>(chamados: T[]) {
  const abertos = ordenarAbertos(chamados.filter(({ status }) => status !== "resolvido"));
  return {
    aberto: abertos.filter(({ status }) => status === "aberto"),
    em_andamento: abertos.filter(({ status }) => status === "em_andamento"),
    resolvido: chamados
      .filter(({ status }) => status === "resolvido")
      .sort((a, b) => (b.resolvido_em ?? "").localeCompare(a.resolvido_em ?? "")),
  } satisfies Record<StatusChamado, T[]>;
}
