"use server";

import { avaliarPeloEmail } from "@/lib/chamados/avaliacao";
import { AGRADECIMENTO_AVALIACAO, avaliacaoSchema } from "@/lib/chamados/esquemas";
import { errosPorCampo, lerCampos, type EstadoFormulario } from "@/lib/formularios";

// Avaliação pelo link de uso único do e-mail "Seu pedido foi resolvido".
export async function avaliarPeloLinkDoEmail(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const valores = lerCampos(formData, ["nota", "comentario"]);
  const dados = avaliacaoSchema.safeParse(valores);
  if (!dados.success) return { erros: errosPorCampo(dados.error), valores };

  try {
    const ok = await avaliarPeloEmail(String(formData.get("token") ?? ""), dados.data);
    if (!ok) return { erroGeral: "Este link de avaliação não vale mais.", valores };
  } catch (erro) {
    console.error("Falha ao registrar avaliação:", erro);
    return { erroGeral: "Não foi possível enviar agora. Tente de novo.", valores };
  }
  return { sucesso: AGRADECIMENTO_AVALIACAO };
}
