import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsString,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { TipoEventoHistoricoEnum } from '../../../enums/tipo-evento-historico.enum';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';

/**
 * Enum para tipos de formato de exportação
 */
export enum TipoExportacaoEnum {
  PDF = 'pdf',
  EXCEL = 'excel',
}

/**
 * DTO para solicitação de exportação do histórico de pagamentos
 *
 * Define os parâmetros necessários para gerar relatórios de exportação
 * do histórico de pagamentos em diferentes formatos.
 *
 * @author Equipe PGBen
 */
export class HistoricoPagamentoExportacaoDto {
  @ApiProperty({
    description: 'Formato de exportação desejado',
    enum: TipoExportacaoEnum,
    example: TipoExportacaoEnum.PDF,
  })
  @IsEnum(TipoExportacaoEnum, {
    message: 'Formato deve ser PDF ou EXCEL',
  })
  formato: TipoExportacaoEnum;

  @ApiPropertyOptional({
    description: 'ID do pagamento para filtrar histórico',
    example: 'uuid-pagamento-123',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID do pagamento deve ser um UUID válido' })
  pagamento_id?: string;

  @ApiPropertyOptional({
    description: 'Tipo de evento para filtrar',
    enum: TipoEventoHistoricoEnum,
    example: TipoEventoHistoricoEnum.ALTERACAO_STATUS,
  })
  @IsOptional()
  @IsEnum(TipoEventoHistoricoEnum, {
    message: 'Tipo de evento deve ser um valor válido do enum TipoEventoHistoricoEnum',
  })
  tipo_evento?: TipoEventoHistoricoEnum;

  @ApiPropertyOptional({
    description: 'Status anterior para filtrar',
    enum: StatusPagamentoEnum,
    example: StatusPagamentoEnum.PENDENTE,
  })
  @IsOptional()
  @IsEnum(StatusPagamentoEnum, {
    message: 'Status anterior deve ser um valor válido do enum StatusPagamentoEnum',
  })
  status_anterior?: StatusPagamentoEnum;

  @ApiPropertyOptional({
    description: 'Status atual para filtrar',
    enum: StatusPagamentoEnum,
    example: StatusPagamentoEnum.LIBERADO,
  })
  @IsOptional()
  @IsEnum(StatusPagamentoEnum, {
    message: 'Status atual deve ser um valor válido do enum StatusPagamentoEnum',
  })
  status_atual?: StatusPagamentoEnum;

  @ApiPropertyOptional({
    description: 'ID do usuário responsável pelo evento',
    example: 'uuid-usuario-123',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID do usuário deve ser um UUID válido' })
  usuario_id?: string;

  @ApiPropertyOptional({
    description: 'Data inicial para filtro por período (ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data inicial deve estar no formato ISO 8601' })
  data_inicial?: string;

  @ApiPropertyOptional({
    description: 'Data final para filtro por período (ISO 8601)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data final deve estar no formato ISO 8601' })
  data_final?: string;

  @ApiPropertyOptional({
    description: 'Título personalizado para o relatório',
    example: 'Histórico de Pagamentos - Janeiro 2024',
  })
  @IsOptional()
  @IsString({ message: 'Título deve ser uma string' })
  titulo?: string;

  @ApiPropertyOptional({
    description: 'Observações adicionais para incluir no relatório',
    example: 'Relatório gerado para auditoria mensal',
  })
  @IsOptional()
  @IsString({ message: 'Observações devem ser uma string' })
  observacoes?: string;
}

/**
 * DTO para resposta de exportação do histórico
 *
 * @author Equipe PGBen
 */
export class HistoricoPagamentoExportacaoResponseDto {
  /**
   * URL para download do arquivo gerado
   */
  @ApiProperty({
    description: 'URL para download do arquivo de exportação',
    example: 'https://api.exemplo.com/downloads/historico-pagamentos-20240115.pdf',
  })
  url_download: string;

  /**
   * Nome do arquivo gerado
   */
  @ApiProperty({
    description: 'Nome do arquivo gerado',
    example: 'historico-pagamentos-20240115.pdf',
  })
  nome_arquivo: string;

  /**
   * Formato do arquivo
   */
  @ApiProperty({
    description: 'Formato do arquivo exportado',
    enum: TipoExportacaoEnum,
    example: TipoExportacaoEnum.PDF,
  })
  formato: TipoExportacaoEnum;

  /**
   * Tamanho do arquivo em bytes
   */
  @ApiProperty({
    description: 'Tamanho do arquivo em bytes',
    example: 1024000,
  })
  tamanho_arquivo: number;

  /**
   * Data de geração do relatório
   */
  @ApiProperty({
    description: 'Data e hora de geração do relatório',
    example: '2024-01-15T10:30:00.000Z',
  })
  data_geracao: Date;

  /**
   * Quantidade de registros incluídos no relatório
   */
  @ApiProperty({
    description: 'Número total de registros incluídos no relatório',
    example: 150,
  })
  total_registros: number;

  /**
   * Período coberto pelo relatório
   */
  @ApiProperty({
    description: 'Período de dados incluído no relatório',
    example: {
      data_inicial: '2024-01-01T00:00:00.000Z',
      data_final: '2024-01-31T23:59:59.999Z'
    },
    required: false,
  })
  periodo?: {
    data_inicial: Date;
    data_final: Date;
  };
}