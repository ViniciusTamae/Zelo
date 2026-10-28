"use client";

import { useActionState, useId } from "react";

import { CampoTexto, LegendaObrigatorio } from "@/components/campo-texto";
import { Button } from "@/components/ui/button";
import { mensagemDoLink } from "@/lib/links";

import { adicionarInquilino, type EstadoInquilino } from "../actions";
import { LinkGerado } from "./link-gerado";

export function FormInquilino({ imovelId, apelido }: { imovelId: string; apelido: string }) {
  const [estado, acao, pendente] = useActionState<EstadoInquilino, FormData>(
    adicionarInquilino,
    {},
  );

  // Ids únicos: o Next mantém a tela anterior montada (escondida) na navegação.
  const id = useId();

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="imovel_id" value={imovelId} />
      <LegendaObrigatorio />

      <CampoTexto
        id={`${id}-nome`}
        nome="nome"
        rotulo="Nome"
        valor={estado.valores?.nome}
        erro={estado.erros?.nome}
        autoComplete="off"
        maxLength={80}
        required
      />

      <CampoTexto
        id={`${id}-email`}
        nome="email"
        rotulo="E-mail (opcional)"
        valor={estado.valores?.email}
        erro={estado.erros?.email}
        ajuda="Usado só para avisar o inquilino sobre o andamento dos pedidos."
        type="email"
        inputMode="email"
        autoComplete="off"
      />

      {estado.erroGeral && (
        <p role="alert" className="text-sm text-destructive">
          {estado.erroGeral}
        </p>
      )}
      {estado.sucesso && (
        <p role="status" className="text-sm text-status-resolvido-foreground">
          {estado.sucesso}
        </p>
      )}
      {estado.adicionado && (
        <LinkGerado
          link={estado.adicionado.link}
          mensagem={mensagemDoLink(estado.adicionado.nome, apelido)}
        />
      )}

      <Button type="submit" disabled={pendente} className="h-11 text-base">
        {pendente ? "Adicionando..." : "Adicionar inquilino"}
      </Button>
    </form>
  );
}
