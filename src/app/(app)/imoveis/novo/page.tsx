import type { Metadata } from "next";

import { FormImovel } from "../form-imovel";
import { ColunaEstreita } from "../../coluna-estreita";

export const metadata: Metadata = {
  title: "Novo imóvel | Zelo",
};

export default function NovoImovelPage() {
  return (
    <ColunaEstreita>
      <h1 className="text-2xl font-semibold">Novo imóvel</h1>
      <FormImovel />
    </ColunaEstreita>
  );
}
