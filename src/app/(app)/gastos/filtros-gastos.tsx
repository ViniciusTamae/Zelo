"use client";

import { usePathname, useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { Label } from "@/components/ui/label";
import { CATEGORIAS, type Categoria } from "@/lib/chamados/categorias";
import { parametrosDosGastos, PERIODOS, type FiltrosGastos as Filtros, type Periodo } from "@/lib/gastos/resumo";

type Props = {
  filtros: Filtros;
  imoveis: { id: string; apelido: string; arquivado: boolean }[];
};

const CAMPO =
  "h-11 w-full rounded-lg border border-input bg-card px-2.5 text-base focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none lg:h-9 lg:w-auto lg:text-sm";

// Período, imóvel e categoria. Cada mudança vai para a URL e a página relê os
// gastos no servidor. Os campos mudam na hora; a URL acompanha logo depois.
export function FiltrosGastos({ filtros: daUrl, imoveis }: Props) {
  const router = useRouter();
  const caminho = usePathname();
  const id = useId();
  const [pendente, iniciar] = useTransition();

  const [filtros, setFiltros] = useState(daUrl);
  const [urlAnterior, setUrlAnterior] = useState(daUrl);
  if (daUrl !== urlAnterior) {
    setUrlAnterior(daUrl);
    setFiltros(daUrl);
  }

  function aplicar(mudanca: Partial<Filtros>) {
    const novos = { ...filtros, ...mudanca };
    setFiltros(novos);
    const busca = parametrosDosGastos(novos);
    iniciar(() => router.replace(busca.size > 0 ? `${caminho}?${busca}` : caminho, { scroll: false }));
  }

  const ativos = imoveis.filter(({ arquivado }) => !arquivado);
  const arquivados = imoveis.filter(({ arquivado }) => arquivado);

  return (
    <div aria-busy={pendente || undefined} className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:flex lg:items-center lg:gap-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-periodo`} className="lg:sr-only">
          Período
        </Label>
        <select
          id={`${id}-periodo`}
          value={filtros.periodo}
          onChange={(evento) => aplicar({ periodo: evento.target.value as Periodo })}
          className={CAMPO}
        >
          {PERIODOS.map(({ valor, rotulo }) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </div>

      {imoveis.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-imovel`} className="lg:sr-only">
            Imóvel
          </Label>
          <select
            id={`${id}-imovel`}
            value={filtros.imovelId ?? ""}
            onChange={(evento) => aplicar({ imovelId: evento.target.value || undefined })}
            className={CAMPO}
          >
            <option value="">Todos os imóveis</option>
            {ativos.map(({ id: valor, apelido }) => (
              <option key={valor} value={valor}>
                {apelido}
              </option>
            ))}
            {arquivados.length > 0 && (
              <optgroup label="Arquivados">
                {arquivados.map(({ id: valor, apelido }) => (
                  <option key={valor} value={valor}>
                    {apelido}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-categoria`} className="lg:sr-only">
          Categoria
        </Label>
        <select
          id={`${id}-categoria`}
          value={filtros.categoria ?? ""}
          onChange={(evento) => aplicar({ categoria: (evento.target.value || undefined) as Categoria | undefined })}
          className={CAMPO}
        >
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map(({ valor, rotulo }) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
