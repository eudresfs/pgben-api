import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { IntegracaoTipoEnum } from '../../enums';

/**
 * DTO para atualização de uma configuração de integração.
 */
export class IntegracaoUpdateDto {
  @ApiProperty({
    description: 'Nome descritivo da configuração de integração',
    example: 'SMTP da SEMTAS',
    maxLength: 200,
    required: false
  })
  @IsOptional()
  @IsString({ message: 'O nome deve ser uma string' })
  @MaxLength(200, { message: 'O nome deve ter no máximo 200 caracteres' })
  nome?: string;
  
  @ApiProperty({
    description: 'Descrição detalhada da configuração de integração',
    example: 'Servidor SMTP para envio de notificações por email',
    maxLength: 500,
    required: false
  })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser uma string' })
  @MaxLength(500, { message: 'A descrição deve ter no máximo 500 caracteres' })
  descricao?: string;
  
  @ApiProperty({
    description: 'Tipo da integração',
    enum: IntegracaoTipoEnum,
    example: IntegracaoTipoEnum.EMAIL
  })
  @IsNotEmpty({ message: 'O tipo é obrigatório' })
  @IsEnum(IntegracaoTipoEnum, { message: 'Tipo de integração inválido' })
  tipo: IntegracaoTipoEnum;

  @ApiProperty({
    description: 'Parâmetros específicos da integração',
    example: {
      host: 'smtp.example.com',
      port: '587',
      secure: 'true'
    },
    type: 'object',
    additionalProperties: true
  })
  @IsNotEmpty({ message: 'Os parâmetros de configuração são obrigatórios' })
  @IsObject({ message: 'Os parâmetros de configuração devem estar em formato de objeto' })
  parametros: Record<string, string>;
  
  /**
   * Alias para o campo parametros, utilizado em diferentes partes do código
   */
  get configuracao(): Record<string, string> {
    return this.parametros;
  }
  
  set configuracao(value: Record<string, string>) {
    this.parametros = value;
  }
  
  @ApiProperty({
    description: 'Credenciais para autenticação',
    example: {
      user: 'user@example.com',
      password: 'senha123'
    },
    type: 'object',
    nullable: true,
    additionalProperties: true
  })
  @IsOptional()
  @IsObject({ message: 'As credenciais devem estar em formato de objeto' })
  credenciais?: Record<string, any>;

  @ApiProperty({
    description: 'Status ativo/inativo da integração',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: 'O status deve ser um booleano' })
  ativo?: boolean;
}
