import { SetMetadata } from '@nestjs/common';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';

/**
 * Chave para metadados de auditoria
 */
export const AUDITORIA_METADATA_KEY = 'auditoria';

/**
 * Interface para opções do decorator de auditoria
 */
export interface AuditoriaOptions {
  /** Nome da entidade sendo auditada */
  entidade: string;
  
  /** Tipo de operação sendo realizada */
  operacao: TipoOperacao;
  
  /** Descrição personalizada da operação (opcional) */
  descricao?: string;
  
  /** Se deve mascarar dados sensíveis (padrão: true) */
  mascarDados?: boolean;
  
  /** Se deve capturar dados anteriores para operações de UPDATE (padrão: false) */
  capturarDadosAnteriores?: boolean;
}

/**
 * Decorator de Auditoria para Métodos do Módulo de Pagamento
 * 
 * Este decorator marca métodos que devem ser auditados automaticamente
 * pelo AuditoriaInterceptor. Quando aplicado a um método, todas as
 * chamadas para esse método serão registradas no log de auditoria.
 * 
 * Funcionalidades:
 * - Marca métodos para auditoria automática
 * - Define tipo de operação e entidade
 * - Permite personalização da descrição
 * - Controla mascaramento de dados sensíveis
 * - Suporte para captura de dados anteriores
 * 
 * @param options Opções de configuração da auditoria
 * 
 * @example
 * ```typescript
 * @Auditoria({
 *   entidade: 'Pagamento',
 *   operacao: TipoOperacao.CREATE,
 *   descricao: 'Criação de novo pagamento'
 * })
 * async createPagamento(dto: CreatePagamentoDto) {
 *   // implementação
 * }
 * ```
 * 
 * @example
 * ```typescript
 * @Auditoria({
 *   entidade: 'Pagamento',
 *   operacao: TipoOperacao.UPDATE,
 *   capturarDadosAnteriores: true,
 *   mascarDados: true
 * })
 * async atualizarStatus(id: string, status: StatusPagamento) {
 *   // implementação
 * }
 * ```
 * 
 * @author Equipe PGBen
 */
export const Auditoria = (options: AuditoriaOptions) => {
  // Validar opções obrigatórias
  if (!options.entidade) {
    throw new Error('Opção "entidade" é obrigatória para o decorator @Auditoria');
  }
  
  if (!options.operacao) {
    throw new Error('Opção "operacao" é obrigatória para o decorator @Auditoria');
  }
  
  // Definir valores padrão
  const metadata = {
    entidade: options.entidade,
    operacao: options.operacao,
    descricao: options.descricao,
    mascarDados: options.mascarDados ?? true,
    capturarDadosAnteriores: options.capturarDadosAnteriores ?? false,
  };
  
  return SetMetadata(AUDITORIA_METADATA_KEY, metadata);
};

/**
 * Decorators pré-configurados para operações comuns
 */

/**
 * Decorator para operações de criação
 */
export const AuditoriaCriacao = (entidade: string, descricao?: string) =>
  Auditoria({
    entidade,
    operacao: TipoOperacao.CREATE,
    descricao: descricao || `Criação de ${entidade}`,
    mascarDados: true,
  });

/**
 * Decorator para operações de atualização
 */
export const AuditoriaAtualizacao = (entidade: string, descricao?: string) =>
  Auditoria({
    entidade,
    operacao: TipoOperacao.UPDATE,
    descricao: descricao || `Atualização de ${entidade}`,
    mascarDados: true,
    capturarDadosAnteriores: true,
  });

/**
 * Decorator para operações de exclusão
 */
export const AuditoriaExclusao = (entidade: string, descricao?: string) =>
  Auditoria({
    entidade,
    operacao: TipoOperacao.DELETE,
    descricao: descricao || `Exclusão de ${entidade}`,
    mascarDados: true,
    capturarDadosAnteriores: true,
  });

/**
 * Decorator para operações de consulta sensíveis
 */
export const AuditoriaConsulta = (entidade: string, descricao?: string) =>
  Auditoria({
    entidade,
    operacao: TipoOperacao.READ,
    descricao: descricao || `Consulta de ${entidade}`,
    mascarDados: true,
  });

/**
 * Decorator específico para operações de pagamento
 */
export const AuditoriaPagamento = {
  /**
   * Auditoria para criação de pagamento
   */
  Criacao: (descricao?: string) =>
    AuditoriaCriacao('Pagamento', descricao || 'Criação de pagamento'),
  
  /**
   * Auditoria para atualização de status de pagamento
   */
  AtualizacaoStatus: (descricao?: string) =>
    AuditoriaAtualizacao('Pagamento', descricao || 'Atualização de status de pagamento'),
  
  /**
   * Auditoria para cancelamento de pagamento
   */
  Cancelamento: (descricao?: string) =>
    Auditoria({
      entidade: 'Pagamento',
      operacao: TipoOperacao.UPDATE,
      descricao: descricao || 'Cancelamento de pagamento',
      mascarDados: true,
      capturarDadosAnteriores: true,
    }),
  
  /**
   * Auditoria para consulta de pagamentos
   */
  Consulta: (descricao?: string) =>
    AuditoriaConsulta('Pagamento', descricao || 'Consulta de pagamentos'),
  
  /**
   * Auditoria para validação de limites
   */
  ValidacaoLimites: (descricao?: string) =>
    Auditoria({
      entidade: 'Pagamento',
      operacao: TipoOperacao.READ,
      descricao: descricao || 'Validação de limites de pagamento',
      mascarDados: false, // Dados de limite não são sensíveis
    }),
};