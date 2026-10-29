import { z } from "zod";

// Inscrição de Web Push enviada pelo navegador (PushSubscription.toJSON()).
// O endereço é sempre HTTPS, de um serviço de push (Google, Apple, Mozilla...).
export const inscricaoSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});

// Chave pública VAPID (base64url) no formato que o pushManager.subscribe pede.
export function chaveParaBytes(base64url: string) {
  const preenchido = `${base64url}${"=".repeat((4 - (base64url.length % 4)) % 4)}`;
  const base64 = preenchido.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (caractere) => caractere.charCodeAt(0));
}
