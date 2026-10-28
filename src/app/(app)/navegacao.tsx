"use client";

import { ClipboardList, House, Settings, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const ITENS: { href: string; texto: string; icone: LucideIcon }[] = [
  { href: "/chamados", texto: "Chamados", icone: ClipboardList },
  { href: "/imoveis", texto: "Imóveis", icone: House },
  { href: "/ajustes", texto: "Ajustes", icone: Settings },
];

// A seção atual fica em negrito e escura (a cor principal é só do botão de ação).
export function Navegacao({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Principal" className={className}>
      <ul className="mx-auto flex w-full max-w-2xl sm:gap-1">
        {ITENS.map(({ href, texto, icone: Icone }) => {
          const atual = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1 sm:flex-none">
              <Link
                href={href}
                aria-current={atual ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-2 text-xs sm:flex-row sm:gap-2 sm:rounded-lg sm:text-sm",
                  atual
                    ? "font-semibold text-foreground sm:bg-muted"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icone aria-hidden="true" className="size-6 sm:size-4" />
                {texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
