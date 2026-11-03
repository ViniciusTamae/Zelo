"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import { FotoImovel } from "@/components/foto-imovel";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizar } from "@/lib/chamados/filtros";

type Imovel = {
  id: string;
  apelido: string;
  endereco: string;
  inquilinosAtivos: number;
  fotoUrl: string | null;
};

// A busca aparece a partir deste número de imóveis (com poucos, basta olhar).
const MINIMO_PARA_BUSCAR = 4;

// Lista de imóveis com busca por apelido ou endereço. A lista é pequena e já
// está toda aqui, então a busca filtra na hora, sem ir ao servidor.
export function ListaImoveis({ imoveis }: { imoveis: Imovel[] }) {
  const id = useId();
  const [busca, setBusca] = useState("");
  const palavras = normalizar(busca).split(/\s+/).filter(Boolean);
  const encontrados = imoveis.filter((imovel) => {
    const conteudo = normalizar(`${imovel.apelido} ${imovel.endereco}`);
    return palavras.every((palavra) => conteudo.includes(palavra));
  });

  return (
    <div className="flex flex-col gap-4">
      {imoveis.length >= MINIMO_PARA_BUSCAR && (
        <div className="flex flex-col gap-2 lg:max-w-sm">
          <Label htmlFor={`${id}-busca`} className="sr-only">
            Buscar imóvel
          </Label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id={`${id}-busca`}
              type="search"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Buscar por apelido ou endereço"
              maxLength={100}
              aria-describedby={`${id}-resultado`}
              className="h-11 bg-card pl-9 text-base md:text-sm"
            />
          </div>
          <p id={`${id}-resultado`} role="status" className="sr-only">
            {palavras.length > 0 ? `${encontrados.length} de ${imoveis.length} imóveis` : ""}
          </p>
        </div>
      )}

      {encontrados.length === 0 ? (
        <p className="text-muted-foreground">Nenhum imóvel com &quot;{busca.trim()}&quot;.</p>
      ) : (
        // No computador, cartões em grade (3 por linha) com a foto em cima; no
        // celular, lista com a foto pequena à esquerda.
        <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-3">
          {encontrados.map((imovel) => (
            <li key={imovel.id}>
              <Link href={`/imoveis/${imovel.id}`} className="block h-full">
                <Card className="h-full flex-row items-center gap-0 pl-4 transition-colors hover:bg-muted/50 lg:flex-col lg:items-stretch lg:pt-0 lg:pl-0">
                  {/* Envolvida: o Card trata <img> como primeiro filho de outro jeito
                      (tira o espaço de cima), o que desalinharia foto e imagem padrão. */}
                  <div className="shrink-0 lg:w-full">
                    <FotoImovel
                      url={imovel.fotoUrl}
                      apelido={imovel.apelido}
                      className="size-16 rounded-lg lg:aspect-video lg:size-auto lg:w-full lg:rounded-none"
                    />
                  </div>
                  <CardHeader className="flex-1 lg:pt-4">
                    <CardTitle>{imovel.apelido}</CardTitle>
                    <CardDescription>{imovel.endereco}</CardDescription>
                    <CardDescription>
                      {imovel.inquilinosAtivos === 1 ? "1 inquilino" : `${imovel.inquilinosAtivos} inquilinos`}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
