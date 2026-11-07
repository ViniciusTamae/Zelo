import type { NextRequest } from "next/server";

import { listarConsertos } from "@/lib/gastos/dados";
import { gerarPlanilha, lerFiltrosGastos } from "@/lib/gastos/resumo";

// "Baixar planilha" em Gastos: os consertos do filtro atual em CSV. Sem
// sessão, listarConsertos manda para /entrar (e o proxy já protege /gastos).
export async function GET(request: NextRequest) {
  const filtros = lerFiltrosGastos(Object.fromEntries(request.nextUrl.searchParams));
  const agora = new Date();
  const consertos = await listarConsertos(filtros, agora);

  const dia = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(agora); // 2026-11-07
  return new Response(gerarPlanilha(consertos), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gastos-zelo-${dia}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
