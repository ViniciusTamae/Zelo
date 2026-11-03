import type { Metadata } from "next";
import { after } from "next/server";
import { Suspense } from "react";

import { FormAvaliacao } from "@/components/form-avaliacao";
import { MolduraPublica } from "@/components/moldura-publica";
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
import { cn } from "cn";

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
    <MolduraPublica>
      <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
        <Conteudo params={params} />
      </Suspense>
    </MolduraPublica>
  );
}

async function Conteudo({ params }: Pick<PageProps<"/c/[token]">, "params">) {
  const { token } = await params;
  const inquilino = await buscarInquilinoPeloLink(token);

  if (!inquilino) {
    return (
      <Card className="mx-auto w-full max-w-md">
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
  const temPedidos = chamados.length > 0;

  return (
    // No computador: formulário à esquerda e pedidos à direita, sempre à vista.
    // Sem pedidos ainda, o formulário fica sozinho, centralizado.
    <div
      className={cn(
        "flex flex-col gap-6",
        temPedidos
          ? "lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-x-8"
          : "lg:mx-auto lg:w-full lg:max-w-2xl",
      )}
    >
      <div className="lg:col-span-2">
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

      {temPedidos && (
        <section
          className="flex flex-col gap-3 lg:sticky lg:top-6 lg:-m-1 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:p-1"
          aria-labelledby="seus-pedidos"
        >
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
    </div>
  );
}
