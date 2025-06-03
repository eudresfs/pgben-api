/**
 * Enum que define os tipos de dados suportados para campos dinâmicos
 * em formulários de benefícios.
 */
export enum TipoDado {
  TEXTO = 'texto',
  NUMERO = 'numero',
  DATA = 'data',
  BOOLEANO = 'booleano',
  SELECAO = 'selecao',
  MULTIPLA_ESCOLHA = 'multipla_escolha',
  ARQUIVO = 'arquivo',
  CPF = 'cpf',
  CNPJ = 'cnpj',
  EMAIL = 'email',
  TELEFONE = 'telefone',
  CEP = 'cep',
  ENDERECO = 'endereco',
  MOEDA = 'moeda',
  PERCENTUAL = 'percentual',
  TEXTAREA = 'textarea',
}
