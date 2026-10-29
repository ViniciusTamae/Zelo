import { describe, expect, it } from "vitest";

import { chamadoSchema, mudancaStatusSchema, TAMANHO_MAXIMO_FOTO, validarFoto } from "./esquemas";

const valido = { categoria: "hidraulica", descricao: "Vazamento na pia", melhor_horario: "" };

describe("chamadoSchema", () => {
  it("aceita um chamado completo e limpa os espaços", () => {
    expect(
      chamadoSchema.parse({
        categoria: "eletrica",
        descricao: "  Tomada da sala sem energia  ",
        urgente: "on",
        melhor_horario: " Depois das 18h ",
      }),
    ).toEqual({
      categoria: "eletrica",
      descricao: "Tomada da sala sem energia",
      urgente: true,
      melhor_horario: "Depois das 18h",
    });
  });

  it("sem marcar urgente, não é urgente; horário em branco vira null", () => {
    expect(chamadoSchema.parse(valido)).toMatchObject({ urgente: false, melhor_horario: null });
  });

  it("recusa categoria fora da lista", () => {
    const resultado = chamadoSchema.safeParse({ ...valido, categoria: "jardim" });
    expect(resultado.error?.issues[0].message).toBe("Escolha o tipo de problema.");
  });

  it("recusa categoria não escolhida", () => {
    const resultado = chamadoSchema.safeParse({ ...valido, categoria: undefined });
    expect(resultado.error?.issues[0].message).toBe("Escolha o tipo de problema.");
  });

  it("recusa descrição em branco", () => {
    const resultado = chamadoSchema.safeParse({ ...valido, descricao: "   " });
    expect(resultado.error?.issues[0].message).toBe("Conte o que aconteceu.");
  });

  it("recusa descrição com mais de 1000 caracteres", () => {
    expect(chamadoSchema.safeParse({ ...valido, descricao: "a".repeat(1001) }).success).toBe(false);
  });
});

function arquivo(bytes: number[], nome = "foto.jpg", tipo = "image/jpeg") {
  return new File([new Uint8Array(bytes)], nome, { type: tipo });
}

describe("validarFoto", () => {
  it("sem foto (campo vazio) segue sem foto e sem erro", async () => {
    expect(await validarFoto(null)).toEqual({ foto: null });
    expect(await validarFoto(new File([], ""))).toEqual({ foto: null });
  });

  it.each([
    [[0xff, 0xd8, 0xff, 0xe0], "image/jpeg", "jpg"],
    [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a], "image/png", "png"],
    [[...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")], "image/webp", "webp"],
  ])("reconhece a foto pelo conteúdo (%#)", async (bytes, tipo, extensao) => {
    const { foto } = await validarFoto(arquivo(bytes));
    expect(foto).toMatchObject({ tipo, extensao });
  });

  it("recusa arquivo que diz ser imagem mas não é", async () => {
    const { foto, erro } = await validarFoto(arquivo([...Buffer.from("<script>")], "foto.jpg"));
    expect(foto).toBeNull();
    expect(erro).toBe("Formato de foto não aceito. Use uma foto JPG, PNG ou WebP.");
  });

  it("recusa foto acima do limite", async () => {
    const grande = arquivo([0xff, 0xd8, 0xff, ...new Array(TAMANHO_MAXIMO_FOTO).fill(0)]);
    const { erro } = await validarFoto(grande);
    expect(erro).toBe("A foto é muito grande. Tente tirar outra pela câmera.");
  });
});

describe("mudancaStatusSchema", () => {
  const base = { chamado_id: "2b0c4c8e-8a5b-4bb0-9a43-3f1f8f6f9b10", status: "resolvido", nota: "", valor: "" };

  it("recado e custo em branco viram null", () => {
    expect(mudancaStatusSchema.parse(base)).toMatchObject({ nota: null, valor: null });
  });

  it("lê o custo no formato brasileiro", () => {
    expect(mudancaStatusSchema.parse({ ...base, valor: "1.234,56" }).valor).toBe(1234.56);
  });

  it("recusa custo inválido com uma mensagem de exemplo", () => {
    const resultado = mudancaStatusSchema.safeParse({ ...base, valor: "cento e cinquenta" });
    expect(resultado.error?.issues[0].message).toBe("Informe um valor como 150 ou 1.234,56.");
  });
});
