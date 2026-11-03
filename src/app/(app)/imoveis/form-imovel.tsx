"use client";

import Link from "next/link";
import { useActionState, useId, useRef, useState } from "react";

import { CampoTexto, LegendaObrigatorio } from "@/components/campo-texto";
import { Button, buttonVariants } from "@/components/ui/button";
import type { EstadoFormulario } from "@/lib/formularios";
import type { EnderecoDoCep } from "@/lib/imoveis/cep";

import { salvarImovel } from "./actions";
import { CampoCep } from "./campo-cep";
import { PreviaImovel } from "./previa-imovel";

type Props = {
  // Sem imóvel: cadastro novo. Com imóvel: edição.
  imovel?: {
    id: string;
    apelido: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    fotoUrl: string | null;
  };
};

const CAMPOS = ["apelido", "logradouro", "numero", "complemento", "bairro"] as const;
type Rascunho = Record<(typeof CAMPOS)[number], string>;

// Endereço da prévia, montado aos poucos enquanto a pessoa digita.
function enderecoDaPrevia({ logradouro, numero, complemento, bairro }: Rascunho) {
  const rua = [logradouro.trim(), numero.trim()].filter(Boolean).join(", ");
  return [rua, complemento.trim(), bairro.trim()].filter(Boolean).join(" - ");
}

export function FormImovel({ imovel }: Props) {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(
    salvarImovel,
    {},
  );
  // Ids únicos: o Next mantém a tela anterior montada (escondida) na navegação.
  const id = useId();
  const valores: Record<string, string | null> | undefined = estado.valores ?? imovel;
  const voltarPara = imovel ? `/imoveis/${imovel.id}` : "/imoveis";
  const formulario = useRef<HTMLFormElement>(null);

  // Prévia do cartão: começa com os dados do imóvel e acompanha o que é
  // digitado (lido do formulário a cada mudança).
  const [rascunho, setRascunho] = useState<Rascunho>(
    () => Object.fromEntries(CAMPOS.map((campo) => [campo, valores?.[campo] ?? ""])) as Rascunho,
  );
  const lerRascunho = (): Rascunho =>
    Object.fromEntries(
      CAMPOS.map((campo) => [
        campo,
        (formulario.current?.elements.namedItem(campo) as HTMLInputElement | null)?.value ?? "",
      ]),
    ) as Rascunho;

  // Preenche rua e bairro com o que o CEP trouxe (só o que veio) e leva a
  // pessoa ao próximo campo que falta: o número ou, sem rua, a própria rua.
  function preencherPeloCep({ logradouro, bairro }: EnderecoDoCep) {
    const campo = (nome: string) => formulario.current?.elements.namedItem(nome) as HTMLInputElement | null;
    if (logradouro) campo("logradouro")!.value = logradouro;
    if (bairro) campo("bairro")!.value = bairro;
    setRascunho(lerRascunho());
    campo(logradouro ? "numero" : "logradouro")?.focus();
  }

  function propsDoCampo(nome: string) {
    return {
      id: `${id}-${nome}`,
      nome,
      valor: valores?.[nome] ?? undefined,
      erro: estado.erros?.[nome],
    };
  }

  return (
    <form
      ref={formulario}
      action={acao}
      onInput={() => setRascunho(lerRascunho())}
      // No computador: dados à esquerda e a prévia do cartão à direita.
      className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-x-8"
    >
      {imovel && <input type="hidden" name="id" value={imovel.id} />}

      <div className="flex flex-col gap-6 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6">
        <div className="flex flex-col gap-3">
          <LegendaObrigatorio />
          <CampoTexto
            {...propsDoCampo("apelido")}
            rotulo="Apelido"
            ajuda="Um nome curto para você reconhecer o imóvel."
            placeholder="Ex.: Casa da Rua A"
            maxLength={60}
            required
            className="h-12 text-lg font-semibold placeholder:font-normal md:text-lg"
          />
        </div>

        <fieldset className="flex flex-col gap-4 border-t pt-6">
          {/* float + w-full: a legenda vira um item comum do flex (sem o
              posicionamento especial de <legend> na borda do fieldset). */}
          <legend className="float-left w-full">
            <span className="block text-base font-semibold">Endereço</span>
            <span className="block text-sm text-muted-foreground">
              Comece pelo CEP: a rua e o bairro são preenchidos para você.
            </span>
          </legend>

          <CampoCep id={`${id}-cep`} aoEncontrar={preencherPeloCep} />

          {/* Celular: rua; número e complemento; bairro. Computador: rua e
              número; complemento e bairro. */}
          <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-4 lg:grid-cols-6">
            <div className="col-span-2 lg:col-span-4">
              <CampoTexto
                {...propsDoCampo("logradouro")}
                rotulo="Rua"
                placeholder="Ex.: Rua das Flores"
                autoComplete="address-line1"
                maxLength={120}
                required
              />
            </div>
            <div className="lg:col-span-2">
              <CampoTexto
                {...propsDoCampo("numero")}
                rotulo="Número"
                placeholder="Ex.: 123"
                maxLength={10}
                required
              />
            </div>
            <div className="lg:col-span-3">
              <CampoTexto
                {...propsDoCampo("complemento")}
                rotulo="Complemento (opcional)"
                placeholder="Ex.: Casa 2, Apto 31"
                autoComplete="address-line2"
                maxLength={60}
              />
            </div>
            <div className="col-span-2 lg:col-span-3">
              <CampoTexto
                {...propsDoCampo("bairro")}
                rotulo="Bairro"
                placeholder="Ex.: Centro"
                maxLength={80}
                required
              />
            </div>
          </div>
        </fieldset>
      </div>

      <div className="lg:sticky lg:top-6 lg:row-span-2">
        <PreviaImovel
          id={`${id}-foto`}
          apelido={rascunho.apelido.trim()}
          endereco={enderecoDaPrevia(rascunho)}
          atual={imovel?.fotoUrl ? { url: imovel.fotoUrl, alt: `Foto atual de ${imovel.apelido}` } : null}
          erroDoServidor={estado.erros?.foto}
        />
      </div>

      <div className="flex flex-col gap-3">
        {estado.erroGeral && (
          <p role="alert" className="text-sm text-destructive">
            {estado.erroGeral}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button type="submit" disabled={pendente} className="h-11 px-6 text-base sm:min-w-44">
            {pendente ? "Salvando..." : imovel ? "Salvar alterações" : "Salvar imóvel"}
          </Button>
          <Link
            href={voltarPara}
            className={buttonVariants({ variant: "outline", className: "h-11 text-base sm:w-32" })}
          >
            Cancelar
          </Link>
        </div>
      </div>
    </form>
  );
}
