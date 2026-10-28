import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { FormNome } from "./form-nome";

export const metadata: Metadata = {
  title: "Boas-vindas | Zelo",
};

// Primeiro acesso: o login manda para cá enquanto o proprietário não tem nome.
export default function BoasVindasPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Boas-vindas ao Zelo</CardTitle>
          <CardDescription>Como podemos te chamar?</CardDescription>
        </CardHeader>
        <CardContent>
          <FormNome />
        </CardContent>
      </Card>
    </main>
  );
}
