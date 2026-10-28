import { beforeEach, describe, expect, it, vi } from "vitest";

import { entrar, type EstadoEntrar } from "./actions";

const { auth } = vi.hoisted(() => ({
  auth: { signInWithOtp: vi.fn(), verifyOtp: vi.fn() },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth }),
}));

// O redirect do Next interrompe a execução lançando um erro; simulamos igual.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

const inicial: EstadoEntrar = { etapa: "email" };

function formulario(dados: Record<string, string>) {
  const form = new FormData();
  Object.entries(dados).forEach(([campo, valor]) => form.set(campo, valor));
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.signInWithOtp.mockResolvedValue({ error: null });
  auth.verifyOtp.mockResolvedValue({ error: null });
});

describe("entrar: enviar código", () => {
  it("recusa e-mail inválido sem chamar o Supabase", async () => {
    const estado = await entrar(
      inicial,
      formulario({ intencao: "enviar", email: "nao-e-email" }),
    );

    expect(estado).toEqual({
      etapa: "email",
      email: "nao-e-email",
      erro: "Informe um e-mail válido.",
    });
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("normaliza o e-mail, envia o código e avança para a etapa do código", async () => {
    const estado = await entrar(
      inicial,
      formulario({ intencao: "enviar", email: "  Dono@Exemplo.COM " }),
    );

    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: "dono@exemplo.com",
      options: { shouldCreateUser: true },
    });
    expect(estado).toEqual({
      etapa: "codigo",
      email: "dono@exemplo.com",
      aviso: undefined,
    });
  });

  it.each([
    ["over_email_send_rate_limit", "Aguarde um minuto antes de pedir outro código."],
    ["over_request_rate_limit", "Muitas tentativas. Aguarde alguns minutos e tente de novo."],
  ])("traduz o limite %s para o proprietário", async (codigo, mensagem) => {
    auth.signInWithOtp.mockResolvedValue({ error: { code: codigo } });

    const estado = await entrar(
      inicial,
      formulario({ intencao: "enviar", email: "dono@exemplo.com" }),
    );

    expect(estado).toEqual({
      etapa: "email",
      email: "dono@exemplo.com",
      erro: mensagem,
    });
  });

  it("usa mensagem genérica para erros desconhecidos", async () => {
    auth.signInWithOtp.mockResolvedValue({ error: { code: "unexpected" } });

    const estado = await entrar(
      inicial,
      formulario({ intencao: "enviar", email: "dono@exemplo.com" }),
    );

    expect(estado).toMatchObject({
      etapa: "email",
      erro: "Não foi possível entrar agora. Tente de novo em instantes.",
    });
  });
});

describe("entrar: reenviar e trocar e-mail", () => {
  const naEtapaCodigo: EstadoEntrar = {
    etapa: "codigo",
    email: "dono@exemplo.com",
  };

  it("reenvia o código e avisa", async () => {
    const estado = await entrar(
      naEtapaCodigo,
      formulario({ intencao: "reenviar", email: "dono@exemplo.com" }),
    );

    expect(auth.signInWithOtp).toHaveBeenCalledOnce();
    expect(estado).toEqual({
      etapa: "codigo",
      email: "dono@exemplo.com",
      aviso: "Enviamos um novo código.",
    });
  });

  it("se o reenvio falha, continua na etapa do código", async () => {
    auth.signInWithOtp.mockResolvedValue({
      error: { code: "over_request_rate_limit" },
    });

    const estado = await entrar(
      naEtapaCodigo,
      formulario({ intencao: "reenviar", email: "dono@exemplo.com" }),
    );

    expect(estado).toMatchObject({ etapa: "codigo", erro: expect.any(String) });
  });

  it("volta para a etapa do e-mail mantendo o que foi digitado", async () => {
    const estado = await entrar(
      naEtapaCodigo,
      formulario({ intencao: "trocar", email: "dono@exemplo.com" }),
    );

    expect(estado).toEqual({ etapa: "email", email: "dono@exemplo.com" });
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
  });
});

describe("entrar: confirmar código", () => {
  const naEtapaCodigo: EstadoEntrar = {
    etapa: "codigo",
    email: "dono@exemplo.com",
  };

  it.each(["", "12345", "1234567", "abcdef"])(
    "recusa o código %j sem chamar o Supabase",
    async (codigo) => {
      const estado = await entrar(
        naEtapaCodigo,
        formulario({ intencao: "confirmar", email: "dono@exemplo.com", codigo }),
      );

      expect(estado).toEqual({
        etapa: "codigo",
        email: "dono@exemplo.com",
        erro: "O código tem 6 números.",
      });
      expect(auth.verifyOtp).not.toHaveBeenCalled();
    },
  );

  it("avisa quando o código está errado ou expirou", async () => {
    auth.verifyOtp.mockResolvedValue({ error: { code: "otp_expired" } });

    const estado = await entrar(
      naEtapaCodigo,
      formulario({
        intencao: "confirmar",
        email: "dono@exemplo.com",
        codigo: "123456",
      }),
    );

    expect(estado).toEqual({
      etapa: "codigo",
      email: "dono@exemplo.com",
      erro: "Código inválido ou expirado. Confira o número ou peça um novo.",
    });
  });

  it("com o código certo, confere no Supabase e vai para os chamados", async () => {
    await expect(
      entrar(
        naEtapaCodigo,
        formulario({
          intencao: "confirmar",
          email: "dono@exemplo.com",
          codigo: " 123456 ",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/chamados");

    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: "dono@exemplo.com",
      token: "123456",
      type: "email",
    });
  });
});
