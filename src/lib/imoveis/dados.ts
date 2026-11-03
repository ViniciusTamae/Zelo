import "server-only";

import { obterProprietario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { formatarEndereco } from "./endereco";
import { idSchema } from "./esquemas";
import { linksDasFotos } from "./fotos";

// Leituras das telas de imóveis. O RLS garante que só voltam os imóveis do proprietário logado.

export async function listarImoveis() {
  await obterProprietario();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("imoveis")
    .select(
      "id, apelido, logradouro, numero, complemento, bairro, foto_path, inquilinos(count)",
    )
    .eq("inquilinos.ativo", true)
    .order("apelido");
  if (error) throw error;

  const fotos = await linksDasFotos(supabase, data.map(({ foto_path }) => foto_path));
  return data.map(({ inquilinos, ...imovel }) => ({
    ...imovel,
    endereco: formatarEndereco(imovel),
    inquilinosAtivos: inquilinos[0]?.count ?? 0,
    fotoUrl: imovel.foto_path ? (fotos.get(imovel.foto_path) ?? null) : null,
  }));
}

// Devolve null se o id é inválido, não existe ou é de outro proprietário.
export async function obterImovel(id: string) {
  await obterProprietario();
  if (!idSchema.safeParse(id).success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("imoveis")
    .select(
      "id, apelido, logradouro, numero, complemento, bairro, foto_path, inquilinos(id, nome, email, ativo, ultimo_acesso_em)",
    )
    .eq("id", id)
    .order("ativo", { referencedTable: "inquilinos", ascending: false })
    .order("criado_em", { referencedTable: "inquilinos" })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const fotos = await linksDasFotos(supabase, [data.foto_path]);
  // O link de cada inquilino não volta daqui: o banco só tem o hash do token.
  return {
    ...data,
    endereco: formatarEndereco(data),
    fotoUrl: data.foto_path ? (fotos.get(data.foto_path) ?? null) : null,
  };
}
