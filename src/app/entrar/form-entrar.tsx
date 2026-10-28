"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { entrar, type EstadoEntrar } from "./actions";

const estadoInicial: EstadoEntrar = { etapa: "email" };

// Só exibe o estado devolvido pela Server Action; as regras ficam em actions.ts.
export function FormEntrar() {
  const [estado, acao, pendente] = useActionState(entrar, estadoInicial);

  if (estado.etapa === "email") {
    return (
      <form action={acao} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
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
        <Label htmlFor="codigo">Código</Label>
        <Input
          id="codigo"
          name="codigo"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="000000"
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
        <Button
          type="submit"
          name="intencao"
          value="reenviar"
          variant="link"
          formNoValidate
          disabled={pendente}
          className="px-0"
        >
          Reenviar código
        </Button>
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
