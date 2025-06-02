import { TipoOperacao } from '../../../enums/tipo-operacao.enum';

/**
 * Interface para eventos de auditoria
 *
 * Define a estrutura básica para todos os eventos que devem ser
 * registrados no sistema de auditoria. Essa interface é utilizada
 * pelos interceptors e middlewares para padronizar os dados coletados.
 */
export interface AuditEvent {
  /**
   * Tipo de operação realizada
   */
  tipo_operacao: TipoOperacao;

  /**
   * Nome da entidade afetada pela operação
   */
  entidade_afetada: string;

  /**
   * ID da entidade afetada (opcional)
   */
  entidade_id?: string;

  /**
   * Dados anteriores à operação (em caso de update ou delete)
   */
  dados_anteriores?: Record<string, any>;

  /**
   * Dados após a operação (em caso de create ou update)
   */
  dados_novos?: Record<string, any>;

  /**
   * ID do usuário que realizou a operação
   */
  usuario_id?: string;

  /**
   * IP do usuário que realizou a operação
   */
  ip_origem?: string;

  /**
   * User-Agent do navegador do usuário
   */
  user_agent?: string;

  /**
   * Endpoint acessado
   */
  endpoint?: string;

  /**
   * Método HTTP utilizado
   */
  metodo_http?: string;

  /**
   * Lista de campos sensíveis acessados (LGPD compliance)
   */
  dados_sensiveis_acessados?: string[];

  /**
   * Motivo da operação
   */
  motivo?: string;

  /**
   * Descrição da operação
   */
  descricao?: string;

  /**
   * Timestamp da operação
   */
  data_hora?: Date;

  /**
   * Dados adicionais específicos do contexto
   */
  metadata?: Record<string, any>;
}
