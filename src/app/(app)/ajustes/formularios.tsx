"use client";

import { useActionState, useId } from "react";

import { CampoTexto } from "@/components/campo-texto";
import { useNotificarQuandoMudar } from "@/components/notificacoes";
import { Button } from "@/components/ui/button";
import type { EstadoFormulario } from "@/lib/formularios";

import { salvarNome, salvarSilencio } from "./actions";

// Erro fica junto do formulário; a confirmação vira notificação no computador.
function Retorno({ estado }: { estado: EstadoFormulario }) {
  useNotificarQuandoMudar(estado, estado.sucesso);
  if (estado.erroGeral) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {estado.erroGeral}
      </p>
    );
  }
  if (estado.sucesso) {
    return (
      <p role="status" className="text-sm text-status-resolvido-foreground lg:hidden">
        {estado.sucesso}
      </p>
    );
  }
  return null;
}

export function FormNome({ nome }: { nome: string }) {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(salvarNome, {});
  const id = useId();
  return (
    <form action={acao} className="flex flex-col gap-3">
      <CampoTexto
        id={`${id}-nome`}
        nome="nome"
        rotulo="Nome"
        valor={estado.valores?.nome ?? nome}
        erro={estado.erros?.nome}
        autoComplete="name"
        maxLength={80}
        required
      />
      <Retorno estado={estado} />
      <Button type="submit" variant="outline" disabled={pendente} className="h-11 text-base lg:self-end lg:px-6">
        {pendente ? "Salvando..." : "Salvar nome"}
      </Button>
    </form>
  );
}

export function FormSilencio({ inicio, fim }: { inicio: string; fim: string }) {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(salvarSilencio, {});
  const id = useId();
  return (
    <form action={acao} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <CampoTexto
          id={`${id}-inicio`}
          nome="silencio_inicio"
          rotulo="Das"
          type="time"
          valor={estado.valores?.silencio_inicio ?? inicio}
          erro={estado.erros?.silencio_inicio}
          required
        />
        <CampoTexto
          id={`${id}-fim`}
          nome="silencio_fim"
          rotulo="Até"
          type="time"
          valor={estado.valores?.silencio_fim ?? fim}
          erro={estado.erros?.silencio_fim}
          required
        />
      </div>
      <Retorno estado={estado} />
      <Button type="submit" variant="outline" disabled={pendente} className="h-11 text-base lg:self-end lg:px-6">
        {pendente ? "Salvando..." : "Salvar horário"}
      </Button>
    </form>
  );
}
