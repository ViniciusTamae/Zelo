"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { Camera, Star } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useSyncExternalStore, useTransition } from "react";
import { cn } from "cn";

import { useNotificar } from "@/components/notificacoes";
import { StatusBadge } from "@/components/status-badge";
import type { StatusVisual } from "@/lib/chamados/status";
import { transicaoPermitida, type StatusChamado } from "@/lib/chamados/transicoes";

import { mudarStatus } from "./actions";
import { DialogoResolver } from "./dialogo-resolver";

// Cartão já pronto para exibir (textos de data calculados no servidor, para
// o que aparece na tela ser igual no servidor e no navegador).
export type CartaoDoQuadro = {
  id: string;
  status: StatusChamado;
  urgente: boolean;
  titulo: string;
  descricao: string;
  rodape: string;
  temFoto: boolean;
  valor: string | null;
  nota: number | null;
  href: string;
};

export type ColunaDoQuadro = { status: StatusChamado; titulo: string; cartoes: CartaoDoQuadro[] };

type Movimento = { id: string; para: StatusChamado };

// Etiqueta do status no cartão ("aberto" aparece como "Novo").
const STATUS_DA_ETIQUETA: Record<StatusChamado, StatusVisual> = {
  aberto: "novo",
  em_andamento: "em_andamento",
  resolvido: "resolvido",
};

// Move o cartão para o topo da coluna de destino (antes da resposta do servidor).
function moverCartao(colunas: ColunaDoQuadro[], { id, para }: Movimento) {
  const cartao = colunas.flatMap((coluna) => coluna.cartoes).find((c) => c.id === id);
  if (!cartao) return colunas;
  const movido: CartaoDoQuadro = { ...cartao, status: para };
  return colunas.map((coluna) => ({
    ...coluna,
    cartoes:
      coluna.status === para
        ? [movido, ...coluna.cartoes.filter((c) => c.id !== id)]
        : coluna.cartoes.filter((c) => c.id !== id),
  }));
}

// Teclado: setas para a esquerda/direita pulam direto para a coluna vizinha.
const coordenadasDoTeclado: KeyboardCoordinateGetter = (evento, { context }) => {
  if (evento.code !== "ArrowLeft" && evento.code !== "ArrowRight") return undefined;
  evento.preventDefault();
  // Mede as colunas na hora (logo no começo do arraste o dnd-kit ainda não mediu).
  const colunas = context.droppableContainers
    .getEnabled()
    .map((coluna) => ({ id: coluna.id, rect: coluna.node.current?.getBoundingClientRect() }))
    .filter((coluna) => coluna.rect)
    .sort((a, b) => a.rect!.left - b.rect!.left);
  // Coluna atual: a que está sob o cartão (vale mesmo no primeiro toque de
  // seta, antes de o dnd-kit saber sobre qual coluna o cartão está).
  const cartao = context.activeNode?.getBoundingClientRect();
  const meio = cartao ? cartao.left + cartao.width / 2 : undefined;
  const atual = colunas.findIndex(({ id, rect }) =>
    meio !== undefined ? meio >= rect!.left && meio <= rect!.right : id === context.over?.id,
  );
  const destino = colunas[atual + (evento.code === "ArrowRight" ? 1 : -1)];
  if (!destino) return undefined;
  return { x: destino.rect!.left + 12, y: destino.rect!.top + 40 };
};

// Mouse/dedo: a coluna sob o ponteiro; teclado: a coluna mais perto do cartão.
const detectarColuna: CollisionDetection = (args) => {
  const sobPonteiro = pointerWithin(args);
  return sobPonteiro.length > 0 ? sobPonteiro : closestCenter(args);
};

// Ao soltar um cartão, o navegador ainda dispara um clique nele (o mouse foi
// apertado e solto em cima do cartão, que acompanhava o ponteiro), e o clique
// abriria o detalhe. Esse clique é barrado antes de chegar ao cartão.
function ignorarProximoClique() {
  const barrar = (evento: MouseEvent) => {
    evento.preventDefault();
    evento.stopPropagation();
  };
  window.addEventListener("click", barrar, { capture: true, once: true });
  setTimeout(() => window.removeEventListener("click", barrar, { capture: true }), 300);
}

