"use client";

import { Moon, Smartphone, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const OPCOES: { valor: string; rotulo: string; icone: LucideIcon }[] = [
  { valor: "system", rotulo: "Automático", icone: Smartphone },
  { valor: "light", rotulo: "Claro", icone: Sun },
  { valor: "dark", rotulo: "Escuro", icone: Moon },
];

// No servidor não dá para saber o tema escolhido (fica guardado no navegador),
// então a opção marcada só aparece depois que a página carrega no aparelho.
const nada = () => () => {};
function useNoNavegador() {
  return useSyncExternalStore(nada, () => true, () => false);
}

// Troca o tema com um esmaecer suave entre o antes e o depois (View
// Transitions). Sem suporte no navegador, ou com "reduzir movimento" ligado
// no celular, troca na hora.
function trocarComTransicao(novo: string, aplicar: (tema: string) => void) {
  const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduzirMovimento) {
    aplicar(novo);
    return;
  }
  document.startViewTransition(() => {
    // O navegador fotografa a tela antes e depois desta função; a classe .dark
    // é aplicada aqui mesmo (o next-themes só aplicaria depois, num efeito).
    const escuro =
      novo === "dark" || (novo === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", escuro);
    document.documentElement.classList.toggle("light", !escuro);
    aplicar(novo);
  });
}

// Tema do app neste aparelho: segue o celular (padrão), claro ou escuro.
export function Aparencia() {
  const { theme, setTheme } = useTheme();
  const noNavegador = useNoNavegador();

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">Tema</legend>
      <div className="grid grid-cols-3 gap-2">
        {OPCOES.map(({ valor, rotulo, icone: Icone }) => (
          <label
            key={valor}
            className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border bg-card p-3 text-sm has-checked:border-secondary-foreground has-checked:bg-secondary has-checked:font-semibold has-checked:text-secondary-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
          >
            <input
              type="radio"
              name="tema"
              value={valor}
              checked={noNavegador && (theme ?? "system") === valor}
              onChange={() => trocarComTransicao(valor, setTheme)}
              className="sr-only"
            />
            <Icone aria-hidden="true" className="size-5" />
            {rotulo}
          </label>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        &quot;Automático&quot; segue o modo claro ou escuro do celular. A escolha vale só
        para este aparelho.
      </p>
    </fieldset>
  );
}
