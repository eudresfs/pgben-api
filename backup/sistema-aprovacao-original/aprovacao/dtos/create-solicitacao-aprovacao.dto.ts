import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
  IsUUID,
  IsEmail,
  IsIP,
  MinLength,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  StatusSolicitacaoAprovacao,
  PrioridadeAprovacao,
} from '../enums/aprovacao.enums';

/**
 * DTO para criação de uma nova solicitação de aprovação
 * Representa uma solicitação específica que precisa ser aprovada
 */
export class CreateSolicitacaoAprovacaoDto {
  @ApiProperty({
    description: 'ID da ação crítica que está sendo solicitada',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID(4, { message: 'ID da ação crítica deve ser um UUID válido' })
  acao_critica_id: string;

  @ApiProperty({
    description: 'ID da configuração de aprovação aplicável',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID(4, { message: 'ID da configuração deve ser um UUID válido' })
  configuracao_aprovacao_id: string;

  @ApiPropertyOptional({
    description:
      'Código único da solicitação (gerado automaticamente se não fornecido)',
    example: 'SOL-2024-001234',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Código deve ter no máximo 50 caracteres' })
  codigo?: string;

  @ApiPropertyOptional({
    description: 'Status inicial da solicitação',
    enum: StatusSolicitacaoAprovacao,
    example: StatusSolicitacaoAprovacao.PENDENTE,
    default: StatusSolicitacaoAprovacao.PENDENTE,
  })
  @IsOptional()
  @IsEnum(StatusSolicitacaoAprovacao, {
    message:
      'Status deve ser um valor válido do enum StatusSolicitacaoAprovacao',
  })
  status?: StatusSolicitacaoAprovacao = StatusSolicitacaoAprovacao.PENDENTE;

  @ApiProperty({
    description: 'Prioridade da solicitação',
    enum: PrioridadeAprovacao,
    example: PrioridadeAprovacao.NORMAL,
  })
  @IsEnum(PrioridadeAprovacao, {
    message: 'Prioridade deve ser um valor válido do enum PrioridadeAprovacao',
  })
  prioridade: PrioridadeAprovacao;

  @ApiProperty({
    description: 'ID do usuário solicitante',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsUUID(4, { message: 'ID do usuário deve ser um UUID válido' })
  usuario_solicitante_id: string;

  @ApiProperty({
    description: 'Nome do usuário solicitante',
    example: 'João Silva',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  nome: string;

  @ApiProperty({
    description: 'Email do usuário solicitante',
    example: 'joao.silva@empresa.com',
  })
  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  email: string;

  @ApiPropertyOptional({
    description: 'Perfil/cargo do usuário solicitante',
    example: 'ANALISTA',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Perfil deve ter no máximo 50 caracteres' })
  perfil?: string;

  @ApiPropertyOptional({
    description: 'Unidade organizacional do solicitante',
    example: 'DIRETORIA_TECNICA',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Unidade deve ter no máximo 100 caracteres' })
  unidade?: string;

  @ApiProperty({
    description: 'Justificativa para a solicitação',
    example: 'Necessário cancelar devido a erro no preenchimento dos dados',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @MinLength(10, { message: 'Justificativa deve ter pelo menos 10 caracteres' })
  @MaxLength(1000, {
    message: 'Justificativa deve ter no máximo 1000 caracteres',
  })
  justificativa: string;

  @ApiPropertyOptional({
    description: 'Contexto adicional da solicitação',
    example: {
      solicitacao_id: '123',
      valor_original: 1500.0,
      data_solicitacao: '2024-01-15',
    },
  })
  @IsOptional()
  @IsObject()
  contexto?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Dados originais antes da alteração',
    example: {
      status: 'EM_ANDAMENTO',
      valor: 1500.0,
      observacoes: 'Solicitação inicial',
    },
  })
  @IsOptional()
  @IsObject()
  dados_originais?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Dados propostos após a alteração',
    example: {
      status: 'CANCELADO',
      motivo_cancelamento: 'Erro nos dados',
    },
  })
  @IsOptional()
  @IsObject()
  dados_propostos?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Valor monetário envolvido na operação',
    example: 1500.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Valor deve ser um número decimal' },
  )
  @Min(0, { message: 'Valor deve ser maior ou igual a 0' })
  valor_envolvido?: number;

  @ApiPropertyOptional({
    description: 'IP do solicitante',
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsIP(undefined, { message: 'IP deve ter um formato válido' })
  ip_solicitante?: string;

  @ApiPropertyOptional({
    description: 'User Agent do navegador',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'User Agent deve ter no máximo 500 caracteres' })
  user_agent?: string;

  @ApiPropertyOptional({
    description: 'ID da sessão do usuário',
    example: 'sess_123456789',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'ID da sessão deve ter no máximo 100 caracteres' })
  sessao_id?: string;

  @ApiPropertyOptional({
    description: 'Lista de anexos',
    example: [
      {
        nome: 'documento.pdf',
        url: 'https://storage.com/doc.pdf',
        tipo: 'application/pdf',
        tamanho: 1024000,
      },
    ],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  anexos?: Array<{
    nome: string;
    url: string;
    tipo: string;
    tamanho: number;
  }>;

  @ApiPropertyOptional({
    description: 'Tags para categorização',
    example: ['urgente', 'financeiro'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Metadados adicionais',
    example: {
      origem: 'web',
      versao_app: '1.2.3',
      dispositivo: 'desktop',
    },
  })
  @IsOptional()
  @IsObject()
  metadados?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Observações internas (não visíveis ao solicitante)',
    example: 'Solicitação gerada automaticamente pelo sistema',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Observações devem ter no máximo 500 caracteres' })
  observacoes_internas?: string;

  @ApiPropertyOptional({
    description: 'Se deve ser processada automaticamente',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  processamento_automatico?: boolean = false;
}
