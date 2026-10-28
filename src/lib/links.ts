// Link exclusivo que o inquilino usa para abrir chamados, sem login.
export function linkDoInquilino(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new URL(`/c/${token}`, base).toString();
}
