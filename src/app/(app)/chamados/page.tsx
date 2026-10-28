import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chamados | Zelo",
};

// Tela de entrada do app (start_url da PWA). A lista de chamados chega na
// etapa do painel de chamados; por enquanto só o estado vazio.
export default function ChamadosPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Chamados</h1>
      <p className="text-muted-foreground">
        Nenhum chamado ainda. Quando um inquilino pedir um conserto pelo link
        dele, o pedido aparece aqui.
      </p>
    </>
  );
}
