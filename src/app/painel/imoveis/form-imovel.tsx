"use client";

import Link from "next/link";
import { useActionState, useId } from "react";

import { CampoTexto, LegendaObrigatorio } from "@/components/campo-texto";
import { Button, buttonVariants } from "@/components/ui/button";
import type { EstadoFormulario } from "@/lib/formularios";

import { salvarImovel } from "./actions";

type Props = {
  // Sem imóvel: cadastro novo. Com imóvel: edição.
  imovel?: {
    id: string;
    apelido: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
  };
};

export function FormImovel({ imovel }: Props) {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(
    salvarImovel,
    {},
  );
  // Ids únicos: o Next mantém a tela anterior montada (escondida) na navegação.
  const id = useId();
  const valores: Record<string, string> | undefined = estado.valores ?? imovel;
  const voltarPara = imovel ? `/painel/imoveis/${imovel.id}` : "/painel";

  function propsDoCampo(nome: string) {
    return {
      id: `${id}-${nome}`,
      nome,
      valor: valores?.[nome],
      erro: estado.erros?.[nome],
    };
  }

  return (
    <form action={acao} className="flex flex-col gap-5">
      {imovel && <input type="hidden" name="id" value={imovel.id} />}
      <LegendaObrigatorio />

      <CampoTexto
        {...propsDoCampo("apelido")}
        rotulo="Apelido"
        ajuda="Um nome curto para você reconhecer o imóvel."
        placeholder="Ex.: Casa da Rua A"
        maxLength={60}
        required
      />

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-sm font-semibold">Endereço</legend>

        <CampoTexto
          {...propsDoCampo("logradouro")}
          rotulo="Rua"
          placeholder="Ex.: Rua das Flores"
          autoComplete="address-line1"
          maxLength={120}
          required
        />

        <div className="grid grid-cols-[7rem_1fr] gap-3">
          <CampoTexto
            {...propsDoCampo("numero")}
            rotulo="Número"
            placeholder="Ex.: 123"
            maxLength={10}
            required
          />
          <CampoTexto
            {...propsDoCampo("complemento")}
            rotulo="Complemento (opcional)"
            placeholder="Ex.: Casa 2, Apto 31"
            autoComplete="address-line2"
            maxLength={60}
          />
        </div>

        <CampoTexto
          {...propsDoCampo("bairro")}
          rotulo="Bairro"
          placeholder="Ex.: Centro"
          maxLength={80}
          required
        />
      </fieldset>

      {estado.erroGeral && (
        <p role="alert" className="text-sm text-destructive">
          {estado.erroGeral}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button type="submit" disabled={pendente} className="h-11 text-base sm:w-40">
          {pendente ? "Salvando..." : "Salvar"}
        </Button>
        <Link
          href={voltarPara}
          className={buttonVariants({ variant: "outline", className: "h-11 text-base sm:w-40" })}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
