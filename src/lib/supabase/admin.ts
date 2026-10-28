import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

// Cliente com a chave secreta (service role): ignora o RLS.
// Uso exclusivo no servidor, para o fluxo do inquilino (link /c/[token]),
// sempre depois de validar o token. Nunca importar em código do navegador.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
