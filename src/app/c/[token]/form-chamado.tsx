"use client";

import { CloudRain, Droplets, Ellipsis, Zap, type LucideIcon } from "lucide-react";
import { useActionState, useId, useState } from "react";

import { CampoFoto } from "@/components/campo-foto";
import { CampoTexto, LegendaObrigatorio } from "@/components/campo-texto";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIAS, type Categoria } from "@/lib/chamados/categorias";

import { abrirChamadoDoInquilino, type EstadoChamado } from "./actions";

const ICONES: Record<Categoria, LucideIcon> = {
  hidraulica: Droplets,
  eletrica: Zap,
  telhado: CloudRain,
  outros: Ellipsis,
};

// Depois de enviar, "Abrir outro pedido" remonta o formulário do zero.
export function PedidoDeConserto({ token }: { token: string }) {
  const [rodada, setRodada] = useState(0);
  return <FormChamado key={rodada} token={token} onNovoPedido={() => setRodada((r) => r + 1)} />;
}

function FormChamado({ token, onNovoPedido }: { token: string; onNovoPedido: () => void }) {
  const [estado, acao, pendente] = useActionState<EstadoChamado, FormData>(
    abrirChamadoDoInquilino,
    {},
  );
  // Ids únicos: o Next mantém a tela anterior montada (escondida) na navegação.
  const id = useId();

  if (estado.enviado) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="status" className="text-status-resolvido-foreground">
          Pedido enviado! Você acompanha o andamento aqui, em &quot;Seus pedidos&quot;.
        </p>
        <Button variant="outline" className="h-11 text-base" onClick={onNovoPedido}>
          Abrir outro pedido
        </Button>
      </div>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />
      <LegendaObrigatorio />

      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={estado.erros?.categoria ? `${id}-categoria-erro` : undefined}
      >
        <legend className="mb-2 text-sm font-semibold">
          Qual é o problema?
          <span aria-hidden="true" className="ml-0.5 text-destructive">
            *
          </span>
        </legend>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {CATEGORIAS.map(({ valor, rotulo, exemplos }) => {
            const Icone = ICONES[valor];
            return (
              <label
                key={valor}
                className="flex cursor-pointer flex-col gap-1 rounded-lg border bg-card p-3 has-checked:border-secondary-foreground has-checked:bg-secondary has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
              >
                <input
                  type="radio"
                  name="categoria"
                  value={valor}
                  defaultChecked={estado.valores?.categoria === valor}
                  required
                  className="sr-only"
                />
                <span className="flex items-center gap-2 font-semibold">
                  <Icone aria-hidden="true" className="size-5" />
                  {rotulo}
                </span>
                <span className="text-xs text-muted-foreground">{exemplos}</span>
              </label>
            );
          })}
        </div>
        {estado.erros?.categoria && (
          <p id={`${id}-categoria-erro`} className="text-sm text-destructive">
            {estado.erros.categoria}
          </p>
        )}
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-descricao`}>
          O que aconteceu?
          <span aria-hidden="true" className="-ml-1.5 text-destructive">
            *
          </span>
        </Label>
        <Textarea
          id={`${id}-descricao`}
          name="descricao"
          defaultValue={estado.valores?.descricao}
          placeholder="Ex.: A pia da cozinha está vazando por baixo desde ontem."
          maxLength={1000}
          rows={4}
          required
          aria-invalid={Boolean(estado.erros?.descricao)}
          aria-describedby={estado.erros?.descricao ? `${id}-descricao-erro` : undefined}
        />
        {estado.erros?.descricao && (
          <p id={`${id}-descricao-erro`} className="text-sm text-destructive">
            {estado.erros.descricao}
          </p>
        )}
      </div>

      {/* No computador: foto e horário lado a lado, com o "É urgente" embaixo. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-end">
        <CampoFoto id={`${id}-foto`} erroDoServidor={estado.erros?.foto} />

        <label className="flex cursor-pointer gap-3 rounded-lg border bg-card p-3 has-checked:border-status-urgente-foreground has-checked:bg-status-urgente lg:order-last lg:col-span-2">
          <input
            type="checkbox"
            name="urgente"
            defaultChecked={estado.valores?.urgente === "on"}
            className="mt-1 size-5 shrink-0 accent-status-urgente-foreground"
          />
          <span className="flex flex-col gap-1">
            <span className="font-semibold">É urgente</span>
            <span className="text-sm text-muted-foreground">
              Marque só se não dá para esperar: vazamento forte, falta de energia
              ou risco à segurança. O proprietário é avisado mesmo à noite.
            </span>
          </span>
        </label>

        <CampoTexto
          id={`${id}-horario`}
          nome="melhor_horario"
          rotulo="Melhor horário para o conserto (opcional)"
          valor={estado.valores?.melhor_horario}
          erro={estado.erros?.melhor_horario}
          placeholder="Ex.: dias úteis depois das 18h"
          maxLength={100}
        />
      </div>

      {estado.erroGeral && (
        <p role="alert" className="text-sm text-destructive">
          {estado.erroGeral}
        </p>
      )}

      <Button type="submit" disabled={pendente} className="h-11 w-full text-base lg:w-auto lg:self-end lg:px-8">
        {pendente ? "Enviando..." : "Enviar pedido"}
      </Button>
    </form>
  );
}
