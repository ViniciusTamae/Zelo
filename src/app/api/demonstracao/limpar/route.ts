import { demonstracaoLigada } from "@/lib/demonstracao";
import { createAdminClient } from "@/lib/supabase/admin";

// Limpeza diária da demonstração, chamada pelo Vercel Cron (vercel.json):
// apaga as contas de visitante com mais de 24 h, com as fotos delas.
// O Vercel manda "Authorization: Bearer <CRON_SECRET>"; sem ele, recusa.
// O banco só devolve contas visitante-...@demo.zelo.test: nenhuma conta de
// verdade entra na lista.

// Por chamada; o que sobrar fica para o dia seguinte (a função tem tempo limite).
const LIMITE_POR_CHAMADA = 300;

export async function GET(request: Request) {
  if (!demonstracaoLigada()) return new Response(null, { status: 404 });

  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return new Response(null, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: contas, error } = await admin.rpc("contas_demonstracao_vencidas");
  if (error) return Response.json({ erro: "Não foi possível listar as contas." }, { status: 500 });

  let apagadas = 0;
  let falhas = 0;
  for (const dono of (contas ?? []).slice(0, LIMITE_POR_CHAMADA)) {
    try {
      // Fotos primeiro: depois de apagar a conta, não dá mais para achá-las.
      const { data: arquivos, error: erroArquivos } = await admin.rpc("arquivos_da_conta", { p_dono: dono });
      if (erroArquivos) throw erroArquivos;
      const porBucket = new Map<string, string[]>();
      for (const { bucket, caminho } of arquivos ?? []) {
        porBucket.set(bucket, [...(porBucket.get(bucket) ?? []), caminho]);
      }
      for (const [bucket, caminhos] of porBucket) {
        const { error: erroRemover } = await admin.storage.from(bucket).remove(caminhos);
        if (erroRemover) throw erroRemover;
      }

      // O resto (imóveis, inquilinos, chamados, avisos) vai junto em cascata.
      const { error: erroApagar } = await admin.auth.admin.deleteUser(dono);
      if (erroApagar) throw erroApagar;
      apagadas += 1;
    } catch {
      // Tenta de novo no dia seguinte.
      falhas += 1;
    }
  }

  return Response.json({ apagadas, falhas });
}
