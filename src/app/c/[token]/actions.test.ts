import { beforeEach, describe, expect, it, vi } from "vitest";

import { abrirChamadoDoInquilino, avaliarChamadoDoInquilino, pedirNovoLink } from "./actions";

const { reenviar, depois, buscarInquilino, abrir, avaliar, LimiteDeChamados } = vi.hoisted(() => ({
  avaliar: vi.fn(),
  reenviar: vi.fn(),
  // Tarefas agendadas com after(); o teste roda quando quiser.
  depois: [] as (() => Promise<void>)[],
  buscarInquilino: vi.fn(),
  abrir: vi.fn(),
  LimiteDeChamados: class extends Error {},
}));

vi.mock("@/lib/inquilinos/reenvio", () => ({ reenviarLinkPorEmail: reenviar }));
vi.mock("@/lib/inquilinos/acesso", () => ({ buscarInquilinoPeloLink: buscarInquilino }));
vi.mock("@/lib/chamados/inquilino", () => ({ abrirChamado: abrir, LimiteDeChamados }));
vi.mock("@/lib/chamados/avaliacao", () => ({ avaliarPeloLinkDoInquilino: avaliar }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
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
  buscarInquilino.mockResolvedValue({ id: "i1", nome: "Maria", imovel_id: "m1", apelidoImovel: "Casa" });
  abrir.mockResolvedValue("c1");
  avaliar.mockResolvedValue(true);
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

function chamado(campos: Record<string, string | File>) {
  const form = new FormData();
  const padrao = { token: "t".repeat(43), categoria: "hidraulica", descricao: "Vazamento na pia" };
  Object.entries({ ...padrao, ...campos }).forEach(([campo, valor]) => form.set(campo, valor));
  return form;
}

describe("abrirChamadoDoInquilino", () => {
  it("com link válido e dados certos, abre o chamado", async () => {
    const estado = await abrirChamadoDoInquilino({}, chamado({ urgente: "on", melhor_horario: "Manhã" }));

    expect(estado).toEqual({ enviado: true });
    expect(abrir).toHaveBeenCalledWith(
      expect.objectContaining({ id: "i1", imovel_id: "m1" }),
      { categoria: "hidraulica", descricao: "Vazamento na pia", urgente: true, melhor_horario: "Manhã" },
      null,
    );
  });

  it("link trocado ou desativado depois de abrir a página: não abre nada", async () => {
    buscarInquilino.mockResolvedValue(null);

    const estado = await abrirChamadoDoInquilino({}, chamado({}));

    expect(estado.erroGeral).toBe("Este link não funciona mais. Peça um novo ao proprietário.");
    expect(abrir).not.toHaveBeenCalled();
  });

  it("mostra os erros de cada campo, inclusive da foto, sem abrir", async () => {
    const falsa = new File([new TextEncoder().encode("não é imagem")], "foto.jpg", { type: "image/jpeg" });

    const estado = await abrirChamadoDoInquilino({}, chamado({ descricao: " ", foto: falsa }));

    expect(estado.erros).toEqual({
      descricao: "Conte o que aconteceu.",
      foto: "Formato de foto não aceito. Use uma foto JPG, PNG ou WebP.",
    });
    expect(estado.valores?.descricao).toBe(" ");
    expect(abrir).not.toHaveBeenCalled();
  });

  it("passa a foto validada adiante", async () => {
    const jpg = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2])], "foto.jpg");

    await abrirChamadoDoInquilino({}, chamado({ foto: jpg }));

    expect(abrir.mock.calls[0][2]).toMatchObject({ tipo: "image/jpeg", extensao: "jpg" });
  });

  it("acima do limite diário, explica o motivo", async () => {
    abrir.mockRejectedValue(new LimiteDeChamados());

    const estado = await abrirChamadoDoInquilino({}, chamado({}));

    expect(estado.erroGeral).toBe("Você já abriu muitos pedidos hoje. Fale direto com o proprietário.");
  });

  it("erro inesperado: mensagem genérica e o que foi digitado continua", async () => {
    abrir.mockRejectedValue(new Error("banco fora do ar"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const estado = await abrirChamadoDoInquilino({}, chamado({}));

    expect(estado.erroGeral).toBe("Não foi possível enviar agora. Tente de novo.");
    expect(estado.valores?.descricao).toBe("Vazamento na pia");
    log.mockRestore();
  });
});

function avaliacao(campos: Record<string, string>) {
  const form = new FormData();
  Object.entries({ token: "t".repeat(43), chamado_id: "c1", comentario: "", ...campos }).forEach(([campo, valor]) =>
    form.set(campo, valor),
  );
  return form;
}

describe("avaliarChamadoDoInquilino", () => {
  it("registra a nota do chamado do próprio inquilino", async () => {
    const estado = await avaliarChamadoDoInquilino({}, avaliacao({ nota: "5", comentario: " Rápido " }));

    expect(avaliar).toHaveBeenCalledWith("i1", "c1", { nota: 5, comentario: "Rápido" });
    expect(estado.sucesso).toMatch(/^Obrigado pela avaliação!/);
  });

  it("sem nota, pede para escolher", async () => {
    const estado = await avaliarChamadoDoInquilino({}, avaliacao({}));

    expect(estado.erros?.nota).toBe("Escolha uma nota de 1 a 5.");
    expect(avaliar).not.toHaveBeenCalled();
  });

  it("link que não vale mais: não avalia", async () => {
    buscarInquilino.mockResolvedValue(null);

    const estado = await avaliarChamadoDoInquilino({}, avaliacao({ nota: "4" }));

    expect(estado.erroGeral).toBe("Este link não funciona mais. Peça um novo ao proprietário.");
    expect(avaliar).not.toHaveBeenCalled();
  });

  it("chamado já avaliado, reaberto ou de outro inquilino: recusa", async () => {
    avaliar.mockResolvedValue(false);

    const estado = await avaliarChamadoDoInquilino({}, avaliacao({ nota: "4" }));

    expect(estado.erroGeral).toBe("Este pedido não pode mais ser avaliado.");
  });
});
