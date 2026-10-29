"use server";

import { refresh } from "next/cache";

import { obterProprietario } from "@/lib/auth";
import { mudancaStatusSchema } from "@/lib/chamados/esquemas";
import { errosPorCampo, lerCampos, type EstadoFormulario } from "@/lib/formularios";
import { createClient } from "@/lib/supabase/server";

const MENSAGEM: Record<string, string> = {
  em_andamento: "Atendimento iniciado.",
  resolvido: "Chamado marcado como resolvido.",
};

// Muda o status de um chamado. A transição é conferida no banco
// (public.mudar_status_chamado), junto com o registro no histórico.
export async function mudarStatus(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await obterProprietario();
  const valores = lerCampos(formData, ["chamado_id", "status", "nota", "valor"]);

  const dados = mudancaStatusSchema.safeParse(valores);
  if (!dados.success) return { erros: errosPorCampo(dados.error), valores };

  const supabase = await createClient();
  const { error } = await supabase.rpc("mudar_status_chamado", {
    chamado: dados.data.chamado_id,
    novo_status: dados.data.status,
    nota: dados.data.nota ?? undefined,
    valor: dados.data.valor ?? undefined,
  });

  if (error) {
    // 22023: transição inválida (o chamado mudou em outra tela); P0002: não existe para este dono.
    const erroGeral =
      error.code === "22023"
        ? "Este chamado mudou enquanto a tela estava aberta. Atualize a página."
        : error.code === "P0002"
          ? "Chamado não encontrado."
          : "Não foi possível salvar agora. Tente de novo.";
    return { erroGeral, valores };
  }

  refresh();
  return { sucesso: MENSAGEM[dados.data.status] ?? "Chamado reaberto." };
}
