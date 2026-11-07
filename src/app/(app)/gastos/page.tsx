import { Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { rotuloDaCategoria, type Categoria } from "@/lib/chamados/categorias";
import { formatarReais } from "@/lib/chamados/valor";
import { formatarDataHora } from "@/lib/datas";
import { listarConsertos, listarImoveisDosGastos } from "@/lib/gastos/dados";
import {
  fraseDoPeriodo,
  lerFiltrosGastos,
  linkDosGastos,
  parametrosDosGastos,
  resumirGastos,
  type ConsertoResolvido,
} from "@/lib/gastos/resumo";
import { cn } from "cn";

import { FiltrosGastos } from "./filtros-gastos";
import { BarrasHorizontais, GraficoMensal } from "./graficos";

export const metadata: Metadata = {
  title: "Gastos | Zelo",
};

// Histórico de gastos: quanto custaram os consertos resolvidos, por período,
// imóvel e categoria, com a lista e a planilha para baixar.
export default function GastosPage({ searchParams }: PageProps<"/gastos">) {
  return (
    // No computador, título e filtros dividem a primeira linha.
    <div className="contents lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-x-4 lg:gap-y-6">
      <h1 className="text-2xl font-semibold">Gastos</h1>
      {/* Os filtros vêm da URL, que só existe na requisição. */}
      <Suspense fallback={<p className="text-muted-foreground lg:col-span-2">Carregando...</p>}>
        <ConteudoGastos searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const plural = (n: number, um: string, varios: string) => (n === 1 ? `1 ${um}` : `${n} ${varios}`);
const dataCurta = (iso: string) => formatarDataHora(iso).split(" às ")[0];

async function ConteudoGastos({ searchParams }: Pick<PageProps<"/gastos">, "searchParams">) {
  const filtros = lerFiltrosGastos(await searchParams);
  // "Agora" decide o período: lido na requisição, nunca no pré-render.
  await connection();
  const agora = new Date();
  const [imoveis, consertos] = await Promise.all([listarImoveisDosGastos(), listarConsertos(filtros, agora)]);

  if (imoveis.length === 0) {
    return (
      <p className="text-muted-foreground lg:col-span-2">
        Nenhum gasto ainda. Cadastre um imóvel em{" "}
        <Link href="/imoveis" className="underline">
          Imóveis
        </Link>
        : o valor de cada conserto, informado ao resolver o chamado, aparece aqui.
      </p>
    );
  }

  const resumo = resumirGastos(consertos, filtros.periodo, agora);
  const frase = fraseDoPeriodo(filtros.periodo);
  const planilha = parametrosDosGastos(filtros);

  return (
    <>
      <div className="flex flex-col gap-3 lg:col-start-2 lg:row-start-1 lg:flex-row lg:items-center">
        <FiltrosGastos filtros={filtros} imoveis={imoveis} />
        {consertos.length > 0 && (
          // Link comum (não do Next): o navegador baixa o arquivo.
          <a
            href={planilha.size > 0 ? `/gastos/planilha?${planilha}` : "/gastos/planilha"}
            download
            className={buttonVariants({ variant: "outline", className: "h-11 text-base lg:h-9 lg:text-sm" })}
          >
            <Download aria-hidden="true" />
            Baixar planilha
          </a>
        )}
      </div>

      {consertos.length === 0 ? (
        <p className="text-muted-foreground lg:col-span-2">
          Nenhum conserto resolvido {frase}
          {filtros.imovelId || filtros.categoria ? " com esses filtros" : ""}. O valor é informado ao marcar o chamado
          como resolvido.
        </p>
      ) : (
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Total e gráfico do mês a mês; no computador, lado a lado. */}
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
            <section aria-label="Resumo" className="flex flex-col justify-center gap-1 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
              <p className="text-sm text-muted-foreground">Gasto {frase}</p>
              <p className="text-4xl font-semibold tracking-tight tabular-nums">{formatarReais(resumo.total)}</p>
              <p className="text-sm text-muted-foreground">
                {plural(resumo.consertos, "conserto resolvido", "consertos resolvidos")}
                {resumo.media !== null && <> · média de {formatarReais(resumo.media)}</>}
              </p>
              {resumo.semValor > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {plural(resumo.semValor, "conserto sem valor informado não entra", "consertos sem valor informado não entram")}{" "}
                  no total.
                </p>
              )}
            </section>

            <section aria-labelledby="gastos-mes" className="flex flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
              <h2 id="gastos-mes" className="font-semibold">
                Mês a mês
              </h2>
              <GraficoMensal meses={resumo.porMes} />
            </section>
          </div>

          {/* Divisão por imóvel e por categoria (some a que já está filtrada). */}
          {(!filtros.imovelId || !filtros.categoria) && (
            <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
              {!filtros.imovelId && (
                <section aria-labelledby="gastos-imovel" className="flex flex-col gap-2 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
                  <h2 id="gastos-imovel" className="font-semibold">
                    Por imóvel
                  </h2>
                  <BarrasHorizontais
                    itens={resumo.porImovel}
                    rotulo="Gasto por imóvel"
                    hrefDe={(imovelId) => linkDosGastos({ ...filtros, imovelId })}
                  />
                </section>
              )}
              {!filtros.categoria && (
                <section aria-labelledby="gastos-categoria" className="flex flex-col gap-2 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
                  <h2 id="gastos-categoria" className="font-semibold">
                    Por categoria
                  </h2>
                  <BarrasHorizontais
                    itens={resumo.porCategoria}
                    rotulo="Gasto por categoria"
                    hrefDe={(categoria) => linkDosGastos({ ...filtros, categoria: categoria as Categoria })}
                  />
                </section>
              )}
            </div>
          )}

          <section aria-labelledby="gastos-lista" className="flex flex-col gap-3">
            <h2 id="gastos-lista" className="text-lg font-semibold">
              Consertos
            </h2>
            <ListaConsertos consertos={consertos} />
          </section>
        </div>
      )}
    </>
  );
}

// Celular: lista de cartões. Computador: tabela.
function ListaConsertos({ consertos }: { consertos: ConsertoResolvido[] }) {
  const valor = (conserto: ConsertoResolvido) =>
    conserto.valor === null ? <span className="text-muted-foreground">Sem valor</span> : formatarReais(conserto.valor);
  const imovel = (conserto: ConsertoResolvido) =>
    conserto.imovel.apelido + (conserto.imovel.arquivado ? " (arquivado)" : "");

  return (
    <>
      <ul className="flex flex-col gap-2 lg:hidden" aria-label="Lista de consertos">
        {consertos.map((conserto) => (
          <li key={conserto.id}>
            <Link
              href={`/chamados/${conserto.id}`}
              className="flex flex-col gap-1 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-muted/50"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">
                  {rotuloDaCategoria(conserto.categoria)} · {imovel(conserto)}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{valor(conserto)}</span>
              </span>
              <span className="line-clamp-2 text-sm">{conserto.descricao}</span>
              <span className="text-xs text-muted-foreground">Resolvido em {dataCurta(conserto.resolvido_em)}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 lg:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">Resolvido em</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Imóvel</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Categoria</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Descrição</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {consertos.map((conserto) => (
              <tr key={conserto.id} className="border-t transition-colors hover:bg-muted/40">
                <td className="px-4 py-3 whitespace-nowrap tabular-nums">{dataCurta(conserto.resolvido_em)}</td>
                <td className="px-4 py-3">{imovel(conserto)}</td>
                <td className="px-4 py-3">{rotuloDaCategoria(conserto.categoria)}</td>
                <td className="max-w-md px-4 py-3">
                  <Link href={`/chamados/${conserto.id}`} className="line-clamp-1 hover:underline">
                    {conserto.descricao}
                  </Link>
                </td>
                <td className={cn("px-4 py-3 text-right whitespace-nowrap tabular-nums", conserto.valor !== null && "font-medium")}>
                  {valor(conserto)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
