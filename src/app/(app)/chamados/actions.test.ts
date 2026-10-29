import { beforeEach, describe, expect, it, vi } from "vitest";

import { mudarStatus } from "./actions";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/lib/auth", () => ({ obterProprietario: async () => ({ id: "dono" }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const CHAMADO = "2b0c4c8e-8a5b-4bb0-9a43-3f1f8f6f9b10";

function formulario(campos: Record<string, string>) {
  const form = new FormData();
  Object.entries({ chamado_id: CHAMADO, nota: "", valor: "", ...campos }).forEach(([campo, valor]) =>
    form.set(campo, valor),
  );
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ error: null });
});

describe("mudarStatus", () => {
  it("resolve com recado e custo no formato brasileiro", async () => {
    const estado = await mudarStatus(
      {},
      formulario({ status: "resolvido", nota: " Trocamos o sifão ", valor: "1.234,50" }),
    );

    expect(rpc).toHaveBeenCalledWith("mudar_status_chamado", {
      chamado: CHAMADO,
      novo_status: "resolvido",
      nota: "Trocamos o sifão",
      valor: 1234.5,
    });
    expect(estado).toEqual({ sucesso: "Chamado marcado como resolvido." });
  });

  it("sem recado nem custo, não manda esses campos", async () => {
    await mudarStatus({}, formulario({ status: "em_andamento" }));

    expect(rpc).toHaveBeenCalledWith("mudar_status_chamado", {
      chamado: CHAMADO,
      novo_status: "em_andamento",
      nota: undefined,
      valor: undefined,
    });
  });

  it("custo inválido volta com a mensagem e não chama o banco", async () => {
    const estado = await mudarStatus({}, formulario({ status: "resolvido", valor: "muito" }));

    expect(estado.erros?.valor).toBe("Informe um valor como 150 ou 1.234,56.");
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["22023", "Este chamado mudou enquanto a tela estava aberta. Atualize a página."],
    ["P0002", "Chamado não encontrado."],
    ["XX000", "Não foi possível salvar agora. Tente de novo."],
  ])("erro %s do banco vira mensagem clara", async (code, mensagem) => {
    rpc.mockResolvedValue({ error: { code } });

    const estado = await mudarStatus({}, formulario({ status: "resolvido" }));

    expect(estado.erroGeral).toBe(mensagem);
  });
});
