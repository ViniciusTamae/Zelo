// Service worker do Zelo: mostra os avisos (Web Push) e abre a página certa
// quando o proprietário toca neles. O conteúdo vem da Edge Function
// entregar-notificacoes: { titulo, corpo, url, tag }.

self.addEventListener("push", (evento) => {
  const aviso = evento.data ? evento.data.json() : {};
  evento.waitUntil(
    self.registration.showNotification(aviso.titulo || "Zelo", {
      body: aviso.corpo || "",
      icon: "/icons/icon-192.png",
      tag: aviso.tag,
      data: { url: aviso.url || "/chamados" },
    }),
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const url = new URL(evento.notification.data?.url || "/chamados", self.location.origin).href;

  evento.waitUntil(
    (async () => {
      // Reaproveita uma janela do Zelo já aberta; senão, abre uma nova.
      const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const janela of janelas) {
        if (new URL(janela.url).origin === self.location.origin && "focus" in janela) {
          await janela.focus();
          return janela.navigate(url);
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
