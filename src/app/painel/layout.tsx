import Link from "next/link";

import { Button } from "@/components/ui/button";

import { sair } from "./actions";

export default function PainelLayout({ children }: LayoutProps<"/painel">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <Link href="/painel" className="text-lg font-semibold">
          Zelo
        </Link>
        <form action={sair}>
          <Button type="submit" variant="ghost">
            Sair
          </Button>
        </form>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
