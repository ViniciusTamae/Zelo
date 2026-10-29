"use client";

import { Star } from "lucide-react";
import { useActionState, useId } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";

const ROTULOS = ["", "Muito ruim", "Ruim", "Regular", "Bom", "Ótimo"];

// Pesquisa de satisfação: nota de 1 a 5 (estrelas) e comentário opcional.
// Usada na página do link de avaliação (e-mail) e na página de pedidos do inquilino.
export function FormAvaliacao({
  acao: acaoDoServidor,
  campos,
}: {
  acao: (anterior: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  campos: Record<string, string>;
}) {
  const [estado, acao, pendente] = useActionState(acaoDoServidor, {});
  const id = useId();

  if (estado.sucesso) {
    return (
      <p role="status" className="text-status-resolvido-foreground">
        {estado.sucesso}
      </p>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-4">
      {Object.entries(campos).map(([nome, valor]) => (
        <input key={nome} type="hidden" name={nome} value={valor} />
      ))}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">Como ficou o conserto?</legend>
        {/* Estrelas: no HTML vêm de 5 a 1 e o flex-row-reverse mostra de 1 a 5.
            Assim, "label marcado ~ label" pega as estrelas menores: marcar a 4
            acende de 1 a 4 (o mesmo vale para o mouse por cima). */}
        <div className="flex w-fit flex-row-reverse justify-end gap-1">
          {[5, 4, 3, 2, 1].map((nota) => (
            <label
              key={nota}
              className="cursor-pointer text-muted-foreground hover:text-amber-500 has-checked:text-amber-500 has-focus-visible:rounded has-focus-visible:ring-3 has-focus-visible:ring-ring/50 [label:has(:checked)~&]:text-amber-500 [label:hover~&]:text-amber-500"
            >
              <input
                type="radio"
                name="nota"
                value={nota}
                defaultChecked={estado.valores?.nota === String(nota)}
                required
                className="sr-only"
                aria-label={`${nota} de 5: ${ROTULOS[nota]}`}
              />
              <Star aria-hidden="true" className="size-9 fill-current" />
            </label>
          ))}
        </div>
        {estado.erros?.nota && <p className="text-sm text-destructive">{estado.erros.nota}</p>}
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-comentario`}>Comentário (opcional)</Label>
        <Textarea
          id={`${id}-comentario`}
          name="comentario"
          defaultValue={estado.valores?.comentario}
          placeholder="Ex.: Resolveram rápido e deixaram tudo limpo."
          maxLength={500}
          rows={3}
        />
      </div>

      {estado.erroGeral && (
        <p role="alert" className="text-sm text-destructive">
          {estado.erroGeral}
        </p>
      )}

      <Button type="submit" disabled={pendente} className="h-11 text-base">
        {pendente ? "Enviando..." : "Enviar avaliação"}
      </Button>
    </form>
  );
}
