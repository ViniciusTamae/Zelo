-- Endereço do imóvel em campos separados: rua, número e bairro obrigatórios;
-- complemento opcional. Substitui a coluna de texto livre "endereco".

alter table public.imoveis
  add column logradouro text,
  add column numero text,
  add column complemento text,
  add column bairro text;

-- Imóveis já cadastrados: o texto antigo vai para a rua, para não perder nada;
-- número e bairro ficam marcados para o proprietário completar na edição.
update public.imoveis
set
  logradouro = endereco,
  numero = 's/n',
  bairro = 'Não informado';

alter table public.imoveis
  alter column logradouro set not null,
  alter column numero set not null,
  alter column bairro set not null,
  add constraint imoveis_logradouro_preenchido check (length(trim(logradouro)) > 0),
  add constraint imoveis_numero_preenchido check (length(trim(numero)) > 0),
  add constraint imoveis_bairro_preenchido check (length(trim(bairro)) > 0),
  drop column endereco;
