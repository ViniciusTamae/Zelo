import { execSync } from "node:child_process";
import { createDecipheriv, createECDH, hkdfSync, randomBytes } from "node:crypto";
import { createServer, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";

// Serviço de push falso para os testes: faz o papel do Google/Apple/Mozilla.
// Recebe o que a Edge Function envia e decifra como o navegador faria
// (RFC 8291, aes128gcm), para o teste conferir o conteúdo do aviso.

export type AvisoRecebido = {
  caminho: string;
  cabecalhos: IncomingHttpHeaders;
  conteudo: { titulo: string; corpo: string; url: string; tag: string };
};

// Os containers do Supabase alcançam o container dos testes pelo gateway da rede deles.
function enderecoVistoPeloSupabase() {
  return execSync(
    "docker network inspect supabase_network_zelo --format '{{(index .IPAM.Config 0).Gateway}}'",
  )
    .toString()
    .trim();
}

export async function servicoDePushFalso() {
  // Par de chaves do "navegador" (o que o pushManager.subscribe criaria).
  const navegador = createECDH("prime256v1");
  navegador.generateKeys();
  const segredoAuth = randomBytes(16);
  const recebidos: AvisoRecebido[] = [];

  const servidor = createServer((pedido, resposta) => {
    const partes: Buffer[] = [];
    pedido.on("data", (parte) => partes.push(parte));
    pedido.on("end", () => {
      const caminho = pedido.url ?? "";
      // Endereço "/sumiu/...": aparelho que desinstalou o app (410 Gone).
      if (caminho.startsWith("/sumiu/")) {
        resposta.writeHead(410).end();
        return;
      }
      recebidos.push({
        caminho,
        cabecalhos: pedido.headers,
        conteudo: JSON.parse(decifrar(Buffer.concat(partes), navegador, segredoAuth)),
      });
      resposta.writeHead(201).end();
    });
  });
  await new Promise<void>((pronto) => servidor.listen(0, "0.0.0.0", pronto));
  const base = `http://${enderecoVistoPeloSupabase()}:${(servidor.address() as AddressInfo).port}`;

  return {
    recebidos,
    // Dados de uma inscrição (como o PushSubscription.toJSON() do navegador).
    inscricao: (caminho: string) => ({
      endpoint: `${base}${caminho}`,
      p256dh: navegador.getPublicKey().toString("base64url"),
      auth: segredoAuth.toString("base64url"),
    }),
    fechar: () => new Promise((pronto) => servidor.close(pronto)),
  };
}

function decifrar(corpo: Buffer, navegador: ReturnType<typeof createECDH>, segredoAuth: Buffer) {
  // Cabeçalho: sal (16) | tamanho do registro (4) | tamanho da chave (1) | chave do servidor
  const sal = corpo.subarray(0, 16);
  const tamanhoChave = corpo.readUInt8(20);
  const chaveServidor = corpo.subarray(21, 21 + tamanhoChave);
  const cifrado = corpo.subarray(21 + tamanhoChave);

  const compartilhado = navegador.computeSecret(chaveServidor);
  const infoChave = Buffer.concat([
    Buffer.from("WebPush: info\0"),
    navegador.getPublicKey(),
    chaveServidor,
  ]);
  const ikm = Buffer.from(hkdfSync("sha256", compartilhado, segredoAuth, infoChave, 32));
  const cek = Buffer.from(hkdfSync("sha256", ikm, sal, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", ikm, sal, Buffer.from("Content-Encoding: nonce\0"), 12));

  const decifrador = createDecipheriv("aes-128-gcm", cek, nonce);
  decifrador.setAuthTag(cifrado.subarray(cifrado.length - 16));
  const texto = Buffer.concat([decifrador.update(cifrado.subarray(0, cifrado.length - 16)), decifrador.final()]);
  // Fim do conteúdo: delimitador 0x02 seguido de preenchimento com zeros.
  return texto.subarray(0, texto.lastIndexOf(2)).toString("utf8");
}
