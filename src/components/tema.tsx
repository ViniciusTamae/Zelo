"use client";

import { ThemeProvider } from "next-themes";

// Tema claro/escuro: segue o modo do celular, a não ser que a pessoa escolha
// outro em Ajustes > Aparência (fica guardado no navegador, por aparelho).
// O next-themes põe a classe .dark no <html> antes da página aparecer.
export function Tema({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
