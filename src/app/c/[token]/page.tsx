import type { Metadata } from "next";
import { after } from "next/server";
import { Suspense } from "react";

import { FormAvaliacao } from "@/components/form-avaliacao";
import { Logo } from "@/components/marca";
import { StatusBadge } from "@/components/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { rotuloDaCategoria } from "@/lib/chamados/categorias";
import { listarChamadosDoInquilino } from "@/lib/chamados/inquilino";
import { statusVisual } from "@/lib/chamados/status";
import { formatarDataHora } from "@/lib/datas";
import { buscarInquilinoPeloLink, registrarAcesso } from "@/lib/inquilinos/acesso";

import { avaliarChamadoDoInquilino } from "./actions";
import { PedidoDeConserto } from "./form-chamado";
import { FormPerdiLink } from "./form-perdi-link";

export const metadata: Metadata = {
  title: "Zelo",
  // Link pessoal: não deve aparecer em buscadores.
  robots: { index: false, follow: false },
};

// Página do inquilino, aberta pelo link exclusivo (sem login).
export default function PaginaDoInquilino({ params }: PageProps<"/c/[token]">) {
  return (
    <main className="flex flex-1 flex-col items-center px-4 py-8">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Logo altura={36} />
        <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
          <Conteudo params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function Conteudo({ params }: Pick<PageProps<"/c/[token]">, "params">) {
  const { token } = await params;
  const inquilino = await buscarInquilinoPeloLink(token);

  if (!inquilino) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Este link não funciona mais</CardTitle>
          <CardDescription>
            Ele pode ter sido trocado por um novo ou desativado pelo proprietário.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <h2 className="font-semibold">Perdi meu link</h2>
          <FormPerdiLink />
        </CardContent>
      </Card>
    );
  }

  // Registra o "Visto em" depois de responder, sem atrasar a página.
  after(() => registrarAcesso(inquilino.id));
  const chamados = await listarChamadosDoInquilino(inquilino.id);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Olá, {inquilino.nome}!</h1>
        <p className="text-muted-foreground">
          Imóvel: {inquilino.apelidoImovel}. Guarde este link nos favoritos: é
          por ele que você pede consertos, sem senha.
        </p>
      </div>

      <Card aria-label="Pedir um conserto">
        <CardHeader>
          <CardTitle className="text-xl">Pedir um conserto</CardTitle>
        </CardHeader>
        <CardContent>
          <PedidoDeConserto token={token} />
        </CardContent>
      </Card>

      {chamados.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="seus-pedidos">
          <h2 id="seus-pedidos" className="text-lg font-semibold">
            Seus pedidos
          </h2>
          <ul className="flex flex-col gap-3">
            {chamados.map((chamado) => (
              <li key={chamado.id}>
                <Card size="sm" aria-label={`Pedido de ${rotuloDaCategoria(chamado.categoria)}`}>
                  <CardContent className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{rotuloDaCategoria(chamado.categoria)}</span>
                      <StatusBadge status={statusVisual(chamado)} />
                    </div>
                    <p className="line-clamp-2 text-sm">{chamado.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      Aberto em {formatarDataHora(chamado.criado_em)}
                    </p>
                    {chamado.status === "resolvido" &&
                      (chamado.avaliacao_nota ? (
                        <p className="text-sm">Sua avaliação: {chamado.avaliacao_nota} de 5</p>
                      ) : (
                        <div className="mt-2 border-t pt-3">
                          <FormAvaliacao
                            acao={avaliarChamadoDoInquilino}
                            campos={{ token, chamado_id: chamado.id }}
                          />
                        </div>
                      ))}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