// Verdadeiro só depois que a página carregou no navegador (o arrastar só
// funciona a partir daí; no HTML vindo do servidor os cartões são links).
const nada = () => () => {};
function useNoNavegador() {
  return useSyncExternalStore(nada, () => true, () => false);
}

// Quadro de chamados do computador: uma coluna por status. Arrastar um cartão
// para outra coluna muda o status (mesmas regras dos botões do detalhe).
export function Quadro({
  colunas,
  selecionado,
  resumoDosFiltros,
}: {
  colunas: ColunaDoQuadro[];
  selecionado?: string;
  // Com filtros ligados, a linha da dica diz quantos chamados aparecem.
  resumoDosFiltros?: string;
}) {
  const [exibidas, moverOtimista] = useOptimistic(colunas, moverCartao);
  const [, iniciarTransicao] = useTransition();
  // Confirmações e movimentos recusados aparecem como notificação no canto.
  const notificar = useNotificar();
  const setAviso = (aviso: { texto: string; erro?: boolean }) => notificar(aviso.texto, { erro: aviso.erro });
  const [aResolver, setAResolver] = useState<CartaoDoQuadro | null>(null);
  const pronto = useNoNavegador();

  const sensores = useSensors(
    // Só vira arraste depois de mexer 8 px: um clique normal abre o detalhe.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // Enter fica para abrir o detalhe; o arraste pelo teclado começa no espaço.
    useSensor(KeyboardSensor, {
      coordinateGetter: coordenadasDoTeclado,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    }),
  );

  const tituloDaColuna = (status: unknown) => colunas.find((c) => c.status === status)?.titulo ?? "";
  const tituloDoCartao = (id: unknown) =>
    colunas.flatMap((c) => c.cartoes).find((c) => c.id === id)?.titulo ?? "chamado";

  const anuncios: Announcements = {
    onDragStart: ({ active }) => `Pegou o chamado ${tituloDoCartao(active.id)}.`,
    onDragOver: ({ over }) => (over ? `Sobre a coluna ${tituloDaColuna(over.id)}.` : "Fora das colunas."),
    onDragEnd: ({ over }) =>
      over ? `Chamado solto na coluna ${tituloDaColuna(over.id)}.` : "Chamado solto fora das colunas.",
    onDragCancel: () => "Movimento cancelado. O chamado voltou para o lugar.",
  };

  function mover(cartao: CartaoDoQuadro, para: StatusChamado) {
    iniciarTransicao(async () => {
      moverOtimista({ id: cartao.id, para });
      const formulario = new FormData();
      formulario.set("chamado_id", cartao.id);
      formulario.set("status", para);
      formulario.set("nota", "");
      formulario.set("valor", "");
      const resultado = await mudarStatus({}, formulario);
      setAviso(
        resultado.sucesso
          ? { texto: `${cartao.titulo}: ${resultado.sucesso}` }
          : { texto: resultado.erroGeral ?? "Não foi possível mudar o status.", erro: true },
      );
    });
  }

  function aoSoltar({ active, over }: DragEndEvent) {
    ignorarProximoClique();
    const cartao = colunas.flatMap((c) => c.cartoes).find((c) => c.id === active.id);
    const para = over?.id as StatusChamado | undefined;
    if (!cartao || !para || para === cartao.status) return;

    if (!transicaoPermitida(cartao.status, para)) {
      setAviso({
        texto:
          para === "aberto"
            ? "Um chamado não volta para Novos. Use Em andamento para reabrir."
            : `Não dá para passar de ${tituloDaColuna(cartao.status)} para ${tituloDaColuna(para)}.`,
        erro: true,
      });
      return;
    }
    // Resolver pede o recado e o custo (opcionais) antes de salvar.
    if (para === "resolvido") {
      setAResolver(cartao);
      return;
    }
    mover(cartao, para);
  }

  return (
    <div className="flex flex-col gap-3" data-pronto={pronto || undefined}>
      <p className="min-h-5 text-sm text-muted-foreground">
        {resumoDosFiltros ?? "Arraste para mudar o status. Clique para ver o detalhe."}
      </p>

      <DndContext
        id="quadro-de-chamados"
        sensors={sensores}
        collisionDetection={detectarColuna}
        onDragEnd={aoSoltar}
        onDragCancel={ignorarProximoClique}
        accessibility={{
          announcements: anuncios,
          screenReaderInstructions: {
            draggable:
              "Para mudar o status, aperte espaço para pegar o chamado, use as setas para a esquerda e para a direita para trocar de coluna e aperte espaço de novo para soltar. Esc cancela. Enter abre o detalhe.",
          },
        }}
      >
        {/* As colunas têm a mesma altura e vão até o fim da tela: dá para soltar
            um cartão em qualquer ponto, mesmo numa coluna quase vazia. */}
        <div className="grid min-h-[calc(100dvh-12.5rem)] grid-cols-3 gap-4">
          {exibidas.map((coluna) => (
            <Coluna key={coluna.status} coluna={coluna}>
              {coluna.cartoes.map((cartao) => (
                <li key={cartao.id}>
                  <Cartao cartao={cartao} selecionado={cartao.id === selecionado} />
                </li>
              ))}
            </Coluna>
          ))}
        </div>
      </DndContext>

      {aResolver && (
        <DialogoResolver
          chamadoId={aResolver.id}
          titulo={aResolver.titulo}
          aoFechar={(resolvido) => {
            setAResolver(null);
            if (resolvido) setAviso({ texto: `${aResolver.titulo}: Chamado marcado como resolvido.` });
          }}
        />
      )}
    </div>
  );
}

