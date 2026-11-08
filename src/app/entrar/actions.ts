"use server";

import { redirect } from "next/navigation";

import { demonstracaoLigada, emailDeVisitante } from "@/lib/demonstracao";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { codigoSchema, emailSchema, type EstadoEntrar } from "./esquemas";

const ERRO_DEMONSTRACAO = "Não foi possível abrir a demonstração. Tente de novo em instantes.";

// Botão "Entrar na demonstração": cria uma conta só deste visitante, já com os
// imóveis e chamados de exemplo, e entra nela sem e-mail nem código. Ninguém
// vê o que os outros visitantes mexeram; a conta some depois de 24 h.
// Só existe com DEMONSTRACAO=ligada (na Vercel).
export async function entrarNaDemonstracao(): Promise<{ erro?: string }> {
  if (!demonstracaoLigada()) return { erro: "A demonstração não está disponível aqui." };

  const admin = createAdminClient();
  const email = emailDeVisitante();
  const { data: criado, error: erroCriar } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    // Vira o nome do proprietário (trigger ao_criar_usuario).
    user_metadata: { nome: "Marta Oliveira" },
  });
  if (erroCriar || !criado.user) return { erro: ERRO_DEMONSTRACAO };

  const { error: erroDados } = await admin.rpc("preparar_conta_demonstracao", { p_dono: criado.user.id });
  if (erroDados) {
    // Sem os dados de exemplo a conta não serve: apaga para não sobrar lixo.
    await admin.auth.admin.deleteUser(criado.user.id);
    return {
      erro:
        erroDados.hint === "demonstracao_cheia"
          ? "A demonstração está cheia agora. Tente de novo em alguns minutos."
          : ERRO_DEMONSTRACAO,
    };
  }

  // Gera o mesmo login que iria no e-mail (sem enviar nada) e já o confirma
  // aqui no servidor: a sessão fica nos cookies, como num login normal.
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) return { erro: ERRO_DEMONSTRACAO };

  const supabase = await createClient();
  const { error: erroLogin } = await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash });
  if (erroLogin) return { erro: ERRO_DEMONSTRACAO };
  redirect("/chamados");
}

// Login sem senha em duas etapas: o proprietário informa o e-mail, recebe um
// código de 6 dígitos e digita no app. Funciona igual no navegador e na PWA.
export async function entrar(
  anterior: EstadoEntrar,
  formData: FormData,
): Promise<EstadoEntrar> {
  const intencao = formData.get("intencao");
  // Mantido nos erros para não reiniciar a espera do "Reenviar código".
  const envio = anterior.etapa === "codigo" ? anterior.envio : undefined;
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
      return intencao === "reenviar"
        ? { etapa: "codigo", email: email.data, envio, erro: mensagemDeErro(error.code) }
        : { etapa: "email", email: email.data, erro: mensagemDeErro(error.code) };
    }

    return {
      etapa: "codigo",
      email: email.data,
      envio: crypto.randomUUID(),
      aviso: intencao === "reenviar" ? "Enviamos um novo código." : undefined,
    };
  }

  if (intencao === "confirmar") {
    const codigo = codigoSchema.safeParse(formData.get("codigo") ?? "");
    if (!codigo.success) {
      return {
        etapa: "codigo",
        email: email.data,
        envio,
        erro: codigo.error.issues[0].message,
      };
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: email.data,
      token: codigo.data,
      type: "email",
    });

    if (error || !data.user) {
      return {
        etapa: "codigo",
        email: email.data,
        envio,
        erro: mensagemDeErro(error?.code),
      };
    }

    // Primeiro acesso: ainda sem nome, pede só isso antes de abrir o app.
    const { data: proprietario } = await supabase
      .from("proprietarios")
      .select("nome")
      .eq("id", data.user.id)
      .maybeSingle();
    redirect(proprietario?.nome ? "/chamados" : "/boas-vindas");
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
