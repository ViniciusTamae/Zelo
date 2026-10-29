import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { clienteAdmin, idDoUsuario } from "./admin";
import { abrirChamado, adicionarInquilino, cadastrarImovel, entrar } from "./ajudantes";
import { emailDeTeste } from "./mailpit";
import { servicoDePushFalso } from "./push";

// "HH:MM" em São Paulo, deslocado em minutos a partir de agora.
function horaEmSaoPaulo(deslocamentoMin: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(Date.now() + deslocamentoMin * 60_000));
}

// O que o pg_cron faz a cada 5 minutos: chama a função de entrega.
async function rodarEntregaAgendada() {
  const segredo = readFileSync("supabase/functions/.env", "utf8").match(/^NOTIFICACOES_SEGREDO=(.+)$/m)![1];
  const resposta = await fetch("http://127.0.0.1:54321/functions/v1/entregar-notificacoes", {
    method: "POST",
    headers: { "x-zelo-segredo": segredo },
  });
  expect(resposta.status).toBe(200);
}

test("avisos: urgente chega na hora no silêncio; o comum espera e sai pela entrega agendada", async ({
  page,
  browser,
}) => {
  test.slow();
  const push = await servicoDePushFalso();
  const supabase = clienteAdmin();

  const email = emailDeTeste("dono-avisos");
  await entrar(page, email);
  await cadastrarImovel(page, "Casa da Rua A", { rua: "Rua A", numero: "10", bairro: "Centro" });
  const link = await adicionarInquilino(page, "Maria");

  // Dono com dois aparelhos inscritos: um ativo e um que já desinstalou o app.
  // Silêncio cobrindo o horário atual (de 1 h atrás até daqui a 1 h).
  const donoId = await idDoUsuario(email);
  await supabase.from("push_inscricoes").insert([
    { proprietario_id: donoId, ...push.inscricao("/ativo/celular") },
    { proprietario_id: donoId, ...push.inscricao("/sumiu/celular-velho") },
  ]);
  await supabase
    .from("proprietarios")
    .update({ silencio_inicio: horaEmSaoPaulo(-60), silencio_fim: horaEmSaoPaulo(60) })
    .eq("id", donoId);

  const inquilina = await (await browser.newContext()).newPage();
  await inquilina.goto(link);

  // Chamado comum no silêncio: nenhum aviso agora
  await abrirChamado(inquilina, { categoria: "Elétrica", descricao: "Tomada da sala sem energia" });
  await inquilina.waitForTimeout(3000);
  expect(push.recebidos).toHaveLength(0);

  // Chamado urgente: aviso na hora, com prioridade alta e o conteúdo certo
  await abrirChamado(inquilina, { categoria: "Hidráulica", descricao: "Cano estourado", urgente: true });
  await expect.poll(() => push.recebidos.length, { timeout: 20_000 }).toBe(1);
  const urgente = push.recebidos[0];
  expect(urgente.caminho).toBe("/ativo/celular");
  expect(urgente.cabecalhos).toMatchObject({ urgency: "high", ttl: "86400", "content-encoding": "aes128gcm" });
  expect(urgente.cabecalhos.authorization).toMatch(/^vapid t=/);
  expect(urgente.conteudo).toMatchObject({
    titulo: "Urgente · Hidráulica · Casa da Rua A",
    corpo: "Maria: Cano estourado",
  });
  expect(urgente.conteudo.url).toMatch(/^\/chamados\/[0-9a-f-]{36}$/);

  // O aparelho que respondeu 410 foi descartado
  const { count } = await supabase
    .from("push_inscricoes")
    .select("id", { count: "exact", head: true })
    .eq("proprietario_id", donoId);
  expect(count).toBe(1);

  // O comum ficou guardado para o fim do silêncio...
  const { data: guardada } = await supabase
    .from("notificacoes")
    .select("id, enviada, entregar_em")
    .eq("proprietario_id", donoId)
    .eq("enviada", false)
    .single();
  expect(new Date(guardada!.entregar_em).getTime()).toBeGreaterThan(Date.now() + 30 * 60_000);

  // ...e, quando o silêncio acaba, sai na entrega agendada (pg_cron)
  await supabase
    .from("notificacoes")
    .update({ entregar_em: new Date(Date.now() - 60_000).toISOString() })
    .eq("id", guardada!.id);
  await rodarEntregaAgendada();
  await expect.poll(() => push.recebidos.length, { timeout: 20_000 }).toBe(2);
  expect(push.recebidos[1].cabecalhos.urgency).toBe("normal");
  expect(push.recebidos[1].conteudo.titulo).toBe("Novo chamado · Elétrica · Casa da Rua A");

  // Tudo marcado como entregue, sem repetir
  const { data: pendentes } = await supabase
    .from("notificacoes")
    .select("id")
    .eq("proprietario_id", donoId)
    .eq("enviada", false);
  expect(pendentes).toHaveLength(0);
  await rodarEntregaAgendada();
  await inquilina.waitForTimeout(1000);
  expect(push.recebidos).toHaveLength(2);

  await push.fechar();
});
