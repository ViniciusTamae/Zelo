"use client";

import { useActionState, useId } from "react";

import { CampoTexto } from "@/components/campo-texto";
import { Button } from "@/components/ui/button";

import { pedirNovoLink, type EstadoPerdiLink } from "./actions";

export function FormPerdiLink() {
  const [estado, acao, pendente] = useActionState<EstadoPerdiLink, FormData>(pedirNovoLink, {});
  // Ids únicos: o Next mantém a tela anterior montada (escondida) na navegação.
  const id = useId();

  if (estado.enviado) {
    return (
      <p role="status" className="text-status-resolvido-foreground">
        Se o e-mail estiver cadastrado, enviamos o link. Confira sua caixa de
        entrada (e o spam) nos próximos minutos.
      </p>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-4">
      <CampoTexto
        id={`${id}-email`}
        nome="email"
        rotulo="Seu e-mail"
        valor={estado.email}
        erro={estado.erro}
        ajuda="O mesmo e-mail que o proprietário cadastrou para você."
        type="email"
        inputMode="email"
        autoComplete="email"
        required
      />
      <Button type="submit" disabled={pendente} className="h-11 w-full text-base">
        {pendente ? "Enviando..." : "Receber meu link por e-mail"}
      </Button>
    </form>
  );
}
