import { CATEGORIAS, rotuloDaCategoria, type Categoria } from "@/lib/chamados/categorias";
import { idSchema } from "@/lib/imoveis/esquemas";

// Histórico de gastos: os consertos resolvidos (com o valor informado pelo
// dono ao resolver), filtrados por período, imóvel e categoria. Os filtros
// ficam na URL (?periodo=&imovel=&categoria=), como em Chamados.

// `frase` completa textos como "Gasto nos últimos 12 meses".
export const PERIODOS = [
  { valor: "mes", rotulo: "Este mês", frase: "neste mês" },
  { valor: "3m", rotulo: "Últimos 3 meses", frase: "nos últimos 3 meses" },
  { valor: "6m", rotulo: "Últimos 6 meses", frase: "nos últimos 6 meses" },
  { valor: "12m", rotulo: "Últimos 12 meses", frase: "nos últimos 12 meses" },
  { valor: "ano", rotulo: "Este ano", frase: "neste ano" },
  { valor: "tudo", rotulo: "Todo o histórico", frase: "em todo o histórico" },
] as const;

export const fraseDoPeriodo = (periodo: Periodo) => PERIODOS.find(({ valor }) => valor === periodo)!.frase;

export type Periodo = (typeof PERIODOS)[number]["valor"];
export const PERIODO_PADRAO: Periodo = "12m";

export type FiltrosGastos = { periodo: Periodo; imovelId?: string; categoria?: Categoria };

type Parametros = Record<string, string | string[] | undefined>;
const texto = (valor: string | string[] | undefined) => (typeof valor === "string" ? valor : "");

// Valores inválidos são ignorados (o período volta para o padrão).
export function lerFiltrosGastos(parametros: Parametros): FiltrosGastos {
  const periodo = texto(parametros.periodo);
  const imovel = texto(parametros.imovel);
  const categoria = texto(parametros.categoria);
  return {
    periodo: PERIODOS.some(({ valor }) => valor === periodo) ? (periodo as Periodo) : PERIODO_PADRAO,
    imovelId: idSchema.safeParse(imovel).success ? imovel : undefined,
    categoria: CATEGORIAS.some(({ valor }) => valor === categoria) ? (categoria as Categoria) : undefined,
  };
}

// Parâmetros da URL (o período padrão não aparece).
export function parametrosDosGastos({ periodo, imovelId, categoria }: FiltrosGastos) {
  const busca = new URLSearchParams();
  if (periodo !== PERIODO_PADRAO) busca.set("periodo", periodo);
  if (imovelId) busca.set("imovel", imovelId);
  if (categoria) busca.set("categoria", categoria);
  return busca;
}

export function linkDosGastos(filtros: Partial<FiltrosGastos> = {}, caminho = "/gastos") {
  const busca = parametrosDosGastos({ periodo: PERIODO_PADRAO, ...filtros });
  return busca.size > 0 ? `${caminho}?${busca}` : caminho;
}

// ---------------------------------------------------------------------------
// Meses no horário de Brasília (UTC-3 o ano todo, sem horário de verão)
// ---------------------------------------------------------------------------

const FUSO_MS = 3 * 60 * 60 * 1000;

type Mes = { ano: number; mes: number }; // mes de 0 a 11

function mesEmBrasilia(data: Date): Mes {
  const local = new Date(data.getTime() - FUSO_MS);
  return { ano: local.getUTCFullYear(), mes: local.getUTCMonth() };
}

// Instante em que o mês começa em Brasília (dia 1, 00:00).
function inicioDoMes({ ano, mes }: Mes) {
  return new Date(Date.UTC(ano, mes, 1) + FUSO_MS);
}

function somarMeses({ ano, mes }: Mes, quantos: number): Mes {
  const total = ano * 12 + mes + quantos;
  return { ano: Math.floor(total / 12), mes: ((total % 12) + 12) % 12 };
}

const chaveDoMes = ({ ano, mes }: Mes) => `${ano}-${String(mes + 1).padStart(2, "0")}`;

const NOMES_DOS_MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// "nov/26"; com `longo`, "novembro de 2026" (para o leitor de tela e a dica).
export function rotuloDoMes(chave: string, longo = false) {
  const [ano, mes] = chave.split("-").map(Number);
  if (longo) {
    const nome = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(ano, mes - 1, 1)));
    return `${nome} de ${ano}`;
  }
  return `${NOMES_DOS_MESES[mes - 1]}/${String(ano).slice(2)}`;
}

// Primeiro mês do período ("Últimos 3 meses" = este mês e os 2 anteriores,
// para o gráfico ter meses inteiros). "Todo o histórico" não tem início.
function primeiroMes(periodo: Periodo, atual: Mes): Mes | null {
  switch (periodo) {
    case "mes":
      return atual;
    case "3m":
      return somarMeses(atual, -2);
    case "6m":
      return somarMeses(atual, -5);
    case "12m":
      return somarMeses(atual, -11);
    case "ano":
      return { ano: atual.ano, mes: 0 };
    case "tudo":
      return null;
  }
}

