"use client";

import { useEffect, useId, useRef, useState } from "react";

import { CampoTexto } from "@/components/campo-texto";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { mudarStatus } from "./actions";

// Janela de "Marcar como resolvido" ao soltar o cartão na coluna Resolvidos:
// recado e custo opcionais, como no painel do detalhe. Usa o <dialog> do
// navegador, que já cuida do foco, do Esc e de bloquear o fundo.
export function DialogoResolver({
  chamadoId,
  titulo,
  aoFechar,
}: {
  chamadoId: string;
  titulo: string;
  aoFechar: (resolvido: boolean) => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    dialogo.current?.showModal();
  }, []);

  async function salvar(formulario: FormData) {
    setSalvando(true);
    formulario.set("chamado_id", chamadoId);
    formulario.set("status", "resolvido");
    const resultado = await mudarStatus({}, formulario);
    setSalvando(false);
    if (resultado.sucesso) {
      aoFechar(true);
      return;
    }
    setErros(resultado.erros ?? {});
    setErroGeral(resultado.erroGeral ?? null);
  }

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={`${id}-titulo`}
      onClose={() => aoFechar(false)}
      className="m-auto w-full max-w-md rounded-xl border bg-card p-6 text-card-foreground shadow-xl backdrop:bg-background/70 backdrop:backdrop-blur-[2px]"
    >
      <form action={salvar} className="flex flex-col gap-4">
        <div>
          <h2 id={`${id}-titulo`} className="text-lg font-semibold">
            Marcar como resolvido
          </h2>
          <p className="text-sm text-muted-foreground">{titulo}</p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-nota`}>Recado (opcional)</Label>
          <Textarea
            id={`${id}-nota`}
            name="nota"
            placeholder="Ex.: Trocamos o sifão e a vedação."
            maxLength={500}
            rows={2}
            autoFocus
          />
        </div>

        <CampoTexto
          id={`${id}-valor`}
          nome="valor"
          rotulo="Custo do conserto (opcional)"
          erro={erros.valor}
          ajuda="Ex.: 150 ou 1.234,56"
          inputMode="decimal"
          placeholder="R$"
        />

        {erroGeral && (
          <p role="alert" className="text-sm text-destructive">
            {erroGeral}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" className="h-11" onClick={() => dialogo.current?.close()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando} className="h-11">
            {salvando ? "Salvando..." : "Marcar como resolvido"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
