import Link from "next/link";

export default function ChamadoNaoEncontrado() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-xl font-semibold">Chamado não encontrado</h1>
      <p className="text-muted-foreground">
        Ele pode ter sido removido ou o endereço está incorreto.
      </p>
      <Link href="/chamados" className="underline">
        Voltar para os chamados
      </Link>
    </div>
  );
}
