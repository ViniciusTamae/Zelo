import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { FormEntrar } from "./form-entrar";

export const metadata: Metadata = {
  title: "Entrar | Zelo",
};

export default function EntrarPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Zelo</CardTitle>
          <CardDescription>
            Entre com seu e-mail. Você recebe um código, sem precisar de senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormEntrar />
        </CardContent>
      </Card>
    </main>
  );
}
