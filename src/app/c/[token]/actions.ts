"use server";

import { refresh } from "next/cache";
import { after } from "next/server";

import { emailSchema } from "@/app/entrar/esquemas";
import { avaliarPeloLinkDoInquilino } from "@/lib/chamados/avaliacao";
import { abrirChamado, LimiteDeChamados } from "@/lib/chamados/inquilino";
import {
  AGRADECIMENTO_AVALIACAO,
  avaliacaoSchema,
  CAMPOS_CHAMADO,
  chamadoSchema,
  validarFoto,
} from "@/lib/chamados/esquemas";
import { errosPorCampo, lerCampos, type EstadoFormulario } from "@/lib/formularios";
import { buscarInquilinoPeloLink } from "@/lib/inquilinos/acesso";
import { reenviarLinkPorEmail } from "@/lib/inquilinos/reenvio";

export type EstadoPerdiLink = { email?: string; erro?: string; enviado?: boolean };

// "Perdi meu link". A resposta é sempre a mesma, exista ou não o e-mail, e o
// envio roda depois da resposta (after): nem o texto nem o tempo de resposta
// revelam quais e-mails estão cadastrados.
export async function pedirNovoLink(
  _anterior: EstadoPerdiLink,
  formData: FormData,
): Promise<EstadoPerdiLink> {
  const informado = String(formData.get("email") ?? "");
  const email = emailSchema.safeParse(informado);
  if (!email.success) {
    return { email: informado, erro: email.error.issues[0].message };
  }

  after(async () => {
    try {
      await reenviarLinkPorEmail(email.data);
    } catch (erro) {
      console.error("Falha ao reenviar o link do inquilino:", erro);
    }
  });

  return { enviado: true };
}

export type EstadoChamado = EstadoFormulario & { enviado?: boolean };

// Inquilino abre um pedido de conserto. O link é conferido de novo a cada
// envio: se foi trocado ou desativado depois que a página abriu, não passa.
export async function abrirChamadoDoInquilino(
  _anterior: EstadoChamado,
  formData: FormData,
): Promise<EstadoChamado> {
  const valores = lerCampos(formData, CAMPOS_CHAMADO);
  const inquilino = await buscarInquilinoPeloLink(String(formData.get("token") ?? ""));
  if (!inquilino) {
    return {
      erroGeral: "Este link não funciona mais. Peça um novo ao proprietário.",
      valores,
    };
  }

  const dados = chamadoSchema.safeParse(valores);
  const { foto, erro: erroFoto } = await validarFoto(formData.get("foto"));
  if (!dados.success || erroFoto) {
    return {
      erros: {
        ...(dados.success ? {} : errosPorCampo(dados.error)),
        ...(erroFoto ? { foto: erroFoto } : {}),
      },
      valores,
    };
  }

  try {
    await abrirChamado(inquilino, dados.data, foto);
  } catch (erro) {
    if (erro instanceof LimiteDeChamados) {
      return {
        erroGeral: "Você já abriu muitos pedidos hoje. Fale direto com o proprietário.",
        valores,
      };
    }
    console.error("Falha ao abrir chamado:", erro);
    return { erroGeral: "Não foi possível enviar agora. Tente de novo.", valores };
  }

  refresh();
  return { enviado: true };
}

// Avaliação feita na página de pedidos (para quem não tem e-mail cadastrado,
// ou prefere avaliar por aqui). Só vale para chamado resolvido do próprio inquilino.
export async function avaliarChamadoDoInquilino(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const valores = lerCampos(formData, ["nota", "comentario"]);
  const inquilino = await buscarInquilinoPeloLink(String(formData.get("token") ?? ""));
  if (!inquilino) {
    return { erroGeral: "Este link não funciona mais. Peça um novo ao proprietário.", valores };
  }

  const dados = avaliacaoSchema.safeParse(valores);
  if (!dados.success) return { erros: errosPorCampo(dados.error), valores };

  try {
    const ok = await avaliarPeloLinkDoInquilino(inquilino.id, String(formData.get("chamado_id") ?? ""), dados.data);
    if (!ok) return { erroGeral: "Este pedido não pode mais ser avaliado.", valores };
  } catch (erro) {
    console.error("Falha ao registrar avaliação:", erro);
    return { erroGeral: "Não foi possível enviar agora. Tente de novo.", valores };
  }
  // Sem refresh: o agradecimento fica na tela; a nota aparece na próxima visita.
  return { sucesso: AGRADECIMENTO_AVALIACAO };
}
