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
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  /**
   * Referência ao pagamento relacionado a este comprovante
   */
  @ApiProperty({
    description: 'ID do pagamento relacionado',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  pagamentoId: string;

  /**
   * Tipo de documento (ex: comprovante_transferencia, recibo, etc.)
   */
  @ApiProperty({
    description: 'Tipo do documento',
    example: 'comprovante_transferencia'
  })
  tipoDocumento: string;

  /**
   * Nome original do arquivo enviado
   */
  @ApiProperty({
    description: 'Nome original do arquivo',
    example: 'comprovante_transferencia_bb.pdf'
  })
  nomeArquivo: string;

  /**
   * URL segura temporária para acesso ao arquivo
   */
  @ApiProperty({
    description: 'URL para download/visualização do arquivo',
    example: 'https://api.pgben.natal.rn.gov.br/api/pagamentos/123e4567-e89b-12d3-a456-426614174000/comprovantes/123e4567-e89b-12d3-a456-426614174000/download?token=abc123'
  })
  url: string;

  /**
   * Tamanho do arquivo em bytes
   */
  @ApiProperty({
    description: 'Tamanho do arquivo em bytes',
    example: 245367
  })
  tamanho: number;

  /**
   * Tipo MIME do arquivo
   */
  @ApiProperty({
    description: 'Tipo MIME do arquivo',
    example: 'application/pdf'
  })
  mimeType: string;

  /**
   * Data de upload do comprovante
   */
  @ApiProperty({
    description: 'Data de upload do arquivo',
    example: '2025-05-18T14:30:00.000Z'
  })
  dataUpload: Date;

  /**
   * Informações sobre o responsável pelo upload
   */
  @ApiProperty({
    description: 'Dados sobre quem fez o upload do comprovante',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      nome: 'João Silva'
    }
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
    example: '2025-05-18T14:30:00.000Z'
  })
  createdAt: Date;

  /**
   * Data da última atualização do registro
   */
  @ApiProperty({
    description: 'Data da última atualização do registro',
    example: '2025-05-18T14:30:00.000Z'
  })
  updatedAt: Date;
}
