import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const admin = vi.hoisted(() => ({
  rpc: vi.fn(),
  remove: vi.fn(),
  deleteUser: vi.fn(),
  bucketsUsados: [] as string[],
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: admin.rpc,
    storage: {
      from: (bucket: string) => {
        admin.bucketsUsados.push(bucket);
        return { remove: admin.remove };
      },
    },
    auth: { admin: { deleteUser: admin.deleteUser } },
  }),
}));

function chamar(autorizacao?: string) {
  return GET(
    new Request("http://zelo.test/api/demonstracao/limpar", {
      headers: autorizacao ? { authorization: autorizacao } : {},
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  admin.bucketsUsados = [];
  vi.stubEnv("DEMONSTRACAO", "ligada");
  vi.stubEnv("CRON_SECRET", "segredo-do-cron");
  admin.rpc.mockImplementation(async (funcao: string, args?: { p_dono: string }) => {
    if (funcao === "contas_demonstracao_vencidas") return { data: ["v1", "v2"], error: null };
    if (args?.p_dono === "v1") {
      return {
        data: [
          { bucket: "fotos-chamados", caminho: "imovel-1/chamado-1/foto.jpg" },
          { bucket: "fotos-chamados", caminho: "imovel-1/chamado-2/foto.jpg" },
          { bucket: "fotos-imoveis", caminho: "imovel-1/capa.jpg" },
        ],
        error: null,
      };
    }
    return { data: [], error: null };
  });
  admin.remove.mockResolvedValue({ error: null });
  admin.deleteUser.mockResolvedValue({ error: null });
});

describe("limpeza diária da demonstração", () => {
  it("sem o segredo do Vercel Cron, recusa sem apagar nada", async () => {
    expect((await chamar()).status).toBe(401);
    expect((await chamar("Bearer errado")).status).toBe(401);
    expect(admin.rpc).not.toHaveBeenCalled();
    expect(admin.deleteUser).not.toHaveBeenCalled();
  });

  it("sem CRON_SECRET configurado, recusa até quem manda um Bearer vazio", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await chamar("Bearer ")).status).toBe(401);
  });

  it("com a demonstração desligada, a rota não existe", async () => {
    vi.stubEnv("DEMONSTRACAO", "");
    expect((await chamar("Bearer segredo-do-cron")).status).toBe(404);
    expect(admin.rpc).not.toHaveBeenCalled();
  });

  it("apaga as fotos de cada conta vencida e depois a conta", async () => {
    const resposta = await chamar("Bearer segredo-do-cron");

    expect(await resposta.json()).toEqual({ apagadas: 2, falhas: 0 });
    expect(admin.remove).toHaveBeenCalledWith(["imovel-1/chamado-1/foto.jpg", "imovel-1/chamado-2/foto.jpg"]);
    expect(admin.remove).toHaveBeenCalledWith(["imovel-1/capa.jpg"]);
    expect(admin.bucketsUsados).toEqual(["fotos-chamados", "fotos-imoveis"]);
    expect(admin.deleteUser.mock.calls).toEqual([["v1"], ["v2"]]);
  });

  it("se as fotos não saem, mantém a conta para tentar no dia seguinte", async () => {
    admin.remove.mockResolvedValue({ error: { message: "falhou" } });

    const resposta = await chamar("Bearer segredo-do-cron");

    expect(await resposta.json()).toEqual({ apagadas: 1, falhas: 1 });
    expect(admin.deleteUser.mock.calls).toEqual([["v2"]]);
  });
});
