import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { Sexo } from '../../../enums/sexo.enum';
import { PapelCidadaoResponseDto } from './papel-cidadao-response.dto';
import { ParentescoEnum } from '../../../enums/parentesco.enum';

export class CidadaoComposicaoFamiliarDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único da composição familiar',
  })
  @Expose()
  id: string;

  @ApiProperty({
    example: 'João da Silva',
    description: 'Nome do membro da família',
  })
  @Expose()
  nome: string;

  @ApiProperty({
    example: '123.456.789-00',
    description: 'CPF do membro da família',
  })
  @Expose()
  cpf: string;

  @ApiProperty({
    enum: ParentescoEnum,
    enumName: 'Parentesco',
    example: ParentescoEnum.FILHO,
    description: 'Parentesco com o cidadão',
  })
  @Expose()
  parentesco: ParentescoEnum;

  @ApiProperty({
    example: 25,
    description: 'Idade do membro da família',
  })
  @Expose()
  idade: number;

  @ApiProperty({
    example: 1500.5,
    description: 'Renda mensal do membro da família',
  })
  @Expose()
  renda_mensal: number;

  @ApiProperty({
    example: 'Ensino Médio Completo',
    description: 'Escolaridade do membro da família',
  })
  @Expose()
  escolaridade: string;

  @ApiProperty({
    example: true,
    description: 'Indica se o membro está ativo',
  })
  @Expose()
  ativo: boolean;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Data de criação do registro',
  })
  @Expose()
  @Transform(({ value, obj }) => {
    const dateValue = value || obj.created_at;
    if (dateValue instanceof Date) {
      return dateValue.getTime();
    }
    return dateValue;
  })
  created_at: string;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Data de atualização do registro',
  })
  @Expose()
  @Transform(({ value, obj }) => {
    const dateValue = value || obj.updated_at;
    if (dateValue instanceof Date) {
      return dateValue.getTime();
    }
    return dateValue;
  })
  updated_at: string;
}

export class EnderecoResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único do endereço',
  })
  @Expose()
  id: string;

  @ApiProperty({
    example: 'Rua das Flores',
    description: 'Nome do logradouro',
  })
  @Expose()
  logradouro: string;

  @ApiProperty({
    example: '123',
    description: 'Número do endereço',
  })
  @Expose()
  numero: string;

  @ApiPropertyOptional({
    example: 'Apto 45',
    description: 'Complemento do endereço',
  })
  @Expose()
  complemento?: string;

  @ApiProperty({
    example: 'Centro',
    description: 'Nome do bairro',
  })
  @Expose()
  bairro: string;

  @ApiProperty({
    example: 'São Paulo',
    description: 'Nome da cidade',
  })
  @Expose()
  cidade: string;

  @ApiProperty({
    example: 'SP',
    description: 'Sigla do estado',
  })
  @Expose()
  estado: string;

  @ApiProperty({
    example: '01234-567',
    description: 'CEP do endereço',
  })
  @Expose()
  cep: string;

  @ApiProperty({
    example: true,
    description: 'Indica se o endereço está ativo',
  })
  @Expose()
  ativo: boolean;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Data de criação do registro',
  })
  @Expose()
  @Transform(({ value, obj }) => {
    const dateValue = value || obj.created_at;
    if (dateValue instanceof Date) {
      return dateValue.getTime();
    }
    return dateValue;
  })
  created_at: string;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Data de atualização do registro',
  })
  @Expose()
  @Transform(({ value, obj }) => {
    const dateValue = value || obj.updated_at;
    if (dateValue instanceof Date) {
      return dateValue.getTime();
    }
    return dateValue;
  })
  updated_at: string;
}

