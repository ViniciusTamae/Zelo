import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateSession } from "./proxy";

type CookiesConfig = {
  setAll: (
    cookies: { name: string; value: string; options: object }[],
  ) => void;
};

// Simula o Supabase: define se há sessão e se ela foi renovada (cookies novos).
const sessao = vi.hoisted(() => ({
  logado: false,
  renovou: false,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _chave: string,
    { cookies }: { cookies: CookiesConfig },
  ) => ({
    auth: {
      getClaims: async () => {
        if (sessao.renovou) {
          cookies.setAll([
            { name: "sb-auth-token", value: "renovado", options: {} },
          ]);
        }
        return {
          data: sessao.logado ? { claims: { sub: "id-do-dono" } } : null,
        };
      },
    },
  }),
}));

function requisicao(caminho: string) {
  return new NextRequest(new URL(caminho, "http://localhost:3000"));
}

function destino(resposta: Response) {
  const location = resposta.headers.get("location");
  return location ? new URL(location).pathname : null;
}

beforeEach(() => {
  sessao.logado = false;
  sessao.renovou = false;
});

describe("proxy: controle de acesso", () => {
  it.each(["/chamados", "/imoveis", "/imoveis/novo", "/ajustes"])(
    "sem sessão, %s redireciona para /entrar",
    async (caminho) => {
      const resposta = await updateSession(requisicao(caminho));

      expect(resposta.status).toBe(307);
      expect(destino(resposta)).toBe("/entrar");
    },
  );

  it("o redirecionamento descarta a query string", async () => {
    const resposta = await updateSession(requisicao("/imoveis?x=1"));

    expect(resposta.headers.get("location")).toBe(
      "http://localhost:3000/entrar",
    );
  });

  it.each(["/entrar", "/api/health", "/imoveisx", "/c/abc"])(
    "sem sessão, %s segue normalmente",
    async (caminho) => {
      const resposta = await updateSession(requisicao(caminho));

      expect(destino(resposta)).toBeNull();
    },
  );

  it("com sessão, /imoveis segue normalmente", async () => {
    sessao.logado = true;

    const resposta = await updateSession(requisicao("/imoveis"));

    expect(destino(resposta)).toBeNull();
  });

  it("com sessão, /entrar redireciona para /chamados", async () => {
    sessao.logado = true;

    const resposta = await updateSession(requisicao("/entrar"));

    expect(resposta.status).toBe(307);
    expect(destino(resposta)).toBe("/chamados");
  });

  it("mantém os cookies renovados mesmo ao redirecionar", async () => {
    sessao.logado = true;
    sessao.renovou = true;

    const resposta = await updateSession(requisicao("/entrar"));

    expect(destino(resposta)).toBe("/chamados");
    expect(resposta.cookies.get("sb-auth-token")?.value).toBe("renovado");
  });

  it("repassa os cookies renovados na resposta normal", async () => {
    sessao.logado = true;
    sessao.renovou = true;

    const resposta = await updateSession(requisicao("/imoveis"));

    expect(resposta.cookies.get("sb-auth-token")?.value).toBe("renovado");
  });
});
