import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para endereço
 */
export class EnderecoDto {
  @ApiProperty({
    description: 'CEP',
    example: '59000000',
  })
  cep: string;

  @ApiProperty({
    description: 'Logradouro',
    example: 'Rua Exemplo',
  })
  logradouro: string;

  @ApiProperty({
    description: 'Número',
    example: '123',
  })
  numero: string;

  @ApiProperty({
    description: 'Complemento',
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
    description: 'UF',
    example: 'RN',
    maxLength: 2,
    minLength: 2,
  })
  uf: string;
}

/**
 * DTO base para cidadão
 */
export class CidadaoBaseDto {
  @ApiProperty({
    description: 'Nome completo',
    example: 'João da Silva',
  })
  nome: string;

  @ApiProperty({
    description: 'Nome social',
    example: 'Joana',
    required: false,
  })
  nomeSocial?: string;

  @ApiProperty({
    description: 'CPF (apenas números)',
    example: '12345678900',
  })
  cpf: string;

  @ApiProperty({
    description: 'RG',
    example: '1234567',
  })
  rg: string;

  @ApiProperty({
    description: 'Órgão emissor do RG',
    example: 'SSP/RN',
  })
  orgaoEmissor: string;

  @ApiProperty({
    description: 'UF do órgão emissor',
    example: 'RN',
    maxLength: 2,
    minLength: 2,
  })
  ufOrgaoEmissor: string;

  @ApiProperty({
    description: 'Data de nascimento (ISO 8601)',
    example: '1990-01-01',
  })
  dataNascimento: string;

  @ApiProperty({
    description: 'Sexo (M, F ou O)',
    example: 'M',
    enum: ['M', 'F', 'O'],
  })
  sexo: string;

  @ApiProperty({
    description: 'Nome da mãe',
    example: 'Maria da Silva',
  })
  nomeMae: string;

  @ApiProperty({
    description: 'Nome do pai',
    example: 'José da Silva',
    required: false,
  })
  nomePai?: string;

  @ApiProperty({
    description: 'Estado civil',
    example: 'SOLTEIRO',
    enum: ['SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'SEPARADO', 'UNIAO_ESTAVEL'],
  })
  estadoCivil: string;

  @ApiProperty({
    description: 'Grau de instrução',
    example: 'ENSINO_MEDIO_COMPLETO',
    enum: [
      'ANALFABETO',
      'ENSINO_FUNDAMENTAL_INCOMPLETO',
      'ENSINO_FUNDAMENTAL_COMPLETO',
      'ENSINO_MEDIO_INCOMPLETO',
      'ENSINO_MEDIO_COMPLETO',
      'SUPERIOR_INCOMPLETO',
      'SUPERIOR_COMPLETO',
      'POS_GRADUACAO',
      'MESTRADO',
      'DOUTORADO',
    ],
  })
  grauInstrucao: string;

  @ApiProperty({
    description: 'Renda familiar',
    example: 2000.5,
  })
  rendaFamiliar: number;

  @ApiProperty({
    description: 'Número de dependentes',
    example: 2,
    default: 0,
  })
  numeroDependentes?: number;

  @ApiProperty({
    description: 'Telefone principal',
    example: '84999998888',
  })
  telefone1: string;

  @ApiProperty({
    description: 'Telefone secundário',
    example: '84999997777',
    required: false,
  })
  telefone2?: string;

  @ApiProperty({
    description: 'E-mail',
    example: 'joao@exemplo.com',
  })
  email: string;

  @ApiProperty({
    description: 'Endereço',
    type: EnderecoDto,
  })
  endereco: EnderecoDto;
}

/**
 * DTO para criação de cidadão
 */
export class CreateCidadaoDto extends CidadaoBaseDto {}

/**
 * DTO para atualização de cidadão
 */
export class UpdateCidadaoDto extends CidadaoBaseDto {
  @ApiProperty({
    description: 'ID do cidadão',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
  })
  id: string;
}

/**
 * DTO para resposta de cidadão
 */
export class CidadaoResponseDto extends CidadaoBaseDto {
  @ApiProperty({
    description: 'ID do cidadão',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
  })
  id: string;

  @ApiProperty({
    description: 'Data de criação',
    example: '2025-05-17T21:50:07.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Data da última atualização',
    example: '2025-05-17T21:50:07.000Z',
  })
  updatedAt: string;
}
