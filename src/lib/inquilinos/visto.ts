// "Visto em 28/10/2026 às 14:05" (horário de Brasília), para o dono saber se o
// inquilino já abriu o link.
const formato = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function textoVistoEm(ultimoAcessoEm: string | null) {
  if (!ultimoAcessoEm) return "Ainda não abriu o link";
  const partes = Object.fromEntries(
    formato.formatToParts(new Date(ultimoAcessoEm)).map(({ type, value }) => [type, value]),
  );
  return `Visto em ${partes.day}/${partes.month}/${partes.year} às ${partes.hour}:${partes.minute}`;
}
