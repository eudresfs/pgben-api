import { StatusRecurso } from '../../../entities/recurso.entity';

/**
 * DTO de resposta para recursos
 */
export class RecursoResponseDto {
  /**
   * ID do recurso
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  id: string;

  /**
   * ID da solicitação relacionada
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  solicitacao_id: string;

  /**
   * Número do protocolo da solicitação
   * @example "SOL202500010001"
   */
  protocolo_solicitacao?: string;

  /**
   * Nome do beneficiário
   * @example "João da Silva"
   */
  nome_beneficiario?: string;

  /**
   * Justificativa do recurso
   * @example "Discordo da decisão pois apresentei todos os documentos necessários."
   */
  justificativa: string;

  /**
   * Status atual do recurso
   * @example "pendente"
   */
  status: StatusRecurso;

  /**
   * Data de análise do recurso (se houver)
   * @example "2025-05-26T14:20:00.000Z"
   */
  data_analise?: Date;

  /**
   * ID do analista responsável (se houver)
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  analista_id?: string;

  /**
   * Nome do analista responsável (se houver)
   * @example "Maria Oliveira"
   */
  nome_analista?: string;

  /**
   * Parecer da análise (se houver)
   * @example "Após análise da documentação, verificou-se que o beneficiário atende aos requisitos."
   */
  parecer?: string;

  /**
   * Documentos adicionais enviados
   */
  documentos_adicionais?: Record<string, any>;

  /**
   * Motivo do indeferimento original
   * @example "Documentação incompleta"
   */
  motivo_indeferimento?: string;

  /**
   * Prazo em dias úteis para análise
   * @example 5
   */
  prazo_analise: number;

  /**
   * ID do setor responsável
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  setor_responsavel_id?: string;

  /**
   * Nome do setor responsável
   * @example "Setor de Análise de Recursos"
   */
  nome_setor_responsavel?: string;

  /**
   * Data de criação do registro
   * @example "2025-05-24T10:30:00.000Z"
   */
  created_at: Date;

  /**
   * Data da última atualização do registro
   * @example "2025-05-26T14:20:00.000Z"
   */
  updated_at: Date;
}
