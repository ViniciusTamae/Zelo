// No computador, o app usa a largura da tela (kanban, grade de imóveis), mas
// formulários e páginas de leitura ficam numa coluna estreita: linhas e
// campos muito largos ficam piores de ler e de preencher. No celular não muda nada.
export function ColunaEstreita({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">{children}</div>;
}
