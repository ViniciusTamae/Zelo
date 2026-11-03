import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { FotoImovel } from "@/components/foto-imovel";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { obterImovel } from "@/lib/imoveis/dados";
import { textoVistoEm } from "@/lib/inquilinos/visto";
import { mensagemDoLink } from "@/lib/links";

import { alterarAtivoInquilino } from "../actions";
import { FormInquilino } from "./form-inquilino";
import { NovoLink } from "./novo-link";

export const metadata: Metadata = {
  title: "Imóvel | Zelo",
};

export default function ImovelPage({
  params,
}: PageProps<"/imoveis/[id]">) {
  return (
    <>
      <Link href="/imoveis" className="text-sm text-muted-foreground">
        ← Seus imóveis
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
        <DetalheImovel params={params} />
      </Suspense>
    </>
  );
}

type Imovel = NonNullable<Awaited<ReturnType<typeof obterImovel>>>;
type Inquilino = Imovel["inquilinos"][number];

async function DetalheImovel({
  params,
}: Pick<PageProps<"/imoveis/[id]">, "params">) {
  const { id } = await params;
  const imovel = await obterImovel(id);
  if (!imovel) notFound();

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <FotoImovel
            url={imovel.fotoUrl}
            apelido={imovel.apelido}
            className="size-16 shrink-0 rounded-lg lg:h-24 lg:w-36"
          />
          <div>
            <h1 className="text-2xl font-semibold">{imovel.apelido}</h1>
            <p className="text-muted-foreground">{imovel.endereco}</p>
          </div>
        </div>
        <Link
          href={`/imoveis/${imovel.id}/editar`}
          className={buttonVariants({ variant: "outline" })}
        >
          Editar
        </Link>
      </div>

      {/* No computador: inquilinos à esquerda e o cadastro à direita. */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-8">
        <section className="flex flex-col gap-3" aria-labelledby={`inquilinos-${imovel.id}`}>
          <h2 id={`inquilinos-${imovel.id}`} className="text-lg font-semibold">
            Inquilinos
          </h2>
          {imovel.inquilinos.length === 0 ? (
            <p className="text-muted-foreground">
              Nenhum inquilino ainda. Adicione um para gerar o link de pedidos.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {imovel.inquilinos.map((inquilino) => (
                <li key={inquilino.id}>
                  <CartaoInquilino inquilino={inquilino} apelido={imovel.apelido} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <Card aria-label="Adicionar inquilino" className="lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle>Adicionar inquilino</CardTitle>
            <CardDescription>
              Cada inquilino recebe um link exclusivo para pedir consertos, sem
              precisar de senha nem instalar nada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormInquilino imovelId={imovel.id} apelido={imovel.apelido} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function CartaoInquilino({
  inquilino,
  apelido,
}: {
  inquilino: Inquilino;
  apelido: string;
}) {
  const mensagem = mensagemDoLink(inquilino.nome, apelido);

  return (
    <Card
      aria-label={`Inquilino ${inquilino.nome}`}
      className={inquilino.ativo ? undefined : "opacity-60"}
    >
      <CardHeader>
        <CardTitle>
          {inquilino.nome}
          {!inquilino.ativo && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              (desativado)
            </span>
          )}
        </CardTitle>
        {inquilino.email && <CardDescription>{inquilino.email}</CardDescription>}
        {inquilino.ativo && (
          <CardDescription>{textoVistoEm(inquilino.ultimo_acesso_em)}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {inquilino.ativo ? (
          <>
            <NovoLink inquilinoId={inquilino.id} mensagem={mensagem} />

            {/* Ação que corta o acesso fica escondida para evitar toque sem querer. */}
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">
                Mais opções
              </summary>
              <div className="mt-3 flex flex-col gap-3">
                <form action={alterarAtivoInquilino} className="flex flex-col gap-1">
                  <input type="hidden" name="id" value={inquilino.id} />
                  <input type="hidden" name="ativo" value="false" />
                  <Button type="submit" variant="destructive">
                    Desativar inquilino
                  </Button>
                  <span className="text-muted-foreground">
                    Para quando ele sair do imóvel. O link para de funcionar,
                    mas o histórico dos pedidos continua.
                  </span>
                </form>
              </div>
            </details>
          </>
        ) : (
          <form action={alterarAtivoInquilino}>
            <input type="hidden" name="id" value={inquilino.id} />
            <input type="hidden" name="ativo" value="true" />
            <Button type="submit" variant="outline">
              Reativar inquilino
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
