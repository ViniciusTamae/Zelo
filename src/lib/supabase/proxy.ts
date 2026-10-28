import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "./database.types";

// Rotas que exigem proprietário logado.
const ROTAS_PROTEGIDAS = ["/chamados", "/imoveis", "/ajustes", "/boas-vindas"];

// Renova a sessão do Auth a cada requisição e controla o acesso ao app:
// sem sessão em rota protegida → /entrar; já logado em /entrar → /chamados.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Não colocar código entre a criação do cliente e esta chamada:
  // é ela que valida o token e dispara a renovação dos cookies.
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  const rotaProtegida = ROTAS_PROTEGIDAS.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
  );

  if (!logado && rotaProtegida) {
    return redirecionar(request, response, "/entrar");
  }
  if (logado && pathname === "/entrar") {
    return redirecionar(request, response, "/chamados");
  }

  return response;
}

// Redireciona mantendo os cookies de sessão que acabaram de ser renovados.
function redirecionar(
  request: NextRequest,
  response: NextResponse,
  destino: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = destino;
  url.search = "";

  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
