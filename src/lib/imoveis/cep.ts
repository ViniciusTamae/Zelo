// Busca de endereço pelo CEP no ViaCEP (gratuito, sem chave), feita pelo
// navegador do proprietário no cadastro do imóvel. O CEP só ajuda a preencher
// rua e bairro; não é guardado.

const URL_VIACEP = "https://viacep.com.br/ws";
// Sem resposta nesse tempo, a pessoa preenche à mão.
const TEMPO_MAXIMO_MS = 6000;

export type EnderecoDoCep = { logradouro: string; bairro: string; cidade: string; uf: string };

export type ResultadoCep =
  | { encontrado: true; endereco: EnderecoDoCep }
  | { encontrado: false; motivo: "nao-existe" | "falha" };

// Só os números, no máximo 8 (aceita colar "01001-000" ou "01.001-000").
export function limparCep(texto: string) {
  return texto.replace(/\D/g, "").slice(0, 8);
}

// Máscara enquanto digita: 01001 → 01001, 01001000 → 01001-000.
export function formatarCep(texto: string) {
  const digitos = limparCep(texto);
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}

type RespostaViaCep = {
  erro?: boolean | string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

export async function buscarCep(cep: string, buscar: typeof fetch = fetch): Promise<ResultadoCep> {
  const digitos = limparCep(cep);
  if (digitos.length !== 8) return { encontrado: false, motivo: "nao-existe" };

  try {
    const resposta = await buscar(`${URL_VIACEP}/${digitos}/json/`, {
      signal: AbortSignal.timeout(TEMPO_MAXIMO_MS),
    });
    // O ViaCEP responde 400 para CEP com formato inválido.
    if (resposta.status === 400) return { encontrado: false, motivo: "nao-existe" };
    if (!resposta.ok) return { encontrado: false, motivo: "falha" };

    const dados = (await resposta.json()) as RespostaViaCep;
    // CEP com formato certo mas que não existe: { "erro": true } (ou "true").
    if (dados.erro === true || dados.erro === "true") return { encontrado: false, motivo: "nao-existe" };

    return {
      encontrado: true,
      endereco: {
        logradouro: dados.logradouro?.trim() ?? "",
        bairro: dados.bairro?.trim() ?? "",
        cidade: dados.localidade?.trim() ?? "",
        uf: dados.uf?.trim() ?? "",
      },
    };
  } catch {
    // Sem internet, tempo esgotado ou resposta que não é JSON.
    return { encontrado: false, motivo: "falha" };
  }
}
