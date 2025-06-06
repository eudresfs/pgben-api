import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsIP,
  IsUrl,
  IsArray,
  IsObject,
  IsDateString,
  ValidateIf,
  IsDate,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { BaseDto } from '../../../shared/dtos/base.dto';
import {
  CREATE,
  UPDATE,
  SECURITY,
  LGPD,
} from '../../../shared/validators/validation-groups';

/**
 * DTO para criação de log de auditoria - Versão MVP
 *
 * Define a estrutura simplificada de dados necessária para registrar um log de auditoria
 * no sistema, contendo apenas os campos essenciais para a rastreabilidade básica.
 * Campos avançados de compliance com LGPD e detalhamento completo foram adiados para versões futuras.
 */
export class CreateLogAuditoriaDto extends BaseDto {
  @ApiProperty({
    description: 'Tipo de operação realizada',
    enum: TipoOperacao,
    example: TipoOperacao.CREATE,
  })
  @IsNotEmpty({
    message: 'O tipo de operação é obrigatório',
    groups: [CREATE, UPDATE, SECURITY],
  })
  @IsEnum(TipoOperacao, {
    message: 'Tipo de operação inválido',
    groups: [CREATE, UPDATE, SECURITY],
  })
  tipo_operacao: TipoOperacao;

  @ApiProperty({
    description: 'Nome da entidade afetada pela operação',
    example: 'Usuario',
  })
  @IsNotEmpty({
    message: 'A entidade afetada é obrigatória',
    groups: [CREATE, SECURITY],
  })
  @IsString({
    message: 'A entidade afetada deve ser uma string',
    groups: [CREATE, UPDATE, SECURITY],
  })
  @MaxLength(100, {
    message: 'A entidade afetada deve ter no máximo 100 caracteres',
    groups: [CREATE, UPDATE, SECURITY],
  })
  entidade_afetada: string;

  @ApiPropertyOptional({
    description: 'ID da entidade afetada',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional({ groups: [CREATE, UPDATE, SECURITY] })
  @IsUUID('4', {
    message: 'O ID da entidade deve ser um UUID válido',
    groups: [CREATE, UPDATE, SECURITY],
  })
  entidade_id?: string;

  @ApiPropertyOptional({
    description: 'ID do usuário que realizou a operação',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional({ groups: [CREATE, UPDATE, SECURITY] })
  @IsUUID('4', {
    message: 'O ID do usuário deve ser um UUID válido',
    groups: [CREATE, UPDATE, SECURITY],
  })
  usuario_id?: string;

  @ApiPropertyOptional({
    description: 'Endpoint acessado',
    example: '/api/v1/usuarios',
  })
  @IsOptional({ groups: [CREATE, UPDATE, SECURITY] })
  @IsString({
    message: 'O endpoint deve ser uma string',
    groups: [CREATE, UPDATE, SECURITY],
  })
  @MaxLength(255, {
    message: 'O endpoint deve ter no máximo 255 caracteres',
    groups: [CREATE, UPDATE, SECURITY],
  })
  endpoint?: string;

  @ApiPropertyOptional({
    description: 'Método HTTP utilizado',
    example: 'POST',
  })
  @IsOptional({ groups: [CREATE, UPDATE, SECURITY] })
  @IsString({
    message: 'O método HTTP deve ser uma string',
    groups: [CREATE, UPDATE, SECURITY],
  })
  @MaxLength(10, {
    message: 'O método HTTP deve ter no máximo 10 caracteres',
    groups: [CREATE, UPDATE, SECURITY],
  })
  metodo_http?: string;

  @ApiPropertyOptional({
    description: 'Endereço IP de origem da requisição',
    example: '192.168.1.1',
  })
  @IsOptional({ groups: [CREATE, UPDATE, SECURITY] })
  @IsIP(undefined, {
    message: 'O IP de origem deve ser um endereço IP válido',
    groups: [CREATE, UPDATE, SECURITY],
  })
  ip_origem?: string;

  @ApiPropertyOptional({
    description: 'User-Agent do navegador ou cliente',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  @IsOptional({ groups: [CREATE, UPDATE, SECURITY] })
  @IsString({
    message: 'O User-Agent deve ser uma string',
    groups: [CREATE, UPDATE, SECURITY],
  })
  @MaxLength(500, {
    message: 'O User-Agent deve ter no máximo 500 caracteres',
    groups: [CREATE, UPDATE, SECURITY],
  })
  user_agent?: string;

  @ApiPropertyOptional({
    description: 'Descrição da operação realizada',
    example: 'Atualização de dados do usuário',
  })
  @IsOptional({ groups: [CREATE, UPDATE, SECURITY] })
  @IsString({
    message: 'A descrição deve ser uma string',
    groups: [CREATE, UPDATE, SECURITY],
  })
  @MaxLength(500, {
    message: 'A descrição deve ter no máximo 500 caracteres',
    groups: [CREATE, UPDATE, SECURITY],
  })
  descricao?: string;

  @ApiPropertyOptional({
    description: 'Dados anteriores à operação',
    example: { nome: 'Nome Antigo', email: 'email@antigo.com' },
  })
  @IsOptional({ groups: [CREATE, UPDATE, SECURITY, LGPD] })
  @IsObject({
    message: 'Os dados anteriores devem ser um objeto',
    groups: [CREATE, UPDATE, SECURITY, LGPD],
  })
  dados_anteriores?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Novos dados após a operação',
    example: { nome: 'Nome Novo', email: 'email@novo.com' },
  })
  @IsOptional({ groups: [CREATE, UPDATE, SECURITY, LGPD] })
  @IsObject({
    message: 'Os novos dados devem ser um objeto',
    groups: [CREATE, UPDATE, SECURITY, LGPD],
  })
  dados_novos?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Data e hora da operação',
    example: '2023-01-01T12:00:00Z',
  })
  @IsOptional({ groups: [CREATE, UPDATE, SECURITY] })
  @IsDateString(
    {},
    {
      message: 'A data e hora deve estar em formato ISO',
      groups: [CREATE, UPDATE, SECURITY],
    },
  )
  data_hora?: Date;

  @ApiPropertyOptional({
    description: 'Dados sensíveis que foram acessados (LGPD)',
    example: ['cpf', 'data_nascimento', 'endereco'],
    type: [String],
  })
  @IsOptional({ groups: [CREATE, UPDATE, SECURITY, LGPD] })
  @IsArray({
    message: 'Os dados sensíveis acessados devem ser um array',
    groups: [CREATE, UPDATE, SECURITY, LGPD],
  })
  dados_sensiveis_acessados?: string[];

  /**
   * Implementação do método validar herdado de BaseDto
   * @param validationGroup Grupo de validação opcional
   */
  validar(validationGroup?: string): void {
    // Implementação específica de validação para logs de auditoria
    // Por enquanto, utiliza apenas as validações dos decorators
  }

  /**
   * Retorna uma representação textual do log de auditoria
   *
   * @returns Descrição resumida do log
   */
  toString(): string {
    return `[${this.tipo_operacao}] ${this.entidade_afetada}${this.entidade_id ? ` (${this.entidade_id})` : ''} - ${this.metodo_http || ''} ${this.endpoint || ''}`;
  }
}
