import Image from "next/image";
import { cn } from "cn";

// As duas versões vão para a página e o CSS mostra a do tema atual (a classe
// .dark no <html>). Assim não pisca a logo errada enquanto a página carrega.
function ParDeImagens({
  claro,
  escuro,
  largura,
  altura,
  className,
}: {
  claro: string;
  escuro: string;
  largura: number;
  altura: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-block", className)}>
      <Image src={claro} alt="Zelo" width={largura} height={altura} priority className="dark:hidden" />
      <Image src={escuro} alt="Zelo" width={largura} height={altura} priority className="hidden dark:block" />
    </span>
  );
}

// Logo completa (símbolo + "Zelo"): tela de entrar, topo no computador e
// página do inquilino. Proporção do SVG: 131 x 48.
export function Logo({ altura = 32, className }: { altura?: number; className?: string }) {
  return (
    <ParDeImagens
      claro="/brand/zelo-logo.svg"
      escuro="/brand/zelo-logo-escuro.svg"
      largura={Math.round((altura * 131) / 48)}
      altura={altura}
      className={className}
    />
  );
}

// Só o símbolo: para espaços pequenos (abaixo de ~24 px de altura a palavra
// "Zelo" fica ilegível), como o topo do app no celular.
export function Simbolo({ tamanho = 28, className }: { tamanho?: number; className?: string }) {
  return (
    <ParDeImagens
      claro="/brand/zelo-simbolo.svg"
      escuro="/brand/zelo-simbolo-escuro.svg"
      largura={tamanho}
      altura={tamanho}
      className={className}
    />
  );
}
