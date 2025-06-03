import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para informações de endereço do cidadão
 */
export class EnderecoDto {
  @ApiProperty({
    description: 'CEP do endereço no formato XXXXX-XXX',
    example: '59000-000',
    pattern: '^\\d{5}-\\d{3}$',
    type: 'string',
    minLength: 9,
    maxLength: 9
  })
  cep: string;

  @ApiProperty({
    description: 'Logradouro completo (rua, avenida, travessa, etc.)',
    example: 'Rua das Flores',
    type: 'string',
    minLength: 5,
    maxLength: 200
  })
  logradouro: string;

  @ApiProperty({
    description: 'Número do endereço (pode conter letras)',
    example: '123A',
    type: 'string',
    minLength: 1,
    maxLength: 10
  })
  numero: string;

  @ApiPropertyOptional({
    description: 'Complemento do endereço (apartamento, bloco, etc.)',
    example: 'Apartamento 101, Bloco B',
    type: 'string',
    maxLength: 100
  })
  complemento?: string;

  @ApiProperty({
    description: 'Nome do bairro',
    example: 'Cidade Alta',
    type: 'string',
    minLength: 2,
    maxLength: 100
  })
  bairro: string;

  @ApiProperty({
    description: 'Nome da cidade',
    example: 'Natal',
    type: 'string',
    minLength: 2,
    maxLength: 100
  })
  cidade: string;

  @ApiProperty({
    description: 'Sigla do estado (UF)',
    example: 'RN',
    enum: ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'],
    type: 'string',
    minLength: 2,
    maxLength: 2
  })
  estado: string;

  @ApiPropertyOptional({
    description: 'Ponto de referência para localização',
    example: 'Próximo ao mercado central',
    type: 'string',
    maxLength: 200
  })
  pontoReferencia?: string;
}

/**
 * DTO para criação de novo cidadão no sistema
 */
export class CreateCidadaoDto {
  @ApiProperty({
    description: 'Nome completo do cidadão (mínimo 2 nomes)',
    example: 'João Silva Santos',
    type: 'string',
    minLength: 5,
    maxLength: 200,
    pattern: '^[A-Za-zÀ-ÿ\\s]+$'
  })
  nome: string;

  @ApiProperty({
    description: 'CPF do cidadão no formato XXX.XXX.XXX-XX',
    example: '123.456.789-00',
    pattern: '^\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}$',
    type: 'string',
    minLength: 14,
    maxLength: 14
  })
  cpf: string;

  @ApiProperty({
    description: 'Número do RG do cidadão',
    example: '1.234.567',
    type: 'string',
    minLength: 5,
    maxLength: 20
  })
  rg: string;

  @ApiProperty({
    description: 'Órgão emissor do RG',
    example: 'SSP/RN',
    type: 'string',
    minLength: 3,
    maxLength: 20
  })
  orgaoEmissorRg: string;

  @ApiProperty({
    description: 'Data de nascimento no formato YYYY-MM-DD',
    example: '1990-05-15',
    type: 'string',
    format: 'date'
  })
  dataNascimento: string;

  @ApiProperty({
    description: 'Sexo biológico do cidadão',
    example: 'M',
    enum: ['M', 'F'],
    type: 'string'
  })
  sexo: string;

  @ApiProperty({
    description: 'Estado civil atual do cidadão',
    example: 'SOLTEIRO',
    enum: ['SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL', 'SEPARADO'],
    type: 'string'
  })
  estadoCivil: string;

  @ApiProperty({
    description: 'Telefone principal para contato (formato: (XX) XXXXX-XXXX)',
    example: '(84) 99999-9999',
    pattern: '^\\(\\d{2}\\)\\s\\d{4,5}-\\d{4}$',
    type: 'string'
  })
  telefone: string;

  @ApiPropertyOptional({
    description: 'Telefone secundário para contato',
    example: '(84) 88888-8888',
    pattern: '^\\(\\d{2}\\)\\s\\d{4,5}-\\d{4}$',
    type: 'string'
  })
  telefoneSecundario?: string;

  @ApiPropertyOptional({
    description: 'Endereço de email válido',
    example: 'joao.silva@email.com',
    type: 'string',
    format: 'email',
    maxLength: 100
  })
  email?: string;

  @ApiProperty({
    description: 'Informações de endereço residencial',
    type: () => EnderecoDto
  })
  endereco: EnderecoDto;

