// Lê os e-mails que o Supabase local entrega no Mailpit (nada sai de verdade).
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:54324";

// Prefixo dos e-mails criados pelos testes; a limpeza apaga só esses usuários.
export const PREFIXO_E2E = "e2e-";

type Busca = { messages_count: number; messages: { ID: string }[] };

async function buscar(email: string): Promise<Busca> {
  const query = encodeURIComponent(`to:"${email}"`);
  const resposta = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`);
  return resposta.json();
}

export async function contarEmails(email: string) {
  return (await buscar(email)).messages_count;
}

type Mensagem = { Text: string; HTML: string };

// Espera chegar um e-mail novo (além dos `jaRecebidos`) e devolve o conteúdo.
async function aguardarMensagem(email: string, jaRecebidos = 0) {
  for (let tentativa = 0; tentativa < 40; tentativa++) {
    const busca = await buscar(email);
    if (busca.messages_count > jaRecebidos) {
      const resposta = await fetch(
        `${MAILPIT_URL}/api/v1/message/${busca.messages[0].ID}`,
      );
      return (await resposta.json()) as Mensagem;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Nenhum e-mail novo para ${email} no Mailpit.`);
}

// Código de 6 dígitos do e-mail mais recente.
export async function aguardarCodigo(email: string, jaRecebidos = 0) {
  const { Text } = await aguardarMensagem(email, jaRecebidos);
  const codigo = Text.match(/\b\d{6}\b/)?.[0];
  if (!codigo) throw new Error(`E-mail sem código: ${Text}`);
  return codigo;
}

// Endereço do botão "Abrir o Zelo com o código" do e-mail mais recente.
export async function aguardarLinkDoCodigo(email: string, jaRecebidos = 0) {
  const { HTML } = await aguardarMensagem(email, jaRecebidos);
  const href = HTML.match(/href="([^"]*\/entrar\?[^"]*)"/)?.[1];
  if (!href) throw new Error("E-mail sem o botão de entrar.");
  // O HTML do e-mail escapa o & da query como &amp;
  return href.replaceAll("&amp;", "&");
}

// Link /c/[token] do e-mail "Perdi meu link" mais recente.
export async function aguardarLinkDoInquilino(email: string, jaRecebidos = 0) {
  const { Text } = await aguardarMensagem(email, jaRecebidos);
  const link = Text.match(/https?:\/\/\S+\/c\/[A-Za-z0-9_-]+/)?.[0];
  if (!link) throw new Error(`E-mail sem link do inquilino: ${Text}`);
  return link;
}

// Espera o e-mail com este assunto e devolve o conteúdo.
export async function aguardarEmailComAssunto(para: string, assunto: string) {
  const query = encodeURIComponent(`to:"${para}" subject:"${assunto}"`);
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    const busca = (await (await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`)).json()) as Busca;
    if (busca.messages_count > 0) {
      const resposta = await fetch(`${MAILPIT_URL}/api/v1/message/${busca.messages[0].ID}`);
      return (await resposta.json()) as Mensagem;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Nenhum e-mail "${assunto}" para ${para} no Mailpit.`);
}

// Esvazia a caixa do Mailpit.
export async function apagarTodosEmails() {
  await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: "DELETE" });
}

// E-mail único por teste, para os testes não interferirem entre si.
export function emailDeTeste(prefixo: string) {
  const sufixo = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${PREFIXO_E2E}${prefixo}-${sufixo}@zelo.test`;
}
