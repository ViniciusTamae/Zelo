# Zelo — estado do projeto e próximos passos

Atualizado em 07/11/2026. Use este arquivo para começar um chat novo: ele resume o que já foi feito, como o projeto funciona e o que está pendente.

## O que é o Zelo

App que centraliza os pedidos de conserto entre pequenos proprietários (2 a 15 casas) e seus inquilinos.

- **Proprietário:** usa o app (PWA) e faz login com um código de 6 dígitos enviado por e-mail.
- **Inquilino:** não tem conta. Usa um link exclusivo (`/c/[token]`).

**Stack:**
- Next.js 16 (App Router, Turbopack, Cache Components), TypeScript, Tailwind 4 e shadcn/ui (base-ui).
- Supabase (Postgres com RLS, Auth, Storage, Edge Functions, pg_cron e pg_net), sem ORM.
- Web Push com VAPID, Resend para e-mails (Mailpit no local) e next-themes.
- dnd-kit (arrastar), Zod 4, Vitest, Playwright e pgTAP.
- Tudo roda em Docker (Node 24 e pnpm só no container), com comandos pelo `Makefile`.

**Regras combinadas:**
- Respostas e comentários no código em português; telas em pt-BR, pensadas primeiro para o celular.
- Mostrar o plano em poucos passos antes de mudanças grandes e entregar em passos pequenos, mostrando cada um funcionando.
- Avisar antes de mudar algo já decidido. Nada fora do escopo sem pedir.
- Commits só quando o usuário pedir, com autor "Vinicius Tamae <tamaevinicius@gmail.com>" e **sem** nenhuma menção de coautoria de IA.
- Migrações só pelo Supabase CLI (`make db-new nome=...`, aplicar com `make db-migrate`). O `make db-reset` apaga os dados locais.
- RLS em todas as tabelas. O inquilino é validado no servidor; a service role só é usada no servidor.

## O que já está pronto

Tudo tem commit e está no GitHub, num repositório **privado**: https://github.com/ViniciusTamae/Zelo (branch `main`). O envio é por HTTPS com o `gh` logado na conta **ViniciusTamae**. A chave SSH deste computador é de outra conta (`Viniciustamaee`) e não tem acesso ao repositório.

1. **Base:** esqueleto com Docker, Supabase local, migrações com RLS, `/api/health` e imagem de produção (Dockerfile standalone).
2. **Login do proprietário:**
   - código de 6 dígitos por e-mail; o botão do e-mail abre a tela com o código já preenchido;
   - "Reenviar" liberado após 60 s;
   - no primeiro acesso, pede só o nome (`/boas-vindas`).
3. **Imóveis e inquilinos:**
   - endereço separado em rua, número, complemento e bairro;
   - CEP opcional que preenche rua e bairro pelo ViaCEP (busca feita pelo navegador; o CEP não é guardado e cidade/UF aparecem só como confirmação);
   - o link do inquilino é guardado só como hash e aparece uma única vez;
   - mostra "Visto em ...", permite gerar novo link, desativar e reativar;
   - excluir imóvel com janela de confirmação: sem chamados, exclui de vez (com os inquilinos e a foto); com chamados, arquiva (some da lista, os links dos inquilinos param e o histórico fica; dá para ver em "Arquivados" e desarquivar); com chamado em aberto, não deixa. A regra fica no banco (`excluir_ou_arquivar_imovel`), e imóvel arquivado não recebe nem reabre chamados (trigger);
   - busca na lista de imóveis (apelido ou endereço), a partir de 4 imóveis;
   - foto opcional do imóvel (bucket privado `fotos-imoveis`, só o dono lê, envia e apaga), com troca e remoção na edição e uma imagem padrão (casa) quando não há foto.
4. **Página do inquilino (`/c/[token]`):**
   - abre chamado com categoria, descrição, foto (reduzida no celular, sem dados de localização), urgência e melhor horário;
   - lista "Seus pedidos";
   - "Perdi meu link", com resposta sempre igual (para não revelar quais e-mails existem) e no máximo 1 reenvio a cada 10 min;
   - limite de 10 chamados por dia por inquilino.
