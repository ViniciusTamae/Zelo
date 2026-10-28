"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// Estado do fluxo de login, devolvido para o formulário só exibir.
export type EstadoEntrar =
  | { etapa: "email"; email?: string; erro?: string }
  | { etapa: "codigo"; email: string; erro?: string; aviso?: string };

// Limpa espaços e maiúsculas antes de validar (teclados de celular costumam
// deixar espaço no fim ou começar com letra maiúscula).
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Informe um e-mail válido."));

const codigoSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "O código tem 6 números.");

// Login sem senha em duas etapas: o proprietário informa o e-mail, recebe um
// código de 6 dígitos e digita no app. Funciona igual no navegador e na PWA.
export async function entrar(
  _anterior: EstadoEntrar,
  formData: FormData,
): Promise<EstadoEntrar> {
  const intencao = formData.get("intencao");
  const emailInformado = String(formData.get("email") ?? "");

  if (intencao === "trocar") {
    return { etapa: "email", email: emailInformado };
  }

  const email = emailSchema.safeParse(emailInformado);
  if (!email.success) {
    return {
      etapa: "email",
      email: emailInformado,
      erro: email.error.issues[0].message,
    };
  }

  const supabase = await createClient();

  if (intencao === "enviar" || intencao === "reenviar") {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.data,
      // Primeiro acesso cria a conta (e o proprietário, pelo trigger do banco).
      options: { shouldCreateUser: true },
    });

    if (error) {
      return {
        etapa: intencao === "reenviar" ? "codigo" : "email",
        email: email.data,
        erro: mensagemDeErro(error.code),
      };
    }

    return {
      etapa: "codigo",
      email: email.data,
      aviso: intencao === "reenviar" ? "Enviamos um novo código." : undefined,
    };
  }

  if (intencao === "confirmar") {
    const codigo = codigoSchema.safeParse(formData.get("codigo") ?? "");
    if (!codigo.success) {
      return {
        etapa: "codigo",
        email: email.data,
        erro: codigo.error.issues[0].message,
      };
    }

    const { error } = await supabase.auth.verifyOtp({
      email: email.data,
      token: codigo.data,
      type: "email",
    });

    if (error) {
      return {
        etapa: "codigo",
        email: email.data,
        erro: mensagemDeErro(error.code),
      };
    }

    redirect("/painel");
  }

  return { etapa: "email", email: email.data };
}

function mensagemDeErro(codigo: string | undefined) {
  switch (codigo) {
    case "otp_expired":
      return "Código inválido ou expirado. Confira o número ou peça um novo.";
    // Intervalo mínimo entre dois envios para o mesmo e-mail (60 s na nuvem).
    case "over_email_send_rate_limit":
      return "Aguarde um minuto antes de pedir outro código.";
    case "over_request_rate_limit":
      return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
    default:
      return "Não foi possível entrar agora. Tente de novo em instantes.";
  }
}
