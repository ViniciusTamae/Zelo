import type { StatusChamado } from "./transicoes";

// Ordem da lista de chamados em aberto: urgentes ainda não atendidos primeiro,
// depois os novos, depois os em andamento; dentro de cada grupo, o mais
// antigo primeiro (é o que está esperando há mais tempo).
function prioridade(chamado: { status: StatusChamado; urgente: boolean }) {
  if (chamado.status === "aberto") return chamado.urgente ? 0 : 1;
  if (chamado.status === "em_andamento") return 2;
  return 3;
}

export function ordenarAbertos<T extends { status: StatusChamado; urgente: boolean; criado_em: string }>(
  chamados: T[],
) {
  return [...chamados].sort(
    (a, b) => prioridade(a) - prioridade(b) || a.criado_em.localeCompare(b.criado_em),
  );
}
