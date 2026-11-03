import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { FotoValidada } from "@/lib/chamados/esquemas";
import type { Database } from "@/lib/supabase/database.types";

// Fotos dos imóveis no bucket privado fotos-imoveis, sempre com o cliente do
// proprietário logado: as políticas do bucket só liberam as pastas dos
// imóveis dele (<imovel_id>/<arquivo>).

type Cliente = SupabaseClient<Database>;

const BUCKET = "fotos-imoveis";
// Tempo de vida do link da foto (o bucket é privado).
const VALIDADE_FOTO_SEGUNDOS = 60 * 60;

// Nome novo a cada envio: trocar a foto não mostra a antiga guardada no navegador.
export async function enviarFotoDoImovel(supabase: Cliente, imovelId: string, foto: FotoValidada) {
  const caminho = `${imovelId}/${crypto.randomUUID()}.${foto.extensao}`;
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, foto.bytes, { contentType: foto.tipo });
  if (error) throw error;
  return caminho;
}

// Apagar a foto antiga é limpeza: se falhar, o imóvel continua certo.
export async function apagarFotoDoImovel(supabase: Cliente, caminho: string) {
  await supabase.storage.from(BUCKET).remove([caminho]);
}

// Links temporários de várias fotos de uma vez (caminho → link).
export async function linksDasFotos(supabase: Cliente, caminhos: (string | null)[]) {
  const validos = caminhos.filter((caminho): caminho is string => Boolean(caminho));
  const links = new Map<string, string>();
  if (validos.length === 0) return links;

  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(validos, VALIDADE_FOTO_SEGUNDOS);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) links.set(item.path, item.signedUrl);
  }
  return links;
}
