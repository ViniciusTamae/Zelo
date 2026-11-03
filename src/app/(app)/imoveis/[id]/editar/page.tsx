import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { obterImovel } from "@/lib/imoveis/dados";

import { FormImovel } from "../../form-imovel";

export const metadata: Metadata = {
  title: "Editar imóvel | Zelo",
};

export default function EditarImovelPage({
  params,
}: PageProps<"/imoveis/[id]/editar">) {
  return (
    // Celular: uma coluna; computador: formulário com a prévia ao lado.
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 lg:max-w-5xl">
      <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
        <Edicao params={params} />
      </Suspense>
    </div>
  );
}

async function Edicao({
  params,
}: Pick<PageProps<"/imoveis/[id]/editar">, "params">) {
  const { id } = await params;
  const imovel = await obterImovel(id);
  if (!imovel) notFound();

  return (
    <>
      <Link href={`/imoveis/${imovel.id}`} className="text-sm text-muted-foreground">
        ← {imovel.apelido}
      </Link>
      <h1 className="text-2xl font-semibold">Editar imóvel</h1>
      <FormImovel
      imovel={{
        id: imovel.id,
        apelido: imovel.apelido,
        logradouro: imovel.logradouro,
        numero: imovel.numero,
        complemento: imovel.complemento ?? "",
        bairro: imovel.bairro,
        fotoUrl: imovel.fotoUrl,
      }}
      />
    </>
  );
}
