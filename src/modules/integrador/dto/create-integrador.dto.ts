import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para criação de um novo integrador.
 * Define os campos necessários e opcionais para o cadastro.
 */
export class CreateIntegradorDto {
  @ApiProperty({
    description: 'Nome do integrador',
    example: 'Sistema ERP Municipal',
  })
  @IsNotEmpty({ message: 'O nome do integrador é obrigatório' })
  @IsString({ message: 'O nome do integrador deve ser uma string' })
  nome: string;

  @ApiPropertyOptional({
    description: 'Descrição do integrador',
    example: 'Sistema de gestão financeira da Prefeitura Municipal',
  })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser uma string' })
  descricao?: string;

  @ApiPropertyOptional({
    description: 'Nome do responsável pelo integrador',
    example: 'João da Silva',
  })
  @IsOptional()
  @IsString({ message: 'O nome do responsável deve ser uma string' })
  responsavel?: string;

  @ApiPropertyOptional({
    description: 'Email de contato do responsável',
    example: 'joao.silva@prefeitura.gov.br',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email de contato inválido' })
  emailContato?: string;

  @ApiPropertyOptional({
    description: 'Telefone de contato do responsável',
    example: '(84) 98765-4321',
  })
  @IsOptional()
  @IsString({ message: 'O telefone de contato deve ser uma string' })
  telefoneContato?: string;

  @ApiPropertyOptional({
    description:
      'Lista de permissões de escopo que este integrador pode utilizar',
    example: ['read:cidadaos', 'read:beneficios', 'write:solicitacoes'],
  })
  @IsOptional()
  @IsArray({ message: 'As permissões de escopo devem ser um array' })
  permissoesEscopo?: string[];

  @ApiPropertyOptional({
    description: 'Lista de endereços IP permitidos para acesso',
    example: ['192.168.1.100', '10.0.0.5'],
  })
  @IsOptional()
  @IsArray({ message: 'Os IPs permitidos devem ser um array' })
  ipPermitidos?: string[];

  @ApiPropertyOptional({
    description: 'Status de ativação do integrador',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'O status ativo deve ser um booleano' })
  ativo?: boolean = true;
}
