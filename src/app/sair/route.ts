import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Encerra a sessão e volta para /entrar. Usado quando o cookie ainda é válido
// mas a conta não existe mais (ex.: usuário apagado), para não travar o app
// numa tela de erro. "local" só apaga os cookies deste navegador.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL("/entrar", request.url));
}
