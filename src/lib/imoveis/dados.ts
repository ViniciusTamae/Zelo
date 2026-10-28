import "server-only";

import { obterProprietario } from "@/lib/auth";
import { linkDoInquilino } from "@/lib/links";
import { createClient } from "@/lib/supabase/server";

import { formatarEndereco } from "./endereco";
import { idSchema } from "./esquemas";

// Leituras do painel. O RLS garante que só voltam os imóveis do proprietário logado.

export async function listarImoveis() {
  await obterProprietario();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("imoveis")
    .select(
      "id, apelido, logradouro, numero, complemento, bairro, inquilinos(count)",
    )
    .eq("inquilinos.ativo", true)
    .order("apelido");
  if (error) throw error;

  return data.map(({ inquilinos, ...imovel }) => ({
    ...imovel,
    endereco: formatarEndereco(imovel),
    inquilinosAtivos: inquilinos[0]?.count ?? 0,
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
      "id, apelido, logradouro, numero, complemento, bairro, inquilinos(id, nome, email, token, ativo)",
    )
    .eq("id", id)
    .order("ativo", { referencedTable: "inquilinos", ascending: false })
    .order("criado_em", { referencedTable: "inquilinos" })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    endereco: formatarEndereco(data),
    inquilinos: data.inquilinos.map(({ token, ...inquilino }) => ({
      ...inquilino,
      link: linkDoInquilino(token),
    })),
  };
}
