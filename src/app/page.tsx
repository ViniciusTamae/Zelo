import { redirect } from "next/navigation";

// A entrada do app é o painel; o proxy manda para /entrar quem não está logado.
export default function Home() {
  redirect("/painel");
}
