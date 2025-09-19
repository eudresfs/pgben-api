import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsObject,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para dados de resposta de uma tela
 * 
 * @description Representa os dados específicos que serão
 * enviados para uma tela do WhatsApp Flow
 */
export class ScreenDataDto {
  @IsString({ message: 'Título deve ser uma string' })
  @IsOptional()
  @ApiPropertyOptional({
    example: 'Bem-vindo ao SEMTAS',
    description: 'Título da tela',
  })
  title?: string;

  @IsString({ message: 'Mensagem deve ser uma string' })
  @IsOptional()
  @ApiPropertyOptional({
    example: 'Digite seu CPF e senha para acessar o sistema',
    description: 'Mensagem principal da tela',
  })
  message?: string;

  @IsObject({ message: 'Dados devem ser um objeto' })
  @IsOptional()
  @ApiPropertyOptional({
    example: { user_name: 'João Silva', benefits_count: 3 },
    description: 'Dados dinâmicos específicos da tela',
  })
  dynamic_data?: Record<string, any>;
}

/**
 * DTO para ações disponíveis em uma tela
 * 
 * @description Define as ações que o usuário pode realizar
 * em uma determinada tela do fluxo
 */
export class ScreenActionDto {
  @IsString({ message: 'Nome da ação deve ser uma string' })
  @IsNotEmpty({ message: 'Nome da ação é obrigatório' })
  @ApiProperty({
    example: 'login',
    description: 'Identificador da ação',
  })
  name: string;

  @IsString({ message: 'Label deve ser uma string' })
  @IsNotEmpty({ message: 'Label é obrigatório' })
  @ApiProperty({
    example: 'Entrar',
    description: 'Texto exibido para a ação',
  })
  label: string;

  @IsString({ message: 'Próxima tela deve ser uma string' })
  @IsOptional()
  @ApiPropertyOptional({
    example: 'DASHBOARD',
    description: 'Tela de destino após a ação',
  })
  next_screen?: string;

  @IsBoolean({ message: 'Enabled deve ser um boolean' })
  @IsOptional()
  @ApiPropertyOptional({
    example: true,
    description: 'Se a ação está habilitada',
    default: true,
  })
  enabled?: boolean;
}

/**
 * DTO para dados de erro
 * 
 * @description Estrutura padronizada para retorno de erros
 * nas respostas do WhatsApp Flow
 */
export class ErrorDataDto {
  @IsString({ message: 'Código do erro deve ser uma string' })
  @IsNotEmpty({ message: 'Código do erro é obrigatório' })
  @ApiProperty({
    example: 'INVALID_CREDENTIALS',
    description: 'Código identificador do erro',
  })
  error_code: string;

  @IsString({ message: 'Mensagem de erro deve ser uma string' })
  @IsNotEmpty({ message: 'Mensagem de erro é obrigatória' })
  @ApiProperty({
    example: 'CPF ou senha inválidos',
    description: 'Mensagem de erro para exibição ao usuário',
  })
  error_message: string;

  @IsObject({ message: 'Detalhes devem ser um objeto' })
  @IsOptional()
  @ApiPropertyOptional({
    example: { field: 'cpf', reason: 'format_invalid' },
    description: 'Detalhes adicionais sobre o erro',
  })
  details?: Record<string, any>;
}

/**
 * DTO principal para respostas do WhatsApp Flows
 * 
 * @description Estrutura completa de resposta que será
 * criptografada e enviada de volta ao WhatsApp Business API
 * 
 * @author SEMTAS Development Team
 * @since 1.0.0
 */
export class WhatsAppFlowResponseDto {
  @IsString({ message: 'Versão deve ser uma string' })
  @IsNotEmpty({ message: 'Versão é obrigatória' })
  @ApiProperty({
    example: '3.0',
    description: 'Versão da API do WhatsApp Flows',
  })
  version: string;

  @IsString({ message: 'Ação deve ser uma string' })
  @IsNotEmpty({ message: 'Ação é obrigatória' })
  @ApiProperty({
    example: 'data_exchange',
    description: 'Tipo de resposta (ping, data_exchange, terminate)',
  })
  action?: string;

  @IsString({ message: 'Tela deve ser uma string' })
  @IsOptional()
  @ApiPropertyOptional({
    example: 'INICIO',
    description: 'Tela atual ou de destino',
  })
  screen?: string;

  @IsObject({ message: 'Dados devem ser um objeto' })
  @IsOptional()
  @ValidateNested()
  @ApiPropertyOptional({
    type: Object,
    description: 'Dados específicos da tela',
  })
  data?: any;

