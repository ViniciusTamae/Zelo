"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORIAS, type Categoria } from "@/lib/chamados/categorias";
import { contarFiltrosAtivos, parametrosDosFiltros, type Filtros } from "@/lib/chamados/filtros";

// Quanto esperar depois da última tecla para buscar.
const ESPERA_BUSCA_MS = 350;

type Props = {
  filtros: Filtros;
  imoveis: { id: string; apelido: string }[];
  // Mantidos na URL ao filtrar (ex.: a aba do celular).
  extras?: Record<string, string | undefined>;
};

// Filtros dos chamados. Computador: barra sempre à vista. Celular: botão
// "Filtrar" que abre os mesmos campos. Cada mudança vai para a URL (a página
// relê os chamados no servidor); fechar o painel lateral não é preciso, o
// chamado aberto sai da URL ao filtrar.
export function FiltrosChamados({ filtros: daUrl, imoveis, extras = {} }: Props) {
  const router = useRouter();
  const caminho = usePathname();
  const [pendente, iniciar] = useTransition();
  const [aberto, setAberto] = useState(false);

  // Os campos mudam na hora; a URL (e a lista) acompanha logo depois. Quando
  // a URL muda por fora (voltar no navegador), os campos seguem a URL.
  const [filtros, setFiltros] = useState(daUrl);
  const [urlAnterior, setUrlAnterior] = useState(daUrl);
  if (daUrl !== urlAnterior) {
    setUrlAnterior(daUrl);
    setFiltros(daUrl);
  }
  const ativos = contarFiltrosAtivos(filtros);

  function aplicar(mudanca: Partial<Filtros>) {
    const novos = { ...filtros, ...mudanca };
    setFiltros(novos);
    const busca = parametrosDosFiltros(novos, extras);
    iniciar(() => router.replace(busca.size > 0 ? `${caminho}?${busca}` : caminho, { scroll: false }));
  }

  const campos = (variante: "barra" | "painel") => (
    <CamposDosFiltros
      variante={variante}
      filtros={filtros}
      imoveis={imoveis}
      aplicar={aplicar}
      ativos={ativos}
    />
  );

  return (
    <div aria-busy={pendente || undefined}>
      {/* Computador */}
      <div className="hidden lg:flex lg:flex-wrap lg:items-center lg:justify-end lg:gap-2">{campos("barra")}</div>

      {/* Celular */}
      <div className="flex flex-col gap-3 lg:hidden">
        <Button
          type="button"
          variant="outline"
          aria-expanded={aberto}
          onClick={() => setAberto((valor) => !valor)}
          className="h-11 self-start text-base"
        >
          <SlidersHorizontal aria-hidden="true" />
          Filtrar
          {ativos > 0 && (
            <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground">
              {ativos}
              <span className="sr-only"> {ativos === 1 ? "filtro ligado" : "filtros ligados"}</span>
            </span>
          )}
        </Button>
        {aberto && (
          <div className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">{campos("painel")}</div>
        )}
      </div>
    </div>
  );
}

function CamposDosFiltros({
  variante,
  filtros,
  imoveis,
  aplicar,
  ativos,
}: {
  variante: "barra" | "painel";
  filtros: Filtros;
  imoveis: { id: string; apelido: string }[];
  aplicar: (mudanca: Partial<Filtros>) => void;
  ativos: number;
}) {
  const id = useId();
  const painel = variante === "painel";
  // Na barra os rótulos ficam só para o leitor de tela (o campo já se explica).
  const rotulo = painel ? undefined : "sr-only";
  const campo = cn(
    "rounded-lg border border-input bg-card px-2.5",
    painel ? "h-11 w-full text-base" : "h-9 text-sm",
  );

  return (
    <>
      <div className={cn("flex flex-col gap-2", !painel && "w-60")}>
        <Label htmlFor={`${id}-busca`} className={rotulo}>
          Buscar
        </Label>
        <CampoBusca
          id={`${id}-busca`}
          valor={filtros.busca}
          aoMudar={(busca) => aplicar({ busca })}
          className={painel ? "h-11 text-base" : "h-9 text-sm md:text-sm"}
        />
      </div>

      {imoveis.length > 1 && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-imovel`} className={rotulo}>
            Imóvel
          </Label>
          <select
            id={`${id}-imovel`}
            value={filtros.imovelId ?? ""}
            onChange={(evento) => aplicar({ imovelId: evento.target.value || undefined })}
            className={campo}
          >
            <option value="">Todos os imóveis</option>
            {imoveis.map(({ id: valor, apelido }) => (
              <option key={valor} value={valor}>
                {apelido}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-categoria`} className={rotulo}>
          Categoria
        </Label>
        <select
          id={`${id}-categoria`}
          value={filtros.categoria ?? ""}
          onChange={(evento) => aplicar({ categoria: (evento.target.value || undefined) as Categoria | undefined })}
          className={campo}
        >
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map(({ valor, rotulo: texto }) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </select>
      </div>

      <label
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-lg border border-input bg-card px-3 has-checked:border-status-urgente-foreground has-checked:bg-status-urgente has-checked:text-status-urgente-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
          painel ? "h-11 text-base" : "h-9 text-sm",
        )}
      >
        <input
          type="checkbox"
          checked={filtros.urgentes}
          onChange={(evento) => aplicar({ urgentes: evento.target.checked })}
          className="size-4 accent-status-urgente-foreground"
        />
        Só urgentes
      </label>

      {ativos > 0 && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => aplicar({ imovelId: undefined, categoria: undefined, urgentes: false, busca: "" })}
          className={painel ? "h-11 self-start text-base" : "h-9"}
        >
          <X aria-hidden="true" />
          Limpar filtros
        </Button>
      )}
    </>
  );
}

// Campo de busca: aplica depois de uma pausa na digitação (e na hora com Enter).
function CampoBusca({
  id,
  valor,
  aoMudar,
  className,
}: {
  id: string;
  valor: string;
  aoMudar: (busca: string) => void;
  className: string;
}) {
  const [texto, setTexto] = useState(valor);

  // "Limpar filtros" (ou voltar no navegador) muda a busca por fora.
  const [valorAnterior, setValorAnterior] = useState(valor);
  if (valor !== valorAnterior) {
    setValorAnterior(valor);
    setTexto(valor);
  }

  // `valor` é a busca que já está na URL: só aplica se o texto mudou.
  useEffect(() => {
    const limpo = texto.trim();
    if (limpo === valor) return;
    const espera = setTimeout(() => aoMudar(limpo), ESPERA_BUSCA_MS);
    return () => clearTimeout(espera);
  }, [texto, valor, aoMudar]);

  return (
    <div className="relative">
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        type="search"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        onKeyDown={(evento) => {
          if (evento.key === "Enter") {
            evento.preventDefault();
            if (texto.trim() !== valor) aoMudar(texto.trim());
          }
        }}
        placeholder="Descrição, imóvel ou inquilino"
        maxLength={100}
        className={cn("bg-card pl-8", className)}
      />
    </div>
  );
}
