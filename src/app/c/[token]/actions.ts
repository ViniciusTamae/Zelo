"use server";

import { after } from "next/server";

import { emailSchema } from "@/app/entrar/esquemas";
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
