import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO base para comprovantes
 *
 * Define campos comuns compartilhados entre diferentes DTOs de comprovante
 * para seguir o princípio DRY (Don't Repeat Yourself).
 *
 * @author Equipe PGBen
 */
export abstract class ComprovanteBaseDto {
  /**
   * Identificador único do comprovante
   */
  @ApiProperty({
    description: 'ID único do comprovante',
    example: 'uuid',
  })
  id: string;

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
 * Interface para informações do responsável pelo upload
 */
export interface ResponsavelUploadInfo {
  id: string;
  nome: string;
}
