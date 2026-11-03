import Link from "next/link";
import { Suspense } from "react";

import { Logo, Simbolo } from "@/components/marca";

import { ListaNavegacao, Navegacao } from "./navegacao";

// Enquanto o endereço atual não chega, mostra a mesma barra sem destaque.
function NavegacaoComReserva({ className }: { className: string }) {
  return (
    <Suspense fallback={<ListaNavegacao className={className} pathname={null} />}>
      <Navegacao className={className} />
    </Suspense>
  );
}

// Moldura das telas do proprietário logado: topo com a marca e navegação
// (no celular, a navegação fica numa barra fixa embaixo, perto do polegar).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3 lg:max-w-7xl lg:px-6 2xl:max-w-[92rem]">
          {/* No celular só o símbolo; no computador, a logo completa. */}
          <Link href="/chamados" aria-label="Zelo, ir para os chamados">
            <Simbolo className="sm:hidden" />
            <Logo className="hidden sm:block" />
          </Link>
          <NavegacaoComReserva className="hidden sm:flex" />
        </div>
      </header>

      {/* No computador (lg) a página usa mais largura; no celular fica igual. */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-6 pb-24 sm:pb-6 lg:max-w-7xl lg:px-6 2xl:max-w-[92rem]">
        {children}
      </main>

      <NavegacaoComReserva className="fixed inset-x-0 bottom-0 border-t bg-card pb-[env(safe-area-inset-bottom)] sm:hidden" />
    </div>
  );
}
