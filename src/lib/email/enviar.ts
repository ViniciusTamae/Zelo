import "server-only";

import { createTransport } from "nodemailer";

export type Email = {
  para: string;
  assunto: string;
  html: string;
  texto: string;
};

// Envia um e-mail do app, pelo primeiro caminho configurado:
// 1. SMTP (SMTP_HOST...): qualquer provedor, como o Gmail com senha de app;
// 2. API do Resend (RESEND_API_KEY);
// 3. Mailpit do Supabase local (MAILPIT_URL): nada sai de verdade.
// O remetente vem de EMAIL_FROM (ou RESEND_FROM, o nome antigo).
export async function enviarEmail(email: Email) {
  const remetente = process.env.EMAIL_FROM ?? process.env.RESEND_FROM;
  if (!remetente) throw new Error("EMAIL_FROM não configurado.");

  if (process.env.SMTP_HOST) {
    await enviarPorSmtp(email, remetente);
  } else if (process.env.RESEND_API_KEY) {
    await enviarPeloResend(email, remetente, process.env.RESEND_API_KEY);
  } else if (process.env.MAILPIT_URL) {
    await enviarPeloMailpit(email, remetente, process.env.MAILPIT_URL);
  } else {
    throw new Error("Configure SMTP_HOST ou RESEND_API_KEY (produção) ou MAILPIT_URL (local).");
  }
}

// Porta 465: conexão já cifrada (Gmail, Resend); outras portas sobem para
// TLS quando o servidor oferece. Sem SMTP_USER, entra sem login (Mailpit).
async function enviarPorSmtp(email: Email, remetente: string) {
  const porta = Number(process.env.SMTP_PORT ?? 465);
  const transporte = createTransport({
    host: process.env.SMTP_HOST,
    port: porta,
    secure: porta === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transporte.sendMail({ from: remetente, to: email.para, subject: email.assunto, html: email.html, text: email.texto });
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
