import { idSchema } from "@/lib/imoveis/esquemas";

import { CATEGORIAS, rotuloDaCategoria, type Categoria } from "./categorias";

// Filtros dos chamados (lista do celular e quadro do computador). Ficam na
// URL (?imovel=&categoria=&urgentes=1&busca=): dá para recarregar, voltar e
// compartilhar a tela filtrada.

export type Filtros = {
  imovelId?: string;
  categoria?: Categoria;
  urgentes: boolean;
  busca: string;
};

type Parametros = Record<string, string | string[] | undefined>;

const texto = (valor: string | string[] | undefined) => (typeof valor === "string" ? valor : "");

// Valores inválidos (id malformado, categoria que não existe) são ignorados.
export function lerFiltros(parametros: Parametros): Filtros {
  const imovel = texto(parametros.imovel);
  const categoria = texto(parametros.categoria);
  return {
    imovelId: idSchema.safeParse(imovel).success ? imovel : undefined,
    categoria: CATEGORIAS.some(({ valor }) => valor === categoria) ? (categoria as Categoria) : undefined,
    urgentes: texto(parametros.urgentes) === "1",
    busca: texto(parametros.busca).trim().slice(0, 100),
  };
}

export function contarFiltrosAtivos({ imovelId, categoria, urgentes, busca }: Filtros) {
  return [imovelId, categoria, urgentes, busca].filter(Boolean).length;
}

// Parâmetros da URL para estes filtros (só os que estão ligados), mais extras
// como a aba do celular ou o chamado aberto no painel.
export function parametrosDosFiltros(filtros: Filtros, extras: Record<string, string | undefined> = {}) {
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(extras)) if (valor) busca.set(chave, valor);
  if (filtros.imovelId) busca.set("imovel", filtros.imovelId);
  if (filtros.categoria) busca.set("categoria", filtros.categoria);
  if (filtros.urgentes) busca.set("urgentes", "1");
  if (filtros.busca) busca.set("busca", filtros.busca);
  return busca;
}

export function linkDosChamados(filtros: Filtros, extras: Record<string, string | undefined> = {}) {
  const busca = parametrosDosFiltros(filtros, extras);
  return busca.size > 0 ? `/chamados?${busca}` : "/chamados";
}

// Minúsculas e sem acento: "Elétrica" acha "eletrica" e vice-versa.
export function normalizar(valor: string) {
  return valor.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

type ChamadoPesquisavel = {
  categoria: Categoria;
  descricao: string;
  imoveis: { apelido: string };
  inquilinos: { nome: string } | null;
};

// A busca procura na descrição, no imóvel, no inquilino e na categoria. Com
// várias palavras, todas precisam aparecer (em qualquer um desses campos).
export function combinaComBusca(chamado: ChamadoPesquisavel, busca: string) {
  const palavras = normalizar(busca).split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return true;
  const conteudo = normalizar(
    [chamado.descricao, chamado.imoveis.apelido, chamado.inquilinos?.nome ?? "", rotuloDaCategoria(chamado.categoria)].join(" "),
  );
  return palavras.every((palavra) => conteudo.includes(palavra));
}
