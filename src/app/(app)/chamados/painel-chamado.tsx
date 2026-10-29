"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// Painel lateral do computador, por cima do quadro. Fecha com Esc, com o X
// ou clicando fora. O foco vai para o painel ao abrir (teclado e leitor de tela).
export function PainelChamado({
  fecharHref,
  idTitulo,
  children,
}: {
  fecharHref: string;
  idTitulo: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const painel = useRef<HTMLElement>(null);

  useEffect(() => {
    painel.current?.focus();
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") router.push(fecharHref, { scroll: false });
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [fecharHref, router]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <Link
        href={fecharHref}
        scroll={false}
        aria-label="Fechar detalhe do chamado"
        tabIndex={-1}
        className="absolute inset-0 bg-background/70 backdrop-blur-[2px]"
      />
      <aside
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        // *:shrink-0: o painel rola em vez de espremer as seções para caber na altura.
        className="relative flex h-full w-full max-w-xl flex-col gap-6 overflow-y-auto border-l bg-background p-6 shadow-xl outline-none *:shrink-0"
      >
        <Link
          href={fecharHref}
          scroll={false}
          aria-label="Fechar"
          className="-mb-4 self-end rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X aria-hidden="true" className="size-5" />
        </Link>
        {children}
      </aside>
    </div>
  );
}
