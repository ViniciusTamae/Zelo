import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CampoTextoProps = Omit<ComponentProps<typeof Input>, "id" | "name"> & {
  id: string;
  nome: string;
  rotulo: string;
  valor?: string;
  erro?: string;
  ajuda?: string;
};

// Rótulo + campo + mensagem (o erro do servidor substitui o texto de ajuda).
// Campos com `required` ganham um * no rótulo.
export function CampoTexto({
  id,
  nome,
  rotulo,
  valor,
  erro,
  ajuda,
  required,
  ...props
}: CampoTextoProps) {
  const mensagem = erro ?? ajuda;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {rotulo}
        {/* Leitores de tela já anunciam "obrigatório" pelo atributo required;
            o -ml-1.5 compensa o espaçamento (gap) que o Label já aplica. */}
        {required && (
          <span aria-hidden="true" className="-ml-1.5 text-destructive">
            *
          </span>
        )}
      </Label>
      <Input
        id={id}
        name={nome}
        defaultValue={valor}
        required={required}
        aria-invalid={Boolean(erro)}
        aria-describedby={mensagem ? `${id}-mensagem` : undefined}
        className="h-11 text-base"
        {...props}
      />
      {mensagem && (
        <p
          id={`${id}-mensagem`}
          className={erro ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
        >
          {mensagem}
        </p>
      )}
    </div>
  );
}

export function LegendaObrigatorio() {
  return (
    <p className="text-sm text-muted-foreground">
      <span aria-hidden="true" className="text-destructive">
        *
      </span>{" "}
      Campo obrigatório
    </p>
  );
}
