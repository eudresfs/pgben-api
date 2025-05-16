import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sexo } from '../entities/cidadao.entity';
import { PapelCidadaoResponseDto } from './papel-cidadao-response.dto';

export class EnderecoResponseDto {
  @ApiProperty({ example: 'Rua das Flores', description: 'Logradouro do endereço' })
  logradouro: string;

  @ApiProperty({ example: '123', description: 'Número do endereço' })
  numero: string;

  @ApiPropertyOptional({ example: 'Apto 101', description: 'Complemento do endereço' })
  complemento?: string;

  @ApiProperty({ example: 'Centro', description: 'Bairro do endereço' })
  bairro: string;

  @ApiProperty({ example: 'Natal', description: 'Cidade do endereço' })
  cidade: string;

  @ApiProperty({ example: 'RN', description: 'Estado do endereço (sigla)' })
  estado: string;

  @ApiProperty({ example: '59000-000', description: 'CEP do endereço' })
  cep: string;
}

export class CidadaoResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'ID único do cidadão' })
  id: string;

  @ApiProperty({ example: 'Maria da Silva', description: 'Nome completo do cidadão' })
  nome: string;

  @ApiProperty({ example: '123.456.789-00', description: 'CPF do cidadão' })
  cpf: string;

  @ApiProperty({ example: '1234567', description: 'RG do cidadão' })
  rg: string;

  @ApiProperty({ example: 'SSP/RN', description: 'Órgão emissor do RG' })
  orgaoEmissor: string;

  @ApiProperty({ example: '1990-01-01', description: 'Data de nascimento no formato YYYY-MM-DD' })
  dataNascimento: string;

  @ApiProperty({ enum: Sexo, enumName: 'Sexo', example: Sexo.FEMININO, description: 'Sexo do cidadão' })
  sexo: Sexo;

  @ApiProperty({ example: 'maria@example.com', description: 'Email do cidadão' })
  email: string;

  @ApiProperty({ example: '(84) 99999-9999', description: 'Telefone do cidadão' })
  telefone: string;

  @ApiProperty({ example: '12345678901', description: 'Número do NIS (PIS/PASEP)' })
  nis: string;

  @ApiProperty({ example: 'Brasileira', description: 'Nacionalidade do cidadão' })
  nacionalidade: string;

  @ApiProperty({ example: 'Solteira', description: 'Estado civil do cidadão' })
  estadoCivil: string;

  @ApiProperty({ example: 'Ensino Médio Completo', description: 'Escolaridade do cidadão' })
  escolaridade: string;

  @ApiProperty({ example: 'Empresa XYZ', description: 'Nome da empresa onde trabalha' })
  empresa: string;

  @ApiProperty({ example: 'Auxiliar administrativo', description: 'Cargo ou função profissional' })
  profissao: string;

  @ApiProperty({ example: 1500.50, description: 'Renda mensal' })
  rendaMensal: number;

  @ApiProperty({ example: 'Filho com necessidades especiais', description: 'Informações adicionais' })
  observacoes: string;

  @ApiProperty({ type: EnderecoResponseDto, description: 'Endereço do cidadão' })
  endereco: EnderecoResponseDto;

  @ApiProperty({ example: true, description: 'Indica se o cidadão está ativo no sistema' })
  ativo: boolean;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z', description: 'Data de criação do registro' })
  created_at: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z', description: 'Data da última atualização do registro' })
  updated_at: Date;

  @ApiPropertyOptional({ example: null, description: 'Data de desativação do registro, se aplicável' })
  deleted_at?: Date;

  @ApiPropertyOptional({ 
    type: [PapelCidadaoResponseDto],
    description: 'Papéis que o cidadão possui no sistema'
  })
  papeis?: PapelCidadaoResponseDto[];
}

export class CidadaoPaginatedResponseDto {
  @ApiProperty({ 
    type: [CidadaoResponseDto],
    description: 'Lista de cidadãos' 
  })
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
    description: 'Metadados da paginação' 
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
