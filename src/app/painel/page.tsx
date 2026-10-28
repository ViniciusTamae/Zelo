import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listarImoveis } from "@/lib/imoveis/dados";

export const metadata: Metadata = {
  title: "Painel | Zelo",
};

export default function PainelPage() {
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Seus imóveis</h1>
        <Link href="/painel/imoveis/novo" className={buttonVariants({ size: "lg" })}>
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
    <ul className="flex flex-col gap-3">
      {imoveis.map((imovel) => (
        <li key={imovel.id}>
          <Link href={`/painel/imoveis/${imovel.id}`} className="block">
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
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
