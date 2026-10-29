// Conteúdo do aviso (Web Push) que o proprietário recebe. TypeScript puro,
// sem APIs do Deno, para ser testado também pelo Vitest do app.

// Mesmos nomes de src/lib/chamados/categorias.ts (a Edge Function não
// enxerga o código do app).
const CATEGORIAS: Record<string, string> = {
  hidraulica: "Hidráulica",
  eletrica: "Elétrica",
  telhado: "Telhado",
  outros: "Outros",
};

export type ChamadoDoAviso = {
  id: string;
  categoria: string;
  descricao: string;
  urgente: boolean;
  apelidoImovel: string;
  nomeInquilino: string | null;
};

export type Aviso = {
  titulo: string;
  corpo: string;
  // Página que abre ao tocar no aviso.
  url: string;
  // Avisos com a mesma tag se substituem em vez de empilhar.
  tag: string;
  // Prioridade para o serviço de push (high acorda o celular na hora).
  urgencia: "high" | "normal";
};

const TAMANHO_MAXIMO_CORPO = 120;

function resumir(texto: string) {
  const limpo = texto.replace(/\s+/g, " ").trim();
  return limpo.length > TAMANHO_MAXIMO_CORPO ? `${limpo.slice(0, TAMANHO_MAXIMO_CORPO - 1)}…` : limpo;
}

export function montarAviso(tipo: string, chamado: ChamadoDoAviso | null): Aviso | null {
  if (tipo === "teste") {
    return {
      titulo: "Avisos do Zelo ligados",
      corpo: "Pronto! É assim que você vai saber dos pedidos de conserto.",
      url: "/ajustes",
      tag: "teste",
      urgencia: "normal",
    };
  }

  if (tipo === "chamado_novo" && chamado) {
    const categoria = CATEGORIAS[chamado.categoria] ?? "Conserto";
    const quem = chamado.nomeInquilino ? `${chamado.nomeInquilino}: ` : "";
    return {
      titulo: `${chamado.urgente ? "Urgente" : "Novo chamado"} · ${categoria} · ${chamado.apelidoImovel}`,
      corpo: resumir(`${quem}${chamado.descricao}`),
      url: `/chamados/${chamado.id}`,
      tag: `chamado-${chamado.id}`,
      urgencia: chamado.urgente ? "high" : "normal",
    };
  }

  return null;
}
