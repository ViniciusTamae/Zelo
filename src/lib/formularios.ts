import type { z } from "zod";

// Estado devolvido pelas Server Actions de formulário; o componente só exibe.
export type EstadoFormulario = {
  erros?: Record<string, string>;
  erroGeral?: string;
  sucesso?: string;
  // Valores digitados, para o formulário não perder o que a pessoa escreveu.
  valores?: Record<string, string>;
};

export function lerCampos(formData: FormData, campos: readonly string[]) {
  return Object.fromEntries(
    campos.map((campo) => [campo, String(formData.get(campo) ?? "")]),
  );
}

// Primeira mensagem de erro de cada campo.
export function errosPorCampo(erro: z.ZodError) {
  const erros: Record<string, string> = {};
  for (const issue of erro.issues) {
    const campo = String(issue.path[0] ?? "");
    erros[campo] ??= issue.message;
  }
  return erros;
}
