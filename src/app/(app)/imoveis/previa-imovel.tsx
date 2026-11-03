"use client";

import { ImagePlus, X } from "lucide-react";
import { useState } from "react";
import { cn } from "cn";

import { useFotoEscolhida } from "@/components/campo-foto";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Prévia do cartão do imóvel no cadastro: o mesmo cartão de "Seus imóveis",
// com o apelido e o endereço mudando enquanto a pessoa digita. O espaço da
// foto é onde ela escolhe a foto (clicando ou arrastando um arquivo).
export function PreviaImovel({
  id,
  apelido,
  endereco,
  atual,
  erroDoServidor,
}: {
  id: string;
  apelido: string;
  endereco: string;
  atual: { url: string; alt: string } | null;
  erroDoServidor?: string;
}) {
  const { entrada, previa, removeuAtual, preparando, erro, receber, remover } = useFotoEscolhida();
  const [arrastando, setArrastando] = useState(false);

  const imagem = previa
    ? { url: previa, alt: "Prévia da foto escolhida" }
    : atual && !removeuAtual
      ? atual
      : null;
  const mensagem = erro ?? erroDoServidor;

  function soltar(evento: React.DragEvent) {
    evento.preventDefault();
    setArrastando(false);
    const arquivo = evento.dataTransfer.files[0];
    if (arquivo?.type.startsWith("image/")) receber(arquivo);
  }

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
        className="peer sr-only"
        aria-describedby={mensagem ? `${id}-erro` : `${id}-dica`}
      />
      {removeuAtual && !previa && <input type="hidden" name="remover_foto" value="1" />}

      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
        <div className="relative aspect-video">
          {imagem ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) ou link assinado do Storage privado */}
              <img src={imagem.url} alt={imagem.alt} className="size-full object-cover" />
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
              <label
                htmlFor={id}
                className="absolute bottom-2 left-2 cursor-pointer rounded-md bg-card/90 px-2.5 py-1 text-sm font-semibold shadow-xs hover:bg-card"
              >
                Trocar foto
              </label>
            </>
          ) : (
            <label
              htmlFor={id}
              onDragOver={(evento) => {
                evento.preventDefault();
                setArrastando(true);
              }}
              onDragLeave={() => setArrastando(false)}
              onDrop={soltar}
              className={cn(
                "flex size-full cursor-pointer flex-col items-center justify-center gap-2 bg-secondary/70 px-6 text-center text-secondary-foreground transition-colors hover:bg-secondary",
                arrastando && "bg-secondary ring-2 ring-primary ring-inset",
              )}
            >
              <ImagePlus aria-hidden="true" className="size-8" strokeWidth={1.5} />
              <span className="font-semibold">{preparando ? "Preparando foto..." : "Adicionar foto da fachada"}</span>
              <span className="text-xs opacity-80">
                <span className="lg:hidden">Toque para tirar ou escolher uma foto</span>
                <span className="hidden lg:inline">Clique para escolher ou arraste a foto para cá</span>
              </span>
            </label>
          )}
        </div>
        <div className="flex flex-col gap-1 p-4">
          <p className={cn("font-semibold", !apelido && "text-muted-foreground")}>{apelido || "Apelido do imóvel"}</p>
          <p className="text-sm text-muted-foreground">{endereco || "Rua, número - bairro"}</p>
        </div>
      </div>

      {mensagem ? (
        <p id={`${id}-erro`} className="text-sm text-destructive">
          {mensagem}
        </p>
      ) : (
        <p id={`${id}-dica`} className="text-sm text-muted-foreground">
          É assim que ele aparece em Seus imóveis.
        </p>
      )}
    </div>
  );
}
