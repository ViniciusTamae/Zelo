import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Fica de fora: arquivos estáticos, imagens, o link do inquilino (sem login)
  // e o health check.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|c/|api/health|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
