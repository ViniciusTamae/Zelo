import "server-only";

import { obterProprietario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { formatarEndereco } from "./endereco";
import { idSchema } from "./esquemas";
import { linksDasFotos } from "./fotos";

// Leituras das telas de imóveis. O RLS garante que só voltam os imóveis do proprietário logado.

// Imóveis ativos ou, com `arquivados`, só os arquivados.
export async function listarImoveis({ arquivados = false }: { arquivados?: boolean } = {}) {
  await obterProprietario();
  const supabase = await createClient();

  let consulta = supabase
    .from("imoveis")
    .select(
      "id, apelido, logradouro, numero, complemento, bairro, foto_path, arquivado_em, inquilinos(count)",
    )
    .eq("inquilinos.ativo", true)
    .order("apelido");
  consulta = arquivados ? consulta.not("arquivado_em", "is", null) : consulta.is("arquivado_em", null);
  const { data, error } = await consulta;
  if (error) throw error;

  const fotos = await linksDasFotos(supabase, data.map(({ foto_path }) => foto_path));
  return data.map(({ inquilinos, ...imovel }) => ({
    ...imovel,
    endereco: formatarEndereco(imovel),
    inquilinosAtivos: inquilinos[0]?.count ?? 0,
    fotoUrl: imovel.foto_path ? (fotos.get(imovel.foto_path) ?? null) : null,
  }));
}

// Quantos imóveis arquivados (para o link "Ver arquivados").
export async function contarArquivados() {
  await obterProprietario();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("imoveis")
    .select("id", { count: "exact", head: true })
    .not("arquivado_em", "is", null);
  if (error) throw error;
  return count ?? 0;
}

// Devolve null se o id é inválido, não existe ou é de outro proprietário.
export async function obterImovel(id: string) {
  await obterProprietario();
  if (!idSchema.safeParse(id).success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("imoveis")
    .select(
      "id, apelido, logradouro, numero, complemento, bairro, foto_path, arquivado_em, inquilinos(id, nome, email, ativo, ultimo_acesso_em)",
    )
    .eq("id", id)
    .order("ativo", { referencedTable: "inquilinos", ascending: false })
    .order("criado_em", { referencedTable: "inquilinos" })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  // Chamados do imóvel: decidem entre excluir e arquivar (e se pode).
  const contar = (status: ("aberto" | "em_andamento" | "resolvido")[]) =>
    supabase.from("chamados").select("id", { count: "exact", head: true }).eq("imovel_id", id).in("status", status);
  const [fotos, total, abertos] = await Promise.all([
    linksDasFotos(supabase, [data.foto_path]),
    contar(["aberto", "em_andamento", "resolvido"]),
    contar(["aberto", "em_andamento"]),
  ]);
  if (total.error) throw total.error;
  if (abertos.error) throw abertos.error;

  // O link de cada inquilino não volta daqui: o banco só tem o hash do token.
  return {
    ...data,
    chamados: { total: total.count ?? 0, abertos: abertos.count ?? 0 },
    endereco: formatarEndereco(data),
    fotoUrl: data.foto_path ? (fotos.get(data.foto_path) ?? null) : null,
  };
}
