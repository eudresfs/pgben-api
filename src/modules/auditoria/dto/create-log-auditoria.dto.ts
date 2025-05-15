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
  ValidateIf
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoOperacao } from '../enums/tipo-operacao.enum';
import { BaseDto } from '../../../shared/dtos/base.dto';
import { CREATE, UPDATE, SECURITY, LGPD } from '../../../shared/validators/validation-groups';

/**
 * DTO para criação de log de auditoria
 * 
 * Define a estrutura de dados necessária para registrar um log de auditoria
 * no sistema, incluindo informações sobre a operação realizada, o usuário
 * que a executou, e dados de compliance com a LGPD.
 */
export class CreateLogAuditoriaDto extends BaseDto {
  @ApiProperty({
    description: 'Tipo de operação realizada',
    enum: TipoOperacao,
    example: TipoOperacao.CREATE,
  })
  @IsNotEmpty({ message: 'O tipo de operação é obrigatório', groups: [CREATE, UPDATE, SECURITY] })
  @IsEnum(TipoOperacao, { message: 'Tipo de operação inválido', groups: [CREATE, UPDATE, SECURITY] })
  tipo_operacao: TipoOperacao;

  @ApiProperty({
    description: 'Nome da entidade afetada pela operação',
    example: 'Usuario',
  })
  @IsNotEmpty({ message: 'A entidade afetada é obrigatória', groups: [CREATE, SECURITY] })
  @IsString({ message: 'A entidade afetada deve ser uma string', groups: [CREATE, UPDATE, SECURITY] })
  @MaxLength(100, { message: 'A entidade afetada deve ter no máximo 100 caracteres', groups: [CREATE, UPDATE, SECURITY] })
  entidade_afetada: string;

  @ApiPropertyOptional({
    description: 'ID da entidade afetada',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional({ groups: [CREATE, UPDATE, SECURITY] })
  @IsUUID('4', { message: 'O ID da entidade deve ser um UUID válido', groups: [CREATE, UPDATE, SECURITY] })
  entidade_id?: string;

  @ApiPropertyOptional({
    description: 'Dados anteriores à operação (em caso de update ou delete)',
    example: { nome: 'João', email: 'joao@exemplo.com' },
  })
  @IsOptional({ groups: [CREATE, UPDATE, SECURITY] })
  @IsObject({ message: 'Os dados anteriores devem ser um objeto', groups: [CREATE, UPDATE, SECURITY] })
  @ValidateIf((o) => o.tipo_operacao === TipoOperacao.UPDATE || o.tipo_operacao === TipoOperacao.DELETE)
  dados_anteriores?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Dados após a operação (em caso de create ou update)',
    example: { nome: 'João Silva', email: 'joao.silva@exemplo.com' },
  })
  @IsOptional({ groups: [CREATE, UPDATE, SECURITY] })
  @IsObject({ message: 'Os dados novos devem ser um objeto', groups: [CREATE, UPDATE, SECURITY] })
  @ValidateIf((o) => o.tipo_operacao === TipoOperacao.CREATE || o.tipo_operacao === TipoOperacao.UPDATE)
  dados_novos?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'ID do usuário que realizou a operação',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional({ groups: [CREATE, UPDATE, SECURITY] })
  @IsUUID('4', { message: 'O ID do usuário deve ser um UUID válido', groups: [CREATE, UPDATE, SECURITY] })
  usuario_id?: string;

  @ApiPropertyOptional({
    description: 'IP do usuário que realizou a operação',
    example: '192.168.1.1',
  })
  @IsOptional({ groups: [CREATE, UPDATE, SECURITY] })
  @IsIP(undefined, { message: 'O IP de origem deve ser um endereço IP válido', groups: [CREATE, UPDATE, SECURITY] })
  @MaxLength(45, { message: 'O IP de origem deve ter no máximo 45 caracteres', groups: [CREATE, UPDATE, SECURITY] })
  ip_origem?: string;

