import { beforeEach, describe, expect, it, vi } from "vitest";

import { entrar, entrarNaDemonstracao } from "./actions";
import type { EstadoEntrar } from "./esquemas";

const { auth, proprietario } = vi.hoisted(() => ({
  auth: { signInWithOtp: vi.fn(), verifyOtp: vi.fn() },
  // Linha de public.proprietarios lida depois do login
  proprietario: { nome: "Ana" as string | null },
}));

const admin = vi.hoisted(() => ({
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  generateLink: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: { admin: { createUser: admin.createUser, deleteUser: admin.deleteUser, generateLink: admin.generateLink } },
    rpc: admin.rpc,
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth,
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { nome: proprietario.nome }, error: null }),
        }),
      }),
    }),
  }),
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
  auth.verifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  proprietario.nome = "Ana";
  admin.createUser.mockResolvedValue({ data: { user: { id: "visitante-1" } }, error: null });
  admin.rpc.mockResolvedValue({ error: null });
  admin.deleteUser.mockResolvedValue({ error: null });
  admin.generateLink.mockResolvedValue({ data: { properties: { hashed_token: "hash-demo" } }, error: null });
  vi.unstubAllEnvs();
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
      envio: expect.any(String),
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
      envio: expect.any(String),
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
    auth.verifyOtp.mockResolvedValue({ data: { user: null }, error: { code: "otp_expired" } });

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

  it("no primeiro acesso (sem nome), vai para a tela de boas-vindas", async () => {
    proprietario.nome = null;

    await expect(
      entrar(
        naEtapaCodigo,
        formulario({ intencao: "confirmar", email: "dono@exemplo.com", codigo: "123456" }),
      ),
    ).rejects.toThrow("REDIRECT:/boas-vindas");
  });
});

describe("entrarNaDemonstracao", () => {
  it("com a demonstração desligada (computador e produção real), não cria conta", async () => {
    vi.stubEnv("DEMONSTRACAO", "");

    const estado = await entrarNaDemonstracao();

    expect(estado.erro).toBe("A demonstração não está disponível aqui.");
    expect(admin.createUser).not.toHaveBeenCalled();
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("cria uma conta só do visitante, com os dados de exemplo, e entra nela sem e-mail", async () => {
    vi.stubEnv("DEMONSTRACAO", "ligada");

    await expect(entrarNaDemonstracao()).rejects.toThrow("REDIRECT:/chamados");

    const { email } = admin.createUser.mock.calls[0][0];
    expect(email).toMatch(/^visitante-[0-9a-f-]{36}@demo\.zelo\.test$/);
    expect(admin.createUser).toHaveBeenCalledWith({
      email,
      email_confirm: true,
      user_metadata: { nome: "Marta Oliveira" },
    });
    expect(admin.rpc).toHaveBeenCalledWith("preparar_conta_demonstracao", { p_dono: "visitante-1" });
    expect(admin.generateLink).toHaveBeenCalledWith({ type: "magiclink", email });
    expect(auth.verifyOtp).toHaveBeenCalledWith({ type: "email", token_hash: "hash-demo" });
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("cada clique cria uma conta diferente", async () => {
    vi.stubEnv("DEMONSTRACAO", "ligada");

    await entrarNaDemonstracao().catch(() => {});
    await entrarNaDemonstracao().catch(() => {});

    const [primeira, segunda] = admin.createUser.mock.calls.map(([dados]) => dados.email);
    expect(primeira).not.toBe(segunda);
  });

  it("demonstração cheia: apaga a conta recém-criada e avisa", async () => {
    vi.stubEnv("DEMONSTRACAO", "ligada");
    admin.rpc.mockResolvedValue({ error: { hint: "demonstracao_cheia" } });

    const estado = await entrarNaDemonstracao();

    expect(estado.erro).toBe("A demonstração está cheia agora. Tente de novo em alguns minutos.");
    expect(admin.deleteUser).toHaveBeenCalledWith("visitante-1");
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("se o Supabase falha ao criar a conta, avisa sem entrar", async () => {
    vi.stubEnv("DEMONSTRACAO", "ligada");
    admin.createUser.mockResolvedValue({ data: { user: null }, error: { code: "unexpected_failure" } });

    const estado = await entrarNaDemonstracao();

    expect(estado.erro).toMatch(/Não foi possível abrir a demonstração/);
    expect(admin.rpc).not.toHaveBeenCalled();
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });
});
