// Entrega os avisos do proprietário (Web Push). Chamada pelo banco: na hora,
// quando nasce uma notificação vencida (pg_net), e a cada 5 min (pg_cron).
// Só aceita quem manda o segredo combinado (cabeçalho x-zelo-segredo).

import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import webpush from "npm:web-push@3.6.7";

import { montarAviso, type ChamadoDoAviso } from "../_shared/aviso.ts";

const SEGREDO = Deno.env.get("NOTIFICACOES_SEGREDO");

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT")!,
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// Um aviso guardado pelo serviço de push vale por 1 dia (celular desligado).
const VALIDADE_SEGUNDOS = 24 * 60 * 60;

Deno.serve(async (requisicao) => {
  if (!SEGREDO || requisicao.headers.get("x-zelo-segredo") !== SEGREDO) {
    return new Response("Não autorizado", { status: 401 });
  }

  const { data: lote, error } = await supabase.rpc("reservar_notificacoes", {
    para: "proprietario",
    limite: 50,
  });
  if (error) return Response.json({ erro: error.message }, { status: 500 });

  let entregues = 0;
  let falhas = 0;
  for (const notificacao of lote ?? []) {
    try {
      await entregar(notificacao);
      await supabase
        .from("notificacoes")
        .update({ enviada: true, enviada_em: new Date().toISOString(), reservada_ate: null, ultimo_erro: null })
        .eq("id", notificacao.id);
      entregues++;
    } catch (erro) {
      // Libera para o pg_cron tentar de novo (até 5 tentativas).
      await supabase
        .from("notificacoes")
        .update({ reservada_ate: null, ultimo_erro: String(erro).slice(0, 500) })
        .eq("id", notificacao.id);
      falhas++;
    }
  }

  return Response.json({ entregues, falhas });
});

async function entregar(notificacao: { proprietario_id: string; chamado_id: string | null; tipo: string }) {
  const aviso = montarAviso(notificacao.tipo, await buscarChamado(notificacao.chamado_id));
  if (!aviso) return; // Nada a avisar (ex.: chamado apagado): conta como entregue.

  const { data: inscricoes, error } = await supabase
    .from("push_inscricoes")
    .select("id, endpoint, p256dh, auth")
    .eq("proprietario_id", notificacao.proprietario_id);
  if (error) throw error;

  const conteudo = JSON.stringify({ titulo: aviso.titulo, corpo: aviso.corpo, url: aviso.url, tag: aviso.tag });
  const erros: string[] = [];

  for (const inscricao of inscricoes) {
    // O web-push cifra o conteúdo e assina com a chave VAPID; o envio em si é
    // feito com o fetch do Deno.
    const pedido = webpush.generateRequestDetails(
      { endpoint: inscricao.endpoint, keys: { p256dh: inscricao.p256dh, auth: inscricao.auth } },
      conteudo,
      { TTL: VALIDADE_SEGUNDOS, urgency: aviso.urgencia, topic: aviso.tag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) },
    );
    const resposta = await fetch(pedido.endpoint, {
      method: pedido.method,
      headers: pedido.headers as Record<string, string>,
      body: pedido.body,
    });

    if (resposta.status === 404 || resposta.status === 410) {
      // Aparelho desinscrito ou app removido: a inscrição não serve mais.
      await supabase.from("push_inscricoes").delete().eq("id", inscricao.id);
    } else if (!resposta.ok) {
      erros.push(`${resposta.status} ${await resposta.text()}`.slice(0, 200));
    }
  }

  // Só falha se nenhum aparelho recebeu (com algum aparelho ok, não repete para todos).
  if (erros.length > 0 && erros.length === inscricoes.length) {
    throw new Error(erros.join("; "));
  }
}

async function buscarChamado(id: string | null): Promise<ChamadoDoAviso | null> {
  if (!id) return null;
  const { data } = await supabase
    .from("chamados")
    .select(
      "id, categoria, descricao, urgente, imoveis!chamados_imovel_id_fkey(apelido), inquilinos!chamados_inquilino_id_imovel_id_fkey(nome)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    categoria: data.categoria,
    descricao: data.descricao,
    urgente: data.urgente,
    apelidoImovel: data.imoveis.apelido,
    nomeInquilino: data.inquilinos?.nome ?? null,
  };
}
