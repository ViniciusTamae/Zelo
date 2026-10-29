"use client";

import Form from "next/form";
import { useId } from "react";

import { Label } from "@/components/ui/label";

// Filtro por imóvel: troca a lista assim que a pessoa escolhe (navegação do
// Next, sem recarregar a página). A aba atual vai junto.
export function FiltroImovel({
  aba,
  imovelId,
  imoveis,
}: {
  aba: string;
  imovelId?: string;
  imoveis: { id: string; apelido: string }[];
}) {
  const id = useId();
  return (
    <Form action="/chamados" className="flex flex-col gap-2">
      <input type="hidden" name="aba" value={aba} />
      <Label htmlFor={id}>Imóvel</Label>
      <select
        id={id}
        name="imovel"
        defaultValue={imovelId ?? ""}
        onChange={(evento) => evento.currentTarget.form?.requestSubmit()}
        className="h-11 rounded-lg border border-input bg-card px-2.5 text-base"
      >
        <option value="">Todos os imóveis</option>
        {imoveis.map(({ id: valor, apelido }) => (
          <option key={valor} value={valor}>
            {apelido}
          </option>
        ))}
      </select>
    </Form>
  );
}
