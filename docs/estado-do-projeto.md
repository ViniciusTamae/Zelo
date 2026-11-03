# Zelo — estado do projeto e próximos passos

Atualizado em 02/11/2026. Use este arquivo para começar um chat novo: ele resume o que já foi feito, como o projeto funciona e o que está pendente.

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
   - foto opcional do imóvel (bucket privado `fotos-imoveis`, só o dono lê, envia e apaga), com troca e remoção na edição e uma imagem padrão (casa) quando não há foto.
4. **Página do inquilino (`/c/[token]`):**
   - abre chamado com categoria, descrição, foto (reduzida no celular, sem dados de localização), urgência e melhor horário;
   - lista "Seus pedidos";
   - "Perdi meu link", com resposta sempre igual (para não revelar quais e-mails existem) e no máximo 1 reenvio a cada 10 min;
   - limite de 10 chamados por dia por inquilino.
5. **Painel do proprietário:**
   - no celular: lista com abas Abertos/Resolvidos e filtro por imóvel;
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

**Testes:** 219 unitários (Vitest), 85 do banco (pgTAP) e 35 de ponta a ponta (Playwright), sendo 29 no celular e 6 no computador (`*.pc.spec.ts`). Rode com `make test-all`.

**Comandos úteis:**
- `make dev`, `make dev-limpar` (quando o cache do Next ficar velho), `make db-start` e `make db-migrate`;
- `make avisos-config` (configura no Vault do banco a URL das funções e o segredo dos avisos);
- `make mail-clear`, `make test-all` (rode os testes pelo `make`: o teste de avisos precisa do acesso ao Docker que ele configura);
- e-mails locais em http://localhost:54324.

## Pendências para as próximas atualizações

O celular está perfeito; não mexer sem pedir.

### Observabilidade

- **Datadog:** o usuário quer começar a usar. Fazer junto com a publicação, em etapas: erros e logs do servidor, depois rastreamento e, por último, o navegador. Hoje só existem 5 `console.error`. Antes, definir a hospedagem (Vercel ou Docker), ver o custo e tratar a Edge Function, que roda no Supabase. O token de `/c/[token]` e `/avaliar/[token]` funciona como senha: mascarar nos logs e rastreamentos, assim como e-mails e descrições.

### Melhorias pedidas

1. **Excluir imóvel, com janela de confirmação:** (lembrar de apagar a foto do bucket `fotos-imoveis`) decidir o que acontece com imóveis que têm chamados. A proposta anterior era excluir só os que não têm chamados e arquivar os outros, para não perder o histórico.
2. **Filtros e busca:** na lista de imóveis e no kanban (por texto, imóvel, categoria, período...).
3. **Dados de demonstração (seed):** proprietários, imóveis, inquilinos e chamados de exemplo, para ter volume ao apresentar. Lembrar que o login é por código no e-mail: no local o código chega no Mailpit.

### Ainda pendente do plano original

- **Histórico de gastos por imóvel com filtros:** período, imóvel e categoria, com total gasto. Também resolve o "ver todos" da coluna Resolvidos, que no computador mostra só 30 dias.
- **PWA:** dica de "Adicionar à Tela de Início", principalmente no iPhone, e tela de "sem internet".
- **Antes de publicar:** conferir o build de produção e a imagem Docker.
- **Publicar:** o GitHub já está feito (repositório privado). Faltam Supabase Cloud (região São Paulo), Vercel e domínio no Resend. O passo a passo está no README.

### Decisões em aberto

- Cadastro aberto para qualquer e-mail ou só para convidados no lançamento?
- "Sair" deve desligar os avisos daquele aparelho?
- Os limites servem? Hoje são 10 chamados por dia e 10 min entre reenvios de link.
- Valor do aluguel no imóvel (para mostrar o % gasto em consertos): fazer ou não?
- Contratos, ganhos, cobrança, reajuste e IR ficam para depois do lançamento (seria outro produto).
