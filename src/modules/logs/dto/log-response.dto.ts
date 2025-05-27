import { ApiProperty } from '@nestjs/swagger';
import { CriticidadeLog } from './logs-filter.dto';

/**
 * DTO para resposta de logs
 */
export class LogResponseDto {
  /**
   * ID do log
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @ApiProperty({
    description: 'ID do log',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  /**
   * ID do usuário que realizou a ação
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @ApiProperty({
    description: 'ID do usuário que realizou a ação',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  usuario_id?: string;

  /**
   * Nome do usuário que realizou a ação
   * @example "João Silva"
   */
  @ApiProperty({
    description: 'Nome do usuário que realizou a ação',
    example: 'João Silva',
    required: false,
  })
  nome_usuario?: string;

  /**
   * Ação realizada
   * @example "CREATE"
   */
  @ApiProperty({
    description: 'Ação realizada',
    example: 'CREATE',
  })
  acao: string;

  /**
   * Entidade afetada
   * @example "solicitacao"
   */
  @ApiProperty({
    description: 'Entidade afetada',
    example: 'solicitacao',
  })
  entidade: string;

  /**
   * ID da entidade afetada
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @ApiProperty({
    description: 'ID da entidade afetada',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  entidade_id?: string;

  /**
   * Dados anteriores à ação
   */
  @ApiProperty({
    description: 'Dados anteriores à ação',
    required: false,
  })
  dados_anteriores?: Record<string, any>;

  /**
   * Novos dados após a ação
   */
  @ApiProperty({
    description: 'Novos dados após a ação',
    required: false,
  })
  dados_novos?: Record<string, any>;

  /**
   * Endereço IP do usuário
   * @example "192.168.1.1"
   */
  @ApiProperty({
    description: 'Endereço IP do usuário',
    example: '192.168.1.1',
    required: false,
  })
  ip_address?: string;

  /**
   * User agent do navegador
   * @example "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
   */
  @ApiProperty({
    description: 'User agent do navegador',
    required: false,
  })
  user_agent?: string;

  /**
   * Módulo do sistema
   * @example "solicitacao"
   */
  @ApiProperty({
    description: 'Módulo do sistema',
    example: 'solicitacao',
    required: false,
  })
  modulo?: string;

  /**
   * Criticidade do log
   * @example "NORMAL"
   */
  @ApiProperty({
    description: 'Criticidade do log',
    enum: CriticidadeLog,
    default: CriticidadeLog.NORMAL,
  })
  criticidade: CriticidadeLog;

  /**
   * Detalhes adicionais
   * @example "Solicitação criada pelo cidadão"
   */
  @ApiProperty({
    description: 'Detalhes adicionais',
    required: false,
  })
  detalhes?: string;

  /**
   * Data de criação do log
   * @example "2025-05-24T10:30:00.000Z"
   */
  @ApiProperty({
    description: 'Data de criação do log',
  })
  created_at: Date;
}
