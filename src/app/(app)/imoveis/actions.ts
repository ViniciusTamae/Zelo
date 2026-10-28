"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { obterProprietario } from "@/lib/auth";
import {
  errosPorCampo,
  lerCampos,
  type EstadoFormulario,
} from "@/lib/formularios";
import {
  CAMPOS_IMOVEL,
  idSchema,
  imovelSchema,
  inquilinoSchema,
} from "@/lib/imoveis/esquemas";
import { gerarToken } from "@/lib/inquilinos/token";
import { linkDoInquilino } from "@/lib/links";
import { createClient } from "@/lib/supabase/server";

const ERRO_GENERICO = "Não foi possível salvar agora. Tente de novo.";

// Cria um imóvel (sem id) ou atualiza um existente (com id) e abre a página dele.
export async function salvarImovel(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const proprietario = await obterProprietario();
  const valores = lerCampos(formData, CAMPOS_IMOVEL);
  const id = formData.get("id");

  const dados = imovelSchema.safeParse(valores);
  if (!dados.success) {
    return { erros: errosPorCampo(dados.error), valores };
  }

  const supabase = await createClient();
  let imovelId: string;

  if (id) {
    const idValido = idSchema.safeParse(id);
    if (!idValido.success) return { erroGeral: ERRO_GENERICO, valores };

    // O RLS só deixa atualizar imóveis do próprio proprietário.
    const { data, error } = await supabase
      .from("imoveis")
      .update(dados.data)
      .eq("id", idValido.data)
      .select("id")
      .maybeSingle();
    if (error || !data) return { erroGeral: ERRO_GENERICO, valores };
    imovelId = data.id;
  } else {
    const { data, error } = await supabase
      .from("imoveis")
      .insert({ ...dados.data, dono_id: proprietario.id })
      .select("id")
      .single();
    if (error) return { erroGeral: ERRO_GENERICO, valores };
    imovelId = data.id;
  }

  redirect(`/imoveis/${imovelId}`);
}

// O link só existe na resposta destas ações: o banco guarda apenas o hash do
// token, então ele é mostrado ao dono uma única vez.
export type EstadoInquilino = EstadoFormulario & {
  adicionado?: { nome: string; link: string };
};
export type EstadoNovoLink = { link?: string; erro?: string };

export async function adicionarInquilino(
  _anterior: EstadoInquilino,
  formData: FormData,
): Promise<EstadoInquilino> {
  await obterProprietario();
  const valores = lerCampos(formData, ["nome", "email"]);

  const imovelId = idSchema.safeParse(formData.get("imovel_id"));
  if (!imovelId.success) return { erroGeral: ERRO_GENERICO, valores };

  const dados = inquilinoSchema.safeParse(valores);
  if (!dados.success) {
    return { erros: errosPorCampo(dados.error), valores };
  }

  // O RLS recusa imóvel de outro dono.
  const { token, hash } = gerarToken();
  const supabase = await createClient();
  const { error } = await supabase
    .from("inquilinos")
    .insert({ ...dados.data, imovel_id: imovelId.data, token_hash: hash });
  if (error) return { erroGeral: ERRO_GENERICO, valores };

  refresh();
  return {
    sucesso: `Inquilino adicionado: ${dados.data.nome}. Compartilhe o link abaixo, ele só aparece agora.`,
    adicionado: { nome: dados.data.nome, link: linkDoInquilino(token) },
  };
}

// Desativar corta o acesso pelo link, mas mantém o histórico dos chamados.
export async function alterarAtivoInquilino(formData: FormData) {
  await obterProprietario();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("inquilinos")
    .update({ ativo: formData.get("ativo") === "true" })
    .eq("id", id.data);
  if (error) throw error;

  refresh();
}

// Troca o token: o link antigo deixa de funcionar na hora e o novo é mostrado
// uma única vez.
export async function gerarNovoLink(
  _anterior: EstadoNovoLink,
  formData: FormData,
): Promise<EstadoNovoLink> {
  await obterProprietario();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { erro: ERRO_GENERICO };

  const { token, hash } = gerarToken();
  const supabase = await createClient();
  // Sem linha de volta = não existe ou é de outro dono (o RLS esconde).
  const { data, error } = await supabase
    .from("inquilinos")
    .update({ token_hash: hash })
    .eq("id", id.data)
    .eq("ativo", true)
    .select("id")
    .maybeSingle();
  if (error || !data) return { erro: ERRO_GENERICO };

  return { link: linkDoInquilino(token) };
}
