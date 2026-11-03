import { clienteAdmin } from "./admin";
import { apagarTodosEmails, PREFIXO_E2E } from "./mailpit";

// Roda ao fim dos testes E2E (globalTeardown): esvazia o Mailpit e apaga os
// usuários criados pelos testes, para nada se acumular no ambiente local.
// Apagar o usuário apaga em cascata o proprietário e os dados dele.
export default async function limpeza() {
  await apagarTodosEmails();

  const supabase = clienteAdmin();

  const { data, error } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) throw error;

  const usuariosDeTeste = data.users.filter(
    (usuario) =>
      usuario.email?.startsWith(PREFIXO_E2E) &&
      usuario.email.endsWith("@zelo.test"),
  );

  // As fotos dos chamados ficam no Storage, fora da cascata do banco.
  await apagarFotos(supabase, usuariosDeTeste.map((usuario) => usuario.id));

  for (const usuario of usuariosDeTeste) {
    const { error: erroAoApagar } = await supabase.auth.admin.deleteUser(
      usuario.id,
    );
    if (erroAoApagar) throw erroAoApagar;
  }
}

// Fotos ficam em <imovel_id>/<chamado_id>/<arquivo>.
async function apagarFotos(supabase: ReturnType<typeof clienteAdmin>, donos: string[]) {
  if (donos.length === 0) return;
  const { data: imoveis, error } = await supabase.from("imoveis").select("id").in("dono_id", donos);
  if (error) throw error;

  const bucket = supabase.storage.from("fotos-chamados");
  for (const { id } of imoveis) {
    const { data: pastas } = await bucket.list(id);
    for (const pasta of pastas ?? []) {
      const { data: arquivos } = await bucket.list(`${id}/${pasta.name}`);
      const caminhos = (arquivos ?? []).map((arquivo) => `${id}/${pasta.name}/${arquivo.name}`);
      if (caminhos.length > 0) await bucket.remove(caminhos);
    }
  }

  // Fotos dos imóveis ficam em <imovel_id>/<arquivo>.
  const fotosImoveis = supabase.storage.from("fotos-imoveis");
  for (const { id } of imoveis) {
    const { data: arquivos } = await fotosImoveis.list(id);
    const caminhos = (arquivos ?? []).map((arquivo) => `${id}/${arquivo.name}`);
    if (caminhos.length > 0) await fotosImoveis.remove(caminhos);
  }
}
