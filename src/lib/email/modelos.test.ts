import { describe, expect, it } from "vitest";

import { emailLinkDoInquilino } from "./modelos";

const dados = {
  nome: "Maria",
  apelidoImovel: "Casa da Rua A",
  link: "http://localhost:3000/c/abc",
};

describe("emailLinkDoInquilino", () => {
  it("traz o nome, o imóvel e o link no HTML e no texto", () => {
    const email = emailLinkDoInquilino(dados);

    expect(email.assunto).toBe("Seu link para pedir consertos (Casa da Rua A)");
    expect(email.html).toContain("Olá, Maria!");
    expect(email.html).toContain('href="http://localhost:3000/c/abc"');
    expect(email.texto).toContain("http://localhost:3000/c/abc");
  });

  it("escapa o que o dono digitou, para não injetar HTML no e-mail", () => {
    const email = emailLinkDoInquilino({ ...dados, nome: '<b>"Maria"</b>' });

    expect(email.html).toContain("&lt;b&gt;&quot;Maria&quot;&lt;/b&gt;");
    expect(email.html).not.toContain("<b>");
  });
});
