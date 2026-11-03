import { beforeEach, describe, expect, it, vi } from "vitest";

import { reenviarLinkPorEmail } from "./reenvio";
import { hashDoToken } from "./token";

vi.mock("server-only", () => ({}));

const { banco, enviados } = vi.hoisted(() => ({
  banco: {
    // Inquilinos ativos com o e-mail procurado
    encontrados: [] as { id: string; nome: string; imoveis: { apelido: string; arquivado_em?: string } }[],
    // Ids que o update consegue trocar (fora da espera de 10 min)
    trocaveis: new Set<string>(),
    updates: [] as { id: string; token_hash: string }[],
  },
  enviados: [] as { para: string; texto: string }[],
}));

vi.mock("@/lib/email/enviar", () => ({
  enviarEmail: async (email: { para: string; texto: string }) => enviados.push(email),
}));

// Simula só as duas consultas que o reenvio faz.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ eq: async () => ({ data: banco.encontrados, error: null }) }),
      }),
      update: (valores: { token_hash: string }) => ({
        eq: (_coluna: string, id: string) => ({
          or: () => ({
            select: () => ({
              maybeSingle: async () => {
                if (!banco.trocaveis.has(id)) return { data: null, error: null };
                banco.updates.push({ id, token_hash: valores.token_hash });
                return { data: { id }, error: null };
              },
            }),
          }),
        }),
      }),
    }),
  }),
}));

beforeEach(() => {
  banco.encontrados = [{ id: "i1", nome: "Maria", imoveis: { apelido: "Casa da Rua A" } }];
  banco.trocaveis = new Set(["i1"]);
  banco.updates = [];
  enviados.length = 0;
});

describe("reenviarLinkPorEmail", () => {
  it("troca o link e manda o novo por e-mail", async () => {
    await reenviarLinkPorEmail("maria@exemplo.com");

    expect(enviados).toHaveLength(1);
    expect(enviados[0].para).toBe("maria@exemplo.com");
    // O link enviado é o do token cujo hash foi gravado
    const token = enviados[0].texto.match(/\/c\/([A-Za-z0-9_-]{43})/)![1];
    expect(banco.updates[0].token_hash).toBe(hashDoToken(token));
  });

  it("e-mail não cadastrado: não envia nada", async () => {
    banco.encontrados = [];
    await reenviarLinkPorEmail("ninguem@exemplo.com");
    expect(enviados).toHaveLength(0);
  });

  it("dentro da espera entre reenvios: não troca nem envia", async () => {
    banco.trocaveis.clear();
    await reenviarLinkPorEmail("maria@exemplo.com");
    expect(enviados).toHaveLength(0);
  });

  it("imóvel arquivado: não troca nem envia", async () => {
    banco.encontrados[0].imoveis.arquivado_em = "2026-11-03T00:00:00Z";
    await reenviarLinkPorEmail("maria@exemplo.com");
    expect(enviados).toHaveLength(0);
    expect(banco.updates).toHaveLength(0);
  });

  it("inquilina em dois imóveis recebe um link para cada", async () => {
    banco.encontrados.push({ id: "i2", nome: "Maria", imoveis: { apelido: "Apto Centro" } });
    banco.trocaveis.add("i2");

    await reenviarLinkPorEmail("maria@exemplo.com");

    expect(enviados).toHaveLength(2);
    expect(enviados[1].texto).toContain("Apto Centro");
  });
});
