import Link from "next/link";

import { Navegacao } from "./navegacao";

// Moldura das telas do proprietário logado: topo com a marca e navegação
// (no celular, a navegação fica numa barra fixa embaixo, perto do polegar).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/chamados" className="text-lg font-semibold">
            Zelo
          </Link>
          <Navegacao className="hidden sm:flex" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-6 pb-24 sm:pb-6">
        {children}
      </main>

      <Navegacao className="fixed inset-x-0 bottom-0 border-t bg-card pb-[env(safe-area-inset-bottom)] sm:hidden" />
    </div>
  );
}
