"use client";

import { useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buscarCep, formatarCep, limparCep, type EnderecoDoCep } from "@/lib/imoveis/cep";

type Aviso = { texto: string; erro?: boolean };

const AJUDA = "Digite o CEP para preencher a rua e o bairro.";

// CEP que preenche o endereço (ViaCEP). Não tem `name`: só ajuda a preencher,
// não vai para o servidor. Ao completar 8 números, busca sozinho.
export function CampoCep({ id, aoEncontrar }: { id: string; aoEncontrar: (endereco: EnderecoDoCep) => void }) {
  const [cep, setCep] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  // Só vale a resposta do último CEP digitado (quem digita rápido não vê uma
  // resposta antiga sobrescrever a nova).
  const ultimaBusca = useRef("");

  async function mudar(evento: React.ChangeEvent<HTMLInputElement>) {
    const formatado = formatarCep(evento.target.value);
    setCep(formatado);
    const digitos = limparCep(formatado);
    ultimaBusca.current = digitos;
    if (digitos.length !== 8) {
      setAviso(null);
      return;
    }

    setBuscando(true);
    setAviso(null);
    const resultado = await buscarCep(digitos);
    if (ultimaBusca.current !== digitos) return;
    setBuscando(false);

    if (!resultado.encontrado) {
      setAviso({
        texto:
          resultado.motivo === "nao-existe"
            ? "CEP não encontrado. Confira os números ou preencha o endereço à mão."
            : "Não deu para buscar o CEP agora. Preencha o endereço à mão.",
        erro: true,
      });
      return;
    }
    const { endereco } = resultado;
    const local = [endereco.cidade, endereco.uf].filter(Boolean).join("/");
    setAviso({
      texto: endereco.logradouro
        ? `Endereço encontrado em ${local}. Confira e informe o número.`
        : `CEP de ${local} sem rua definida: preencha a rua e o bairro.`,
    });
    aoEncontrar(endereco);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>CEP (opcional)</Label>
      <Input
        id={id}
        value={cep}
        onChange={mudar}
        inputMode="numeric"
        autoComplete="postal-code"
        placeholder="Ex.: 01001-000"
        maxLength={10}
        aria-describedby={`${id}-mensagem`}
        className="h-11 text-base sm:max-w-48"
      />
      <p
        id={`${id}-mensagem`}
        role="status"
        className={aviso?.erro ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
      >
        {buscando ? "Buscando o endereço..." : (aviso?.texto ?? AJUDA)}
      </p>
    </div>
  );
}
