type Endereco = {
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
};

// "Rua A, 10 - Apto 2 - Centro" (o complemento só aparece se existir).
export function formatarEndereco({
  logradouro,
  numero,
  complemento,
  bairro,
}: Endereco) {
  return [`${logradouro}, ${numero}`, complemento, bairro]
    .filter(Boolean)
    .join(" - ");
}
