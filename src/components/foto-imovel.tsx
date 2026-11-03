import { House } from "lucide-react";
import { cn } from "cn";

// Foto do imóvel ou, sem foto, a imagem padrão (casa no tom da marca). O
// tamanho vem de `className`; a foto preenche o espaço sem distorcer.
export function FotoImovel({ url, apelido, className }: { url: string | null; apelido: string; className?: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- link assinado e temporário do Storage privado
      <img src={url} alt={`Foto de ${apelido}`} className={cn("object-cover", className)} />
    );
  }
  return (
    <div
      data-sem-foto=""
      aria-hidden="true"
      className={cn("flex items-center justify-center bg-secondary text-secondary-foreground", className)}
    >
      <House className="size-1/3 max-h-12 max-w-12 min-h-6 min-w-6" strokeWidth={1.5} />
    </div>
  );
}
