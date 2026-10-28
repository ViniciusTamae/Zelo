"use client";

import { useActionState, useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { entrar } from "./actions";
import type { EstadoEntrar } from "./esquemas";

// Espera mínima entre dois envios de código (o Supabase também limita).
const ESPERA_REENVIO_SEGUNDOS = 60;

// Só exibe o estado devolvido pela Server Action; as regras ficam em actions.ts.
export function FormEntrar({ estadoInicial }: { estadoInicial: EstadoEntrar }) {
  const [estado, acao, pendente] = useActionState(entrar, estadoInicial);
  // Ids únicos: o Next mantém a tela anterior montada (escondida) na navegação.
  const id = useId();

  // Veio pelo botão do e-mail: tira e-mail e código da barra de endereço
  // (e do histórico) depois que o formulário já está preenchido.
  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, "", "/entrar");
  }, []);

  if (estado.etapa === "email") {
    return (
      <form action={acao} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-email`}>E-mail</Label>
          <Input
            id={`${id}-email`}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            defaultValue={estado.email}
            required
            autoFocus
            aria-invalid={Boolean(estado.erro)}
            className="h-11 text-base"
          />
        </div>

        {estado.erro && (
          <p role="alert" className="text-sm text-destructive">
            {estado.erro}
          </p>
        )}

        <Button
          type="submit"
          name="intencao"
          value="enviar"
          disabled={pendente}
          className="h-11 w-full text-base"
        >
          {pendente ? "Enviando..." : "Receber código por e-mail"}
        </Button>
      </form>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="email" value={estado.email} />

      <p className="text-sm text-muted-foreground">
        Enviamos um código de 6 números para{" "}
        <strong className="text-foreground">{estado.email}</strong>.
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-codigo`}>Código</Label>
        <Input
          id={`${id}-codigo`}
          name="codigo"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="000000"
          defaultValue={estado.codigo}
          required
          autoFocus
          aria-invalid={Boolean(estado.erro)}
          className="h-11 text-center text-lg tracking-[0.5em]"
        />
      </div>

      {estado.erro && (
        <p role="alert" className="text-sm text-destructive">
          {estado.erro}
        </p>
      )}
      {estado.aviso && !estado.erro && (
        <p role="status" className="text-sm text-muted-foreground">
          {estado.aviso}
        </p>
      )}

      <Button
        type="submit"
        name="intencao"
        value="confirmar"
        disabled={pendente}
        className="h-11 w-full text-base"
      >
        {pendente ? "Entrando..." : "Entrar"}
      </Button>

      <div className="flex justify-between">
        {/* Cada código novo (envio) reinicia a espera; quem chega pelo link do
            e-mail pode pedir outro na hora. */}
        <BotaoReenviar
          key={estado.envio ?? "sem-envio"}
          espera={estado.envio ? ESPERA_REENVIO_SEGUNDOS : 0}
          pendente={pendente}
        />
        <Button
          type="submit"
          name="intencao"
          value="trocar"
          variant="link"
          formNoValidate
          disabled={pendente}
          className="px-0"
        >
          Usar outro e-mail
        </Button>
      </div>
    </form>
  );
}

function BotaoReenviar({ espera, pendente }: { espera: number; pendente: boolean }) {
  const [restante, setRestante] = useState(espera);

  // Conta a partir de um horário final (e não de 1 em 1 s): o celular atrasa
  // os timers de abas em segundo plano, e a contagem não pode ficar para trás.
  useEffect(() => {
    if (espera <= 0) return;
    const fim = Date.now() + espera * 1000;
    const timer = setInterval(() => {
      const segundos = Math.max(0, Math.ceil((fim - Date.now()) / 1000));
      setRestante(segundos);
      if (segundos === 0) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
  }, [espera]);

  return (
    <Button
      type="submit"
      name="intencao"
      value="reenviar"
      variant="link"
      formNoValidate
      disabled={pendente || restante > 0}
      className="px-0"
    >
      {restante > 0 ? `Reenviar código em ${restante} s` : "Reenviar código"}
    </Button>
  );
}
