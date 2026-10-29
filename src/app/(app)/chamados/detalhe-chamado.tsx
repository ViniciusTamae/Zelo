import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { rotuloDaCategoria } from "@/lib/chamados/categorias";
import { descreverEvento } from "@/lib/chamados/eventos";
import type { obterChamado } from "@/lib/chamados/proprietario";
import { statusVisual } from "@/lib/chamados/status";
import { formatarReais } from "@/lib/chamados/valor";
import { formatarDataHora } from "@/lib/datas";

import { AcoesChamado } from "./[id]/acoes-chamado";

type Chamado = NonNullable<Awaited<ReturnType<typeof obterChamado>>>;

// Detalhe do chamado: na página /chamados/[id] (celular) e no painel lateral
// do quadro (computador). `idTitulo` liga o título ao painel (aria-labelledby).
export function DetalheChamado({ chamado, idTitulo }: { chamado: Chamado; idTitulo?: string }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h1 id={idTitulo} className="text-2xl font-semibold">{rotuloDaCategoria(chamado.categoria)}</h1>
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
          {chamado.avaliacao_nota !== null && (
            <>
              <dt className="text-muted-foreground">Avaliação</dt>
              <dd>
                <span aria-hidden="true" className="text-estrela">
                  {"★".repeat(chamado.avaliacao_nota)}
                  {"☆".repeat(5 - chamado.avaliacao_nota)}
                </span>{" "}
                {chamado.avaliacao_nota} de 5
                {chamado.avaliacao_comentario && (
                  <span className="block text-muted-foreground">&quot;{chamado.avaliacao_comentario}&quot;</span>
                )}
              </dd>
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
