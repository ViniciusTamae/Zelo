"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { obterProprietario } from "@/lib/auth";
import { validarFoto } from "@/lib/chamados/esquemas";
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
import { apagarFotoDoImovel, enviarFotoDoImovel } from "@/lib/imoveis/fotos";
import { gerarToken } from "@/lib/inquilinos/token";
import { linkDoInquilino } from "@/lib/links";
import { createClient } from "@/lib/supabase/server";

const ERRO_GENERICO = "Não foi possível salvar agora. Tente de novo.";

const ERRO_FOTO = "Não foi possível enviar a foto agora. Tente de novo.";

// Cria um imóvel (sem id) ou atualiza um existente (com id) e abre a página dele.
// A foto é opcional: nova foto substitui a antiga; "remover_foto" volta ao padrão.
export async function salvarImovel(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const proprietario = await obterProprietario();
  const valores = lerCampos(formData, CAMPOS_IMOVEL);
  const id = formData.get("id");

  const dados = imovelSchema.safeParse(valores);
  // A foto é conferida antes de salvar qualquer coisa.
  const { foto, erro: erroFoto } = await validarFoto(formData.get("foto"));
  if (!dados.success || erroFoto) {
    return {
      erros: { ...(dados.success ? {} : errosPorCampo(dados.error)), ...(erroFoto ? { foto: erroFoto } : {}) },
      valores,
    };
  }
  const removerFoto = formData.get("remover_foto") === "1";

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
      .select("id, foto_path")
      .maybeSingle();
    if (error || !data) return { erroGeral: ERRO_GENERICO, valores };
    imovelId = data.id;

    const fotoAntiga = data.foto_path;
    if (foto) {
      const erro = await trocarFoto(supabase, imovelId, foto);
      if (erro) return { erroGeral: "Os dados foram salvos, mas a foto não. Tente enviar de novo.", valores };
      if (fotoAntiga) await apagarFotoDoImovel(supabase, fotoAntiga);
    } else if (removerFoto && fotoAntiga) {
      const { error: erroRemover } = await supabase.from("imoveis").update({ foto_path: null }).eq("id", imovelId);
      if (erroRemover) return { erroGeral: ERRO_GENERICO, valores };
      await apagarFotoDoImovel(supabase, fotoAntiga);
    }
  } else {
    const { data, error } = await supabase
      .from("imoveis")
      .insert({ ...dados.data, dono_id: proprietario.id })
      .select("id")
      .single();
    if (error) return { erroGeral: ERRO_GENERICO, valores };
    imovelId = data.id;

    // A pasta da foto é o id do imóvel, que só existe depois de criá-lo. Se a
    // foto falhar, desfaz o cadastro: salvar de novo não cria um imóvel repetido.
    if (foto && (await trocarFoto(supabase, imovelId, foto))) {
      await supabase.from("imoveis").delete().eq("id", imovelId);
      return { erroGeral: ERRO_FOTO, valores };
    }
  }

  redirect(`/imoveis/${imovelId}`);
}

// Envia a foto e grava o caminho no imóvel. Devolve true se algo falhou (sem
// deixar arquivo solto no bucket).
async function trocarFoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  imovelId: string,
  foto: NonNullable<Awaited<ReturnType<typeof validarFoto>>["foto"]>,
) {
  let caminho: string;
  try {
    caminho = await enviarFotoDoImovel(supabase, imovelId, foto);
  } catch {
    return true;
  }
  const { error } = await supabase.from("imoveis").update({ foto_path: caminho }).eq("id", imovelId);
  if (error) {
    await apagarFotoDoImovel(supabase, caminho);
    return true;
  }
  return false;
}

export type EstadoExcluir = { erro?: string };

// Exclui o imóvel (sem chamados) ou arquiva (com chamados, todos resolvidos).
// A regra fica no banco (excluir_ou_arquivar_imovel), numa transação só.
export async function excluirImovel(_anterior: EstadoExcluir, formData: FormData): Promise<EstadoExcluir> {
  await obterProprietario();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { erro: ERRO_GENERICO };

  const supabase = await createClient();
  // A foto só é apagada se o imóvel for excluído; arquivado, ela fica.
  const { data: imovel } = await supabase.from("imoveis").select("foto_path").eq("id", id.data).maybeSingle();
  const { data: resultado, error } = await supabase.rpc("excluir_ou_arquivar_imovel", { imovel: id.data });
  if (error) {
    return {
      erro:
        error.code === "22023"
          ? "Este imóvel tem chamados em aberto. Resolva os chamados antes de excluir."
          : "Não foi possível excluir agora. Tente de novo.",
    };
  }
  if (resultado === "excluido" && imovel?.foto_path) await apagarFotoDoImovel(supabase, imovel.foto_path);

  redirect(`/imoveis?aviso=${resultado === "excluido" ? "excluido" : "arquivado"}`);
}

// Desarquivar volta o imóvel para a lista; os links dos inquilinos voltam a funcionar.
export async function desarquivarImovel(formData: FormData) {
  await obterProprietario();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;

  const supabase = await createClient();
  const { error } = await supabase.from("imoveis").update({ arquivado_em: null }).eq("id", id.data);
  if (error) throw error;
  refresh();
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
