"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { cn } from "cn";

// Notificações do computador: avisos de confirmação ("Nome salvo.", "Imóvel
// excluído.") aparecem no canto inferior direito e somem sozinhos. No celular
// a área não aparece (hidden lg:flex): lá cada aviso continua no próprio lugar
// da tela, e quem usa a notificação esconde o aviso no lugar com lg:hidden.

type Notificacao = { id: number; texto: string; erro?: boolean };
type Notificar = (texto: string, opcoes?: { erro?: boolean }) => void;

// Tempo na tela; erro fica mais, para dar tempo de ler.
const DURACAO_MS = 5000;
const DURACAO_ERRO_MS = 8000;
// No máximo estas na pilha (as mais antigas saem).
const MAXIMO = 3;

const Contexto = createContext<Notificar>(() => {});

export function ProvedorNotificacoes({ children }: { children: React.ReactNode }) {
  const [lista, setLista] = useState<Notificacao[]>([]);
  const proximoId = useRef(0);
  const ultima = useRef({ texto: "", em: 0 });

  const fechar = useCallback((id: number) => setLista((atual) => atual.filter((n) => n.id !== id)), []);

  const notificar = useCallback<Notificar>((texto, opcoes = {}) => {
    // O mesmo aviso duas vezes seguidas (ex.: efeito rodando de novo) vira um só.
    const agora = Date.now();
    if (ultima.current.texto === texto && agora - ultima.current.em < 1000) return;
    ultima.current = { texto, em: agora };
    const id = ++proximoId.current;
    setLista((atual) => [...atual, { id, texto, erro: opcoes.erro }].slice(-MAXIMO));
  }, []);

  return (
    <Contexto.Provider value={notificar}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notificações"
        className="pointer-events-none fixed right-6 bottom-6 z-50 hidden w-96 max-w-[calc(100vw-3rem)] flex-col gap-2 lg:flex"
      >
        {lista.map((notificacao) => (
          <ItemNotificacao key={notificacao.id} notificacao={notificacao} aoFechar={fechar} />
        ))}
      </div>
    </Contexto.Provider>
  );
}

function ItemNotificacao({ notificacao, aoFechar }: { notificacao: Notificacao; aoFechar: (id: number) => void }) {
  const [pausada, setPausada] = useState(false);

  // Some sozinha; com o mouse em cima, espera (dá tempo de ler).
  useEffect(() => {
    if (pausada) return;
    const espera = setTimeout(() => aoFechar(notificacao.id), notificacao.erro ? DURACAO_ERRO_MS : DURACAO_MS);
    return () => clearTimeout(espera);
  }, [pausada, notificacao, aoFechar]);

  const Icone = notificacao.erro ? CircleAlert : CircleCheck;
  return (
    <div
      onMouseEnter={() => setPausada(true)}
      onMouseLeave={() => setPausada(false)}
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-xl border bg-card p-4 text-sm text-card-foreground shadow-lg",
        "transition duration-200 ease-out starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none",
        notificacao.erro && "border-destructive/40",
      )}
    >
      <Icone
        aria-hidden="true"
        className={cn(
          "mt-0.5 size-5 shrink-0",
          notificacao.erro ? "text-destructive" : "text-status-resolvido-foreground",
        )}
      />
      <p className="flex-1">{notificacao.texto}</p>
      <button
        type="button"
        onClick={() => aoFechar(notificacao.id)}
        aria-label="Fechar notificação"
        className="-m-1 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

export function useNotificar() {
  return useContext(Contexto);
}

// Mostra `texto` numa notificação quando `origem` muda: o retorno de um
// formulário (o estado do useActionState) ou um aviso guardado em estado. Só a
// origem dispara; o texto pode ser montado a cada renderização sem repetir.
export function useNotificarQuandoMudar(origem: unknown, texto: string | undefined, erro = false) {
  const notificar = useNotificar();
  const atual = useRef({ texto, erro });
  useEffect(() => {
    atual.current = { texto, erro };
  });
  useEffect(() => {
    if (atual.current.texto) notificar(atual.current.texto, { erro: atual.current.erro });
  }, [origem, notificar]);
}

// Notificação ao abrir a página (aviso que veio na URL, como ?aviso=excluido).
// Tira o parâmetro da URL, para recarregar a página não repetir o aviso.
export function NotificarAoAbrir({ texto, parametro }: { texto: string; parametro: string }) {
  const notificar = useNotificar();
  useEffect(() => {
    notificar(texto);
    const url = new URL(window.location.href);
    url.searchParams.delete(parametro);
    window.history.replaceState(window.history.state, "", url);
  }, [texto, parametro, notificar]);
  return null;
}
