import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para resposta contendo dados de um comprovante de pagamento
 *
 * Este DTO define a estrutura de dados retornada pela API ao consultar
 * informações sobre um comprovante específico.
 *
 * @author Equipe PGBen
 */
export class ComprovanteResponseDto {
  /**
   * Identificador único do comprovante
   */
  @ApiProperty({
    description: 'ID único do comprovante',
    example: 'uuid',
  })
  id: string;

  /**
   * Referência ao pagamento relacionado a este comprovante
   */
  @ApiProperty({
    description: 'ID do pagamento relacionado',
    example: 'uuid',
  })
  pagamentoId: string;

  /**
   * Tipo de documento (ex: comprovante_transferencia, recibo, etc.)
   */
  @ApiProperty({
    description: 'Tipo do documento',
    example: 'string',
  })
  tipoDocumento: string;

  /**
   * Nome original do arquivo enviado
   */
  @ApiProperty({
    description: 'Nome original do arquivo',
    example: 'string',
  })
  nomeArquivo: string;

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
  mimeType: string;

  /**
   * Data de upload do comprovante
   */
  @ApiProperty({
    description: 'Data de upload do arquivo',
    example: 'ISO 8601 date string',
  })
  dataUpload: Date;

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
  responsavelUpload: {
    id: string;
    nome: string;
  };

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
