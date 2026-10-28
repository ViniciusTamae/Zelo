"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  link: string;
  mensagem: string;
};

// No celular abre o menu de compartilhar do sistema (WhatsApp, SMS...);
// onde não houver, copia o link.
export function BotaoCompartilhar({ link, mensagem }: Props) {
  const [copiado, setCopiado] = useState(false);

  async function compartilhar() {
    if (navigator.share) {
      try {
        await navigator.share({ text: `${mensagem}\n${link}` });
        return;
      } catch (erro) {
        // Cancelar o menu de compartilhar não é erro.
        if (erro instanceof DOMException && erro.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem permissão de área de transferência: o link continua visível para copiar à mão.
    }
  }

  return (
    <Button type="button" variant="outline" onClick={compartilhar} className="h-10">
      {copiado ? "Link copiado!" : "Compartilhar link"}
    </Button>
  );
}
