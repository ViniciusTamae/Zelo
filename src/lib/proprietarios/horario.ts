// O banco devolve horários como "21:00:00"; na tela fica "21h" (ou "21h30").
export function formatarHora(hora: string) {
  const [h, m] = hora.split(":");
  const horas = String(Number(h));
  return m && m !== "00" ? `${horas}h${m}` : `${horas}h`;
}

export function formatarSilencio(inicio: string, fim: string) {
  return `Das ${formatarHora(inicio)} às ${formatarHora(fim)}`;
}
