"use client";

import { useActionState, useId } from "react";

import { CampoTexto } from "@/components/campo-texto";
import { Button } from "@/components/ui/button";
import type { EstadoFormulario } from "@/lib/formularios";

import { salvarNome } from "./actions";

export function FormNome() {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(salvarNome, {});
  // Ids únicos: o Next mantém a tela anterior montada (escondida) na navegação.
  const id = useId();

  return (
    <form action={acao} className="flex flex-col gap-4">
      <CampoTexto
        id={`${id}-nome`}
        nome="nome"
        rotulo="Seu nome"
        valor={estado.valores?.nome}
        erro={estado.erros?.nome}
        ajuda="Aparece para os seus inquilinos nos avisos sobre os pedidos."
        autoComplete="name"
        autoFocus
        maxLength={80}
        required
      />

      {estado.erroGeral && (
        <p role="alert" className="text-sm text-destructive">
          {estado.erroGeral}
        </p>
      )}

      <Button type="submit" disabled={pendente} className="h-11 w-full text-base">
        {pendente ? "Salvando..." : "Continuar"}
      </Button>
    </form>
  );
}
