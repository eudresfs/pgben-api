import { SetMetadata } from '@nestjs/common';
import { TipoAcaoCritica, EstrategiaAprovacao } from '../enums';

/**
 * Interface para configuração do decorator de aprovação
 */
export interface ConfiguracaoAprovacao {
  /** Tipo da ação crítica que requer aprovação */
  tipo: TipoAcaoCritica;
  
  /** Descrição da ação para contexto */
  descricao?: string;
  
  /** Estratégia de aprovação a ser utilizada */
  estrategia?: EstrategiaAprovacao;
  
  /** Se true, permite auto-aprovação para usuários com permissão especial */
  permitirAutoAprovacao?: boolean;
  
  /** Perfil necessário para autoaprovação (usado com AUTOAPROVACAO_PERFIL) */
  perfilAutoAprovacao?: string[];
  
  /** Setor/unidade para escalonamento (usado com ESCALONAMENTO_SETOR) */
  setorEscalonamento?: string;
  
  /** Permissão necessária para aprovação no setor */
  permissaoAprovacao?: string;
}

/**
 * Chave de metadata para o decorator de aprovação
 */
export const APROVACAO_METADATA_KEY = 'requer_aprovacao';

/**
 * Decorator para marcar métodos que requerem aprovação
 * 
 * @param config Configuração da aprovação necessária
 * 
 * @example
 * ```typescript
 * // Exemplo 1: Escalonamento por setor
 * @RequerAprovacao({
 *   tipo: TipoAcaoCritica.CANCELAMENTO_SOLICITACAO,
 *   descricao: 'Cancelamento de solicitação de benefício',
 *   estrategia: EstrategiaAprovacao.ESCALONAMENTO_SETOR,
 *   setorEscalonamento: 'GESTAO_BENEFICIOS',
 *   permissaoAprovacao: 'APROVAR_CANCELAMENTO_BENEFICIO'
 * })
 * async cancelarSolicitacao(id: string) {
 *   // Lógica do cancelamento
 * }
 * 
 * // Exemplo 2: Autoaprovação por perfil
 * @RequerAprovacao({
 *   tipo: TipoAcaoCritica.CANCELAMENTO_SOLICITACAO,
 *   descricao: 'Cancelamento de solicitação de benefício',
 *   estrategia: EstrategiaAprovacao.AUTOAPROVACAO_PERFIL,
 *   perfilAutoAprovacao: 'GESTOR'
 * })
 * async cancelarSolicitacaoGestor(id: string) {
 *   // Lógica do cancelamento
 * }
 * ```
 */
export const RequerAprovacao = (config: ConfiguracaoAprovacao) => {
  return SetMetadata(APROVACAO_METADATA_KEY, config);
};