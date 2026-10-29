import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { obterImovel } from "@/lib/imoveis/dados";

import { FormImovel } from "../../form-imovel";
import { ColunaEstreita } from "../../../coluna-estreita";

export const metadata: Metadata = {
  title: "Editar imóvel | Zelo",
};

export default function EditarImovelPage({
  params,
}: PageProps<"/imoveis/[id]/editar">) {
  return (
    <ColunaEstreita>
      <h1 className="text-2xl font-semibold">Editar imóvel</h1>
      <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
        <Edicao params={params} />
      </Suspense>
    </ColunaEstreita>
  );
}

async function Edicao({
  params,
}: Pick<PageProps<"/imoveis/[id]/editar">, "params">) {
  const { id } = await params;
  const imovel = await obterImovel(id);
  if (!imovel) notFound();

  return (
    <FormImovel
      imovel={{
        id: imovel.id,
        apelido: imovel.apelido,
        logradouro: imovel.logradouro,
        numero: imovel.numero,
        complemento: imovel.complemento ?? "",
        bairro: imovel.bairro,
      }}
    />
  );
}
