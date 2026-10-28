"use server";

import { refresh } from "next/cache";
import { after } from "next/server";

import { emailSchema } from "@/app/entrar/esquemas";
import { abrirChamado, LimiteDeChamados } from "@/lib/chamados/inquilino";
import { CAMPOS_CHAMADO, chamadoSchema, validarFoto } from "@/lib/chamados/esquemas";
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
