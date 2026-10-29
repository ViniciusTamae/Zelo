// Modelos dos e-mails que o próprio app manda. A moldura (topo com a logo) é
// a mesma dos e-mails da Edge Function: fica em supabase/functions/_shared.
import { botao, escapar, moldura } from "../../../supabase/functions/_shared/email";

const site = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Um e-mail para cada imóvel em que a pessoa é inquilina (normalmente um só).
export function emailLinkDoInquilino(dados: { nome: string; apelidoImovel: string; link: string }) {
  const nome = escapar(dados.nome);
  const imovel = escapar(dados.apelidoImovel);

  return {
    assunto: `Seu link para pedir consertos (${dados.apelidoImovel})`,
    html: moldura(site(), `
      <p style="margin:0 0 12px;font-size:16px;">Olá, ${nome}!</p>
      <p style="margin:0 0 20px;font-size:16px;">Aqui está o seu novo link para pedir consertos no imóvel <strong>${imovel}</strong>. Guarde-o: o link anterior parou de funcionar.</p>
      ${botao(dados.link, "Abrir meu link")}
      <p style="margin:20px 0 0;font-size:14px;color:#78716C;">Se você não pediu este link, pode ignorar este e-mail.</p>`),
    texto: `Olá, ${dados.nome}!\n\nAqui está o seu novo link para pedir consertos no imóvel ${dados.apelidoImovel}. Guarde-o: o link anterior parou de funcionar.\n\n${dados.link}\n\nSe você não pediu este link, pode ignorar este e-mail.`,
  };
}
