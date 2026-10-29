import { describe, expect, it } from "vitest";

import { emailStatusChamado, type DadosEmailStatus } from "./email.ts";

const base: DadosEmailStatus = {
  site: "http://localhost:3000",
  nomeInquilino: "Maria",
  nomeProprietario: "Ana Souza",
  categoria: "hidraulica",
  apelidoImovel: "Casa da Rua A",
  descricao: "Vazamento embaixo da pia",
  statusAnterior: "aberto",
  statusNovo: "em_andamento",
  recado: null,
  linkAvaliacao: null,
};

describe("emailStatusChamado", () => {
  it("em andamento: assunto, quem está cuidando e o pedido", () => {
    const email = emailStatusChamado(base);
    expect(email.assunto).toBe("Seu pedido está em andamento (Hidráulica, Casa da Rua A)");
    expect(email.texto).toContain("Ana Souza começou a cuidar do seu pedido.");
    expect(email.html).toContain("Vazamento embaixo da pia");
    expect(email.html).not.toContain("Avaliar o conserto");
  });

  it("com recado do proprietário", () => {
    const email = emailStatusChamado({ ...base, recado: "O encanador passa na sexta." });
    expect(email.html).toContain("<strong>Recado:</strong> O encanador passa na sexta.");
    expect(email.texto).toContain("Recado: O encanador passa na sexta.");
  });

  it("resolvido: traz o botão de avaliação", () => {
    const email = emailStatusChamado({
      ...base,
      statusNovo: "resolvido",
      linkAvaliacao: "http://localhost:3000/avaliar/abc",
    });
    expect(email.assunto).toBe("Seu pedido foi resolvido (Hidráulica, Casa da Rua A)");
    expect(email.html).toContain('href="http://localhost:3000/avaliar/abc"');
    expect(email.html).toContain("Avaliar o conserto");
  });

  it("reaberto: avisa que voltou a ser cuidado", () => {
    const email = emailStatusChamado({ ...base, statusAnterior: "resolvido" });
    expect(email.assunto).toBe("Seu pedido foi reaberto (Hidráulica, Casa da Rua A)");
  });

  it("sem nome do proprietário, usa um texto genérico", () => {
    expect(emailStatusChamado({ ...base, nomeProprietario: null }).texto).toContain(
      "O proprietário começou a cuidar do seu pedido.",
    );
  });

  it("escapa o que foi digitado, para não injetar HTML", () => {
    const email = emailStatusChamado({ ...base, recado: '<a href="x">clique</a>' });
    expect(email.html).toContain("&lt;a href=&quot;x&quot;&gt;clique&lt;/a&gt;");
    expect(email.html).not.toContain('<a href="x">');
  });
});
