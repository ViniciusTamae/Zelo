import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";

// Cliente do Supabase para componentes que rodam no navegador.
// Usa só a chave publicável: tudo o que ele acessa passa pelo RLS.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
