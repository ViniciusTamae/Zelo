import { Logo } from "@/components/marca";

// Moldura das páginas abertas por link, sem login (inquilino e avaliação). No
// computador ganha a barra com a logo, como no app, e mais largura; quem usa
// pouco espaço se limita com `max-w-md`. No celular, só a logo acima do conteúdo.
export function MolduraPublica({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="lg:border-b lg:bg-card">
        <div className="px-4 pt-8 lg:px-6 lg:py-3">
          <div className="mx-auto flex w-full max-w-md flex-col lg:max-w-6xl">
            <Logo altura={36} />
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col px-4 pt-6 pb-8 lg:px-6 lg:pt-8">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6 lg:max-w-6xl">{children}</div>
      </main>
    </>
  );
}
