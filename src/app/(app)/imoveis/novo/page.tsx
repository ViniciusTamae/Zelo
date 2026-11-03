import type { Metadata } from "next";
import Link from "next/link";

import { FormImovel } from "../form-imovel";

export const metadata: Metadata = {
  title: "Novo imóvel | Zelo",
};

export default function NovoImovelPage() {
  return (
    // Celular: uma coluna; computador: formulário com a prévia ao lado.
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 lg:max-w-5xl">
      <Link href="/imoveis" className="text-sm text-muted-foreground">
        ← Seus imóveis
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Novo imóvel</h1>
        <p className="text-muted-foreground">
          Depois de salvar, você adiciona os inquilinos e gera o link de pedidos de cada um.
        </p>
      </div>
      <FormImovel />
    </div>
  );
}
