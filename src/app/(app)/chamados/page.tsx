import { Camera } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { FaixaInstalar } from "@/components/pwa";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { rotuloDaCategoria } from "@/lib/chamados/categorias";
import {
  contarAbertos,
  listarChamados,
  listarImoveisParaFiltro,
  listarQuadro,
  obterChamado,
  type Aba,
} from "@/lib/chamados/proprietario";
import { contarFiltrosAtivos, lerFiltros, linkDosChamados } from "@/lib/chamados/filtros";
import { COLUNAS } from "@/lib/chamados/quadro";
import { statusVisual } from "@/lib/chamados/status";
import { formatarReais } from "@/lib/chamados/valor";
import { linkDosGastos } from "@/lib/gastos/resumo";
import { formatarDataHora, tempoDesde } from "@/lib/datas";
import { cn } from "cn";

import { DetalheChamado } from "./detalhe-chamado";
import { FiltrosChamados } from "./filtros-chamados";
import { PainelChamado } from "./painel-chamado";
import { Quadro, type ColunaDoQuadro } from "./quadro";

export const metadata: Metadata = {
  title: "Chamados | Zelo",
};

// Tela de entrada do app (start_url da PWA): chamados de todos os imóveis.
export default function ChamadosPage({ searchParams }: PageProps<"/chamados">) {
  return (
    // No computador, título e filtro dividem a primeira linha, e o quadro ocupa
    // a linha de baixo inteira. No celular a grade não existe (`contents`).
    <div className="contents lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-x-4 lg:gap-y-3">
      <h1 className="text-2xl font-semibold">Chamados</h1>
      {/* Dica de instalar o app (só no celular e enquanto não instalado). */}
      <FaixaInstalar />
      {/* Aba e filtro vêm da URL, que só existe na requisição. */}
      <Suspense fallback={<p className="text-muted-foreground lg:col-span-2">Carregando...</p>}>
        <ConteudoChamados searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ConteudoChamados({ searchParams }: Pick<PageProps<"/chamados">, "searchParams">) {
  const parametros = await searchParams;
  const aba: Aba = parametros.aba === "resolvidos" ? "resolvidos" : "abertos";
  const filtros = lerFiltros(parametros);
  const filtrando = contarFiltrosAtivos(filtros) > 0;
  const chamadoAberto = typeof parametros.chamado === "string" ? parametros.chamado : undefined;

  // O celular usa a lista com abas; o computador, o quadro. As duas vêm
  // juntas e o CSS mostra a certa (lg:hidden / hidden lg:block).
  const [imoveis, chamados, abertos, quadro] = await Promise.all([
    listarImoveisParaFiltro(),
    listarChamados({ aba, filtros }),
    contarAbertos(filtros),
    listarQuadro(filtros),
  ]);

  if (imoveis.length === 0) {
    return (
      <p className="text-muted-foreground lg:col-span-2">
        Nenhum chamado ainda. Cadastre um imóvel em{" "}
        <Link href="/imoveis" className="underline">
          Imóveis
        </Link>{" "}
        e compartilhe o link com o inquilino: os pedidos dele aparecem aqui.
      </p>
    );
  }

  // Trocar de aba ou abrir um chamado no painel mantém os filtros.
  const linkDaAba = (destino: Aba) => linkDosChamados(filtros, { aba: destino });
  const linkDoQuadro = (chamado?: string) => linkDosChamados(filtros, { chamado });

  const agora = new Date();
  const colunas: ColunaDoQuadro[] = COLUNAS.map(({ status, titulo }) => ({
    status,
    titulo,
    cartoes: quadro[status].map((chamado) => ({
      id: chamado.id,
      status: chamado.status,
      urgente: chamado.urgente,
      titulo: `${rotuloDaCategoria(chamado.categoria)} · ${chamado.imoveis.apelido}`,
      descricao: chamado.descricao,
      rodape: `${chamado.inquilinos?.nome ?? "Inquilino removido"} · ${tempoDesde(
        chamado.status === "resolvido" && chamado.resolvido_em ? chamado.resolvido_em : chamado.criado_em,
        agora,
      )}`,
      temFoto: Boolean(chamado.foto_path),
      valor: chamado.valor !== null ? formatarReais(chamado.valor) : null,
      nota: chamado.avaliacao_nota,
      href: linkDoQuadro(chamado.id),
    })),
  }));

  return (
    <>
      <div className="lg:col-start-2 lg:row-start-1">
        <FiltrosChamados filtros={filtros} imoveis={imoveis} extras={{ aba: aba === "resolvidos" ? aba : undefined }} />
      </div>

      <div className="hidden lg:col-span-2 lg:block">
        <Quadro
          colunas={colunas}
          selecionado={chamadoAberto}
          resumoDosFiltros={filtrando ? resumoDoQuadro(colunas.reduce((total, { cartoes }) => total + cartoes.length, 0)) : undefined}
          verTodosHref={linkDosGastos({ imovelId: filtros.imovelId, categoria: filtros.categoria })}
        />
        {chamadoAberto && (
          <Suspense>
            <PainelDoQuadro id={chamadoAberto} fecharHref={linkDoQuadro()} />
          </Suspense>
        )}
      </div>

      <div className="flex flex-col gap-6 lg:hidden">
        <nav aria-label="Situação dos chamados" className="grid grid-cols-2 rounded-lg bg-muted p-1">
          {(
            [
              ["abertos", `Abertos (${abertos})`],
              ["resolvidos", "Resolvidos"],
            ] as const
          ).map(([destino, texto]) => (
            <Link
              key={destino}
              href={linkDaAba(destino)}
              aria-current={aba === destino ? "page" : undefined}
              className={cn(
                "rounded-md py-2 text-center text-sm",
                aba === destino ? "bg-card font-semibold shadow-sm" : "text-muted-foreground",
              )}
            >
              {texto}
            </Link>
          ))}
        </nav>

        {chamados.length === 0 ? (
          <p className="text-muted-foreground">
            {filtrando
              ? "Nenhum chamado com esses filtros."
              : aba === "abertos"
                ? "Nenhum chamado em aberto. Quando um inquilino pedir um conserto, ele aparece aqui."
                : "Nenhum chamado resolvido ainda."}
          </p>
        ) : (
          <ul className="flex flex-col gap-3" aria-label="Lista de chamados">
            {chamados.map((chamado) => (
              <li key={chamado.id}>
                <Link href={`/chamados/${chamado.id}`} className="block">
                  <Card size="sm" className="transition-colors hover:bg-muted/50">
                    <CardContent className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">
                          {rotuloDaCategoria(chamado.categoria)} · {chamado.imoveis.apelido}
                        </span>
                        <StatusBadge status={statusVisual(chamado)} />
                      </div>
                      <p className="line-clamp-2 text-sm">{chamado.descricao}</p>
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        {chamado.inquilinos?.nome ?? "Inquilino removido"} ·{" "}
                        {aba === "resolvidos" && chamado.resolvido_em
                          ? `Resolvido em ${formatarDataHora(chamado.resolvido_em)}`
                          : `Aberto em ${formatarDataHora(chamado.criado_em)}`}
                        {chamado.foto_path && (
                          <Camera aria-label="Com foto" className="size-3.5" />
                        )}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function resumoDoQuadro(total: number) {
  if (total === 0) return "Nenhum chamado com esses filtros.";
  return total === 1 ? "1 chamado com esses filtros." : `${total} chamados com esses filtros.`;
}

async function PainelDoQuadro({ id, fecharHref }: { id: string; fecharHref: string }) {
  const chamado = await obterChamado(id);
  if (!chamado) return null;
  const idTitulo = `painel-${chamado.id}`;
  return (
    <PainelChamado fecharHref={fecharHref} idTitulo={idTitulo}>
      <DetalheChamado chamado={chamado} idTitulo={idTitulo} />
    </PainelChamado>
  );
}
