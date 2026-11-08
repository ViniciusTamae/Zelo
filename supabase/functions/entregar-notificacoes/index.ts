// Entrega as notificações: aviso no celular do proprietário (Web Push) e
// e-mail ao inquilino quando o status do chamado muda. Chamada pelo banco: na
// hora, quando nasce uma notificação vencida (pg_net), e a cada 5 min (pg_cron).
// Só aceita quem manda o segredo combinado (cabeçalho x-zelo-segredo).

import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import nodemailer from "npm:nodemailer@10.0.11";
import webpush from "npm:web-push@3.6.7";

import { montarAviso, type ChamadoDoAviso } from "../_shared/aviso.ts";
import { emailStatusChamado, type Email } from "../_shared/email.ts";

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

  let entregues = 0;
  let falhas = 0;
  for (const [destino, entregar] of [
    ["proprietario", entregarAviso],
    ["inquilino", entregarEmail],
  ] as const) {
    const { data: lote, error } = await supabase.rpc("reservar_notificacoes", { para: destino, limite: 50 });
    if (error) return Response.json({ erro: error.message }, { status: 500 });
    const resultado = await entregarLote(lote ?? [], entregar);
    entregues += resultado.entregues;
    falhas += resultado.falhas;
  }

  return Response.json({ entregues, falhas });
});

type Notificacao = {
  id: string;
  proprietario_id: string | null;
  inquilino_id: string | null;
  chamado_id: string | null;
  evento_id: string | null;
  tipo: string;
};

async function entregarLote(lote: Notificacao[], entregar: (n: Notificacao) => Promise<void>) {
  let entregues = 0;
  let falhas = 0;
  for (const notificacao of lote) {
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
  return { entregues, falhas };
}

// ---------------------------------------------------------------------------
// Proprietário: aviso no celular
// ---------------------------------------------------------------------------

async function entregarAviso(notificacao: Notificacao) {
  const aviso = montarAviso(notificacao.tipo, await buscarChamado(notificacao.chamado_id));
  if (!aviso) return; // Nada a avisar (ex.: chamado apagado): conta como entregue.

  const { data: inscricoes, error } = await supabase
    .from("push_inscricoes")
    .select("id, endpoint, p256dh, auth")
    .eq("proprietario_id", notificacao.proprietario_id!);
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

// ---------------------------------------------------------------------------
// Inquilino: e-mail de mudança de status (e pesquisa de satisfação)
// ---------------------------------------------------------------------------

async function entregarEmail(notificacao: Notificacao) {
  if (notificacao.tipo !== "status_chamado" || !notificacao.evento_id) return;

  const { data: evento } = await supabase
    .from("eventos_chamado")
    .select(
      "status_anterior, status_novo, nota, chamados(id, categoria, descricao, status, avaliacao_nota, imoveis!chamados_imovel_id_fkey(apelido, proprietarios(nome)), inquilinos!chamados_inquilino_id_imovel_id_fkey(nome, email, ativo))",
    )
    .eq("id", notificacao.evento_id)
    .maybeSingle();
  const chamado = evento?.chamados;
  const inquilino = chamado?.inquilinos;
  // Sem e-mail cadastrado ou inquilino desativado: nada a enviar.
  if (!evento?.status_novo || !chamado || !inquilino?.email || !inquilino.ativo) return;

  const site = Deno.env.get("APP_URL") ?? "http://localhost:3000";
  // Pesquisa só se o chamado continua resolvido e ainda não foi avaliado
  // (se foi reaberto nesse meio-tempo, não faz sentido pedir avaliação).
  const linkAvaliacao =
    evento.status_novo === "resolvido" && chamado.status === "resolvido" && chamado.avaliacao_nota === null
      ? `${site}/avaliar/${await novoTokenDeAvaliacao(chamado.id)}`
      : null;

  await enviarEmail(
    inquilino.email,
    emailStatusChamado({
      site,
      nomeInquilino: inquilino.nome,
      nomeProprietario: chamado.imoveis.proprietarios?.nome ?? null,
      categoria: chamado.categoria,
      apelidoImovel: chamado.imoveis.apelido,
      descricao: chamado.descricao,
      statusAnterior: evento.status_anterior,
      statusNovo: evento.status_novo,
      recado: evento.nota,
      linkAvaliacao,
    }),
  );
}

// Link de avaliação de uso único: o banco guarda só o hash (SHA-256 em hex,
// igual a src/lib/inquilinos/token.ts). Um novo token invalida o anterior.
async function novoTokenDeAvaliacao(chamadoId: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const resumo = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const hash = Array.from(new Uint8Array(resumo), (b) => b.toString(16).padStart(2, "0")).join("");

  const { error } = await supabase.from("chamados").update({ avaliacao_token_hash: hash }).eq("id", chamadoId);
  if (error) throw error;
  return token;
}

// Pelo primeiro caminho configurado, como no app (src/lib/email/enviar.ts):
// 1. SMTP (SMTP_HOST...), como o Gmail com senha de app. Na nuvem, use a
//    porta 465: as Edge Functions não abrem conexões nas portas 25 e 587;
// 2. API do Resend (RESEND_API_KEY);
// 3. Mailpit do Supabase local.
// Remetente: EMAIL_FROM (ou RESEND_FROM, o nome antigo).
async function enviarEmail(para: string, email: Email) {
  const remetente = Deno.env.get("EMAIL_FROM") ?? Deno.env.get("RESEND_FROM") ?? "Zelo <avisos@zelo.test>";
  const hostSmtp = Deno.env.get("SMTP_HOST");
  const chaveResend = Deno.env.get("RESEND_API_KEY");

  if (hostSmtp) {
    const porta = Number(Deno.env.get("SMTP_PORT") ?? 465);
    const usuario = Deno.env.get("SMTP_USER");
    const transporte = nodemailer.createTransport({
      host: hostSmtp,
      port: porta,
      secure: porta === 465,
      auth: usuario ? { user: usuario, pass: Deno.env.get("SMTP_PASS") } : undefined,
    });
    await transporte.sendMail({ from: remetente, to: para, subject: email.assunto, html: email.html, text: email.texto });
    return;
  }

  const resposta = chaveResend
    ? await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${chaveResend}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: remetente, to: [para], subject: email.assunto, html: email.html, text: email.texto }),
      })
    : await fetch(`${Deno.env.get("MAILPIT_URL")}/api/v1/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          From: { Name: remetente.replace(/\s*<.*$/, ""), Email: remetente.match(/<(.+)>/)?.[1] ?? remetente },
          To: [{ Email: para }],
          Subject: email.assunto,
          HTML: email.html,
          Text: email.texto,
        }),
      });
  if (!resposta.ok) throw new Error(`E-mail recusado (${resposta.status}): ${await resposta.text()}`);
}
