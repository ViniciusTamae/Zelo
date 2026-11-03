"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useId, useRef } from "react";

import { Button, buttonVariants } from "@/components/ui/button";

import { excluirImovel, type EstadoExcluir } from "../actions";

const plural = (n: number, um: string, varios: string) => (n === 1 ? `1 ${um}` : `${n} ${varios}`);

// Botão "Excluir imóvel" e a janela de confirmação. O que acontece depende
// dos chamados: sem nenhum, exclui de vez; com chamados (todos resolvidos),
// arquiva para não perder o histórico; com chamado em aberto, não deixa.
export function ExcluirImovel({
  imovelId,
  apelido,
  chamados,
  inquilinos,
}: {
  imovelId: string;
  apelido: string;
  chamados: { total: number; abertos: number };
  inquilinos: number;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [estado, acao, pendente] = useActionState<EstadoExcluir, FormData>(excluirImovel, {});

  const fechar = () => dialogo.current?.close();
  const conteudo =
    chamados.abertos > 0
      ? {
          titulo: "Ainda não dá para excluir",
          texto: `${apelido} tem ${plural(chamados.abertos, "chamado em aberto", "chamados em aberto")}. Resolva antes de excluir: assim nenhum conserto pendente se perde.`,
        }
      : chamados.total === 0
        ? {
            titulo: `Excluir ${apelido}?`,
            texto: `O imóvel ${inquilinos > 0 ? `e ${plural(inquilinos, "inquilino", "inquilinos")} serão apagados, e os links de pedidos param de funcionar` : "será apagado"}. Isso não pode ser desfeito.`,
            botao: "Excluir imóvel",
          }
        : {
            titulo: `Arquivar ${apelido}?`,
            texto: `Ele tem ${plural(chamados.total, "chamado", "chamados")} no histórico. Para não perder o histórico e os gastos, o imóvel será arquivado: sai da lista e os links dos inquilinos param de funcionar. Você pode desarquivar quando quiser.`,
            botao: "Arquivar imóvel",
          };

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        onClick={() => dialogo.current?.showModal()}
        className="h-9"
      >
        <Trash2 aria-hidden="true" />
        Excluir imóvel
      </Button>

      {/* <dialog> do navegador: cuida do foco, do Esc e de bloquear o fundo. */}
      <dialog
        ref={dialogo}
        aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-texto`}
        className="m-auto w-full max-w-md rounded-xl border bg-card p-6 text-card-foreground shadow-xl backdrop:bg-background/70 backdrop:backdrop-blur-[2px]"
      >
        <form action={acao} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={imovelId} />
          <div className="flex flex-col gap-2">
            <h2 id={`${id}-titulo`} className="text-lg font-semibold">
              {conteudo.titulo}
            </h2>
            <p id={`${id}-texto`} className="text-sm text-muted-foreground">
              {conteudo.texto}
            </p>
          </div>

          {estado.erro && (
            <p role="alert" className="text-sm text-destructive">
              {estado.erro}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="h-11" onClick={fechar} autoFocus>
              {conteudo.botao ? "Cancelar" : "Fechar"}
            </Button>
            {conteudo.botao ? (
              <Button
                type="submit"
                disabled={pendente}
                className="h-11 bg-red-700 text-white hover:bg-red-800"
              >
                {pendente ? "Aguarde..." : conteudo.botao}
              </Button>
            ) : (
              <Link href={`/chamados?imovel=${imovelId}`} className={buttonVariants({ className: "h-11" })}>
                Ver chamados do imóvel
              </Link>
            )}
          </div>
        </form>
      </dialog>
    </>
  );
}
