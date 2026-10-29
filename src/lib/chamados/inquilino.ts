import "server-only";

import type { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";

import type { chamadoSchema, FotoValidada } from "./esquemas";

// Chamados do lado do inquilino. Ele não tem conta: tudo passa pela service
// role, sempre com o inquilino já validado pelo link (buscarInquilinoPeloLink).

type Inquilino = { id: string; imovel_id: string };
type DadosChamado = z.infer<typeof chamadoSchema>;

const BUCKET = "fotos-chamados";

// Um link vazado não pode virar uma enxurrada de chamados.
export const LIMITE_CHAMADOS_POR_DIA = 10;

export class LimiteDeChamados extends Error {}

export async function abrirChamado(
  inquilino: Inquilino,
  dados: DadosChamado,
  foto: FotoValidada | null,
  agora = new Date(),
) {
  const supabase = createAdminClient();

  const umDiaAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: erroContagem } = await supabase
    .from("chamados")
    .select("id", { count: "exact", head: true })
    .eq("inquilino_id", inquilino.id)
    .gte("criado_em", umDiaAtras);
  if (erroContagem) throw erroContagem;
  if ((count ?? 0) >= LIMITE_CHAMADOS_POR_DIA) throw new LimiteDeChamados();

  // O id é gerado aqui para a foto já ir para a pasta do chamado.
  const id = crypto.randomUUID();
  let fotoPath: string | null = null;

  if (foto) {
    // <imovel_id>/<chamado_id>/foto.ext: a primeira pasta é o imóvel, que é o
    // que a política do bucket usa para liberar a leitura ao dono.
    fotoPath = `${inquilino.imovel_id}/${id}/foto.${foto.extensao}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(fotoPath, foto.bytes, { contentType: foto.tipo });
    if (error) throw error;
  }

  const { error } = await supabase.from("chamados").insert({
    id,
    imovel_id: inquilino.imovel_id,
    inquilino_id: inquilino.id,
    ...dados,
    foto_path: fotoPath,
  });
  if (error) {
    // Sem chamado, a foto ficaria órfã no bucket.
    if (fotoPath) await supabase.storage.from(BUCKET).remove([fotoPath]);
    throw error;
  }

  const { error: erroEvento } = await supabase.from("eventos_chamado").insert({
    chamado_id: id,
    autor: "inquilino",
    status_novo: "aberto",
  });
  if (erroEvento) throw erroEvento;

  return id;
}

// Pedidos que o próprio inquilino abriu, do mais novo para o mais antigo.
export async function listarChamadosDoInquilino(inquilinoId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chamados")
    .select("id, categoria, descricao, urgente, status, criado_em, avaliacao_nota")
    .eq("inquilino_id", inquilinoId)
    .order("criado_em", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}
