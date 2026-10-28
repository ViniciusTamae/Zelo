import { formatarDataHora } from "@/lib/datas";

// "Visto em 28/10/2026 às 14:05", para o dono saber se o inquilino já abriu o link.
export function textoVistoEm(ultimoAcessoEm: string | null) {
  if (!ultimoAcessoEm) return "Ainda não abriu o link";
  return `Visto em ${formatarDataHora(ultimoAcessoEm)}`;
}
