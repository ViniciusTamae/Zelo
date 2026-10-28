import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-xl font-semibold">Imóvel não encontrado</h1>
      <p className="text-muted-foreground">
        Ele pode ter sido removido ou o endereço está incorreto.
      </p>
      <Link href="/painel" className="underline">
        Voltar para seus imóveis
      </Link>
    </div>
  );
}
