"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { gerarNovoLink, type EstadoNovoLink } from "../actions";
import { LinkGerado } from "./link-gerado";

export function NovoLink({ inquilinoId, mensagem }: { inquilinoId: string; mensagem: string }) {
  const [estado, acao, pendente] = useActionState<EstadoNovoLink, FormData>(gerarNovoLink, {});

  if (estado.link) {
    return (
      <div className="flex flex-col gap-2">
        <p role="status" className="text-sm text-status-resolvido-foreground">
          Novo link gerado. O anterior parou de funcionar. Compartilhe agora: ele
          só aparece desta vez.
        </p>
        <LinkGerado link={estado.link} mensagem={mensagem} />
      </div>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={inquilinoId} />
      <Button type="submit" variant="outline" disabled={pendente} className="h-10">
        {pendente ? "Gerando..." : "Gerar e compartilhar novo link"}
      </Button>
      <span className="text-sm text-muted-foreground">
        Por segurança, o link só aparece na hora em que é gerado. Gerar um novo
        desativa o anterior.
      </span>
      {estado.erro && (
        <p role="alert" className="text-sm text-destructive">
          {estado.erro}
        </p>
      )}
    </form>
  );
}
