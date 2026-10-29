import "server-only";

import type { z } from "zod";

import { hashDoToken, tokenTemFormatoValido } from "@/lib/inquilinos/token";
import { createAdminClient } from "@/lib/supabase/admin";

import type { avaliacaoSchema } from "./esquemas";

// Pesquisa de satisfação do inquilino. Ele não tem conta: tudo passa pela
// service role, sempre filtrado por algo que só ele tem (o link de avaliação
// de uso único do e-mail, ou o link de pedidos dele).

type Avaliacao = z.infer<typeof avaliacaoSchema>;

const SELECAO = "id, categoria, descricao, imoveis!chamados_imovel_id_fkey(apelido), inquilinos!chamados_inquilino_id_imovel_id_fkey(nome)";

// Chamado do link de avaliação do e-mail, se ele ainda vale (o link deixa de
// valer quando é usado, quando o chamado é reaberto ou quando sai um novo).
export async function buscarChamadoParaAvaliar(token: string) {
  if (!tokenTemFormatoValido(token)) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chamados")
    .select(SELECAO)
    .eq("avaliacao_token_hash", hashDoToken(token))
    .eq("status", "resolvido")
    .is("avaliacao_nota", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { imoveis, inquilinos, ...chamado } = data;
  return { ...chamado, apelidoImovel: imoveis.apelido, nomeInquilino: inquilinos?.nome ?? null };
}

// Pelo link de avaliação do e-mail. Devolve false se o link não vale mais.
export async function avaliarPeloEmail(token: string, avaliacao: Avaliacao) {
  if (!tokenTemFormatoValido(token)) return false;
  return registrar(avaliacao, (consulta) => consulta.eq("avaliacao_token_hash", hashDoToken(token)));
}

// Pela página de pedidos do inquilino (link já validado por quem chama).
export async function avaliarPeloLinkDoInquilino(inquilinoId: string, chamadoId: string, avaliacao: Avaliacao) {
  return registrar(avaliacao, (consulta) => consulta.eq("id", chamadoId).eq("inquilino_id", inquilinoId));
}

type Filtro = <T extends { eq: (coluna: string, valor: string) => T }>(consulta: T) => T;

async function registrar(avaliacao: Avaliacao, filtrar: Filtro) {
  const supabase = createAdminClient();
  // Só avalia uma vez, e só chamado resolvido. O link do e-mail é apagado no
  // mesmo update: usado uma vez, não vale de novo.
  const { data, error } = await filtrar(
    supabase
      .from("chamados")
      .update({
        avaliacao_nota: avaliacao.nota,
        avaliacao_comentario: avaliacao.comentario,
        avaliacao_token_hash: null,
      }),
  )
    .eq("status", "resolvido")
    .is("avaliacao_nota", null)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) return false;

  // Fica no histórico do chamado, que o proprietário vê.
  const { error: erroEvento } = await supabase.from("eventos_chamado").insert({
    chamado_id: data.id,
    autor: "inquilino",
    nota: `Nota ${avaliacao.nota} de 5.${avaliacao.comentario ? ` ${avaliacao.comentario}` : ""}`,
  });
  if (erroEvento) throw erroEvento;
  return true;
}
