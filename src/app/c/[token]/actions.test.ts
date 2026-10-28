import { beforeEach, describe, expect, it, vi } from "vitest";

import { pedirNovoLink } from "./actions";

const { reenviar, depois } = vi.hoisted(() => ({
  reenviar: vi.fn(),
  // Tarefas agendadas com after(); o teste roda quando quiser.
  depois: [] as (() => Promise<void>)[],
}));

vi.mock("@/lib/inquilinos/reenvio", () => ({ reenviarLinkPorEmail: reenviar }));
vi.mock("next/server", () => ({
  after: (tarefa: () => Promise<void>) => depois.push(tarefa),
}));

function formulario(email: string) {
  const form = new FormData();
  form.set("email", email);
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  depois.length = 0;
  reenviar.mockResolvedValue(undefined);
});

describe("pedirNovoLink", () => {
  it("e-mail inválido mostra o erro e não procura nada", async () => {
    const estado = await pedirNovoLink({}, formulario("maria@"));

    expect(estado).toEqual({ email: "maria@", erro: "Informe um e-mail válido." });
    expect(depois).toHaveLength(0);
  });

  it("responde sempre igual e reenvia depois da resposta, com o e-mail normalizado", async () => {
    const estado = await pedirNovoLink({}, formulario("  Maria@Exemplo.com "));

    expect(estado).toEqual({ enviado: true });
    // Nada foi feito antes de responder
    expect(reenviar).not.toHaveBeenCalled();

    await depois[0]();
    expect(reenviar).toHaveBeenCalledWith("maria@exemplo.com");
  });

  it("se o envio falhar, a resposta continua a mesma (e o erro vai para o log)", async () => {
    reenviar.mockRejectedValue(new Error("Resend fora do ar"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const estado = await pedirNovoLink({}, formulario("maria@exemplo.com"));
    await depois[0]();

    expect(estado).toEqual({ enviado: true });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
