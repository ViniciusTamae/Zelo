"use client";

import { useSyncExternalStore } from "react";

// Instalar o Zelo na Tela de Início (PWA).
// - Android (Chrome e afins): o navegador avisa que dá para instalar com o
//   evento `beforeinstallprompt`; guardamos o evento para abrir a instalação
//   quando a pessoa tocar em "Instalar".
// - iPhone: o Safari não tem esse evento nem botão de instalar; a dica ensina
//   o caminho (Compartilhar -> Adicionar à Tela de Início).
// - Já instalado (aberto como app) ou navegador sem suporte: nada a mostrar.

export type ComoInstalar = "android" | "iphone" | "instalado" | "indisponivel";

type EventoDeInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let pedido: EventoDeInstalacao | null = null;
let instaladoAgora = false;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((ouvinte) => ouvinte());

// Os eventos podem chegar antes de qualquer tela usar o hook: escuta assim
// que este módulo carrega (ele é importado pelo layout raiz).
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (evento) => {
    // Sem isto o Chrome mostra a própria barra de instalação na hora errada.
    evento.preventDefault();
    pedido = evento as EventoDeInstalacao;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    pedido = null;
    instaladoAgora = true;
    avisar();
  });
}

export function ehIphone(agenteDoUsuario: string, plataforma = "", toques = 0) {
  // iPad recente se apresenta como Mac, mas tem tela de toque.
  return /iPhone|iPad|iPod/.test(agenteDoUsuario) || (plataforma === "MacIntel" && toques > 1);
}

function situacaoAtual(): ComoInstalar {
  const aberto = window.matchMedia("(display-mode: standalone)").matches;
  const naTelaDeInicioDoIphone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (instaladoAgora || aberto || naTelaDeInicioDoIphone) return "instalado";
  if (pedido) return "android";
  if (ehIphone(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)) return "iphone";
  return "indisponivel";
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

// No servidor (e na primeira renderização) não dá para saber: null.
export function useComoInstalar(): ComoInstalar | null {
  return useSyncExternalStore(assinar, situacaoAtual, () => null);
}

// Abre a instalação do navegador (Android). Devolve true se a pessoa instalou.
export async function abrirInstalacao() {
  if (!pedido) return false;
  const atual = pedido;
  await atual.prompt();
  const { outcome } = await atual.userChoice;
  // O mesmo evento não pode ser usado de novo.
  pedido = null;
  avisar();
  return outcome === "accepted";
}

// ---------------------------------------------------------------------------
// "Agora não" na faixa de Chamados: some por 30 dias neste aparelho.
// ---------------------------------------------------------------------------

const CHAVE_DISPENSADA = "zelo:instalar-dispensado-em";
export const DIAS_SEM_A_FAIXA = 30;
const ouvintesDaFaixa = new Set<() => void>();
// Vale mesmo sem armazenamento (aba anônima), até recarregar a página.
let dispensadaNestaVisita = false;

function faixaDispensada() {
  if (dispensadaNestaVisita) return true;
  try {
    const em = Number(localStorage.getItem(CHAVE_DISPENSADA));
    return Boolean(em) && Date.now() - em < DIAS_SEM_A_FAIXA * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function useFaixaDispensada() {
  return useSyncExternalStore(
    (ouvinte) => {
      ouvintesDaFaixa.add(ouvinte);
      return () => ouvintesDaFaixa.delete(ouvinte);
    },
    faixaDispensada,
    // No servidor, considera dispensada: a faixa só aparece no navegador.
    () => true,
  );
}

export function dispensarFaixa() {
  try {
    localStorage.setItem(CHAVE_DISPENSADA, String(Date.now()));
  } catch {
    // Sem armazenamento: fica só a marca desta visita.
  }
  dispensadaNestaVisita = true;
  ouvintesDaFaixa.forEach((ouvinte) => ouvinte());
}
