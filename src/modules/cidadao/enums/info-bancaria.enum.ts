/**
 * Enums relacionados às informações bancárias
 */

/**
 * Tipos de conta bancária
 */
export enum TipoConta {
  CORRENTE = 'CORRENTE',
  POUPANCA = 'POUPANCA',
  POUPANCA_SOCIAL = 'POUPANCA_SOCIAL',
  SALARIO = 'SALARIO',
}

/**
 * Tipos de chave PIX
 */
export enum TipoChavePix {
  CPF = 'CPF',
  CNPJ = 'CNPJ',
  EMAIL = 'EMAIL',
  TELEFONE = 'TELEFONE',
  ALEATORIA = 'ALEATORIA',
}

/**
 * Códigos dos principais bancos brasileiros
 */
export enum CodigoBanco {
  BANCO_DO_BRASIL = '001',
  SANTANDER = '033',
  CAIXA_ECONOMICA = '104',
  BRADESCO = '237',
  ITAU = '341',
  BANCO_INTER = '077',
  NUBANK = '260',
  SICOOB = '756',
  SICREDI = '748',
  BANCO_ORIGINAL = '212',
  BANCO_SAFRA = '422',
  BANCO_VOTORANTIM = '655',
  BANCO_PAN = '623',
  BANCO_BMG = '318',
  BANCO_PINE = '643',
  BANCO_FIBRA = '224',
  BANCO_MODAL = '746',
  BANCO_DAYCOVAL = '707',
  BANCO_RENDIMENTO = '633',
  BANCO_SOFISA = '637',
}

/**
 * Nomes dos bancos correspondentes aos códigos
 */
export const NOMES_BANCOS: Record<string, string> = {
  '001': 'Banco do Brasil S.A.',
  '033': 'Banco Santander (Brasil) S.A.',
  '104': 'Caixa Econômica Federal',
  '237': 'Banco Bradesco S.A.',
  '341': 'Banco Itaú Unibanco S.A.',
  '077': 'Banco Inter S.A.',
  '260': 'Nu Pagamentos S.A. (Nubank)',
  '756': 'Banco Cooperativo do Brasil S.A. (Sicoob)',
  '748': 'Banco Cooperativo Sicredi S.A.',
  '212': 'Banco Original S.A.',
  '422': 'Banco Safra S.A.',
  '655': 'Banco Votorantim S.A.',
  '623': 'Banco Pan S.A.',
  '318': 'Banco BMG S.A.',
  '643': 'Banco Pine S.A.',
  '224': 'Banco Fibra S.A.',
  '746': 'Banco Modal S.A.',
  '707': 'Banco Daycoval S.A.',
  '633': 'Banco Rendimento S.A.',
  '637': 'Banco Sofisa S.A.',
};

/**
 * Função utilitária para obter o nome do banco pelo código
 */
export function getNomeBanco(codigo: string): string {
  return NOMES_BANCOS[codigo] || `Banco ${codigo}`;
}

/**
 * Função utilitária para validar se é uma conta poupança social do Banco do Brasil
 */
export function isPoupancaSocialBB(banco: string, tipoConta: TipoConta): boolean {
  return banco === CodigoBanco.BANCO_DO_BRASIL && tipoConta === TipoConta.POUPANCA_SOCIAL;
}