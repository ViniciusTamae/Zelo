import type { Metadata } from "next";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { obterProprietario } from "@/lib/auth";

import { sair } from "./actions";

export const metadata: Metadata = {
  title: "Painel | Zelo",
};

export default function PainelPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-lg font-semibold">Zelo</span>
        <form action={sair}>
          <Button type="submit" variant="ghost">
            Sair
          </Button>
        </form>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-4 py-6">
        {/* A sessão é lida na requisição: fica atrás do Suspense. */}
        <Suspense
          fallback={<p className="text-muted-foreground">Carregando...</p>}
        >
          <Saudacao />
        </Suspense>
        <p className="text-muted-foreground">
          Seus imóveis e chamados vão aparecer aqui.
        </p>
      </main>
    </div>
  );
}

async function Saudacao() {
  const proprietario = await obterProprietario();

  return (
    <h1 className="text-xl font-semibold">
      Olá{proprietario.nome ? `, ${proprietario.nome}` : ""}!
      <span className="block text-sm font-normal text-muted-foreground">
        {proprietario.email}
      </span>
    </h1>
  );
}
