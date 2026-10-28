import type { Database } from "@/lib/supabase/database.types";

export type Categoria = Database["public"]["Enums"]["categoria_chamado"];

// Ordem e textos das categorias no formulário do inquilino.
export const CATEGORIAS: { valor: Categoria; rotulo: string; exemplos: string }[] = [
  { valor: "hidraulica", rotulo: "Hidráulica", exemplos: "Vazamento, cano, descarga, torneira" },
  { valor: "eletrica", rotulo: "Elétrica", exemplos: "Tomada, disjuntor, chuveiro, luz" },
  { valor: "telhado", rotulo: "Telhado", exemplos: "Goteira, telha quebrada, calha" },
  { valor: "outros", rotulo: "Outros", exemplos: "Porta, janela, pintura, outro problema" },
];

export function rotuloDaCategoria(categoria: Categoria) {
  return CATEGORIAS.find(({ valor }) => valor === categoria)!.rotulo;
}
