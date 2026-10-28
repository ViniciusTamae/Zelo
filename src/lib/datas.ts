// Datas mostradas na tela, sempre no horário de Brasília: "28/10/2026 às 14:05".
const formato = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatarDataHora(iso: string) {
  const partes = Object.fromEntries(
    formato.formatToParts(new Date(iso)).map(({ type, value }) => [type, value]),
  );
  return `${partes.day}/${partes.month}/${partes.year} às ${partes.hour}:${partes.minute}`;
}
