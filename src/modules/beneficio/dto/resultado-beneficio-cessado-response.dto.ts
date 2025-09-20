import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { MotivoEncerramentoBeneficio } from '../../../enums/motivo-encerramento-beneficio.enum';
import { StatusVulnerabilidade } from '../../../enums/status-vulnerabilidade.enum';

/**
 * DTO de resposta para resultado de benefício cessado.
 * 
 * Estrutura as informações retornadas após o registro
 * do resultado de encerramento de benefício eventual,
 * conforme Lei de Benefícios Eventuais do SUAS.
 */
export class DocumentoComprobatorioResponseDto {
  @ApiProperty({
    description: 'ID único do documento',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Tipo do documento comprobatório',
    example: 'FOTOGRAFIA',
  })
  @Expose()
  tipo: string;

  @ApiProperty({
    description: 'Nome original do arquivo',
    example: 'comprovante_renda_familia.pdf',
  })
  @Expose()
  nomeArquivo: string;

  @ApiProperty({
    description: 'Descrição do documento',
    example: 'Comprovante de renda atual da família',
  })
  @Expose()
  descricao: string;

  @ApiProperty({
    description: 'Tamanho do arquivo em bytes',
    example: 1048576,
  })
  @Expose()
  tamanhoArquivo: number;

  @ApiProperty({
    description: 'Data de upload do documento',
    example: '2024-01-15T10:30:00Z',
  })
  @Expose()
  dataUpload: Date;

  @ApiProperty({
    description: 'Indica se o documento foi validado',
    example: false,
  })
  @Expose()
  validado: boolean;

  @ApiPropertyOptional({
    description: 'Data de validação do documento',
    example: '2024-01-15T14:30:00Z',
  })
  @Expose()
  dataValidacao?: Date;
}

export class TecnicoResponseDto {
  @ApiProperty({
    description: 'ID do técnico responsável',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Nome do técnico responsável',
    example: 'Maria Silva Santos',
  })
  @Expose()
  nome: string;

  @ApiProperty({
    description: 'Email do técnico responsável',
    example: 'maria.santos@semtas.gov.br',
  })
  @Expose()
  email: string;
}

export class ConcessaoResponseDto {
  @ApiProperty({
    description: 'ID da concessão',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Status atual da concessão',
    example: 'CESSADO',
  })
  @Expose()
  status: string;

  @ApiProperty({
    description: 'Data de início da concessão',
    example: '2023-12-01T00:00:00Z',
  })
  @Expose()
  dataInicio: Date;

  @ApiProperty({
    description: 'Data de encerramento da concessão',
    example: '2024-01-15T00:00:00Z',
  })
  @Expose()
  dataEncerramento: Date;
}

export class ResultadoBeneficioCessadoResponseDto {
  @ApiProperty({
    description: 'ID único do resultado',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Informações da concessão cessada',
    type: ConcessaoResponseDto,
  })
  @Expose()
  @Type(() => ConcessaoResponseDto)
  concessao: ConcessaoResponseDto;

  @ApiProperty({
    description: 'Motivo principal do encerramento',
    enum: MotivoEncerramentoBeneficio,
    example: MotivoEncerramentoBeneficio.SUPERACAO_VULNERABILIDADE,
  })
  @Expose()
  motivoEncerramento: MotivoEncerramentoBeneficio;

  @ApiProperty({
    description: 'Descrição detalhada do motivo',
    example: 'Família conseguiu emprego formal e renda suficiente para subsistência',
  })
  @Expose()
  descricaoMotivo: string;

  @ApiProperty({
    description: 'Status atual da vulnerabilidade',
    enum: StatusVulnerabilidade,
    example: StatusVulnerabilidade.SUPERADA,
  })
  @Expose()
  statusVulnerabilidade: StatusVulnerabilidade;

  @ApiProperty({
    description: 'Avaliação detalhada da vulnerabilidade',
    example: 'Família demonstrou autonomia financeira e social',
  })
  @Expose()
  avaliacaoVulnerabilidade: string;

  @ApiPropertyOptional({
    description: 'Observações adicionais',
    example: 'Família foi encaminhada para acompanhamento no CRAS local',
  })
  @Expose()
  observacoes?: string;

  @ApiProperty({
    description: 'Indica se há necessidade de acompanhamento posterior',
    example: true,
  })
  @Expose()
  acompanhamentoPosterior: boolean;

  @ApiPropertyOptional({
    description: 'Detalhes sobre o acompanhamento posterior',
    example: 'Acompanhamento trimestral no CRAS',
  })
  @Expose()
  detalhesAcompanhamento?: string;

  @ApiPropertyOptional({
    description: 'Recomendações para a família',
    example: 'Manter acompanhamento educacional das crianças',
  })
  @Expose()
  recomendacoes?: string;

  @ApiProperty({
    description: 'Técnico responsável pelo registro',
    type: TecnicoResponseDto,
  })
  @Expose()
  @Type(() => TecnicoResponseDto)
  tecnicoResponsavel: TecnicoResponseDto;

  @ApiProperty({
    description: 'Data de registro do resultado',
    example: '2024-01-15T10:30:00Z',
  })
  @Expose()
  dataRegistro: Date;

  @ApiProperty({
    description: 'Lista de documentos comprobatórios',
    type: [DocumentoComprobatorioResponseDto],
  })
  @Expose()
  @Type(() => DocumentoComprobatorioResponseDto)
  documentosComprobatorios: DocumentoComprobatorioResponseDto[];

  @ApiProperty({
    description: 'Data de criação do registro',
    example: '2024-01-15T10:30:00Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização',
    example: '2024-01-15T10:30:00Z',
  })
  @Expose()
  updatedAt: Date;
}