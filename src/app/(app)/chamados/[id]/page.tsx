import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { rotuloDaCategoria } from "@/lib/chamados/categorias";
import { descreverEvento } from "@/lib/chamados/eventos";
import { obterChamado } from "@/lib/chamados/proprietario";
import { statusVisual } from "@/lib/chamados/status";
import { formatarReais } from "@/lib/chamados/valor";
import { formatarDataHora } from "@/lib/datas";

import { AcoesChamado } from "./acoes-chamado";

export const metadata: Metadata = {
  title: "Chamado | Zelo",
};

export default function ChamadoPage({ params }: PageProps<"/chamados/[id]">) {
  return (
    <>
      <Link href="/chamados" className="text-sm text-muted-foreground">
        ← Chamados
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
        <DetalheChamado params={params} />
      </Suspense>
    </>
  );
}

async function DetalheChamado({ params }: Pick<PageProps<"/chamados/[id]">, "params">) {
  const { id } = await params;
  const chamado = await obterChamado(id);
  if (!chamado) notFound();

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold">{rotuloDaCategoria(chamado.categoria)}</h1>
          <StatusBadge status={statusVisual(chamado)} />
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Imóvel</dt>
          <dd>
            <Link href={`/imoveis/${chamado.imovel.id}`} className="underline">
              {chamado.imovel.apelido}
            </Link>{" "}
            <span className="text-muted-foreground">({chamado.imovel.endereco})</span>
          </dd>
          <dt className="text-muted-foreground">Inquilino</dt>
          <dd>{chamado.inquilino?.nome ?? "Removido"}</dd>
          <dt className="text-muted-foreground">Aberto em</dt>
          <dd>{formatarDataHora(chamado.criado_em)}</dd>
          {chamado.melhor_horario && (
            <>
              <dt className="text-muted-foreground">Melhor horário</dt>
              <dd>{chamado.melhor_horario}</dd>
            </>
          )}
          {chamado.resolvido_em && (
            <>
              <dt className="text-muted-foreground">Resolvido em</dt>
              <dd>{formatarDataHora(chamado.resolvido_em)}</dd>
            </>
          )}
          {chamado.valor !== null && (
            <>
              <dt className="text-muted-foreground">Custo</dt>
              <dd>{formatarReais(chamado.valor)}</dd>
            </>
          )}
        </dl>
      </div>

      <section aria-label="Descrição do problema" className="flex flex-col gap-3">
        <p className="whitespace-pre-wrap">{chamado.descricao}</p>
        {chamado.fotoUrl && (
          <a href={chamado.fotoUrl} target="_blank" rel="noreferrer" className="w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element -- link assinado e temporário do Storage privado */}
            <img
              src={chamado.fotoUrl}
              alt="Foto enviada pelo inquilino"
              className="max-h-80 rounded-lg border"
            />
          </a>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Atualizar chamado</CardTitle>
        </CardHeader>
        <CardContent>
          <AcoesChamado chamadoId={chamado.id} status={chamado.status} />
        </CardContent>
      </Card>

      <section aria-labelledby={`historico-${chamado.id}`} className="flex flex-col gap-3">
        <h2 id={`historico-${chamado.id}`} className="text-lg font-semibold">
          Histórico
        </h2>
        <ol className="flex flex-col gap-3 border-l pl-4">
          {chamado.eventos.map((evento) => (
            <li key={evento.id} className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">
                {descreverEvento(evento, chamado.inquilino?.nome)}
              </span>
              {evento.nota && <span className="text-sm whitespace-pre-wrap">{evento.nota}</span>}
              <span className="text-xs text-muted-foreground">{formatarDataHora(evento.criado_em)}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
