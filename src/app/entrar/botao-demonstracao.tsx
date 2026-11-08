"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { entrarNaDemonstracao } from "./actions";

// Para quem só quer conhecer o app: entra numa conta de exemplo já cheia.
export function BotaoDemonstracao() {
  const [estado, acao, pendente] = useActionState(entrarNaDemonstracao, {});

  return (
    <form action={acao} aria-label="Demonstração" className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-sm text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>
      <p className="text-sm text-muted-foreground">
        Só quer conhecer? Entre numa conta de exemplo, já com imóveis, chamados e gastos.
      </p>
      {estado.erro && (
        <p role="alert" className="text-sm text-destructive">
          {estado.erro}
        </p>
      )}
      <Button type="submit" variant="outline" disabled={pendente} className="h-11 w-full text-base">
        {pendente ? "Abrindo..." : "Entrar na demonstração"}
      </Button>
    </form>
  );
}
