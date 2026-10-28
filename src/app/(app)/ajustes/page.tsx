import { LogOut } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { obterProprietario } from "@/lib/auth";
import { formatarSilencio } from "@/lib/proprietarios/horario";

import { sair } from "../actions";

export const metadata: Metadata = {
  title: "Ajustes | Zelo",
};

export default function AjustesPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Ajustes</h1>
      <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
        <DadosDaConta />
      </Suspense>

      <form action={sair}>
        <Button type="submit" variant="outline" className="h-11 w-full text-base">
          <LogOut aria-hidden="true" />
          Sair
        </Button>
      </form>
    </>
  );
}

async function DadosDaConta() {
  const proprietario = await obterProprietario();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Sua conta</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col gap-3">
            <div>
              <dt className="text-sm text-muted-foreground">Nome</dt>
              <dd>{proprietario.nome || "Não informado"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">E-mail</dt>
              <dd className="break-all">{proprietario.email}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horário de silêncio</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <p>{formatarSilencio(proprietario.silencio_inicio, proprietario.silencio_fim)}</p>
          <p className="text-sm text-muted-foreground">
            Nesse horário, só chamados urgentes avisam você na hora. Os outros
            chegam quando o silêncio termina.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
