import { SetMetadata } from '@nestjs/common';
import { TipoAcaoCritica } from '../enums/aprovacao.enums';

/**
 * Interface para configuração de metadados de aprovação
 * Define as opções disponíveis para configurar uma ação que requer aprovação
 */
export interface ConfiguracaoAprovacaoMetadata {
  /** Tipo da ação crítica que será executada */
  acao: TipoAcaoCritica;
  
  /** Nome da entidade alvo da ação (opcional) */
  entidadeAlvo?: string;
  
  /** Se permite auto-aprovação para usuários específicos */
  permitirAutoAprovacao?: boolean;
  
  /** Função para verificar condições de auto-aprovação */
  condicoesAutoAprovacao?: (context: any) => boolean;
  
  /** Descrição adicional da ação para auditoria */
  descricaoAcao?: string;
  
  /** Se deve registrar na auditoria mesmo quando não requer aprovação */
  sempreAuditar?: boolean;
}

/** Chave para armazenar metadados de aprovação */
export const APROVACAO_METADATA_KEY = 'aprovacao_config';

/**
 * Decorator para marcar métodos que requerem aprovação
 * 
 * Este decorator marca um método como uma ação crítica que pode requerer
 * aprovação antes da execução, dependendo da configuração e do perfil do usuário.
 * 
 * @param config Configuração da aprovação
 * 
 * @example
 * ```typescript
 * @RequerAprovacao({
 *   acao: TipoAcaoCritica.CANCELAR_SOLICITACAO,
 *   entidadeAlvo: 'Solicitacao',
 *   permitirAutoAprovacao: true,
 *   condicoesAutoAprovacao: (context) => context.usuario.role === 'ADMIN'
 * })
 * async cancelarSolicitacao(id: string, justificativa: string) {
 *   // Implementação da ação
 * }
 * ```
 */
export const RequerAprovacao = (config: ConfiguracaoAprovacaoMetadata) =>
  SetMetadata(APROVACAO_METADATA_KEY, config);

/**
 * Decorator simplificado para ações que sempre requerem aprovação
 * 
 * @param acao Tipo da ação crítica
 * @param entidadeAlvo Nome da entidade alvo (opcional)
 * 
 * @example
 * ```typescript
 * @AcaoCritica(TipoAcaoCritica.EXCLUSAO_CIDADAO, 'Cidadao')
 * async excluirCidadao(id: string) {
 *   // Implementação
 * }
 * ```
 */
export const AcaoCritica = (acao: TipoAcaoCritica, entidadeAlvo?: string) =>
  RequerAprovacao({
    acao,
    entidadeAlvo,
    permitirAutoAprovacao: false,
    sempreAuditar: true,
  });

/**
 * Decorator para ações que permitem auto-aprovação para administradores
 * 
 * @param acao Tipo da ação crítica
 * @param entidadeAlvo Nome da entidade alvo (opcional)
 * 
 * @example
 * ```typescript
 * @AcaoCriticaComAutoAprovacao(TipoAcaoCritica.SUSPENDER_BENEFICIO, 'Beneficio')
 * async suspenderBeneficio(id: string) {
 *   // Implementação
 * }
 * ```
 */
export const AcaoCriticaComAutoAprovacao = (acao: TipoAcaoCritica, entidadeAlvo?: string) =>
  RequerAprovacao({
    acao,
    entidadeAlvo,
    permitirAutoAprovacao: true,
    condicoesAutoAprovacao: (context) => {
      const usuario = context.usuario || context.user;
      return usuario && ['ADMIN', 'GESTOR'].includes(usuario.role);
    },
    sempreAuditar: true,
  });