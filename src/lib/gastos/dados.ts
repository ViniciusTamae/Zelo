import "server-only";

import { obterProprietario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { inicioDoPeriodo, type ConsertoResolvido, type FiltrosGastos } from "./resumo";

// Leituras do histórico de gastos. O RLS garante que só voltam chamados dos
// imóveis do proprietário logado (inclusive os arquivados, cujo histórico conta).

// Um proprietário pequeno resolve bem menos que isso em toda a vida do app.
const LIMITE = 5000;

export async function listarConsertos(filtros: FiltrosGastos, agora = new Date()): Promise<ConsertoResolvido[]> {
  await obterProprietario();
  const supabase = await createClient();

  let consulta = supabase
    .from("chamados")
    .select("id, categoria, descricao, valor, resolvido_em, imoveis!chamados_imovel_id_fkey(id, apelido, arquivado_em)")
    .eq("status", "resolvido")
    .not("resolvido_em", "is", null)
    .order("resolvido_em", { ascending: false })
    .limit(LIMITE);
  const inicio = inicioDoPeriodo(filtros.periodo, agora);
  if (inicio) consulta = consulta.gte("resolvido_em", inicio.toISOString());
  if (filtros.imovelId) consulta = consulta.eq("imovel_id", filtros.imovelId);
  if (filtros.categoria) consulta = consulta.eq("categoria", filtros.categoria);

  const { data, error } = await consulta;
  if (error) throw error;
  return data.map(({ imoveis, resolvido_em, ...conserto }) => ({
    ...conserto,
    resolvido_em: resolvido_em!,
    imovel: { id: imoveis.id, apelido: imoveis.apelido, arquivado: Boolean(imoveis.arquivado_em) },
  }));
}

// Imóveis do filtro: os ativos e, depois, os arquivados.
export async function listarImoveisDosGastos() {
  await obterProprietario();
  const supabase = await createClient();
  const { data, error } = await supabase.from("imoveis").select("id, apelido, arquivado_em").order("apelido");
  if (error) throw error;
  return data
    .map(({ id, apelido, arquivado_em }) => ({ id, apelido, arquivado: Boolean(arquivado_em) }))
    .sort((a, b) => Number(a.arquivado) - Number(b.arquivado));
}
