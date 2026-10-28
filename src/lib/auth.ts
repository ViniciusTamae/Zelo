import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Camada de acesso: único lugar que lê a sessão e devolve o proprietário logado.
// Páginas e Server Actions do app chamam esta função em vez de ler cookies.
// Lê a requisição, então quem chamar precisa estar dentro de um <Suspense>.
export async function obterProprietario() {
  // A validação da sessão compara a expiração com a hora atual: marca como
  // dado da requisição para o Next não tentar pré-renderizar este trecho.
  await connection();

  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) {
    redirect("/entrar");
  }

  const { data: proprietario, error } = await supabase
    .from("proprietarios")
    .select("id, nome, silencio_inicio, silencio_fim")
    .eq("id", claims.sub)
    .maybeSingle();
  if (error) throw error;

  // O trigger do banco cria o proprietário junto com o usuário. Sem a linha,
  // a conta foi apagada mas o cookie ainda vale: encerra a sessão.
  if (!proprietario) {
    redirect("/sair");
  }

  return { ...proprietario, email: claims.email ?? "" };
}
