"use client";

import { BellOff, BellRing } from "lucide-react";
import { useEffect, useState } from "react";

import { useNotificarQuandoMudar } from "@/components/notificacoes";
import { Button } from "@/components/ui/button";
import { chaveParaBytes } from "@/lib/push/esquemas";

import { enviarAvisoTeste, removerInscricao, salvarInscricao } from "./actions";

type Situacao = "carregando" | "sem-suporte" | "instalar-no-iphone" | "bloqueado" | "desligado" | "ligado";

const CHAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

// Permissão de notificações deste site. Usa a Permissions API quando existe
// (é a fonte mais confiável) e cai para Notification.permission se não.
async function permissaoDeAvisos(): Promise<PermissionState | NotificationPermission> {
  try {
    return (await navigator.permissions.query({ name: "notifications" })).state;
  } catch {
    return Notification.permission;
  }
}

// Descobre se este aparelho pode receber avisos e se já está inscrito.
async function descobrirSituacao(): Promise<Situacao> {
  const ehIphone = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const instalado = window.matchMedia("(display-mode: standalone)").matches;
  // No iPhone, Web Push só funciona com o Zelo adicionado à Tela de Início.
  if (ehIphone && !instalado) return "instalar-no-iphone";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !CHAVE_PUBLICA) {
    return "sem-suporte";
  }
  if ((await permissaoDeAvisos()) === "denied") return "bloqueado";

  const registro = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  const inscricao = await registro.pushManager.getSubscription();
  if (!inscricao) return "desligado";
  // Reenvia ao servidor: garante que a inscrição deste aparelho está salva.
  await salvarInscricao(inscricao.toJSON());
  return "ligado";
}

// Liga e desliga os avisos (Web Push) neste aparelho.
export function AvisosAparelho() {
  const [situacao, setSituacao] = useState<Situacao>("carregando");
  const [mensagem, setMensagem] = useState<{ texto: string; erro?: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  // A confirmação vira notificação no computador; o erro fica aqui.
  useNotificarQuandoMudar(mensagem, mensagem?.erro ? undefined : mensagem?.texto);

  useEffect(() => {
    descobrirSituacao()
      .then(setSituacao)
      .catch(() => setSituacao("sem-suporte"));
  }, []);

  async function ligar() {
    setOcupado(true);
    setMensagem(null);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setSituacao(permissao === "denied" ? "bloqueado" : "desligado");
        return;
      }
      const registro = await navigator.serviceWorker.ready;
      const inscricao = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: chaveParaBytes(CHAVE_PUBLICA),
      });
      const { ok } = await salvarInscricao(inscricao.toJSON());
      if (!ok) throw new Error("inscrição recusada");
      setSituacao("ligado");
      setMensagem({ texto: "Avisos ligados neste aparelho." });
    } catch {
      setMensagem({ texto: "Não foi possível ligar os avisos neste aparelho. Tente de novo.", erro: true });
    } finally {
      setOcupado(false);
    }
  }

  async function desligar() {
    setOcupado(true);
    setMensagem(null);
    try {
      const registro = await navigator.serviceWorker.ready;
      const inscricao = await registro.pushManager.getSubscription();
      if (inscricao) {
        await removerInscricao(inscricao.endpoint);
        await inscricao.unsubscribe();
      }
      setSituacao("desligado");
      setMensagem({ texto: "Avisos desligados neste aparelho." });
    } finally {
      setOcupado(false);
    }
  }

  async function testar() {
    setOcupado(true);
    const resultado = await enviarAvisoTeste();
    setMensagem({ texto: resultado.mensagem, erro: !resultado.ok });
    setOcupado(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {situacao === "carregando" && <p className="text-muted-foreground">Verificando...</p>}
      {situacao === "sem-suporte" && (
        <p className="text-muted-foreground">
          Este navegador não recebe avisos. No celular, use o Chrome (Android) ou o
          Safari com o Zelo na Tela de Início (iPhone).
        </p>
      )}
      {situacao === "instalar-no-iphone" && (
        <p className="text-muted-foreground">
          No iPhone, os avisos só funcionam com o Zelo na Tela de Início: toque em
          Compartilhar e depois em &quot;Adicionar à Tela de Início&quot;. Abra o Zelo
          por lá e volte aqui.
        </p>
      )}
      {situacao === "bloqueado" && (
        <p className="text-muted-foreground">
          Os avisos estão bloqueados para o Zelo neste navegador. Libere as
          notificações nas configurações do site e recarregue a página.
        </p>
      )}
      {situacao === "desligado" && (
        <>
          <p className="text-muted-foreground">
            Receba um aviso no celular quando chegar um pedido de conserto.
          </p>
          <Button onClick={ligar} disabled={ocupado} className="h-11 text-base">
            <BellRing aria-hidden="true" />
            Ligar avisos neste aparelho
          </Button>
        </>
      )}
      {situacao === "ligado" && (
        <>
          <p className="flex items-center gap-2">
            <BellRing aria-hidden="true" className="size-4" />
            Avisos ligados neste aparelho.
          </p>
          <Button variant="outline" onClick={testar} disabled={ocupado} className="h-11 text-base">
            Enviar aviso de teste
          </Button>
          <Button variant="outline" onClick={desligar} disabled={ocupado} className="h-11 text-base">
            <BellOff aria-hidden="true" />
            Desligar avisos neste aparelho
          </Button>
        </>
      )}
      {mensagem && (
        <p
          role={mensagem.erro ? "alert" : "status"}
          className={mensagem.erro ? "text-sm text-destructive" : "text-sm text-status-resolvido-foreground lg:hidden"}
        >
          {mensagem.texto}
        </p>
      )}
    </div>
  );
}
