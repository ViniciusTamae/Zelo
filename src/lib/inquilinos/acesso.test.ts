import { beforeEach, describe, expect, it, vi } from "vitest";

import { buscarInquilinoPeloLink } from "./acesso";
import { gerarToken } from "./token";

vi.mock("server-only", () => ({}));

// Tabela de inquilinos simulada: a busca só funciona pelo hash, como no banco.
const { banco } = vi.hoisted(() => ({
  banco: {
    inquilinos: [] as { id: string; nome: string; imovel_id: string; token_hash: string; ativo: boolean }[],
    consultas: 0,
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    const filtros: Record<string, unknown> = {};
    const consulta = {
      select: () => consulta,
      eq: (coluna: string, valor: unknown) => {
        filtros[coluna] = valor;
        return consulta;
      },
      maybeSingle: async () => {
        banco.consultas++;
        const linha = banco.inquilinos.find((inquilino) =>
          Object.entries(filtros).every(
            ([coluna, valor]) => inquilino[coluna as keyof typeof inquilino] === valor,
          ),
        );
        if (!linha) return { data: null, error: null };
        const { id, nome, imovel_id } = linha;
        return { data: { id, nome, imovel_id, imoveis: { apelido: "Casa da Rua A" } }, error: null };
      },
    };
    return { from: () => consulta };
  },
}));

const original = gerarToken();

beforeEach(() => {
  banco.consultas = 0;
  banco.inquilinos = [
    { id: "i1", nome: "Maria", imovel_id: "m1", token_hash: original.hash, ativo: true },
  ];
});

describe("buscarInquilinoPeloLink", () => {
  it("com o token certo, devolve o inquilino e o imóvel", async () => {
    expect(await buscarInquilinoPeloLink(original.token)).toEqual({
      id: "i1",
      nome: "Maria",
      imovel_id: "m1",
      apelidoImovel: "Casa da Rua A",
    });
  });

  it("token com formato inválido nem consulta o banco", async () => {
    expect(await buscarInquilinoPeloLink("../nao-e-token")).toBeNull();
    expect(banco.consultas).toBe(0);
  });

  it("token com formato certo mas desconhecido é recusado", async () => {
    expect(await buscarInquilinoPeloLink(gerarToken().token)).toBeNull();
  });

  it("o hash guardado não funciona como link", async () => {
    expect(await buscarInquilinoPeloLink(original.hash)).toBeNull();
  });

  it("depois de gerar um novo link, o antigo para de funcionar", async () => {
    const novo = gerarToken();
    banco.inquilinos[0].token_hash = novo.hash;

    expect(await buscarInquilinoPeloLink(original.token)).toBeNull();
    expect(await buscarInquilinoPeloLink(novo.token)).toMatchObject({ id: "i1" });
  });

  it("inquilino desativado não entra pelo link", async () => {
    banco.inquilinos[0].ativo = false;
    expect(await buscarInquilinoPeloLink(original.token)).toBeNull();
  });
});
