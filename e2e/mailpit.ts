// Lê os e-mails que o Supabase local entrega no Mailpit (nada sai de verdade).
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:54324";

type Busca = { messages_count: number; messages: { ID: string }[] };

async function buscar(email: string): Promise<Busca> {
  const query = encodeURIComponent(`to:"${email}"`);
  const resposta = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`);
  return resposta.json();
}

export async function contarEmails(email: string) {
  return (await buscar(email)).messages_count;
}

// Espera chegar um e-mail novo (além dos `jaRecebidos`) e devolve o código de 6 dígitos.
export async function aguardarCodigo(email: string, jaRecebidos = 0) {
  for (let tentativa = 0; tentativa < 40; tentativa++) {
    const busca = await buscar(email);
    if (busca.messages_count > jaRecebidos) {
      const resposta = await fetch(
        `${MAILPIT_URL}/api/v1/message/${busca.messages[0].ID}`,
      );
      const { Text } = (await resposta.json()) as { Text: string };
      const codigo = Text.match(/\b\d{6}\b/)?.[0];
      if (!codigo) throw new Error(`E-mail sem código: ${Text}`);
      return codigo;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Nenhum e-mail novo para ${email} no Mailpit.`);
}

// E-mail único por teste, para os testes não interferirem entre si.
export function emailDeTeste(prefixo: string) {
  const sufixo = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefixo}-${sufixo}@zelo.test`;
}
