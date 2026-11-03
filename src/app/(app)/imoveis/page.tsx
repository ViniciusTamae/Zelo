import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { FotoImovel } from "@/components/foto-imovel";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listarImoveis } from "@/lib/imoveis/dados";

export const metadata: Metadata = {
  title: "Imóveis | Zelo",
};

export default function ImoveisPage() {
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Seus imóveis</h1>
        <Link href="/imoveis/novo" className={buttonVariants({ size: "lg" })}>
          Novo imóvel
        </Link>
      </div>

      {/* Os dados são lidos na requisição: ficam atrás do Suspense. */}
      <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
        <ListaImoveis />
      </Suspense>
    </>
  );
}

async function ListaImoveis() {
  const imoveis = await listarImoveis();

  if (imoveis.length === 0) {
    return (
      <p className="text-muted-foreground">
        Você ainda não cadastrou imóveis. Comece pelo botão &quot;Novo imóvel&quot;.
      </p>
    );
  }

  return (
    // No computador, cartões em grade (3 por linha) com a foto em cima; no
    // celular, lista com a foto pequena à esquerda.
    <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-3">
      {imoveis.map((imovel) => (
        <li key={imovel.id}>
          <Link href={`/imoveis/${imovel.id}`} className="block h-full">
            <Card className="h-full flex-row items-center gap-0 pl-4 transition-colors hover:bg-muted/50 lg:flex-col lg:items-stretch lg:pt-0 lg:pl-0">
              {/* Envolvida: o Card trata <img> como primeiro filho de outro jeito
                  (tira o espaço de cima), o que desalinharia foto e imagem padrão. */}
              <div className="shrink-0 lg:w-full">
                <FotoImovel
                  url={imovel.fotoUrl}
                  apelido={imovel.apelido}
                  className="size-16 rounded-lg lg:aspect-video lg:size-auto lg:w-full lg:rounded-none"
                />
              </div>
              <CardHeader className="flex-1 lg:pt-4">
                <CardTitle>{imovel.apelido}</CardTitle>
                <CardDescription>{imovel.endereco}</CardDescription>
                <CardDescription>
                  {imovel.inquilinosAtivos === 1
                    ? "1 inquilino"
                    : `${imovel.inquilinosAtivos} inquilinos`}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
