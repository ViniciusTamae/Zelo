// Modelos de e-mail do Zelo. TypeScript puro, sem imports: usado pela Edge
// Function (Deno) e pelo app (Next.js), para todos os e-mails terem a mesma cara.
// HTML só com estilos inline e tabelas, que é o que os leitores de e-mail aceitam.

export type Email = { assunto: string; html: string; texto: string };

export function escapar(texto: string) {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Topo na cor do Zelo com a logo branca centralizada (PNG: muitos leitores de
// e-mail não exibem SVG). `site` é o endereço público do app.
export function moldura(site: string, conteudo: string) {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background-color:#FAFAF9;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF9;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background-color:#FFFFFF;border:1px solid #E7E5E4;border-radius:12px;overflow:hidden;font-family:Inter,Arial,Helvetica,sans-serif;color:#1C1917;">
          <tr><td align="center" style="background-color:#0F766E;padding:20px 24px;text-align:center;">
            <img src="${site}/brand/zelo-logo-branco.png" alt="Zelo" height="32" style="display:block;margin:0 auto;height:32px;border:0;color:#FFFFFF;font-size:24px;font-weight:600;" />
          </td></tr>
          <tr><td style="padding:28px 24px 24px;">${conteudo}</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function botao(url: string, texto: string) {
  return `<a href="${escapar(url)}" style="display:inline-block;background-color:#0F766E;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:16px;padding:12px 24px;border-radius:8px;">${escapar(texto)}</a>`;
}

// ---------------------------------------------------------------------------
// Mudança de status do chamado (para o inquilino)
// ---------------------------------------------------------------------------

const CATEGORIAS: Record<string, string> = {
  hidraulica: "Hidráulica",
  eletrica: "Elétrica",
  telhado: "Telhado",
  outros: "Outros",
};

export type DadosEmailStatus = {
  site: string;
  nomeInquilino: string;
  nomeProprietario: string | null;
  categoria: string;
  apelidoImovel: string;
  descricao: string;
  statusAnterior: string | null;
  statusNovo: string;
  recado: string | null;
  // Só ao resolver: link de uso único da pesquisa de satisfação.
  linkAvaliacao: string | null;
};

export function emailStatusChamado(dados: DadosEmailStatus): Email {
  const pedido = `${CATEGORIAS[dados.categoria] ?? "Conserto"}, ${dados.apelidoImovel}`;
  const quem = dados.nomeProprietario ?? "O proprietário";
  const resumo = dados.descricao.length > 140 ? `${dados.descricao.slice(0, 139)}…` : dados.descricao;

  const { assunto, frase } =
    dados.statusNovo === "resolvido"
      ? { assunto: `Seu pedido foi resolvido (${pedido})`, frase: `${quem} marcou seu pedido como resolvido.` }
      : dados.statusAnterior === "resolvido"
        ? { assunto: `Seu pedido foi reaberto (${pedido})`, frase: `${quem} reabriu seu pedido e voltou a cuidar dele.` }
        : { assunto: `Seu pedido está em andamento (${pedido})`, frase: `${quem} começou a cuidar do seu pedido.` };

  const linhas = [
    `<p style="margin:0 0 12px;font-size:16px;">Olá, ${escapar(dados.nomeInquilino)}!</p>`,
    `<p style="margin:0 0 12px;font-size:16px;">${escapar(frase)}</p>`,
    `<p style="margin:0 0 16px;font-size:14px;color:#78716C;">Pedido: ${escapar(pedido)}<br />"${escapar(resumo)}"</p>`,
  ];
  if (dados.recado) {
    linhas.push(
      `<div style="margin:0 0 20px;padding:12px 16px;background-color:#F5F5F4;border-radius:8px;font-size:15px;"><strong>Recado:</strong> ${escapar(dados.recado)}</div>`,
    );
  }
  if (dados.linkAvaliacao) {
    linhas.push(
      `<p style="margin:0 0 16px;font-size:16px;">O conserto ficou bom? Leva 10 segundos para avaliar.</p>`,
      botao(dados.linkAvaliacao, "Avaliar o conserto"),
    );
  }
  linhas.push(
    `<p style="margin:20px 0 0;font-size:14px;color:#78716C;">Você acompanha todos os seus pedidos pelo seu link de pedidos do Zelo.</p>`,
  );

  const texto = [
    `Olá, ${dados.nomeInquilino}!`,
    "",
    frase,
    `Pedido: ${pedido} - "${resumo}"`,
    dados.recado ? `\nRecado: ${dados.recado}` : "",
    dados.linkAvaliacao ? `\nO conserto ficou bom? Avalie: ${dados.linkAvaliacao}` : "",
    "",
    "Você acompanha todos os seus pedidos pelo seu link de pedidos do Zelo.",
  ].join("\n");

  return { assunto, html: moldura(dados.site, linhas.join("\n")), texto };
}
