import "server-only";

export type Email = {
  para: string;
  assunto: string;
  html: string;
  texto: string;
};

// Envia um e-mail do app. Em produção usa a API do Resend; no local, sem
// RESEND_API_KEY, entrega no Mailpit do Supabase (nada sai de verdade).
export async function enviarEmail(email: Email) {
  const remetente = process.env.RESEND_FROM;
  if (!remetente) throw new Error("RESEND_FROM não configurado.");

  if (process.env.RESEND_API_KEY) {
    await enviarPeloResend(email, remetente, process.env.RESEND_API_KEY);
  } else if (process.env.MAILPIT_URL) {
    await enviarPeloMailpit(email, remetente, process.env.MAILPIT_URL);
  } else {
    throw new Error("Configure RESEND_API_KEY (produção) ou MAILPIT_URL (local).");
  }
}

async function enviarPeloResend(email: Email, remetente: string, chave: string) {
  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: remetente,
      to: [email.para],
      subject: email.assunto,
      html: email.html,
      text: email.texto,
    }),
  });
  if (!resposta.ok) {
    throw new Error(`Resend recusou o e-mail (${resposta.status}): ${await resposta.text()}`);
  }
}

async function enviarPeloMailpit(email: Email, remetente: string, url: string) {
  // "Nome <email>" → { Name, Email }, formato da API de envio do Mailpit.
  const [, nome = "", endereco = remetente] = remetente.match(/^(.*)<(.+)>$/) ?? [];
  const resposta = await fetch(`${url}/api/v1/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      From: { Name: nome.trim(), Email: endereco.trim() },
      To: [{ Email: email.para }],
      Subject: email.assunto,
      HTML: email.html,
      Text: email.texto,
    }),
  });
  if (!resposta.ok) {
    throw new Error(`Mailpit recusou o e-mail (${resposta.status}): ${await resposta.text()}`);
  }
}
