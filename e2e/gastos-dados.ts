import { clienteAdmin, idDoUsuario } from "./admin";

// Prepara o histórico de gastos de um proprietário de teste direto no banco
// (mais rápido que abrir e resolver cada chamado pela tela):
//   Casa A: hidráulica R$ 100,00, elétrica R$ 50,50 e telhado sem valor (este mês),
//           mais um chamado em aberto (não entra nos gastos);
//   Casa B (arquivada): outros R$ 300,00, resolvido há uns 2 meses.
export async function prepararGastos(email: string) {
  const supabase = clienteAdmin();
  const dono = await idDoUsuario(email);

  const { data: imoveis, error } = await supabase
    .from("imoveis")
    .insert([
      { dono_id: dono, apelido: "Casa A", logradouro: "Rua A", numero: "1", bairro: "Centro" },
      { dono_id: dono, apelido: "Casa B", logradouro: "Rua B", numero: "2", bairro: "Centro" },
    ])
    .select("id, apelido");
  if (error) throw error;
  const casaA = imoveis.find(({ apelido }) => apelido === "Casa A")!.id;
  const casaB = imoveis.find(({ apelido }) => apelido === "Casa B")!.id;

  const { data: chamados, error: erroChamados } = await supabase
    .from("chamados")
    .insert([
      { imovel_id: casaA, categoria: "hidraulica", descricao: "Vazamento na pia", status: "resolvido", valor: 100 },
      { imovel_id: casaA, categoria: "eletrica", descricao: "Tomada queimada", status: "resolvido", valor: 50.5 },
      { imovel_id: casaA, categoria: "telhado", descricao: "Calha solta", status: "resolvido", valor: null },
      { imovel_id: casaA, categoria: "outros", descricao: "Porta emperrada", status: "aberto", valor: null },
      { imovel_id: casaB, categoria: "outros", descricao: "Pintura da sala", status: "resolvido", valor: 300 },
    ])
    .select("id, imovel_id");
  if (erroChamados) throw erroChamados;

  // O banco marca resolvido_em como "agora"; o da Casa B vai para 2 meses atrás.
  const daCasaB = chamados.find(({ imovel_id }) => imovel_id === casaB)!.id;
  const doisMesesAtras = new Date(Date.now() - 62 * 24 * 60 * 60 * 1000).toISOString();
  const { error: erroData } = await supabase.from("chamados").update({ resolvido_em: doisMesesAtras }).eq("id", daCasaB);
  if (erroData) throw erroData;
  const { error: erroArquivo } = await supabase
    .from("imoveis")
    .update({ arquivado_em: new Date().toISOString() })
    .eq("id", casaB);
  if (erroArquivo) throw erroArquivo;

  return { casaA, casaB };
}
