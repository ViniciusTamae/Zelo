import "server-only";

import { obterProprietario } from "@/lib/auth";
import { formatarEndereco } from "@/lib/imoveis/endereco";
import { idSchema } from "@/lib/imoveis/esquemas";
import { createClient } from "@/lib/supabase/server";

import { ordenarAbertos } from "./ordem";

// Leituras dos chamados pelo proprietário logado. O RLS garante que só voltam
// chamados dos imóveis dele.

export type Aba = "abertos" | "resolvidos";

const BUCKET = "fotos-chamados";
// Tempo de vida do link da foto (o bucket é privado).
const VALIDADE_FOTO_SEGUNDOS = 60 * 60;

export async function listarChamados({ aba, imovelId }: { aba: Aba; imovelId?: string }) {
  await obterProprietario();
  const supabase = await createClient();

  let consulta = supabase
    .from("chamados")
    .select(
      "id, categoria, descricao, urgente, status, criado_em, resolvido_em, foto_path, imoveis!chamados_imovel_id_fkey(apelido), inquilinos!chamados_inquilino_id_imovel_id_fkey(nome)",
    )
    .in("status", aba === "abertos" ? ["aberto", "em_andamento"] : ["resolvido"]);
  if (imovelId && idSchema.safeParse(imovelId).success) {
    consulta = consulta.eq("imovel_id", imovelId);
  }
  consulta =
    aba === "abertos"
      ? consulta.limit(200)
      : consulta.order("resolvido_em", { ascending: false }).limit(50);

  const { data, error } = await consulta;
  if (error) throw error;
  return aba === "abertos" ? ordenarAbertos(data) : data;
}

// Quantos chamados em aberto (novos + em andamento), para o rótulo da aba.
export async function contarAbertos(imovelId?: string) {
  await obterProprietario();
  const supabase = await createClient();
  let consulta = supabase
    .from("chamados")
    .select("id", { count: "exact", head: true })
    .in("status", ["aberto", "em_andamento"]);
  if (imovelId && idSchema.safeParse(imovelId).success) {
    consulta = consulta.eq("imovel_id", imovelId);
  }
  const { count, error } = await consulta;
  if (error) throw error;
  return count ?? 0;
}

// Imóveis para o filtro da lista.
export async function listarImoveisParaFiltro() {
  await obterProprietario();
  const supabase = await createClient();
  const { data, error } = await supabase.from("imoveis").select("id, apelido").order("apelido");
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
      "id, categoria, descricao, urgente, status, melhor_horario, valor, criado_em, resolvido_em, foto_path, imoveis!chamados_imovel_id_fkey(id, apelido, logradouro, numero, complemento, bairro), inquilinos!chamados_inquilino_id_imovel_id_fkey(nome, email), eventos_chamado(id, autor, status_anterior, status_novo, nota, criado_em)",
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
