"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ErroPainel({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-xl font-semibold">Algo deu errado</h1>
      <p className="text-muted-foreground">
        Não foi possível concluir a ação. Verifique sua conexão e tente de novo.
      </p>
      <Button onClick={() => retry()}>Tentar de novo</Button>
    </div>
  );
}
