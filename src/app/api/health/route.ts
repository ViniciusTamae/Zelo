import { connection } from "next/server";

// Liveness para Docker/Kubernetes: responde se o processo está de pé.
// Não consulta o banco, para uma falha do Supabase não derrubar o container.
export async function GET() {
  // Força a execução a cada requisição (com Cache Components, sem isto o GET seria pré-renderizado).
  await connection();
  return Response.json({ status: "ok", timestamp: new Date().toISOString() });
}
