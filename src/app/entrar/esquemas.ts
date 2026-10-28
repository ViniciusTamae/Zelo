import { z } from "zod";

// Limpa espaços e maiúsculas antes de validar (teclados de celular costumam
// deixar espaço no fim ou começar com letra maiúscula).
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Informe um e-mail válido."));

export const codigoSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "O código tem 6 números.");

// Estado do fluxo de login, devolvido para o formulário só exibir.
// `envio` muda a cada código enviado: é ele que reinicia a espera do "Reenviar".
export type EstadoEntrar =
  | { etapa: "email"; email?: string; erro?: string }
  | {
      etapa: "codigo";
      email: string;
      codigo?: string;
      envio?: string;
      erro?: string;
      aviso?: string;
    };

// Botão do e-mail: abre /entrar?email=...&codigo=... já na etapa do código e
// com o campo preenchido. O login só acontece quando a pessoa toca em "Entrar",
// assim a prévia automática do leitor de e-mail não gasta o código.
export function estadoDoLink(params: {
  email?: string | string[];
  codigo?: string | string[];
}): EstadoEntrar {
  const email = emailSchema.safeParse(params.email);
  if (!email.success) return { etapa: "email" };

  const codigo = codigoSchema.safeParse(params.codigo);
  return {
    etapa: "codigo",
    email: email.data,
    codigo: codigo.success ? codigo.data : undefined,
  };
}
