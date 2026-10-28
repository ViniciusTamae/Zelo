import { BotaoCompartilhar } from "./botao-compartilhar";

// Link recém-gerado. Só existe nesta tela: o banco guarda apenas o hash.
export function LinkGerado({ link, mensagem }: { link: string; mensagem: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p
        className="truncate rounded-md bg-muted px-3 py-2 font-mono text-sm select-all"
        data-testid="link-inquilino"
      >
        {link}
      </p>
      <BotaoCompartilhar link={link} mensagem={mensagem} />
    </div>
  );
}
