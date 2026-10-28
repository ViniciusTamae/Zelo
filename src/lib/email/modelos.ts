// Modelos dos e-mails que o app manda. HTML só com estilos inline e tabelas,
// que é o que os leitores de e-mail aceitam; sempre com versão em texto puro.

function escapar(texto: string) {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Moldura com o topo na cor do Zelo e a logo branca (PNG: muitos leitores de
// e-mail não exibem SVG).
function moldura(conteudo: string) {
  const site = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background-color:#FAFAF9;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF9;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background-color:#FFFFFF;border:1px solid #E7E5E4;border-radius:12px;overflow:hidden;font-family:Inter,Arial,Helvetica,sans-serif;color:#1C1917;">
          <tr><td style="background-color:#0F766E;padding:20px 24px;">
            <img src="${site}/brand/zelo-logo-branco.png" alt="Zelo" height="32" style="display:block;height:32px;border:0;color:#FFFFFF;font-size:24px;font-weight:600;" />
          </td></tr>
          <tr><td style="padding:28px 24px 24px;">${conteudo}</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

// Um e-mail para cada imóvel em que a pessoa é inquilina (normalmente um só).
export function emailLinkDoInquilino(dados: { nome: string; apelidoImovel: string; link: string }) {
  const nome = escapar(dados.nome);
  const imovel = escapar(dados.apelidoImovel);
  const link = escapar(dados.link);

  return {
    assunto: `Seu link para pedir consertos (${dados.apelidoImovel})`,
    html: moldura(`
      <p style="margin:0 0 12px;font-size:16px;">Olá, ${nome}!</p>
      <p style="margin:0 0 20px;font-size:16px;">Aqui está o seu novo link para pedir consertos no imóvel <strong>${imovel}</strong>. Guarde-o: o link anterior parou de funcionar.</p>
      <a href="${link}" style="display:inline-block;background-color:#0F766E;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:16px;padding:12px 24px;border-radius:8px;">Abrir meu link</a>
      <p style="margin:20px 0 0;font-size:14px;color:#78716C;">Se você não pediu este link, pode ignorar este e-mail.</p>`),
    texto: `Olá, ${dados.nome}!\n\nAqui está o seu novo link para pedir consertos no imóvel ${dados.apelidoImovel}. Guarde-o: o link anterior parou de funcionar.\n\n${dados.link}\n\nSe você não pediu este link, pode ignorar este e-mail.`,
  };
}
