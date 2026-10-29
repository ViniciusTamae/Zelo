import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { obterChamado } from "@/lib/chamados/proprietario";

import { ColunaEstreita } from "../../coluna-estreita";
import { DetalheChamado } from "../detalhe-chamado";

export const metadata: Metadata = {
  title: "Chamado | Zelo",
};

export default function ChamadoPage({ params }: PageProps<"/chamados/[id]">) {
  return (
    <ColunaEstreita>
      <Link href="/chamados" className="text-sm text-muted-foreground">
        ← Chamados
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
        <Detalhe params={params} />
      </Suspense>
    </ColunaEstreita>
  );
}

async function Detalhe({ params }: Pick<PageProps<"/chamados/[id]">, "params">) {
  const { id } = await params;
  const chamado = await obterChamado(id);
  if (!chamado) notFound();
  return <DetalheChamado chamado={chamado} />;
}
