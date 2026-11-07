"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { abrirInstalacao, dispensarFaixa, useComoInstalar, useFaixaDispensada } from "@/lib/pwa/instalacao";

// Registra o service worker em qualquer tela (tela "Sem internet" e avisos).
// Fica no layout raiz; também faz o módulo de instalação começar a escutar
// o pedido de instalação do navegador logo que a página abre.
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Sem service worker o app funciona igual; só perde a tela "Sem internet".
    });
  }, []);
  return null;
}

const BENEFICIO = "Ele abre como um app, direto nos chamados, e recebe os avisos de pedidos novos.";

// iPhone: não há botão de instalar; o caminho é pelo Compartilhar.
function PassosDoIphone() {
  return (
    <ol className="flex flex-col gap-1.5 text-sm">
      <li className="flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-xs font-semibold text-foreground ring-1 ring-foreground/10">
          1
        </span>
        <span>
          Toque em <span className="font-semibold">Compartilhar</span>{" "}
          <Share aria-hidden="true" className="inline size-4 align-text-bottom" />
          <span className="sr-only">(o quadrado com a seta para cima)</span>
        </span>
      </li>
      <li className="flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-xs font-semibold text-foreground ring-1 ring-foreground/10">
          2
        </span>
        <span>
          Escolha <span className="font-semibold">Adicionar à Tela de Início</span>{" "}
          <SquarePlus aria-hidden="true" className="inline size-4 align-text-bottom" />
        </span>
      </li>
    </ol>
  );
}

function BotaoInstalar({ className }: { className?: string }) {
  const [ocupado, setOcupado] = useState(false);
  return (
    <Button
      type="button"
      disabled={ocupado}
      className={className}
      onClick={async () => {
        setOcupado(true);
        try {
          await abrirInstalacao();
        } finally {
          setOcupado(false);
        }
      }}
    >
      <Download aria-hidden="true" />
      Instalar o Zelo
    </Button>
  );
}

// Faixa no topo de Chamados, só no celular. "Agora não" esconde por 30 dias;
// quem quiser instalar depois encontra o mesmo em Ajustes.
export function FaixaInstalar() {
  const como = useComoInstalar();
  const dispensada = useFaixaDispensada();
  if (dispensada || (como !== "android" && como !== "iphone")) return null;

  return (
    <section
      aria-labelledby="faixa-instalar-titulo"
      className="relative flex flex-col gap-3 rounded-xl bg-secondary p-4 pr-12 text-secondary-foreground lg:hidden"
    >
      <button
        type="button"
        onClick={dispensarFaixa}
        aria-label="Fechar dica"
        className="absolute top-2 right-2 rounded-md p-2 opacity-70 hover:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
      <div className="flex flex-col gap-1">
        <h2 id="faixa-instalar-titulo" className="font-semibold">
          Instale o Zelo no celular
        </h2>
        <p className="text-sm">
          {BENEFICIO}
          {como === "iphone" && " No iPhone, os avisos só funcionam com ele instalado."}
        </p>
      </div>
      {como === "android" ? (
        <div className="flex flex-wrap gap-2">
          <BotaoInstalar className="h-11 text-base" />
          <Button type="button" variant="ghost" className="h-11 text-base" onClick={dispensarFaixa}>
            Agora não
          </Button>
        </div>
      ) : (
        <PassosDoIphone />
      )}
    </section>
  );
}

// Cartão em Ajustes: sempre disponível enquanto o Zelo não estiver instalado
// (no computador, aparece se o navegador oferece instalar).
export function CartaoInstalar({ className }: { className?: string }) {
  const como = useComoInstalar();
  if (como !== "android" && como !== "iphone") return null;

  return (
    <Card aria-label="Instalar o app" className={className}>
      <CardHeader>
        <CardTitle>Instalar o app</CardTitle>
        <CardDescription>
          Coloque o Zelo na Tela de Início. {BENEFICIO}
          {como === "iphone" && " No iPhone, os avisos só funcionam com ele instalado."}
        </CardDescription>
      </CardHeader>
      <CardContent>{como === "android" ? <BotaoInstalar className="h-11 text-base lg:h-9 lg:text-sm" /> : <PassosDoIphone />}</CardContent>
    </Card>
  );
}
