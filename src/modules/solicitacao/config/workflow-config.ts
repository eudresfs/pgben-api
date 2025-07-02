import { StatusSolicitacao } from '../../../entities/solicitacao.entity';

/**
 * Configuração de transições de estados para solicitações
 * Define quais transições são permitidas a partir de cada estado
 *
 * Ciclo de vida simplificado:
 * RASCUNHO -> ABERTA -> PENDENTE -> EM_ANALISE -> [APROVADA|INDEFERIDA|CANCELADA]
 */
export const TRANSICOES_PERMITIDAS: Partial<
  Record<StatusSolicitacao, StatusSolicitacao[]>
> = {
  [StatusSolicitacao.RASCUNHO]: [
    StatusSolicitacao.ABERTA,
    StatusSolicitacao.CANCELADA,
  ],
  [StatusSolicitacao.ABERTA]: [
    StatusSolicitacao.PENDENTE,
    StatusSolicitacao.EM_ANALISE,
    StatusSolicitacao.CANCELADA,
  ],
  [StatusSolicitacao.PENDENTE]: [
    StatusSolicitacao.EM_ANALISE,
    StatusSolicitacao.CANCELADA,
  ],
  [StatusSolicitacao.EM_ANALISE]: [
    StatusSolicitacao.APROVADA,
    StatusSolicitacao.INDEFERIDA,
    StatusSolicitacao.PENDENTE,
    StatusSolicitacao.CANCELADA,
  ],
  [StatusSolicitacao.APROVADA]: [],
  [StatusSolicitacao.INDEFERIDA]: [],
  [StatusSolicitacao.CANCELADA]: [],
};

/**
 * Configuração de permissões necessárias para cada transição de estado
 * Define quais permissões são necessárias para realizar cada transição
 */
export const PERMISSOES_TRANSICAO: Record<string, string[]> = {
  RASCUNHO_PARA_ABERTA: ['solicitacao.submeter'],
  RASCUNHO_PARA_CANCELADA: ['solicitacao.cancelar'],
  ABERTA_PARA_PENDENTE: ['solicitacao.criar-pendencia'],
  ABERTA_PARA_EM_ANALISE: ['solicitacao.enviar-para-analise'],
  ABERTA_PARA_CANCELADA: ['solicitacao.cancelar'],
  PENDENTE_PARA_EM_ANALISE: ['solicitacao.enviar-para-analise'],
  PENDENTE_PARA_CANCELADA: ['solicitacao.cancelar'],
  EM_ANALISE_PARA_APROVADA: ['solicitacao.aprovar'],
  EM_ANALISE_PARA_INDEFERIDA: ['solicitacao.indeferir'],
  EM_ANALISE_PARA_PENDENTE: ['solicitacao.retornar-para-pendente'],
  EM_ANALISE_PARA_ABERTA: ['solicitacao.retornar-para-aberta'],
  EM_ANALISE_PARA_CANCELADA: ['solicitacao.cancelar'],
};
