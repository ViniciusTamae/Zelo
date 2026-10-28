import { createClient } from "@supabase/supabase-js";

import { apagarTodosEmails, PREFIXO_E2E } from "./mailpit";

// Roda ao fim dos testes E2E (globalTeardown): esvazia o Mailpit e apaga os
// usuários criados pelos testes, para nada se acumular no ambiente local.
// Apagar o usuário apaga em cascata o proprietário e os dados dele.
export default async function limpeza() {
  await apagarTodosEmails();

  process.loadEnvFile(".env.local");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) throw error;

  const usuariosDeTeste = data.users.filter(
    (usuario) =>
      usuario.email?.startsWith(PREFIXO_E2E) &&
      usuario.email.endsWith("@zelo.test"),
  );

  for (const usuario of usuariosDeTeste) {
    const { error: erroAoApagar } = await supabase.auth.admin.deleteUser(
      usuario.id,
    );
    if (erroAoApagar) throw erroAoApagar;
  }
}
