"use client";

import {
  Camera,
  CloudRain,
  Droplets,
  Ellipsis,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import { CampoTexto, LegendaObrigatorio } from "@/components/campo-texto";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIAS, type Categoria } from "@/lib/chamados/categorias";
import { TAMANHO_MAXIMO_FOTO } from "@/lib/chamados/esquemas";
import { reduzirFoto } from "@/lib/chamados/reduzir-foto";

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
        <div className="grid grid-cols-2 gap-2">
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

      <CampoFoto id={`${id}-foto`} erroDoServidor={estado.erros?.foto} />

      <label className="flex cursor-pointer gap-3 rounded-lg border bg-card p-3 has-checked:border-status-urgente-foreground has-checked:bg-status-urgente">
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

      {estado.erroGeral && (
        <p role="alert" className="text-sm text-destructive">
          {estado.erroGeral}
        </p>
      )}

      <Button type="submit" disabled={pendente} className="h-11 w-full text-base">
        {pendente ? "Enviando..." : "Enviar pedido"}
      </Button>
    </form>
  );
}

// Foto opcional: reduzida no próprio celular antes de ir para o formulário.
function CampoFoto({ id, erroDoServidor }: { id: string; erroDoServidor?: string }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Libera a memória da prévia anterior.
  useEffect(() => () => {
    if (previa) URL.revokeObjectURL(previa);
  }, [previa]);

  async function escolher(evento: React.ChangeEvent<HTMLInputElement>) {
    const original = evento.target.files?.[0];
    setErro(null);
    if (!original) return setPrevia(null);

    setPreparando(true);
    const reduzida = await reduzirFoto(original);
    setPreparando(false);

    if (reduzida.size > TAMANHO_MAXIMO_FOTO) {
      remover();
      setErro("A foto é muito grande. Tente tirar outra pela câmera.");
      return;
    }
    // Troca o arquivo do campo pela versão reduzida (é ela que vai no envio).
    const transferencia = new DataTransfer();
    transferencia.items.add(reduzida);
    evento.target.files = transferencia.files;
    setPrevia(URL.createObjectURL(reduzida));
  }

  function remover() {
    if (entrada.current) entrada.current.value = "";
    setPrevia(null);
  }

  const mensagem = erro ?? erroDoServidor;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Foto (opcional)</Label>
      <input
        ref={entrada}
        id={id}
        name="foto"
        type="file"
        accept="image/*"
        onChange={escolher}
        className="sr-only"
        aria-describedby={mensagem ? `${id}-erro` : undefined}
      />
      {previa ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:), não passa pelo otimizador */}
          <img src={previa} alt="Prévia da foto escolhida" className="max-h-48 rounded-lg border" />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={remover}
            aria-label="Remover foto"
            className="absolute top-2 right-2 bg-card"
          >
            <X />
          </Button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed bg-card text-base font-semibold"
        >
          <Camera aria-hidden="true" className="size-5" />
          {preparando ? "Preparando foto..." : "Tirar ou escolher foto"}
        </label>
      )}
      {mensagem && (
        <p id={`${id}-erro`} className="text-sm text-destructive">
          {mensagem}
        </p>
      )}
    </div>
  );
}
