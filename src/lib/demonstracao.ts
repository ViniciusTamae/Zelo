// Demonstração pública (só na Vercel): DEMONSTRACAO=ligada mostra o botão
// "Entrar na demonstração" e libera a limpeza diária das contas de visitante.
// No computador e numa produção de verdade fica desligada.
export function demonstracaoLigada() {
  return process.env.DEMONSTRACAO === "ligada";
}

// Cada visitante ganha uma conta própria com este formato de e-mail. O banco
// (eh_conta_de_visitante) só aceita preparar e apagar contas assim.
export function emailDeVisitante() {
  return `visitante-${crypto.randomUUID()}@demo.zelo.test`;
}
