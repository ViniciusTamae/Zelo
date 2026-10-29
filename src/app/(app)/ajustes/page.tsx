import { LogOut } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { obterProprietario } from "@/lib/auth";

import { sair } from "../actions";
import { AvisosAparelho } from "./avisos-aparelho";
import { FormNome, FormSilencio } from "./formularios";

export const metadata: Metadata = {
  title: "Ajustes | Zelo",
};

export default function AjustesPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Ajustes</h1>

      <Card aria-label="Avisos no celular">
        <CardHeader>
          <CardTitle>Avisos no celular</CardTitle>
        </CardHeader>
        <CardContent>
          <AvisosAparelho />
        </CardContent>
      </Card>

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
      <Card aria-label="Horário de silêncio">
        <CardHeader>
          <CardTitle>Horário de silêncio</CardTitle>
          <CardDescription>
            Nesse horário, só chamados urgentes avisam você na hora. Os outros
            chegam quando o silêncio termina.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* O banco guarda "21:00:00"; o campo de hora usa "21:00". */}
          <FormSilencio
            inicio={proprietario.silencio_inicio.slice(0, 5)}
            fim={proprietario.silencio_fim.slice(0, 5)}
          />
        </CardContent>
      </Card>

      <Card aria-label="Sua conta">
        <CardHeader>
          <CardTitle>Sua conta</CardTitle>
          <CardDescription className="break-all">{proprietario.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <FormNome nome={proprietario.nome ?? ""} />
        </CardContent>
      </Card>
    </>
  );
}
