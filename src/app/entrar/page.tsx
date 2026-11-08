import type { Metadata } from "next";
import { Suspense } from "react";

import { Logo } from "@/components/marca";
import { demonstracaoLigada } from "@/lib/demonstracao";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { BotaoDemonstracao } from "./botao-demonstracao";
import { estadoDoLink } from "./esquemas";
import { FormEntrar } from "./form-entrar";

export const metadata: Metadata = {
  title: "Entrar | Zelo",
};

export default function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1>
              <Logo altura={40} />
            </h1>
          </CardTitle>
          <CardDescription>
            Entre com seu e-mail. Você recebe um código, sem precisar de senha.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Os parâmetros da URL só existem na requisição: ficam atrás do Suspense. */}
          <Suspense>
            <FormDoLink searchParams={searchParams} />
          </Suspense>
          {/* Só na demonstração da Vercel (DEMONSTRACAO=ligada). */}
          {demonstracaoLigada() && <BotaoDemonstracao />}
        </CardContent>
      </Card>
    </main>
  );
}

async function FormDoLink({ searchParams }: Pick<PageProps<"/entrar">, "searchParams">) {
  return <FormEntrar estadoInicial={estadoDoLink(await searchParams)} />;
}
