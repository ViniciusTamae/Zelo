import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue({});
  return { sendMail, createTransport: vi.fn(() => ({ sendMail })) };
});
vi.mock("server-only", () => ({}));
vi.mock("nodemailer", () => ({ createTransport }));

import { enviarEmail } from "./enviar";

const EMAIL = { para: "maria@exemplo.com", assunto: "Assunto", html: "<p>Oi</p>", texto: "Oi" };

describe("enviarEmail", () => {
  const fetchOriginal = globalThis.fetch;
  beforeEach(() => {
    vi.unstubAllEnvs();
    for (const nome of ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "RESEND_API_KEY", "MAILPIT_URL", "RESEND_FROM", "EMAIL_FROM"]) {
      vi.stubEnv(nome, undefined as unknown as string);
    }
    vi.clearAllMocks();
  });
  afterEach(() => {
    globalThis.fetch = fetchOriginal;
    vi.unstubAllEnvs();
  });

  it("com SMTP configurado, envia por SMTP (465 cifrado, com login)", async () => {
    vi.stubEnv("EMAIL_FROM", "Zelo <zelo@gmail.com>");
    vi.stubEnv("SMTP_HOST", "smtp.gmail.com");
    vi.stubEnv("SMTP_USER", "zelo@gmail.com");
    vi.stubEnv("SMTP_PASS", "senha-de-app");
    vi.stubEnv("RESEND_API_KEY", "re_123");
    globalThis.fetch = vi.fn();

    await enviarEmail(EMAIL);

    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: "zelo@gmail.com", pass: "senha-de-app" },
    });
    expect(sendMail).toHaveBeenCalledWith({
      from: "Zelo <zelo@gmail.com>",
      to: "maria@exemplo.com",
      subject: "Assunto",
      html: "<p>Oi</p>",
      text: "Oi",
    });
    // SMTP tem prioridade sobre o Resend.
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("SMTP sem login e em outra porta (ex.: Mailpit) não força TLS", async () => {
    vi.stubEnv("RESEND_FROM", "Zelo <avisos@zelo.test>");
    vi.stubEnv("SMTP_HOST", "127.0.0.1");
    vi.stubEnv("SMTP_PORT", "54325");
    await enviarEmail(EMAIL);
    expect(createTransport).toHaveBeenCalledWith({ host: "127.0.0.1", port: 54325, secure: false, auth: undefined });
  });

  it("sem SMTP, usa o Resend", async () => {
    vi.stubEnv("EMAIL_FROM", "Zelo <avisos@zelo.app>");
    vi.stubEnv("RESEND_API_KEY", "re_123");
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    await enviarEmail(EMAIL);
    expect(createTransport).not.toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
  });

  it("sem remetente, recusa", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.gmail.com");
    await expect(enviarEmail(EMAIL)).rejects.toThrow("EMAIL_FROM não configurado.");
  });
});
