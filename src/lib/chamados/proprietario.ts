import "server-only";

import { obterProprietario } from "@/lib/auth";
import { formatarEndereco } from "@/lib/imoveis/endereco";
import { idSchema } from "@/lib/imoveis/esquemas";
import { createClient } from "@/lib/supabase/server";

import { combinaComBusca, type Filtros } from "./filtros";
import { ordenarAbertos } from "./ordem";
import { DIAS_RESOLVIDOS_NO_QUADRO, montarQuadro } from "./quadro";

// Leituras dos chamados pelo proprietário logado. O RLS garante que só voltam
// chamados dos imóveis dele.

export type Aba = "abertos" | "resolvidos";

const BUCKET = "fotos-chamados";
// Tempo de vida do link da foto (o bucket é privado).
const VALIDADE_FOTO_SEGUNDOS = 60 * 60;

// Imóvel, categoria e "só urgentes" filtram no banco; a busca por texto, no
// resultado (procura também no imóvel e no inquilino, que vêm de outras tabelas).
export async function listarChamados({ aba, filtros }: { aba: Aba; filtros: Filtros }) {
  await obterProprietario();
  const supabase = await createClient();

  let consulta = supabase
    .from("chamados")
    .select(
      "id, categoria, descricao, urgente, status, criado_em, resolvido_em, foto_path, imoveis!chamados_imovel_id_fkey(apelido), inquilinos!chamados_inquilino_id_imovel_id_fkey(nome)",
    )
    .in("status", aba === "abertos" ? ["aberto", "em_andamento"] : ["resolvido"]);
  if (filtros.imovelId) consulta = consulta.eq("imovel_id", filtros.imovelId);
  if (filtros.categoria) consulta = consulta.eq("categoria", filtros.categoria);
  if (filtros.urgentes) consulta = consulta.eq("urgente", true);
  consulta =
    aba === "abertos"
      ? consulta.limit(200)
      : consulta.order("resolvido_em", { ascending: false }).limit(50);

  const { data, error } = await consulta;
  if (error) throw error;
  const encontrados = data.filter((chamado) => combinaComBusca(chamado, filtros.busca));
  return aba === "abertos" ? ordenarAbertos(encontrados) : encontrados;
}

// Quadro do computador: tudo o que está aberto e os resolvidos dos últimos
// dias (DIAS_RESOLVIDOS_NO_QUADRO), já separados por coluna.
export async function listarQuadro(filtros: Filtros) {
  await obterProprietario();
  const supabase = await createClient();
  const desde = new Date(Date.now() - DIAS_RESOLVIDOS_NO_QUADRO * 24 * 60 * 60 * 1000).toISOString();

  let consulta = supabase
    .from("chamados")
    .select(
      "id, categoria, descricao, urgente, status, criado_em, resolvido_em, valor, avaliacao_nota, foto_path, imoveis!chamados_imovel_id_fkey(apelido), inquilinos!chamados_inquilino_id_imovel_id_fkey(nome)",
    )
    .or(`status.in.(aberto,em_andamento),resolvido_em.gte."${desde}"`)
    .limit(300);
  if (filtros.imovelId) consulta = consulta.eq("imovel_id", filtros.imovelId);
  if (filtros.categoria) consulta = consulta.eq("categoria", filtros.categoria);
  if (filtros.urgentes) consulta = consulta.eq("urgente", true);

  const { data, error } = await consulta;
  if (error) throw error;
  return montarQuadro(data.filter((chamado) => combinaComBusca(chamado, filtros.busca)));
}

// Quantos chamados em aberto (novos + em andamento) com os filtros, para o
// rótulo da aba. Lê os textos porque a busca é feita fora do banco.
export async function contarAbertos(filtros: Filtros) {
  await obterProprietario();
  const supabase = await createClient();
  let consulta = supabase
    .from("chamados")
    .select(
      "categoria, descricao, imoveis!chamados_imovel_id_fkey(apelido), inquilinos!chamados_inquilino_id_imovel_id_fkey(nome)",
    )
    .in("status", ["aberto", "em_andamento"])
    .limit(500);
  if (filtros.imovelId) consulta = consulta.eq("imovel_id", filtros.imovelId);
  if (filtros.categoria) consulta = consulta.eq("categoria", filtros.categoria);
  if (filtros.urgentes) consulta = consulta.eq("urgente", true);
  const { data, error } = await consulta;
  if (error) throw error;
  return data.filter((chamado) => combinaComBusca(chamado, filtros.busca)).length;
}

// Imóveis para o filtro (os arquivados ficam de fora).
export async function listarImoveisParaFiltro() {
  await obterProprietario();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("imoveis")
    .select("id, apelido")
    .is("arquivado_em", null)
    .order("apelido");
  if (error) throw error;
  return data;
}

// Devolve null se o id é inválido, não existe ou é de outro proprietário.
export async function obterChamado(id: string) {
  await obterProprietario();
  if (!idSchema.safeParse(id).success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chamados")
    .select(
      "id, categoria, descricao, urgente, status, melhor_horario, valor, avaliacao_nota, avaliacao_comentario, criado_em, resolvido_em, foto_path, imoveis!chamados_imovel_id_fkey(id, apelido, logradouro, numero, complemento, bairro), inquilinos!chamados_inquilino_id_imovel_id_fkey(nome, email), eventos_chamado(id, autor, status_anterior, status_novo, nota, criado_em)",
    )
    .eq("id", id)
    .order("criado_em", { referencedTable: "eventos_chamado", ascending: false })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  // Link temporário da foto: a política do bucket só libera fotos dos imóveis do dono.
  let fotoUrl: string | null = null;
  if (data.foto_path) {
    const { data: assinada } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(data.foto_path, VALIDADE_FOTO_SEGUNDOS);
    fotoUrl = assinada?.signedUrl ?? null;
  }

  const { imoveis: imovel, inquilinos: inquilino, eventos_chamado: eventos, ...chamado } = data;
  return {
    ...chamado,
    imovel: { id: imovel.id, apelido: imovel.apelido, endereco: formatarEndereco(imovel) },
    inquilino,
    eventos,
    fotoUrl,
  };
}
