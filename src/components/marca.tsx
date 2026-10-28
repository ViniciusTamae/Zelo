import Image from "next/image";

// Logo completa (símbolo + "zelo"): tela de entrar, topo no computador e
// página do inquilino. Proporção do SVG: 131 x 48.
export function Logo({ altura = 32, className }: { altura?: number; className?: string }) {
  return (
    <Image
      src="/brand/zelo-logo.svg"
      alt="Zelo"
      width={Math.round((altura * 131) / 48)}
      height={altura}
      priority
      className={className}
    />
  );
}

// Só o símbolo: para espaços pequenos (abaixo de ~24 px de altura a palavra
// "zelo" fica ilegível), como o topo do app no celular.
export function Simbolo({ tamanho = 28, className }: { tamanho?: number; className?: string }) {
  return (
    <Image
      src="/brand/zelo-simbolo.svg"
      alt="Zelo"
      width={tamanho}
      height={tamanho}
      priority
      className={className}
    />
  );
}