  @ApiPropertyOptional({
    description: 'Nome da mãe (para validação de identidade)',
    example: 'Maria Silva Santos',
    type: 'string',
    minLength: 5,
    maxLength: 200
  })
  nomeMae?: string;

  @ApiPropertyOptional({
    description: 'Nome do pai',
    example: 'José Santos',
    type: 'string',
    minLength: 5,
    maxLength: 200
  })
  nomePai?: string;

  @ApiPropertyOptional({
    description: 'Número do NIS (Número de Identificação Social)',
    example: '12345678901',
    pattern: '^\\d{11}$',
    type: 'string',
    minLength: 11,
    maxLength: 11
  })
  nis?: string;

  @ApiPropertyOptional({
    description: 'Renda familiar mensal declarada em reais',
    example: 1200.50,
    type: 'number',
    format: 'float',
    minimum: 0
  })
  rendaFamiliar?: number;

  @ApiPropertyOptional({
    description: 'Número de pessoas na composição familiar',
    example: 4,
    type: 'integer',
    minimum: 1,
    maximum: 20
  })
  composicaoFamiliar?: number;
}

/**
 * DTO para resposta com dados completos do cidadão
 */
export class CidadaoResponseDto extends CreateCidadaoDto {
  @ApiProperty({
    description: 'Identificador único do cidadão no sistema',
    example: '507f1f77bcf86cd799439011',
    type: 'string'
  })
  id: string;

  @ApiProperty({
    description: 'Status do cadastro do cidadão',
    example: 'ATIVO',
    enum: ['ATIVO', 'INATIVO', 'PENDENTE', 'BLOQUEADO'],
    type: 'string'
  })
  status: string;

  @ApiProperty({
    description: 'Data e hora de criação do registro',
    example: '2025-01-18T10:30:00.000Z',
    type: 'string',
    format: 'date-time'
  })
  createdAt: string;

  @ApiProperty({
    description: 'Data e hora da última atualização do registro',
    example: '2025-01-18T10:30:00.000Z',
    type: 'string',
    format: 'date-time'
  })
  updatedAt: string;

  @ApiPropertyOptional({
    description: 'Data da última validação dos dados',
    example: '2025-01-18T10:30:00.000Z',
    type: 'string',
    format: 'date-time'
  })
  ultimaValidacao?: string;

  @ApiPropertyOptional({
    description: 'Observações administrativas sobre o cidadão',
    example: 'Documentação validada em 18/01/2025',
    type: 'string',
    maxLength: 500
  })
  observacoes?: string;
}

/**
 * DTO para atualização de dados do cidadão
 */
export class UpdateCidadaoDto {
  @ApiPropertyOptional({
    description: 'Nome completo do cidadão',
    example: 'João Silva Santos',
    type: 'string',
    minLength: 5,
    maxLength: 200
  })
  nome?: string;

  @ApiPropertyOptional({
    description: 'Telefone principal para contato',
    example: '(84) 99999-9999',
    pattern: '^\\(\\d{2}\\)\\s\\d{4,5}-\\d{4}$',
    type: 'string'
  })
  telefone?: string;

  @ApiPropertyOptional({
    description: 'Telefone secundário para contato',
    example: '(84) 88888-8888',
    pattern: '^\\(\\d{2}\\)\\s\\d{4,5}-\\d{4}$',
    type: 'string'
  })
  telefoneSecundario?: string;

  @ApiPropertyOptional({
    description: 'Endereço de email válido',
    example: 'joao.silva@email.com',
    type: 'string',
    format: 'email'
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Informações de endereço residencial',
    type: () => EnderecoDto
  })
  endereco?: EnderecoDto;

  @ApiPropertyOptional({
    description: 'Estado civil atual',
    example: 'CASADO',
    enum: ['SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL', 'SEPARADO'],
    type: 'string'
  })
  estadoCivil?: string;

  @ApiPropertyOptional({
    description: 'Renda familiar mensal em reais',
    example: 1500.00,
    type: 'number',
    format: 'float',
    minimum: 0
  })
  rendaFamiliar?: number;

  @ApiPropertyOptional({
    description: 'Número de pessoas na família',
    example: 3,
    type: 'integer',
    minimum: 1,
    maximum: 20
  })
  composicaoFamiliar?: number;
}
