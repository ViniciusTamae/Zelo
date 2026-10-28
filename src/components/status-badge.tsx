import { Check, CircleDot, TriangleAlert, Wrench, type LucideIcon } from "lucide-react";
import { cn } from "cn";

import type { StatusVisual } from "@/lib/chamados/status";

const APARENCIA: Record<StatusVisual, { texto: string; icone: LucideIcon; classes: string }> = {
  urgente: {
    texto: "Urgente",
    icone: TriangleAlert,
    classes: "bg-status-urgente text-status-urgente-foreground",
  },
  novo: {
    texto: "Novo",
    icone: CircleDot,
    classes: "bg-status-novo text-status-novo-foreground",
  },
  em_andamento: {
    texto: "Em andamento",
    icone: Wrench,
    classes: "bg-status-andamento text-status-andamento-foreground",
  },
  resolvido: {
    texto: "Resolvido",
    icone: Check,
    classes: "bg-status-resolvido text-status-resolvido-foreground",
  },
};

// Sempre cor + ícone + texto: o status nunca depende só da cor.
export function StatusBadge({ status, className }: { status: StatusVisual; className?: string }) {
  const { texto, icone: Icone, classes } = APARENCIA[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-semibold",
        classes,
        className,
      )}
    >
      <Icone aria-hidden="true" className="size-4" />
      {texto}
    </span>
  );
}
