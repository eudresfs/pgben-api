import { StatusSolicitacao } from '../../../entities/solicitacao.entity';

/**
 * Configuração de transições de estados para solicitações
 * Define quais transições são permitidas a partir de cada estado
 */
export const TRANSICOES_PERMITIDAS: Partial<
  Record<StatusSolicitacao, StatusSolicitacao[]>
> = {
  [StatusSolicitacao.RASCUNHO]: [
    StatusSolicitacao.ABERTA,
    StatusSolicitacao.PENDENTE,
    StatusSolicitacao.CANCELADA,
  ],
  [StatusSolicitacao.ABERTA]: [
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
    StatusSolicitacao.AGUARDANDO_DOCUMENTOS,
    StatusSolicitacao.PENDENTE,
    StatusSolicitacao.CANCELADA,
  ],
  [StatusSolicitacao.AGUARDANDO_DOCUMENTOS]: [
    StatusSolicitacao.EM_ANALISE,
    StatusSolicitacao.INDEFERIDA,
    StatusSolicitacao.CANCELADA,
  ],
  [StatusSolicitacao.APROVADA]: [
    StatusSolicitacao.LIBERADA,
    StatusSolicitacao.CANCELADA,
  ],
  [StatusSolicitacao.LIBERADA]: [
    StatusSolicitacao.EM_PROCESSAMENTO,
    StatusSolicitacao.CANCELADA,
  ],
  [StatusSolicitacao.INDEFERIDA]: [
    StatusSolicitacao.PENDENTE,
    StatusSolicitacao.EM_ANALISE,
    StatusSolicitacao.ARQUIVADA,
    StatusSolicitacao.CANCELADA,
  ],
  [StatusSolicitacao.CANCELADA]: [StatusSolicitacao.ARQUIVADA],
  [StatusSolicitacao.EM_PROCESSAMENTO]: [
    StatusSolicitacao.CONCLUIDA,
    StatusSolicitacao.CANCELADA,
  ],
  [StatusSolicitacao.CONCLUIDA]: [StatusSolicitacao.ARQUIVADA],
  [StatusSolicitacao.ARQUIVADA]: [StatusSolicitacao.ABERTA],
};

/**
 * Configuração de permissões necessárias para cada transição de estado
 * Define quais permissões são necessárias para realizar cada transição
 */
export const PERMISSOES_TRANSICAO: Record<string, string[]> = {
  RASCUNHO_PARA_ABERTA: ['solicitacao.submeter'],
  PENDENTE_PARA_EM_ANALISE: ['solicitacao.enviar-para-analise'],
  ABERTA_PARA_EM_ANALISE: ['solicitacao.enviar-para-analise'],
  EM_ANALISE_PARA_APROVADA: ['solicitacao.aprovar'],
  EM_ANALISE_PARA_REPROVADA: ['solicitacao.rejeitar'],
  EM_ANALISE_PARA_AGUARDANDO_DOCUMENTOS: ['solicitacao.solicitar-documentos'],
  EM_ANALISE_PARA_PENDENTE: ['solicitacao.retornar-para-pendente'],
  EM_ANALISE_PARA_CANCELADA: ['solicitacao.cancelar'],
  AGUARDANDO_DOCUMENTOS_PARA_EM_ANALISE: ['solicitacao.receber-documentos'],
  AGUARDANDO_DOCUMENTOS_PARA_REPROVADA: ['solicitacao.rejeitar'],
  AGUARDANDO_DOCUMENTOS_PARA_CANCELADA: ['solicitacao.cancelar'],
  APROVADA_PARA_LIBERADA: ['solicitacao.liberar'],
  APROVADA_PARA_EM_ANALISE: ['solicitacao.retornar-para-analise'],
  APROVADA_PARA_CANCELADA: ['solicitacao.cancelar'],
  LIBERADA_PARA_EM_PROCESSAMENTO: ['solicitacao.iniciar-processamento'],
  LIBERADA_PARA_CANCELADA: ['solicitacao.cancelar'],
  REPROVADA_PARA_EM_ANALISE: ['solicitacao.retornar-para-analise'],
  REPROVADA_PARA_ARQUIVADA: ['solicitacao.arquivar'],
  REPROVADA_PARA_CANCELADA: ['solicitacao.cancelar'],
  CANCELADA_PARA_ARQUIVADA: ['solicitacao.arquivar'],
  EM_PROCESSAMENTO_PARA_CONCLUIDA: ['solicitacao.concluir'],
  EM_PROCESSAMENTO_PARA_CANCELADA: ['solicitacao.cancelar'],
  CONCLUIDA_PARA_ARQUIVADA: ['solicitacao.arquivar'],
};
