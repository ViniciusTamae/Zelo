import type { Metadata } from "next";
import { after } from "next/server";
import { Suspense } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buscarInquilinoPeloLink, registrarAcesso } from "@/lib/inquilinos/acesso";

import { FormPerdiLink } from "./form-perdi-link";

export const metadata: Metadata = {
  title: "Zelo",
  // Link pessoal: não deve aparecer em buscadores.
  robots: { index: false, follow: false },
};

// Página do inquilino, aberta pelo link exclusivo (sem login).
export default function PaginaDoInquilino({ params }: PageProps<"/c/[token]">) {
  return (
    <main className="flex flex-1 flex-col items-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <p className="text-2xl font-semibold">Zelo</p>
        <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
          <Conteudo params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function Conteudo({ params }: Pick<PageProps<"/c/[token]">, "params">) {
  const { token } = await params;
  const inquilino = await buscarInquilinoPeloLink(token);

  if (!inquilino) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Este link não funciona mais</CardTitle>
          <CardDescription>
            Ele pode ter sido trocado por um novo ou desativado pelo proprietário.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <h2 className="font-semibold">Perdi meu link</h2>
          <FormPerdiLink />
        </CardContent>
      </Card>
    );
  }

  // Registra o "Visto em" depois de responder, sem atrasar a página.
  after(() => registrarAcesso(inquilino.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Olá, {inquilino.nome}!</CardTitle>
        <CardDescription>Imóvel: {inquilino.apelidoImovel}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Por este link você vai pedir consertos ao proprietário, sem senha. Guarde
          este endereço nos favoritos do celular.
        </p>
      </CardContent>
    </Card>
  );
}
