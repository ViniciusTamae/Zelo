// Custo do conserto digitado pelo dono, no formato brasileiro:
// "150", "150,5", "1.234,56" e "R$ 80,00" viram número; em branco é null.
export function lerValorEmReais(texto: string): number | null | undefined {
  const limpo = texto.replace(/R\$/i, "").replace(/\s/g, "");
  if (!limpo) return null;
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(limpo)) return undefined;
  return Number(limpo.replaceAll(".", "").replace(",", "."));
}

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarReais(valor: number) {
  // O Intl usa espaço não separável entre "R$" e o número.
  return moeda.format(valor).replace(/ /g, " ");
}
