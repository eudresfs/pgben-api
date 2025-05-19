import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { IntegracaoTipoEnum } from '../../enums';

/**
 * DTO para teste de uma configuração de integração.
 * Permite testar a conexão com o serviço externo usando
 * parâmetros específicos para o teste.
 */
export class IntegracaoTestDto {
  @ApiProperty({
    description: 'Código da configuração de integração',
    example: 'email-smtp',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'O código deve ser uma string' })
  codigo?: string;
  
  @ApiProperty({
    description: 'Tipo da integração',
    enum: IntegracaoTipoEnum,
    example: IntegracaoTipoEnum.EMAIL,
    required: false
  })
  @IsOptional()
  @IsEnum(IntegracaoTipoEnum, { message: 'Tipo de integração inválido' })
  tipo?: IntegracaoTipoEnum;
  
  @ApiProperty({
    description: 'Parâmetros de configuração para teste',
    example: {
      host: 'smtp.example.com',
      port: '587',
      secure: 'true'
    },
    type: 'object',
    nullable: true,
    additionalProperties: true
  })
  @IsOptional()
  @IsObject({ message: 'A configuração deve estar em formato de objeto' })
  parametros?: Record<string, string>;
  
  /**
   * Alias para o campo parametros, utilizado em diferentes partes do código
   */
  get configuracao(): Record<string, string> | undefined {
    return this.parametros;
  }
  
  set configuracao(value: Record<string, string> | undefined) {
    if (value) {
      this.parametros = value;
    }
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
    description: 'Parâmetros adicionais para o teste',
    example: {
      destinatario: 'teste@example.com',
      mensagem: 'Teste de envio de email'
    },
    type: 'object',
    nullable: true,
    additionalProperties: true
  })
  @IsOptional()
  @IsObject({ message: 'Os parâmetros de teste devem estar em formato de objeto' })
  parametros_teste?: Record<string, any>;
}
