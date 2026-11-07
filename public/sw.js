// Service worker do Zelo:
// - sem internet, mostra a tela "Sem internet" (public/offline.html) no lugar
//   da página de erro do navegador;
// - mostra os avisos (Web Push) e abre a página certa quando o proprietário
//   toca neles. O conteúdo vem da Edge Function entregar-notificacoes:
//   { titulo, corpo, url, tag }.
//
// Só a tela "Sem internet" fica guardada no aparelho: chamados e outros dados
// sempre vêm do servidor (nada desatualizado ou pessoal fica no celular).

// Mude a versão ao alterar o offline.html, para os aparelhos baixarem de novo.
const CACHE = "zelo-offline-v1";
const TELA_SEM_INTERNET = "/offline.html";

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.add(new Request(TELA_SEM_INTERNET, { cache: "reload" }));
      // A versão nova assume sem esperar as abas antigas fecharem.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      // Apaga caches de versões anteriores.
      for (const nome of await caches.keys()) {
        if (nome !== CACHE) await caches.delete(nome);
      }
      await self.clients.claim();
    })(),
  );
});

// Só as navegações (abrir uma página): tenta a rede e, se não houver
// conexão, responde com a tela "Sem internet". O resto passa direto.
self.addEventListener("fetch", (evento) => {
  if (evento.request.mode !== "navigate") return;
  evento.respondWith(
    (async () => {
      try {
        return await fetch(evento.request);
      } catch {
        return (await caches.match(TELA_SEM_INTERNET)) ?? Response.error();
      }
    })(),
  );
});

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
