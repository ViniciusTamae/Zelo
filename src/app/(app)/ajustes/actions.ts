"use server";

import { refresh } from "next/cache";

import { obterProprietario } from "@/lib/auth";
import { errosPorCampo, lerCampos, type EstadoFormulario } from "@/lib/formularios";
import { nomeProprietarioSchema, silencioSchema } from "@/lib/proprietarios/esquemas";
import { inscricaoSchema } from "@/lib/push/esquemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ERRO_GENERICO = "Não foi possível salvar agora. Tente de novo.";

export async function salvarNome(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const proprietario = await obterProprietario();
  const valores = lerCampos(formData, ["nome"]);
  const dados = nomeProprietarioSchema.safeParse(valores);
  if (!dados.success) return { erros: errosPorCampo(dados.error), valores };

  const supabase = await createClient();
  const { error } = await supabase.from("proprietarios").update(dados.data).eq("id", proprietario.id);
  if (error) return { erroGeral: ERRO_GENERICO, valores };

  refresh();
  return { sucesso: "Nome salvo." };
}

export async function salvarSilencio(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const proprietario = await obterProprietario();
  const valores = lerCampos(formData, ["silencio_inicio", "silencio_fim"]);
  const dados = silencioSchema.safeParse(valores);
  if (!dados.success) return { erros: errosPorCampo(dados.error), valores };

  const supabase = await createClient();
  const { error } = await supabase.from("proprietarios").update(dados.data).eq("id", proprietario.id);
  if (error) return { erroGeral: ERRO_GENERICO, valores };

  refresh();
  return { sucesso: "Horário de silêncio salvo." };
}

// Guarda a inscrição de Web Push deste aparelho. Um aparelho tem uma
// inscrição só por site: se outra conta usava este aparelho, ela passa a ser
// de quem está logado agora (por isso a troca é feita com a service role).
export async function salvarInscricao(inscricao: unknown): Promise<{ ok: boolean }> {
  const proprietario = await obterProprietario();
  const dados = inscricaoSchema.safeParse(inscricao);
  if (!dados.success) return { ok: false };

  const supabase = createAdminClient();
  const { error } = await supabase.from("push_inscricoes").upsert(
    {
      proprietario_id: proprietario.id,
      endpoint: dados.data.endpoint,
      p256dh: dados.data.keys.p256dh,
      auth: dados.data.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  return { ok: !error };
}

export async function removerInscricao(endpoint: string): Promise<{ ok: boolean }> {
  const proprietario = await obterProprietario();
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_inscricoes")
    .delete()
    .eq("proprietario_id", proprietario.id)
    .eq("endpoint", endpoint);
  return { ok: !error };
}

// Manda um aviso de teste para os aparelhos do proprietário (pela mesma fila
// dos avisos de chamado). No máximo um a cada 30 segundos.
export async function enviarAvisoTeste(): Promise<{ ok: boolean; mensagem: string }> {
  const proprietario = await obterProprietario();
  const supabase = createAdminClient();

  const trintaSegundosAtras = new Date(Date.now() - 30_000).toISOString();
  const { count } = await supabase
    .from("notificacoes")
    .select("id", { count: "exact", head: true })
    .eq("proprietario_id", proprietario.id)
    .eq("tipo", "teste")
    .gte("criado_em", trintaSegundosAtras);
  if ((count ?? 0) > 0) {
    return { ok: false, mensagem: "Aguarde alguns segundos antes de pedir outro teste." };
  }

  const { error } = await supabase
    .from("notificacoes")
    .insert({ destino: "proprietario", proprietario_id: proprietario.id, tipo: "teste" });
  if (error) return { ok: false, mensagem: ERRO_GENERICO };
  return { ok: true, mensagem: "Aviso de teste enviado. Ele deve chegar em alguns segundos." };
}