export class CidadaoResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único do cidadão',
  })
  @Expose()
  id: string;

  @ApiProperty({
    example: 'João da Silva',
    description: 'Nome completo do cidadão',
  })
  @Expose()
  nome: string;

  @ApiProperty({
    example: '123.456.789-00',
    description: 'CPF do cidadão',
  })
  @Expose()
  cpf: string;

  @ApiProperty({
    example: '12.345.678-9',
    description: 'RG do cidadão',
  })
  @Expose()
  rg: string;

  @ApiProperty({
    example: 'SSP/RN',
    description: 'Órgão emissor do RG',
  })
  @Expose()
  orgao_emissor: string;

  @ApiProperty({
    example: '1990-01-01',
    description: 'Data de nascimento do cidadão',
  })
  @Expose()
  @Transform(({ value, obj }) => {
    const dateValue = value || obj.data_nascimento;
    if (dateValue instanceof Date) {
      return dateValue.getTime();
    }
    return dateValue;
  })
  data_nascimento: string;

  @ApiProperty({
    enum: Sexo,
    enumName: 'Sexo',
    example: Sexo.MASCULINO,
    description: 'Sexo do cidadão',
  })
  @Expose()
  sexo: Sexo;

  @ApiProperty({
    example: 'Maria da Silva',
    description: 'Nome da mãe do cidadão',
  })
  @Expose()
  @Transform(({ value, obj }) => value || obj.nome_mae)
  nome_mae: string;

  @ApiProperty({
    example: 'João Silva',
    description: 'Nome do pai do cidadão',
  })
  @Expose()
  @Transform(({ value, obj }) => value || obj.nome_pai)
  nome_pai: string;

  @ApiProperty({
    example: 'joao@email.com',
    description: 'Email do cidadão',
  })
  @Expose()
  email: string;

  @ApiProperty({
    example: '(84) 99999-9999',
    description: 'Telefone do cidadão',
  })
  @Expose()
  telefone: string;

  @ApiProperty({
    example: '12345678901',
    description: 'NIS (PIS/PASEP) do cidadão',
  })
  @Expose()
  nis: string;

  @ApiProperty({
    example: '123456789012345',
    description: 'CNS (Cartão Nacional de Saúde) do cidadão',
  })
  @Expose()
  cns: string;

  @ApiProperty({
    example: 'http://example.com/foto.jpg',
    description: 'URL da foto do cidadão',
  })
  @Expose()
  @Transform(({ value, obj }) => value || obj.foto_url)
  foto_url: string;

  @ApiProperty({
    example: 'Natal',
    description: 'Naturalidade do cidadão',
  })
  @Expose()
  naturalidade: string;

  @ApiProperty({
    example: 'Solteiro',
    description: 'Estado civil do cidadão',
  })
  @Expose()
  estado_civil: string;

  @ApiProperty({
    example: 'Ensino Médio Completo',
    description: 'Escolaridade do cidadão',
  })
  @Expose()
  escolaridade: string;

  @ApiProperty({
    example: 'Empresa XYZ Ltda',
    description: 'Empresa onde trabalha',
  })
  @Expose()
  empresa: string;

  @ApiProperty({
    example: 'Analista de Sistemas',
    description: 'Profissão do cidadão',
  })
  @Expose()
  profissao: string;

  @ApiProperty({
    example: 3500.0,
    description: 'Renda mensal do cidadão',
  })
  @Expose()
  renda_mensal: number;

  @ApiPropertyOptional({
    example: 'Observações importantes sobre o cidadão',
    description: 'Observações adicionais',
  })
  @Expose()
  observacoes?: string;

  @ApiProperty({
    example: '59000-000',
    description: 'CEP do endereço',
  })
  @Expose()
  @Transform(({ obj }) => obj.endereco?.cep || null)
  cep: string;

  @ApiProperty({
    example: 'Rua das Flores',
    description: 'Logradouro do endereço',
  })
  @Expose()
  @Transform(({ obj }) => obj.endereco?.logradouro || null)
  logradouro: string;

  @ApiProperty({
    example: '123',
    description: 'Número do endereço',
  })
  @Expose()
  @Transform(({ obj }) => obj.endereco?.numero || null)
  numero: string;

  @ApiProperty({
    example: 'Apto 101',
    description: 'Complemento do endereço',
  })
  @Expose()
  @Transform(({ obj }) => obj.endereco?.complemento || null)
  complemento: string;

  @ApiProperty({
    example: 'Centro',
    description: 'Bairro do endereço',
  })
  @Expose()
  @Transform(({ obj }) => obj.endereco?.bairro || null)
  bairro: string;

  @ApiProperty({
    example: 'Natal',
    description: 'Cidade do endereço',
  })
  @Expose()
  @Transform(({ obj }) => obj.endereco?.cidade || null)
  cidade: string;

  @ApiProperty({
    example: 'RN',
    description: 'UF do endereço',
  })
  @Expose()
  @Transform(({ obj }) => obj.endereco?.estado || obj.endereco?.uf || null)
  uf: string;

  @ApiProperty({
    type: EnderecoResponseDto,
    description: 'Endereço do cidadão',
  })
  @Expose()
  @Type(() => EnderecoResponseDto)
  endereco: EnderecoResponseDto;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID da unidade onde o cidadão está cadastrado',
  })
  @Expose()
  unidade_id: string;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Data de criação do registro',
  })
  @Expose()
  @Transform(({ value, obj }) => {
    const dateValue = value || obj.created_at;
    if (dateValue instanceof Date) {
      return dateValue.getTime();
    }
    return dateValue;
  })
  created_at: string;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Data de atualização do registro',
  })
  @Expose()
  @Transform(({ value, obj }) => {
    const dateValue = value || obj.updated_at;
    if (dateValue instanceof Date) {
      return dateValue.getTime();
    }
    return dateValue;
  })
  updated_at: string;

  @ApiPropertyOptional({
    example: null,
    description: 'Data de desativação do registro, se aplicável',
  })
  @Expose()
  deleted_at?: Date;

  @ApiPropertyOptional({
    type: [PapelCidadaoResponseDto],
    description: 'Papéis que o cidadão possui no sistema',
  })
  @Expose()
  @Type(() => PapelCidadaoResponseDto)
  papeis?: PapelCidadaoResponseDto[];

  @ApiPropertyOptional({
    type: [CidadaoComposicaoFamiliarDto],
    description: 'Composição familiar do cidadão',
  })
  @Expose()
  @Type(() => CidadaoComposicaoFamiliarDto)
  composicao_familiar?: CidadaoComposicaoFamiliarDto[];
}

export class CidadaoPaginatedResponseDto {
  @ApiProperty({
    type: [CidadaoResponseDto],
    description: 'Lista de cidadãos',
  })
  @Expose()
  @Type(() => CidadaoResponseDto)
  items: CidadaoResponseDto[];

  @ApiProperty({
    type: 'object',
    properties: {
      total: { type: 'number', example: 100 },
      page: { type: 'number', example: 1 },
      limit: { type: 'number', example: 10 },
      pages: { type: 'number', example: 10 },
      hasNext: { type: 'boolean', example: true },
      hasPrev: { type: 'boolean', example: false },
    },
    description: 'Metadados da paginação',
  })
  @Expose()
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