function Coluna({ coluna, children }: { coluna: ColunaDoQuadro; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.status });

  return (
    <section
      ref={setNodeRef}
      aria-label={coluna.titulo}
      className={cn(
        "flex min-h-48 flex-col gap-3 rounded-xl bg-muted p-3 transition-shadow",
        isOver && "ring-2 ring-ring/60",
      )}
    >
      {/* O título acompanha a rolagem em colunas compridas. */}
      <h2 className="sticky top-0 z-[1] -mx-3 -mt-3 flex items-center gap-2 rounded-t-xl bg-muted px-4 pt-3 pb-1 text-sm font-semibold">
        {coluna.titulo}
        {coluna.status === "resolvido" && (
          <span className="text-xs font-normal text-muted-foreground">Últimos 30 dias</span>
        )}
        <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-xs text-muted-foreground">
          {coluna.cartoes.length}
        </span>
      </h2>
      {coluna.cartoes.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">Nenhum chamado</p>
      ) : (
        <ul className="flex flex-col gap-2">{children}</ul>
      )}
    </section>
  );
}

function Cartao({ cartao, selecionado }: { cartao: CartaoDoQuadro; selecionado: boolean }) {
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({
    id: cartao.id,
    data: { status: cartao.status },
  });

  return (
    <Link
      ref={setNodeRef}
      href={cartao.href}
      scroll={false}
      {...listeners}
      {...attributes}
      // O dnd-kit marca o cartão como "button"; para o leitor de tela ele é um link.
      role="link"
      aria-current={selecionado ? "true" : undefined}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn(
        "flex touch-none flex-col gap-2 rounded-lg border bg-card p-3 text-left shadow-xs transition-colors hover:border-foreground/30",
        selecionado && "border-ring ring-2 ring-ring/40",
        isDragging && "relative z-10 cursor-grabbing shadow-lg ring-2 ring-ring/40",
      )}
    >
      <span className="text-sm font-semibold">{cartao.titulo}</span>
      {/* Etiquetas numa linha própria, para o título não quebrar. O urgente
          continua marcado em andamento (ainda é prioridade) e sai ao resolver. */}
      <div className="flex flex-wrap gap-1.5">
        <StatusBadge status={STATUS_DA_ETIQUETA[cartao.status]} className="text-xs" />
        {cartao.urgente && cartao.status !== "resolvido" && <StatusBadge status="urgente" className="text-xs" />}
      </div>
      <p className="line-clamp-2 text-sm">{cartao.descricao}</p>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>{cartao.rodape}</span>
        {cartao.temFoto && <Camera aria-label="Com foto" className="size-3.5" />}
        {cartao.valor && <span>· {cartao.valor}</span>}
        {cartao.nota !== null && (
          <span className="flex items-center gap-0.5">
            · <Star aria-hidden="true" className="size-3 fill-estrela text-estrela" />
            {cartao.nota} de 5
          </span>
        )}
      </p>
    </Link>
  );
}