  @ApiPropertyOptional({
    description: 'User-Agent do navegador do usuário',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  @IsOptional({ groups: [CREATE, UPDATE, SECURITY] })
  @IsString({ message: 'O User-Agent deve ser uma string', groups: [CREATE, UPDATE, SECURITY] })
  @MaxLength(500, { message: 'O User-Agent deve ter no máximo 500 caracteres', groups: [CREATE, UPDATE, SECURITY] })
  user_agent?: string;

  @ApiPropertyOptional({
    description: 'Endpoint acessado',
    example: '/api/v1/usuarios',
  })
  @IsOptional({ groups: [CREATE, UPDATE, SECURITY] })
  @IsString({ message: 'O endpoint deve ser uma string', groups: [CREATE, UPDATE, SECURITY] })
  @MaxLength(255, { message: 'O endpoint deve ter no máximo 255 caracteres', groups: [CREATE, UPDATE, SECURITY] })
  endpoint?: string;

  @ApiPropertyOptional({
    description: 'Método HTTP utilizado',
    example: 'POST',
  })
  @IsOptional({ groups: [CREATE, UPDATE, SECURITY] })
  @IsString({ message: 'O método HTTP deve ser uma string', groups: [CREATE, UPDATE, SECURITY] })
  @MaxLength(10, { message: 'O método HTTP deve ter no máximo 10 caracteres', groups: [CREATE, UPDATE, SECURITY] })
  metodo_http?: string;

  @ApiPropertyOptional({
    description: 'Dados sensíveis acessados (para compliance com LGPD)',
    example: ['cpf', 'renda_familiar'],
  })
  @IsOptional({ groups: [CREATE, UPDATE, SECURITY, LGPD] })
  @IsArray({ message: 'Os dados sensíveis acessados devem ser um array', groups: [CREATE, UPDATE, SECURITY, LGPD] })
  dados_sensiveis_acessados?: string[];

  @ApiPropertyOptional({
    description: 'Motivo da operação (útil para operações administrativas)',
    example: 'Correção de dados cadastrais',
  })
  @IsOptional({ groups: [CREATE, UPDATE, SECURITY] })
  @IsString({ message: 'O motivo deve ser uma string', groups: [CREATE, UPDATE, SECURITY] })
  @MaxLength(500, { message: 'O motivo deve ter no máximo 500 caracteres', groups: [CREATE, UPDATE, SECURITY] })
  motivo?: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada da operação realizada',
    example: 'Criação de novo usuário no sistema',
  })
  @IsOptional({ groups: [CREATE, UPDATE, SECURITY] })
  @IsString({ message: 'A descrição deve ser uma string', groups: [CREATE, UPDATE, SECURITY] })
  @MaxLength(1000, { message: 'A descrição deve ter no máximo 1000 caracteres', groups: [CREATE, UPDATE, SECURITY] })
  descricao?: string;

  @ApiPropertyOptional({
    description: 'Data e hora da operação (definida manualmente)',
    example: '2025-05-14T16:20:19-03:00',
  })
  @IsOptional({ groups: [CREATE, UPDATE, SECURITY] })
  @IsDateString({}, { message: 'A data e hora deve estar em formato ISO 8601', groups: [CREATE, UPDATE, SECURITY] })
  data_hora?: Date;
  
  /**
   * Verifica se o log de auditoria contém informações de segurança LGPD
   * 
   * @returns true se o log contém dados sensíveis acessados
   */
  contemDadosLGPD(): boolean {
    return Array.isArray(this.dados_sensiveis_acessados) && this.dados_sensiveis_acessados.length > 0;
  }
  
  /**
   * Retorna uma representação textual do log de auditoria
   * 
   * @returns Descrição resumida do log
   */
  toString(): string {
    return `[${this.tipo_operacao}] ${this.entidade_afetada}${this.entidade_id ? ` (${this.entidade_id})` : ''} - ${this.descricao || 'Sem descrição'}`;
  }
}
