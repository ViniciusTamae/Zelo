import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { hashDoToken, tokenTemFormatoValido } from "./token";

// Acha o inquilino dono de um link /c/[token]. O inquilino não tem conta, então
// a busca usa a service role, mas só pelo hash do token recebido. Devolve null
// se o link é malformado, foi trocado por um novo ou o inquilino foi desativado.
export async function buscarInquilinoPeloLink(token: string) {
  if (!tokenTemFormatoValido(token)) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("inquilinos")
    .select("id, nome, imovel_id, imoveis(apelido)")
    .eq("token_hash", hashDoToken(token))
    .eq("ativo", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { imoveis, ...inquilino } = data;
  return { ...inquilino, apelidoImovel: imoveis.apelido };
}
