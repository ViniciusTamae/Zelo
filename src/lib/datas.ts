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

// "agora", "há 10 min", "há 3 h", "há 2 dias" e, depois de uma semana, a data
// ("12/10/2026"). Usado nos cartões do quadro, onde o que importa é quanto
// tempo o chamado está esperando.
export function tempoDesde(iso: string, agora = new Date()) {
  const minutos = Math.floor((agora.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
  return formatarDataHora(iso).split(" às ")[0];
}
