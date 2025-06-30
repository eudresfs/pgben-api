import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO base para confirmações
 * 
 * Define campos comuns compartilhados entre diferentes DTOs de confirmação
 * para seguir o princípio DRY (Don't Repeat Yourself).
 * 
 * @author Equipe PGBen
 */
export abstract class ConfirmacaoBaseDto {
  /**
   * Identificador único da confirmação
   */
  @ApiProperty({
    description: 'ID único da confirmação',
    example: 'uuid',
  })
  id: string;

  /**
   * Observações sobre a confirmação
   */
  @ApiPropertyOptional({
    description: 'Observações sobre a confirmação',
    example: 'string',
  })
  observacoes?: string;

  /**
   * Data de criação do registro
   */
  @ApiProperty({
    description: 'Data de criação do registro',
    example: 'ISO 8601 date string',
  })
  createdAt: Date;

  /**
   * Data da última atualização do registro
   */
  @ApiProperty({
    description: 'Data da última atualização do registro',
    example: 'ISO 8601 date string',
  })
  updatedAt: Date;
}

/**
 * Interface para informações do responsável pela confirmação
 */
export interface ResponsavelConfirmacaoInfo {
  id: string;
  nome: string;
  role?: string;
}

/**
 * Interface para informações do destinatário
 */
export interface DestinatarioInfo {
  id: string;
  nome: string;
  relacao?: string;
}