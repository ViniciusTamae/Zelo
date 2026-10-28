import "server-only";

import { enviarEmail } from "@/lib/email/enviar";
import { emailLinkDoInquilino } from "@/lib/email/modelos";
import { linkDoInquilino } from "@/lib/links";
import { createAdminClient } from "@/lib/supabase/admin";

import { gerarToken } from "./token";

// Intervalo mínimo entre dois reenvios para o mesmo inquilino: quem sabe o
// e-mail de alguém não consegue ficar trocando o link dessa pessoa.
export const ESPERA_REENVIO_MINUTOS = 10;

// "Perdi meu link": gera um link novo para cada inquilino ativo com esse e-mail
// e manda por e-mail. Não devolve nada: a tela responde sempre igual, para não
// revelar quais e-mails estão cadastrados.
export async function reenviarLinkPorEmail(email: string, agora = new Date()) {
  const supabase = createAdminClient();
  const { data: inquilinos, error } = await supabase
    .from("inquilinos")
    .select("id, nome, imoveis(apelido)")
    .eq("email", email)
    .eq("ativo", true);
  if (error) throw error;

  const limite = new Date(agora.getTime() - ESPERA_REENVIO_MINUTOS * 60_000).toISOString();

  for (const inquilino of inquilinos) {
    const { token, hash } = gerarToken();
    // Só troca se não houve reenvio recente (a condição fica no próprio update,
    // então dois pedidos ao mesmo tempo não geram dois links).
    const { data: trocado, error: erroAoTrocar } = await supabase
      .from("inquilinos")
      .update({ token_hash: hash, link_reenviado_em: agora.toISOString() })
      .eq("id", inquilino.id)
      .or(`link_reenviado_em.is.null,link_reenviado_em.lt."${limite}"`)
      .select("id")
      .maybeSingle();
    if (erroAoTrocar) throw erroAoTrocar;
    if (!trocado) continue;

    await enviarEmail({
      para: email,
      ...emailLinkDoInquilino({
        nome: inquilino.nome,
        apelidoImovel: inquilino.imoveis.apelido,
        link: linkDoInquilino(token),
      }),
    });
  }
}