5. **Painel do proprietário:**
   - no celular: lista com abas Abertos/Resolvidos e um botão "Filtrar";
   - filtros na URL, no celular e no computador: busca por texto (descrição, imóvel, inquilino e categoria, sem ligar para acento), imóvel, categoria e "só urgentes";
   - detalhe do chamado com foto, mudança de status (regra no banco: `mudar_status_chamado`), recado, custo em R$ e histórico.
6. **Avisos:**
   - Web Push para o proprietário, com horário de silêncio (21h às 8h; só urgentes avisam na hora), calculado no banco no fuso de São Paulo;
   - pg_net chama a Edge Function `entregar-notificacoes` na hora e o pg_cron a cada 5 min;
   - em Ajustes: ligar e desligar os avisos, aviso de teste, nome e horário de silêncio editáveis.
7. **E-mails ao inquilino:**
   - um e-mail a cada mudança de status, com o recado;
   - ao resolver, um link de avaliação de uso único (`/avaliar/[token]`), com nota de 1 a 5 e comentário;
   - inquilino sem e-mail avalia pela própria página de pedidos.
8. **Visual:**
   - paleta "Petróleo" e fonte Inter;
   - `StatusBadge` sempre com cor, ícone e texto;
   - logo redesenhada ("Zelo"), ícones da PWA e `manifest.ts`;
   - modo escuro que segue o celular, escolha do tema em Ajustes → Aparência (troca suave) e teste de contraste WCAG.
9. **Layout para computador:**
   - kanban de chamados (Novos, Em andamento, Resolvidos dos últimos 30 dias) com painel lateral (`?chamado=`) e arrastar pelo mouse e pelo teclado (dnd-kit);
   - topo compacto (título e filtro na mesma linha), colunas da mesma altura até o fim da tela e títulos fixos ao rolar;
   - cartões com a etiqueta do status e, no urgente, também "Urgente", que continua em andamento e sai ao resolver;
   - soltar em Resolvidos abre uma janela para recado e custo;
   - imóveis em grade com a foto em cima (no celular, miniatura à esquerda) e, na página do imóvel, inquilinos ao lado do cadastro;
   - Ajustes com os cartões em pares;
   - página do inquilino com barra da logo (`MolduraPublica`), formulário à esquerda e "Seus pedidos" à direita; sem pedidos, o formulário fica centralizado;
   - cadastro e edição de imóvel num painel (apelido em destaque e endereço começando pelo CEP) com a prévia ao vivo do cartão ao lado, onde se escolhe ou arrasta a foto; no celular, a prévia vem antes de salvar;
   - link inválido e avaliação ficam num cartão estreito.
   - notificações no canto inferior direito (`ProvedorNotificacoes`), só no computador: confirmações (imóvel excluído/arquivado, status alterado no quadro e no painel, nome e horário salvos, avisos ligados/desligados) e movimentos recusados no quadro; somem sozinhas em 5 s (erro em 8 s), param com o mouse em cima e têm X. No celular cada aviso continua no próprio lugar. Ficam no lugar, também no computador: links gerados de inquilino, mensagem do CEP e erros de formulário.

10. **Histórico de gastos (`/gastos`, 4º item do menu):**
   - consertos resolvidos com filtros de período (este mês, últimos 3/6/12 meses, este ano, tudo; meses no horário de Brasília), imóvel (arquivados inclusos) e categoria, na URL;
   - total, quantidade e média (só de quem tem valor; os sem valor aparecem na lista e não entram no total), gráfico mês a mês com dica, divisão por imóvel e por categoria (clicar filtra) e a lista (tabela no computador);
   - "Baixar planilha": CSV para o Excel brasileiro (`;`, vírgula decimal, BOM) do que está filtrado, em `/gastos/planilha`;
   - "Ver todos" na coluna Resolvidos do quadro e, na página do imóvel, o gasto dos últimos 12 meses (arquivado: todo o histórico) com link para Gastos filtrado;
   - sem valor do aluguel por enquanto (decidido em 07/11);
   - o botão "N" do modo de desenvolvimento do Next está desligado (`devIndicators: false`): cobria a barra do celular e o X do painel.
