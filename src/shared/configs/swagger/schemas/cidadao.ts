import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO básico para endereço
 */
export class EnderecoDto {
  @ApiProperty({
    description: 'CEP no formato 00000000 (apenas números)',
    example: '59000000',
    pattern: '^[0-9]{8}$',
  })
  cep: string;

  @ApiProperty({
    description: 'Logradouro (rua, avenida, etc)',
    example: 'Rua das Flores',
  })
  logradouro: string;

  @ApiProperty({    
    description: 'Número do imóvel',
    example: '123',
  })
  numero: string;

  @ApiProperty({
    description: 'Complemento do endereço',
    example: 'Apto 101',
    required: false,
  })
  complemento?: string;

  @ApiProperty({
    description: 'Bairro',
    example: 'Centro',
  })
  bairro: string;

  @ApiProperty({
    description: 'Cidade',
    example: 'Natal',
  })
  cidade: string;

  @ApiProperty({
    description: 'UF (estado)',
    example: 'RN',
    pattern: '^[A-Z]{2}$',
  })
  uf: string;
}

/**
 * DTO para criação de cidadão
 */
export class CreateCidadaoDto {
  @ApiProperty({
    description: 'Nome completo do cidadão',
    example: 'João da Silva',
  })
  nome: string;

  @ApiProperty({
    description: 'CPF no formato 00000000000 (apenas números)',
    example: '12345678900',
    pattern: '^[0-9]{11}$',
  })
  cpf: string;

  @ApiProperty({
    description: 'NIS (Número de Identificação Social)',
    example: '12345678901',
    required: false,
  })
  nis?: string;

  @ApiProperty({
    description: 'Data de nascimento no formato YYYY-MM-DD',
    example: '1990-01-01',
    type: 'string',
    format: 'date',
  })
  dataNascimento: string;

  @ApiProperty({
    description: 'Gênero',
    example: 'M',
    enum: ['M', 'F', 'O'],
  })
  genero: string;

  @ApiProperty({
    description: 'Telefone no formato DDD + número',
    example: '84999999999',
  })
  telefone: string;

  @ApiProperty({
    description: 'E-mail',
    example: 'joao.silva@email.com',
    required: false,
  })
  email?: string;

  @ApiProperty({
    description: 'Endereço residencial',
    type: EnderecoDto,
  })
  endereco: EnderecoDto;
}

/**
 * DTO para resposta de cidadão
 */
export class CidadaoResponseDto extends CreateCidadaoDto {
  @ApiProperty({
    description: 'Identificador único do cidadão',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
  })
  id: string;

  @ApiProperty({
    description: 'Data e hora de criação do registro',
    example: '2025-05-18T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data e hora da última atualização do registro',
    example: '2025-05-18T12:00:00.000Z',
  })
  updatedAt: Date;
}

/**
 * DTO para atualização de cidadão
 */
export class UpdateCidadaoDto {
  @ApiProperty({
    description: 'Nome completo do cidadão',
    example: 'João da Silva',
    required: false,
  })
  nome?: string;

  @ApiProperty({
    description: 'NIS (Número de Identificação Social)',
    example: '12345678901',
    required: false,
  })
  nis?: string;

  @ApiProperty({
    description: 'Telefone no formato DDD + número',
    example: '84999999999',
    required: false,
  })
  telefone?: string;

  @ApiProperty({
    description: 'E-mail',
    example: 'joao.silva@email.com',
    required: false,
  })
  email?: string;

  @ApiProperty({
    description: 'Endereço residencial',
    type: EnderecoDto,
    required: false,
  })
  endereco?: EnderecoDto;
}
