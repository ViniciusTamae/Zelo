import Link from "next/link";
import { cn } from "cn";

import { formatarReais } from "@/lib/chamados/valor";
import { rotuloDoMes, type Fatia } from "@/lib/gastos/resumo";

// Gráficos simples em HTML (uma série, uma cor): sem biblioteca. Cada barra
// tem o valor por escrito para o leitor de tela e uma dica ao passar o mouse
// ou focar pelo teclado.

const consertos = (n: number) => (n === 1 ? "1 conserto" : `${n} consertos`);

// Valor redondo para o topo do eixo (R$ 1.234 -> R$ 1.500), para a linha de
// referência cair num número fácil de ler.
function topoDoEixo(maximo: number) {
  if (maximo <= 0) return 0;
  const ordem = 10 ** Math.floor(Math.log10(maximo));
  const passo = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((p) => p * ordem >= maximo)!;
  return passo * ordem;
}

const reaisSemCentavos = (valor: number) => formatarReais(valor).replace(/,00$/, "");

// Gasto mês a mês (barras verticais).
export function GraficoMensal({ meses }: { meses: Fatia[] }) {
  const topo = topoDoEixo(Math.max(...meses.map(({ total }) => total)));
  // Com muitos meses, o rótulo aparece de tantos em tantos (a dica tem todos).
  const salto = meses.length > 12 ? Math.ceil(meses.length / 12) : 1;

  return (
    <div className="flex flex-col gap-1">
      {/* Linha de referência no topo, com o valor. */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-hidden="true">
        <span>{reaisSemCentavos(topo)}</span>
        <span className="h-px flex-1 border-t border-dashed" />
      </div>
      <ol className="flex h-44 items-end gap-1 border-b sm:gap-2" aria-label="Gasto por mês">
        {meses.map((mes, indice) => {
          const altura = topo > 0 ? (mes.total / topo) * 100 : 0;
          const descricao = `${rotuloDoMes(mes.chave, true)}: ${formatarReais(mes.total)}${
            mes.consertos > 0 ? `, ${consertos(mes.consertos)}` : ", nenhum conserto"
          }`;
          return (
            <li
              key={mes.chave}
              tabIndex={0}
              aria-label={descricao}
              className="group relative flex h-full min-w-0 flex-1 cursor-default items-end rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <div
                className={cn(
                  "w-full rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80",
                  mes.total === 0 && "bg-transparent",
                )}
                // Gasto pequeno ainda aparece (pelo menos 2px).
                style={{ height: mes.total > 0 ? `max(${altura}%, 2px)` : 0 }}
              />
              <div
                role="presentation"
                className={cn(
                  "pointer-events-none absolute bottom-full z-10 mb-1 hidden w-max rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md group-focus-visible:block group-hover:block",
                  indice === 0 ? "left-0" : indice === meses.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2",
                )}
              >
                <p className="font-semibold">{rotuloDoMes(mes.chave, true)}</p>
                <p>
                  {formatarReais(mes.total)} · {mes.consertos > 0 ? consertos(mes.consertos) : "nenhum conserto"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="flex gap-1 sm:gap-2" aria-hidden="true">
        {meses.map((mes, indice) => (
          <span
            key={mes.chave}
            className={cn(
              "min-w-0 flex-1 text-center text-xs whitespace-nowrap text-muted-foreground",
              // No celular, com mais de 6 meses, um rótulo sim, outro não (do mês atual para trás).
              meses.length > 6 && (meses.length - 1 - indice) % 2 === 1 && "max-sm:invisible",
            )}
          >
            {indice % salto === 0 ? mes.rotulo : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

// Quanto foi para cada imóvel ou categoria (barras horizontais). Clicar filtra.
export function BarrasHorizontais({
  itens,
  rotulo,
  hrefDe,
}: {
  itens: Fatia[];
  rotulo: string;
  hrefDe: (chave: string) => string;
}) {
  const maximo = Math.max(...itens.map(({ total }) => total), 0);
  return (
    <ul className="flex flex-col gap-1" aria-label={rotulo}>
      {itens.map((item) => (
        <li key={item.chave}>
          <Link
            href={hrefDe(item.chave)}
            scroll={false}
            className="flex flex-col gap-1.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium">{item.rotulo}</span>
              <span className="shrink-0 tabular-nums">
                <span className="font-semibold">{formatarReais(item.total)}</span>
                <span className="text-muted-foreground"> · {consertos(item.consertos)}</span>
              </span>
            </span>
            <span className="h-2 w-full rounded-full bg-foreground/10" aria-hidden="true">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: maximo > 0 ? `max(${(item.total / maximo) * 100}%, ${item.total > 0 ? "4px" : "0px"})` : 0 }}
              />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
