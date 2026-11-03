"use client";

import { Camera, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TAMANHO_MAXIMO_FOTO } from "@/lib/chamados/esquemas";
import { reduzirFoto } from "@/lib/chamados/reduzir-foto";

// Estado da foto escolhida num formulário: reduz no próprio aparelho antes do
// envio, guarda a prévia e marca a foto já salva para remover. Usado pelo
// campo abaixo (chamado do inquilino) e pela prévia do cadastro de imóvel.
export function useFotoEscolhida() {
  const entrada = useRef<HTMLInputElement>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [removeuAtual, setRemoveuAtual] = useState(false);
  const [preparando, setPreparando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Libera a memória da prévia anterior.
  useEffect(() => () => {
    if (previa) URL.revokeObjectURL(previa);
  }, [previa]);

  // Recebe o arquivo escolhido (pelo seletor ou arrastado) e troca o arquivo
  // do campo pela versão reduzida, que é a que vai no envio.
  async function receber(original: File | undefined) {
    setErro(null);
    if (!original) return setPrevia(null);

    setPreparando(true);
    const reduzida = await reduzirFoto(original);
    setPreparando(false);

    if (reduzida.size > TAMANHO_MAXIMO_FOTO) {
      limparEscolha();
      setErro("A foto é muito grande. Tente tirar outra pela câmera.");
      return;
    }
    const transferencia = new DataTransfer();
    transferencia.items.add(reduzida);
    if (entrada.current) entrada.current.files = transferencia.files;
    setPrevia(URL.createObjectURL(reduzida));
  }

  function limparEscolha() {
    if (entrada.current) entrada.current.value = "";
    setPrevia(null);
  }

  // Tira a foto nova escolhida; sem foto nova, marca a salva para remover.
  function remover() {
    if (previa) limparEscolha();
    else setRemoveuAtual(true);
  }

  return { entrada, previa, removeuAtual, preparando, erro, receber, remover };
}

// Foto opcional de um formulário: com `atual`, o campo começa mostrando a
// foto já salva; remover manda `remover_foto=1`.
export function CampoFoto({
  id,
  erroDoServidor,
  textoBotao = "Tirar ou escolher foto",
  atual,
}: {
  id: string;
  erroDoServidor?: string;
  textoBotao?: string;
  atual?: { url: string; alt: string } | null;
}) {
  const { entrada, previa, removeuAtual, preparando, erro, receber, remover } = useFotoEscolhida();

  const mensagem = erro ?? erroDoServidor;
  const mostrarAtual = !previa && atual && !removeuAtual;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Foto (opcional)</Label>
      <input
        ref={entrada}
        id={id}
        name="foto"
        type="file"
        accept="image/*"
        onChange={(evento) => receber(evento.target.files?.[0])}
        className="sr-only"
        aria-describedby={mensagem ? `${id}-erro` : undefined}
      />
      {removeuAtual && !previa && <input type="hidden" name="remover_foto" value="1" />}
      {previa || mostrarAtual ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) ou link assinado do Storage privado */}
            <img
              src={previa ?? atual!.url}
              alt={previa ? "Prévia da foto escolhida" : atual!.alt}
              className="max-h-48 rounded-lg border"
            />
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
          {mostrarAtual && (
            <label htmlFor={id} className="cursor-pointer text-sm font-semibold underline">
              Trocar foto
            </label>
          )}
        </div>
      ) : (
        <label
          htmlFor={id}
          className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed bg-card text-base font-semibold"
        >
          <Camera aria-hidden="true" className="size-5" />
          {preparando ? "Preparando foto..." : textoBotao}
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
