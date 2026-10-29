import { createClient } from "@supabase/supabase-js";

// Cliente com a chave secreta do Supabase local, só para preparar e limpar
// dados dos testes (nunca usado pelo app no navegador).
export function clienteAdmin() {
  process.loadEnvFile(".env.local");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function apagarUsuarioPorEmail(email: string) {
  const supabase = clienteAdmin();
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const usuario = data.users.find((u) => u.email === email);
  if (!usuario) throw new Error(`Usuário ${email} não encontrado.`);
  const { error: erroAoApagar } = await supabase.auth.admin.deleteUser(usuario.id);
  if (erroAoApagar) throw erroAoApagar;
}

export async function idDoUsuario(email: string) {
  const { data, error } = await clienteAdmin().auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const usuario = data.users.find((u) => u.email === email);
  if (!usuario) throw new Error(`Usuário ${email} não encontrado.`);
  return usuario.id;
}
