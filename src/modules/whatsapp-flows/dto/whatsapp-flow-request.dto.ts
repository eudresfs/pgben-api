import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para dados descriptografados do WhatsApp Flow
 * 
 * @description Representa os dados após a descriptografia
 * da requisição do WhatsApp Business API
 */
export class WhatsAppFlowDataDto {
  @IsString({ message: 'Flow token deve ser uma string' })
  @IsNotEmpty({ message: 'Flow token é obrigatório' })
  @ApiProperty({
    example: 'flow_token_12345',
    description: 'Token único do fluxo fornecido pelo WhatsApp',
  })
  flow_token: string;

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
    description: 'Tipo de ação solicitada (ping, data_exchange, init, terminate)',
  })
  action: string;

  @IsString({ message: 'Tela deve ser uma string' })
  @IsOptional()
  @ApiProperty({
    example: 'INICIO',
    description: 'Tela atual do fluxo',
    required: false,
  })
  screen?: string;

  @IsObject({ message: 'Dados devem ser um objeto' })
  @IsOptional()
  @ApiProperty({
    example: { cpf: '123.456.789-00', password: 'senha123' },
    description: 'Dados específicos da tela/ação',
    required: false,
  })
  data?: Record<string, any>;
}

/**
 * DTO principal para requisições do WhatsApp Flows
 * 
 * @description Representa a estrutura completa de uma requisição
 * criptografada recebida do WhatsApp Business API
 * 
 * @author SEMTAS Development Team
 * @since 1.0.0
 */
export class WhatsAppFlowRequestDto {
  @IsString({ message: 'Dados criptografados devem ser uma string' })
  @IsNotEmpty({ message: 'Dados criptografados são obrigatórios' })
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Dados criptografados da requisição em formato JWE',
  })
  encrypted_flow_data: string;

  @IsString({ message: 'Assinatura deve ser uma string' })
  @IsNotEmpty({ message: 'Assinatura é obrigatória' })
  @ApiProperty({
    example: 'sha256=abc123def456...',
    description: 'Assinatura HMAC-SHA256 para validação da integridade',
  })
  encrypted_aes_key: string;

  @IsString({ message: 'IV deve ser uma string' })
  @IsNotEmpty({ message: 'IV é obrigatório' })
  @ApiProperty({
    example: 'iv_base64_encoded',
    description: 'Vetor de inicialização para descriptografia',
  })
  initial_vector: string;

  /**
   * Dados descriptografados (preenchidos após processamento)
   * Não fazem parte da requisição original
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => WhatsAppFlowDataDto)
  decrypted_data?: WhatsAppFlowDataDto;
}

/**
 * DTO para dados de login
 * 
 * @description Estrutura específica para dados de autenticação
 * na tela de login do WhatsApp Flows
 */
export class LoginDataDto {
  @IsString({ message: 'CPF deve ser uma string' })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @ApiProperty({
    example: '123.456.789-00',
    description: 'CPF do usuário para autenticação',
  })
  cpf: string;

  @IsString({ message: 'Senha deve ser uma string' })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @ApiProperty({
    example: 'minhasenha123',
    description: 'Senha do usuário para autenticação',
  })
  password: string;
}

/**
 * DTO para dados de recuperação de senha
 * 
 * @description Estrutura específica para dados de recuperação
 * de senha no WhatsApp Flows
 */
export class ForgotPasswordDataDto {
  @IsString({ message: 'CPF deve ser uma string' })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @ApiProperty({
    example: '123.456.789-00',
    description: 'CPF do usuário para recuperação de senha',
  })
  cpf: string;

  @IsString({ message: 'Email deve ser uma string' })
  @IsOptional()
  @ApiProperty({
    example: 'usuario@email.com',
    description: 'Email para envio de instruções de recuperação',
    required: false,
  })
  email?: string;
}

/**
 * DTO para dados de busca de cidadão
 * 
 * @description Estrutura específica para busca de cidadão
 * por CPF no WhatsApp Flows
 */
export class SearchCidadaoDataDto {
  @IsString({ message: 'CPF deve ser uma string' })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @ApiProperty({
    example: '123.456.789-00',
    description: 'CPF do cidadão a ser buscado',
  })
  cpf: string;

  @IsString({ message: 'Nome da mãe deve ser uma string' })
  @IsOptional()
  @ApiProperty({
    example: 'Maria da Silva',
    description: 'Nome da mãe para validação adicional',
    required: false,
  })
  nome_mae?: string;
}

/**
 * DTO para dados de cadastro de cidadão
 * 
 * @description Estrutura específica para cadastro de novo
 * cidadão através do WhatsApp Flows
 */
export class RegisterCidadaoDataDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @ApiProperty({
    example: 'João da Silva',
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

  @IsString({ message: 'Nome da mãe deve ser uma string' })
  @IsNotEmpty({ message: 'Nome da mãe é obrigatório' })
  @ApiProperty({
    example: 'Maria da Silva',
    description: 'Nome completo da mãe do cidadão',
  })
  nome_mae: string;

  @IsString({ message: 'Data de nascimento deve ser uma string' })
  @IsNotEmpty({ message: 'Data de nascimento é obrigatória' })
  @ApiProperty({
    example: '1990-01-15',
    description: 'Data de nascimento no formato YYYY-MM-DD',
  })
  data_nascimento: string;

  @IsString({ message: 'Telefone deve ser uma string' })
  @IsOptional()
  @ApiProperty({
    example: '(84) 99999-9999',
    description: 'Telefone de contato do cidadão',
    required: false,
  })
  telefone?: string;

  @IsString({ message: 'Email deve ser uma string' })
  @IsOptional()
  @ApiProperty({
    example: 'joao@email.com',
    description: 'Email de contato do cidadão',
    required: false,
  })
  email?: string;
}