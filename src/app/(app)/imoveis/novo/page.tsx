import type { Metadata } from "next";

import { FormImovel } from "../form-imovel";

export const metadata: Metadata = {
  title: "Novo imóvel | Zelo",
};

export default function NovoImovelPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Novo imóvel</h1>
      <FormImovel />
    </>
  );
}