11. **App instalável (PWA):**
   - service worker registrado em todas as telas (`RegistrarServiceWorker` no layout raiz);
   - sem internet, as páginas mostram `public/offline.html` (estilo e logo embutidos, segue o tema, recarrega sozinha quando a conexão volta). Só essa tela fica guardada no aparelho; dados sempre vêm do servidor. Ao mudar o offline.html, subir a versão `CACHE` em `public/sw.js`;
   - dica de instalar (`src/components/pwa.tsx`, `src/lib/pwa/instalacao.ts`): faixa no topo de Chamados, só no celular ("Agora não" esconde por 30 dias), e cartão "Instalar o app" em Ajustes. Android: botão que abre a instalação do navegador (`beforeinstallprompt`); iPhone: passos Compartilhar → Adicionar à Tela de Início. Nada aparece com o app já instalado.
12. **Dados de demonstração (`supabase/seed.sql`):**
   - Marta (`marta@zelo.local`, 8 imóveis, 1 arquivado, 38 chamados) e Jorge (`jorge@zelo.local`, 2 imóveis, 4 chamados); entrar pelo código, que chega no Mailpit;
   - inquilinos com links fixos (token `rpad('demo-<imovel>-<nome>', 43, '0')`; os principais estão listados no topo do arquivo), 1 imóvel vago com inquilino desativado;
   - chamados dos últimos 6 meses, com histórico, recados, valores e avaliações; datas relativas a agora;
   - carrega no `make db-reset` e com `make seed` (refaz só a demonstração, sem apagar o resto). Desliga os gatilhos de e-mail e aviso durante a carga. Os testes não apagam a demonstração.

**Testes:** 245 unitários (Vitest), 95 do banco (pgTAP) e 46 de ponta a ponta (Playwright), sendo 37 no celular e 9 no computador (`*.pc.spec.ts`). Rode com `make test-all`.

**Comandos úteis:**
- `make dev`, `make dev-limpar` (quando o cache do Next ficar velho), `make db-start` e `make db-migrate`;
- `make seed` (carrega a demonstração);
- `make avisos-config` (configura no Vault do banco a URL das funções e o segredo dos avisos);
- `make mail-clear`, `make test-all` (rode os testes pelo `make`: o teste de avisos precisa do acesso ao Docker que ele configura);
- e-mails locais em http://localhost:54324;
- com a VPN da empresa (FortiClient) ligada, o app não alcança o Supabase local: a VPN cria uma rota para `172.18.0.0/16`, a mesma faixa da rede do Docker. Desligar a VPN (e reiniciar o `dev` se ele ficar recarregando) ou mudar a faixa do Docker (`default-address-pools` no `/etc/docker/daemon.json`).

## Pendências para as próximas atualizações

O celular está perfeito; não mexer sem pedir.

### Observabilidade

- **Datadog:** o usuário quer começar a usar. Fazer junto com a publicação, em etapas: erros e logs do servidor, depois rastreamento e, por último, o navegador. Hoje só existem 5 `console.error`. Antes, definir a hospedagem (Vercel ou Docker), ver o custo e tratar a Edge Function, que roda no Supabase. O token de `/c/[token]` e `/avaliar/[token]` funciona como senha: mascarar nos logs e rastreamentos, assim como e-mails e descrições.

### Ainda pendente do plano original

- **Antes de publicar:** conferir o build de produção e a imagem Docker.
- **Publicar:** o GitHub já está feito (repositório privado). Faltam Supabase Cloud (região São Paulo), Vercel e domínio no Resend. O passo a passo está no README.

### Decisões em aberto

- Cadastro aberto para qualquer e-mail ou só para convidados no lançamento?
- "Sair" deve desligar os avisos daquele aparelho?
- Os limites servem? Hoje são 10 chamados por dia e 10 min entre reenvios de link.
- Valor do aluguel no imóvel (para mostrar o % gasto em consertos): por enquanto não (07/11); dá para incluir em Gastos depois.
- Contratos, ganhos, cobrança, reajuste e IR ficam para depois do lançamento (seria outro produto).
