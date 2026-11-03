"use client";

import { useActionState, useId } from "react";

import { CampoTexto } from "@/components/campo-texto";
import { useNotificarQuandoMudar } from "@/components/notificacoes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { ACOES, type StatusChamado } from "@/lib/chamados/transicoes";

import { mudarStatus } from "../actions";

// Botões de mudança de status, com recado e custo opcionais. Cada botão
// envia o status de destino; a regra das transições fica em lib e no banco.
export function AcoesChamado({ chamadoId, status }: { chamadoId: string; status: StatusChamado }) {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(mudarStatus, {});
  const id = useId();
  const acoes = ACOES[status];
  const podeResolver = acoes.some(({ para }) => para === "resolvido");
  // A confirmação vira notificação no computador (no celular fica aqui).
  useNotificarQuandoMudar(estado, estado.sucesso);

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="chamado_id" value={chamadoId} />

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-nota`}>Recado (opcional)</Label>
        <Textarea
          id={`${id}-nota`}
          name="nota"
          defaultValue={estado.valores?.nota}
          placeholder="Ex.: O encanador passa na sexta de manhã."
          maxLength={500}
          rows={2}
          aria-invalid={Boolean(estado.erros?.nota)}
        />
        <p className="text-sm text-muted-foreground">
          {estado.erros?.nota ?? "Fica registrado no histórico do chamado."}
        </p>
      </div>

      {podeResolver && (
        <CampoTexto
          id={`${id}-valor`}
          nome="valor"
          rotulo="Custo do conserto (opcional)"
          valor={estado.valores?.valor}
          erro={estado.erros?.valor}
          ajuda="Preencha ao marcar como resolvido. Ex.: 150 ou 1.234,56"
          inputMode="decimal"
          placeholder="R$"
        />
      )}

      {estado.erroGeral && (
        <p role="alert" className="text-sm text-destructive">
          {estado.erroGeral}
        </p>
      )}
      {estado.sucesso && (
        <p role="status" className="text-sm text-status-resolvido-foreground lg:hidden">
          {estado.sucesso}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {acoes.map(({ para, rotulo }, indice) => (
          <Button
            key={para}
            type="submit"
            name="status"
            value={para}
            disabled={pendente}
            // A cor do Zelo só na ação principal; reabrir não é a principal de nada.
            variant={indice === 0 && status !== "resolvido" ? "default" : "outline"}
            className="h-11 text-base"
          >
            {rotulo}
          </Button>
        ))}
      </div>
    </form>
  );
}
