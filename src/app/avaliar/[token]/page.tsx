import type { Metadata } from "next";
import { Suspense } from "react";

import { FormAvaliacao } from "@/components/form-avaliacao";
import { MolduraPublica } from "@/components/moldura-publica";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buscarChamadoParaAvaliar } from "@/lib/chamados/avaliacao";
import { rotuloDaCategoria } from "@/lib/chamados/categorias";

import { avaliarPeloLinkDoEmail } from "./actions";

export const metadata: Metadata = {
  title: "Avaliar conserto | Zelo",
  robots: { index: false, follow: false },
};

// Pesquisa de satisfação aberta pelo e-mail (link de uso único, sem login).
export default function AvaliarPage({ params }: PageProps<"/avaliar/[token]">) {
  return (
    <MolduraPublica>
      {/* Uma pergunta só: fica estreita também no computador. */}
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
          <Conteudo params={params} />
        </Suspense>
      </div>
    </MolduraPublica>
  );
}

async function Conteudo({ params }: Pick<PageProps<"/avaliar/[token]">, "params">) {
  const { token } = await params;
  const chamado = await buscarChamadoParaAvaliar(token);

  if (!chamado) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Este link de avaliação não vale mais</CardTitle>
          <CardDescription>
            Ele só pode ser usado uma vez. Se você já avaliou, obrigado! Se o pedido
            foi reaberto, você recebe um novo link quando ele for resolvido.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          {chamado.nomeInquilino ? `${chamado.nomeInquilino}, seu` : "Seu"} pedido foi resolvido
        </CardTitle>
        <CardDescription>
          {rotuloDaCategoria(chamado.categoria)} · {chamado.apelidoImovel}
          <br />
          &quot;{chamado.descricao}&quot;
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormAvaliacao acao={avaliarPeloLinkDoEmail} campos={{ token }} />
      </CardContent>
    </Card>
  );
}