// Data a partir da qual buscar os resolvidos (null = desde sempre).
export function inicioDoPeriodo(periodo: Periodo, agora = new Date()) {
  const mes = primeiroMes(periodo, mesEmBrasilia(agora));
  return mes ? inicioDoMes(mes) : null;
}

// ---------------------------------------------------------------------------
// Resumo
// ---------------------------------------------------------------------------

export type ConsertoResolvido = {
  id: string;
  categoria: Categoria;
  descricao: string;
  valor: number | null;
  resolvido_em: string;
  imovel: { id: string; apelido: string; arquivado: boolean };
};

export type Fatia = { chave: string; rotulo: string; total: number; consertos: number };

export function resumirGastos(consertos: ConsertoResolvido[], periodo: Periodo, agora = new Date()) {
  const comValor = consertos.filter((conserto) => conserto.valor !== null);
  const total = somar(comValor);

  const porImovel = agrupar(consertos, (c) => c.imovel.id, (c) => c.imovel.apelido + (c.imovel.arquivado ? " (arquivado)" : ""));
  const porCategoria = agrupar(consertos, (c) => c.categoria, (c) => rotuloDaCategoria(c.categoria));

  // Todos os meses do período, inclusive os sem gasto (barra vazia). Em "Todo
  // o histórico", começa no mês do conserto mais antigo.
  const atual = mesEmBrasilia(agora);
  const maisAntigo = consertos.reduce<Mes | null>((antigo, c) => {
    const mes = mesEmBrasilia(new Date(c.resolvido_em));
    return !antigo || chaveDoMes(mes) < chaveDoMes(antigo) ? mes : antigo;
  }, null);
  const inicio = primeiroMes(periodo, atual) ?? maisAntigo ?? atual;
  const porMes: Fatia[] = [];
  for (let mes = inicio; chaveDoMes(mes) <= chaveDoMes(atual); mes = somarMeses(mes, 1)) {
    porMes.push({ chave: chaveDoMes(mes), rotulo: rotuloDoMes(chaveDoMes(mes)), total: 0, consertos: 0 });
  }
  const indice = new Map(porMes.map((fatia, i) => [fatia.chave, i]));
  for (const conserto of consertos) {
    const fatia = porMes[indice.get(chaveDoMes(mesEmBrasilia(new Date(conserto.resolvido_em)))) ?? -1];
    if (!fatia) continue;
    fatia.consertos += 1;
    fatia.total += conserto.valor ?? 0;
  }

  return {
    total,
    consertos: consertos.length,
    semValor: consertos.length - comValor.length,
    // Média só de quem tem valor (os sem valor não puxam a média para baixo).
    media: comValor.length > 0 ? arredondar(total / comValor.length) : null,
    porImovel,
    porCategoria,
    porMes: porMes.map((fatia) => ({ ...fatia, total: arredondar(fatia.total) })),
  };
}

function agrupar(
  consertos: ConsertoResolvido[],
  chave: (conserto: ConsertoResolvido) => string,
  rotulo: (conserto: ConsertoResolvido) => string,
): Fatia[] {
  const grupos = new Map<string, Fatia>();
  for (const conserto of consertos) {
    const k = chave(conserto);
    const grupo = grupos.get(k) ?? { chave: k, rotulo: rotulo(conserto), total: 0, consertos: 0 };
    grupo.total += conserto.valor ?? 0;
    grupo.consertos += 1;
    grupos.set(k, grupo);
  }
  // Do maior gasto para o menor; empate, pelo nome.
  return [...grupos.values()]
    .map((grupo) => ({ ...grupo, total: arredondar(grupo.total) }))
    .sort((a, b) => b.total - a.total || a.rotulo.localeCompare(b.rotulo, "pt-BR"));
}

const somar = (consertos: ConsertoResolvido[]) => arredondar(consertos.reduce((soma, c) => soma + (c.valor ?? 0), 0));
// Centavos certos (0,1 + 0,2 não vira 0,30000000000000004).
const arredondar = (valor: number) => Math.round(valor * 100) / 100;

// ---------------------------------------------------------------------------
// Planilha (CSV para o Excel brasileiro: ";" entre colunas e vírgula decimal)
// ---------------------------------------------------------------------------

const dataBrasilia = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function gerarPlanilha(consertos: ConsertoResolvido[]) {
  const linhas = [
    ["Data", "Imóvel", "Categoria", "Descrição", "Valor (R$)"],
    ...consertos.map((c) => [
      dataBrasilia.format(new Date(c.resolvido_em)),
      c.imovel.apelido,
      rotuloDaCategoria(c.categoria),
      c.descricao,
      c.valor === null ? "" : c.valor.toFixed(2).replace(".", ","),
    ]),
  ];
  // BOM no começo: sem ele o Excel abre os acentos errado.
  return "﻿" + linhas.map((linha) => linha.map(celula).join(";")).join("\r\n") + "\r\n";
}

// Aspas quando precisa; e "=", "+", "-", "@" no começo viram texto, para o
// Excel não executar uma descrição como fórmula.
function celula(valor: string) {
  let texto = valor.replace(/\r?\n/g, " ");
  if (/^[=+\-@\t]/.test(texto)) texto = `'${texto}`;
  return /[;"]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}
