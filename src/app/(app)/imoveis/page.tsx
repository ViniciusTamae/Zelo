import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { NotificarAoAbrir } from "@/components/notificacoes";
import { buttonVariants } from "@/components/ui/button";
import { contarArquivados, listarImoveis } from "@/lib/imoveis/dados";

import { ListaImoveis } from "./lista-imoveis";

export const metadata: Metadata = {
  title: "Imóveis | Zelo",
};

const AVISOS: Record<string, string> = {
  excluido: "Imóvel excluído.",
  arquivado: "Imóvel arquivado. Ele continua em Arquivados, com o histórico dos chamados.",
};

// Lista de imóveis; com ?arquivados=1, os arquivados.
export default function ImoveisPage({ searchParams }: PageProps<"/imoveis">) {
  return (
    // Os dados (e a URL) são lidos na requisição: ficam atrás do Suspense.
    <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
      <ConteudoImoveis searchParams={searchParams} />
    </Suspense>
  );
}

async function ConteudoImoveis({ searchParams }: Pick<PageProps<"/imoveis">, "searchParams">) {
  const parametros = await searchParams;
  const arquivados = parametros.arquivados === "1";
  const aviso = typeof parametros.aviso === "string" ? AVISOS[parametros.aviso] : undefined;
  const [imoveis, totalArquivados] = await Promise.all([listarImoveis({ arquivados }), contarArquivados()]);

  if (arquivados) {
    return (
      <>
        <Link href="/imoveis" className="text-sm text-muted-foreground">
          ← Seus imóveis
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Imóveis arquivados</h1>
          <p className="text-muted-foreground">
            Os links dos inquilinos não funcionam e o histórico dos chamados continua guardado. Abra um imóvel para
            desarquivar.
          </p>
        </div>
        {imoveis.length === 0 ? (
          <p className="text-muted-foreground">Nenhum imóvel arquivado.</p>
        ) : (
          <ListaImoveis imoveis={imoveis} />
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Seus imóveis</h1>
        <Link href="/imoveis/novo" className={buttonVariants({ size: "lg" })}>
          Novo imóvel
        </Link>
      </div>

      {/* Computador: notificação no canto; celular: faixa no topo da lista. */}
      {aviso && (
        <>
          <NotificarAoAbrir texto={aviso} parametro="aviso" />
          <p role="status" className="rounded-lg bg-secondary px-4 py-3 text-sm text-secondary-foreground lg:hidden">
            {aviso}
          </p>
        </>
      )}

      {imoveis.length === 0 ? (
        <p className="text-muted-foreground">
          {totalArquivados > 0
            ? "Nenhum imóvel ativo. Cadastre um pelo botão \"Novo imóvel\" ou desarquive um dos arquivados."
            : "Você ainda não cadastrou imóveis. Comece pelo botão \"Novo imóvel\"."}
        </p>
      ) : (
        <ListaImoveis imoveis={imoveis} />
      )}

      {totalArquivados > 0 && (
        <Link href="/imoveis?arquivados=1" className="self-start text-sm text-muted-foreground underline">
          Ver arquivados ({totalArquivados})
        </Link>
      )}
    </>
  );
}