  @IsArray({ message: 'Ações devem ser um array' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScreenActionDto)
  @ApiPropertyOptional({
    type: [ScreenActionDto],
    description: 'Ações disponíveis na tela',
  })
  actions?: ScreenActionDto[];

  @IsObject({ message: 'Erro deve ser um objeto' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ErrorDataDto)
  @ApiPropertyOptional({
    type: ErrorDataDto,
    description: 'Informações de erro, se houver',
  })
  error?: ErrorDataDto;

  @IsBoolean({ message: 'Success deve ser um boolean' })
  @IsOptional()
  @ApiPropertyOptional({
    example: true,
    description: 'Indica se a operação foi bem-sucedida',
    default: true,
  })
  success?: boolean;
}

/**
 * DTO para resposta criptografada
 * 
 * @description Estrutura final que será enviada ao WhatsApp
 * contendo os dados criptografados da resposta
 */
export class EncryptedFlowResponseDto {
  @IsString({ message: 'Dados criptografados devem ser uma string' })
  @IsNotEmpty({ message: 'Dados criptografados são obrigatórios' })
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Dados da resposta criptografados em formato JWE',
  })
  encrypted_flow_data: string;
}

/**
 * DTO para resposta de ping
 * 
 * @description Resposta específica para requisições de ping
 * do WhatsApp para verificar se o endpoint está ativo
 */
export class PingResponseDto {
  @IsString({ message: 'Versão deve ser uma string' })
  @IsNotEmpty({ message: 'Versão é obrigatória' })
  @ApiProperty({
    example: '3.0',
    description: 'Versão da API do WhatsApp Flows',
  })
  version: string;

  @IsString({ message: 'Ação deve ser uma string' })
  @IsNotEmpty({ message: 'Ação é obrigatória' })
  @ApiProperty({
    example: 'ping',
    description: 'Confirmação da ação de ping',
  })
  action: string;

  @IsObject({ message: 'Dados devem ser um objeto' })
  @IsOptional()
  @ApiPropertyOptional({
    example: { status: 'ok', timestamp: '2024-01-15T10:30:00Z' },
    description: 'Dados de status do serviço',
  })
  data?: Record<string, any>;
}

/**
 * DTO para dados de usuário autenticado
 * 
 * @description Estrutura para retornar informações do usuário
 * após autenticação bem-sucedida
 */
export class AuthenticatedUserDataDto {
  @IsString({ message: 'ID do usuário deve ser uma string' })
  @IsNotEmpty({ message: 'ID do usuário é obrigatório' })
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único do usuário',
  })
  user_id: string;

  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @ApiProperty({
    example: 'João Silva',
    description: 'Nome completo do usuário',
  })
  name: string;

  @IsString({ message: 'CPF deve ser uma string' })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @ApiProperty({
    example: '123.456.789-00',
    description: 'CPF do usuário',
  })
  cpf: string;

  @IsString({ message: 'Unidade deve ser uma string' })
  @IsOptional()
  @ApiPropertyOptional({
    example: 'CRAS Centro',
    description: 'Nome da unidade do usuário',
  })
  unidade?: string;

  @IsArray({ message: 'Permissões devem ser um array' })
  @IsOptional()
  @ApiPropertyOptional({
    example: ['READ_CIDADAO', 'WRITE_CIDADAO'],
    description: 'Lista de permissões do usuário',
  })
  permissions?: string[];
}

/**
 * DTO para dados de cidadão encontrado
 * 
 * @description Estrutura para retornar informações do cidadão
 * após busca bem-sucedida
 */
export class FoundCidadaoDataDto {
  @IsString({ message: 'ID do cidadão deve ser uma string' })
  @IsNotEmpty({ message: 'ID do cidadão é obrigatório' })
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único do cidadão',
  })
  cidadao_id: string;

  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @ApiProperty({
    example: 'Maria da Silva',
    description: 'Nome completo do cidadão',
  })
  nome: string;

  @IsString({ message: 'CPF deve ser uma string' })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @ApiProperty({
    example: '123.456.789-00',
    description: 'CPF do cidadão',
  })
  cpf: string;

  @IsString({ message: 'Status deve ser uma string' })
  @IsOptional()
  @ApiPropertyOptional({
    example: 'ATIVO',
    description: 'Status atual do cidadão no sistema',
  })
  status?: string;

  @IsObject({ message: 'Benefícios devem ser um objeto' })
  @IsOptional()
  @ApiPropertyOptional({
    example: { total: 2, ativos: 1, pendentes: 1 },
    description: 'Resumo dos benefícios do cidadão',
  })
  benefits_summary?: Record<string, any>;
}