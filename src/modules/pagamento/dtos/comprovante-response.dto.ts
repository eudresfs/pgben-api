import { ApiProperty } from '@nestjs/swagger';
import {
  ComprovanteBaseDto,
  ResponsavelUploadInfo,
} from './base/comprovante-base.dto';

/**
 * DTO para resposta contendo dados de um comprovante de pagamento
 *
 * Este DTO define a estrutura de dados retornada pela API ao consultar
 * informações sobre um comprovante específico. Estende ComprovanteBaseDto
 * para reutilizar campos comuns.
 *
 * @author Equipe PGBen
 */
export class ComprovanteResponseDto extends ComprovanteBaseDto {
  // Campo 'id' herdado de ComprovanteBaseDto

  /**
   * Referência ao pagamento relacionado a este comprovante
   */
  @ApiProperty({
    description: 'ID do pagamento relacionado',
    example: 'uuid',
  })
  pagamento_id: string;

  /**
   * Tipo de documento (ex: comprovante_transferencia, recibo, etc.)
   */
  @ApiProperty({
    description: 'Tipo do documento',
    example: 'string',
  })
  tipo_documento: string;

  /**
   * Nome original do arquivo enviado
   */
  @ApiProperty({
    description: 'Nome original do arquivo',
    example: 'string',
  })
  nome_arquivo: string;

  /**
   * URL segura temporária para acesso ao arquivo
   */
  @ApiProperty({
    description: 'URL para download/visualização do arquivo',
    example: 'string',
  })
  url: string;

  /**
   * Tamanho do arquivo em bytes
   */
  @ApiProperty({
    description: 'Tamanho do arquivo em bytes',
    example: 0,
  })
  tamanho: number;

  /**
   * Tipo MIME do arquivo
   */
  @ApiProperty({
    description: 'Tipo MIME do arquivo',
    example: 'string',
  })
  mime_type: string;

  /**
   * Data de upload do comprovante
   */
  @ApiProperty({
    description: 'Data de upload do arquivo',
    example: 'ISO 8601 date string',
  })
  data_upload: Date;

  /**
   * Informações sobre o responsável pelo upload
   */
  @ApiProperty({
    description: 'Dados sobre quem fez o upload do comprovante',
    example: {
      id: 'uuid',
      nome: 'string',
    },
  })
  responsavel_upload: ResponsavelUploadInfo;

  // Campos 'created_at' e 'updated_at' herdados de ComprovanteBaseDto
}
