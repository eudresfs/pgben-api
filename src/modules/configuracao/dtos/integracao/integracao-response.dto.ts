import { ApiProperty } from '@nestjs/swagger';
import { IntegracaoTipoEnum } from '@/enums';

/**
 * DTO para resposta com informações de uma configuração de integração.
 * Mascara dados sensíveis como senhas e tokens.
 */
export class IntegracaoResponseDto {
  @ApiProperty({
    description: 'ID único da configuração de integração',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  id: string;
  
  @ApiProperty({
    description: 'Código único da configuração de integração',
    example: 'email-smtp'
  })
  codigo: string;

  @ApiProperty({
    description: 'Tipo de integração',
    enum: IntegracaoTipoEnum,
    example: IntegracaoTipoEnum.EMAIL
  })
  tipo: string;

  @ApiProperty({
    description: 'Nome descritivo da configuração de integração',
    example: 'SMTP da SEMTAS'
  })
  nome: string;
  
  @ApiProperty({
    description: 'Descrição detalhada da configuração de integração',
    example: 'Servidor SMTP para envio de notificações por email'
  })
  descricao?: string;

  @ApiProperty({
    description: 'Parâmetros específicos da integração (versão sanitizada)',
    example: {
      host: 'smtp.example.com',
      port: '587',
      user: 'user@example.com',
      password: '********',
      secure: 'true'
    },
    type: 'object',
    additionalProperties: true
  })
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
    description: 'Credenciais mascaradas para autenticação',
    example: {
      user: 'user@example.com',
      password: '********'
    },
    type: 'object',
    additionalProperties: true
  })
  credenciais?: Record<string, any>;

  @ApiProperty({
    description: 'Status ativo/inativo da integração',
    example: true
  })
  ativo: boolean;

  @ApiProperty({
    description: 'Data de criação da configuração',
    example: '2025-05-18T20:10:30.123Z'
  })
  created_at: Date;

  @ApiProperty({
    description: 'Data da última atualização da configuração',
    example: '2025-05-18T20:15:45.678Z'
  })
  updated_at: Date;

  @ApiProperty({
    description: 'Usuário que realizou a última atualização',
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'Administrador'
    }
  })
  updated_by: {
    id: string;
    nome: string;
  };
}
