"use server";

import { redirect } from "next/navigation";

import { obterProprietario } from "@/lib/auth";
import { errosPorCampo, lerCampos, type EstadoFormulario } from "@/lib/formularios";
import { nomeProprietarioSchema } from "@/lib/proprietarios/esquemas";
import { createClient } from "@/lib/supabase/server";

// Grava o nome informado no primeiro acesso e abre o app.
export async function salvarNome(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const proprietario = await obterProprietario();
  const valores = lerCampos(formData, ["nome"]);

  const dados = nomeProprietarioSchema.safeParse(valores);
  if (!dados.success) {
    return { erros: errosPorCampo(dados.error), valores };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("proprietarios")
    .update({ nome: dados.data.nome })
    .eq("id", proprietario.id);

  if (error) {
    return { erroGeral: "Não foi possível salvar agora. Tente de novo.", valores };
  }

  redirect("/chamados");
}
