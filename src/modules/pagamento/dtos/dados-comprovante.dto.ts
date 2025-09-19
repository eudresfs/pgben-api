import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsDate,
  IsOptional,
  ValidateNested,
  IsBoolean,
  IsObject,
} from 'class-validator';

/**
 * DTO para endereço do beneficiário
 */
export class EnderecoComprovanteDto {
  @ApiProperty({ description: 'Logradouro', example: 'Rua das Flores' })
  @IsString()
  logradouro: string;

  @ApiProperty({ description: 'Número', example: '123' })
  @IsString()
  numero: string;

  @ApiPropertyOptional({ description: 'Complemento', example: 'Apto 45' })
  @IsOptional()
  @IsString()
  complemento?: string;

  @ApiProperty({ description: 'Bairro', example: 'Centro' })
  @IsString()
  bairro: string;

  @ApiProperty({ description: 'Cidade', example: 'São Paulo' })
  @IsString()
  cidade: string;

  @ApiProperty({ description: 'Estado', example: 'SP' })
  @IsString()
  estado: string;

  @ApiProperty({ description: 'CEP', example: '01234-567' })
  @IsString()
  cep: string;
}

/**
 * DTO para contatos do beneficiário
 */
export class ContatosComprovanteDto {
  @ApiPropertyOptional({ description: 'Telefone', example: '(11) 99999-9999' })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional({ description: 'Email', example: 'usuario@email.com' })
  @IsOptional()
  @IsString()
  email?: string;
}

/**
 * DTO para dados do beneficiário no comprovante
 */
export class BeneficiarioComprovanteDto {
  @ApiProperty({ description: 'Nome completo', example: 'João da Silva' })
  @IsString()
  nome: string;

  @ApiProperty({ description: 'CPF', example: '123.456.789-00' })
  @IsString()
  cpf: string;

  @ApiPropertyOptional({ description: 'RG', example: '12.345.678-9' })
  @IsOptional()
  @IsString()
  rg?: string;

  @ApiProperty({ description: 'Endereço completo', type: EnderecoComprovanteDto })
  @ValidateNested()
  @Type(() => EnderecoComprovanteDto)
  endereco: EnderecoComprovanteDto;

  @ApiPropertyOptional({ description: 'Contatos', type: ContatosComprovanteDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContatosComprovanteDto)
  contatos?: ContatosComprovanteDto;
}

/**
 * DTO para tipo de benefício
 */
export class TipoBeneficioComprovanteDto {
  @ApiProperty({ description: 'Nome do benefício', example: 'Cesta Básica' })
  @IsString()
  nome: string;

  @ApiProperty({ description: 'Código do benefício', example: 'cesta-basica' })
  @IsString()
  codigo: string;

  @ApiPropertyOptional({ description: 'Descrição do benefício' })
  @IsOptional()
  @IsString()
  descricao?: string;
}

/**
 * DTO para dados da solicitação
 */
export class SolicitacaoComprovanteDto {
  @ApiProperty({ description: 'Protocolo da solicitação', example: 'SOL20240001234' })
  @IsString()
  protocolo: string;

  @ApiPropertyOptional({ description: 'Dados específicos da solicitação', example: {} })
  @IsOptional()
  @IsObject()
  dadosEspecificos?: object;
}

/**
 * DTO para dados do pagamento no comprovante
 */
export class PagamentoComprovanteDto {
  @ApiProperty({ description: 'ID do pagamento', example: 'uuid-123' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'ID da solicitação', example: 'uuid-solicitacao-456' })
  @IsString()
  solicitacao_id: string;

  @ApiProperty({ description: 'Valor do pagamento', example: 150.50 })
  @IsNumber()
  valor: number;

  @ApiProperty({ description: 'Data de liberação', example: '2024-01-15T10:30:00.000Z' })
  @IsDate()
  @Type(() => Date)
  dataLiberacao: Date;

  @ApiProperty({ description: 'Método de pagamento', example: 'PIX' })
  @IsString()
  metodoPagamento: string;

  @ApiPropertyOptional({ description: 'Número da parcela', example: 1 })
  @IsOptional()
  @IsNumber()
  numeroParcela?: number;

  @ApiPropertyOptional({ description: 'Total de parcelas', example: 3 })
  @IsOptional()
  @IsNumber()
  totalParcelas?: number;

  @ApiProperty({ description: 'Status do pagamento', example: 'LIBERADO' })
  @IsString()
  status: string;

  @ApiProperty({ description: 'Tipo de benefício', type: TipoBeneficioComprovanteDto })
  @ValidateNested()
  @Type(() => TipoBeneficioComprovanteDto)
  tipoBeneficio: TipoBeneficioComprovanteDto;

  @ApiProperty({ description: 'Dados da solicitação', type: SolicitacaoComprovanteDto })
  @ValidateNested()
  @Type(() => SolicitacaoComprovanteDto)
  solicitacao: SolicitacaoComprovanteDto;
}

/**
 * DTO para dados da unidade responsável
 */
export class UnidadeComprovanteDto {
  @ApiProperty({ description: 'Nome da unidade', example: 'SEMTAS - Secretaria Municipal de Trabalho e Assistência Social' })
  @IsString()
  nome: string;

  @ApiPropertyOptional({ description: 'Endereço da unidade' })
  @IsOptional()
  @IsString()
  endereco?: string;

  @ApiPropertyOptional({ description: 'Telefone da unidade' })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional({ description: 'Email da unidade' })
  @IsOptional()
  @IsString()
  email?: string;
}

/**
 * DTO para dados do técnico responsável
 */
export class TecnicoComprovanteDto {
  @ApiProperty({ description: 'Nome do técnico', example: 'Maria Santos' })
  @IsString()
  nome: string;

  @ApiPropertyOptional({ description: 'Matrícula do técnico' })
  @IsOptional()
  @IsString()
  matricula?: string;

  @ApiPropertyOptional({ description: 'Cargo do técnico' })
  @IsOptional()
  @IsString()
  cargo?: string;
}

/**
 * DTO para dados bancários
 */
export class DadosBancariosComprovanteDto {
  @ApiPropertyOptional({ description: 'Nome do banco' })
  @IsOptional()
  @IsString()
  banco?: string;

  @ApiPropertyOptional({ description: 'Agência' })
  @IsOptional()
  @IsString()
  agencia?: string;

  @ApiPropertyOptional({ description: 'Conta' })
  @IsOptional()
  @IsString()
  conta?: string;

  @ApiPropertyOptional({ description: 'Tipo de conta' })
  @IsOptional()
  @IsString()
  tipoConta?: string;

  @ApiPropertyOptional({ description: 'Chave PIX' })
  @IsOptional()
  @IsString()
  chavePix?: string;
}

/**
 * DTO para configuração de campos de assinatura
 */
export class CamposAssinaturaDto {
  @ApiProperty({ description: 'Requer assinatura do beneficiário', example: true })
  @IsBoolean()
  beneficiario: boolean;

  @ApiProperty({ description: 'Requer assinatura do técnico', example: true })
  @IsBoolean()
  tecnico: boolean;

  @ApiPropertyOptional({ description: 'Requer assinatura de testemunha', example: false })
  @IsOptional()
  @IsBoolean()
  testemunha?: boolean;
}

/**
 * DTO principal para dados completos do comprovante
 */
export class DadosComprovanteDto {
  @ApiProperty({ description: 'Dados do beneficiário', type: BeneficiarioComprovanteDto })
  @ValidateNested()
  @Type(() => BeneficiarioComprovanteDto)
  beneficiario: BeneficiarioComprovanteDto;

  @ApiProperty({ description: 'Dados do pagamento', type: PagamentoComprovanteDto })
  @ValidateNested()
  @Type(() => PagamentoComprovanteDto)
  pagamento: PagamentoComprovanteDto;

  @ApiProperty({ description: 'Dados da unidade', type: UnidadeComprovanteDto })
  @ValidateNested()
  @Type(() => UnidadeComprovanteDto)
  unidade: UnidadeComprovanteDto;

  @ApiPropertyOptional({ description: 'Dados do técnico', type: TecnicoComprovanteDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TecnicoComprovanteDto)
  tecnico?: TecnicoComprovanteDto;

  @ApiPropertyOptional({ description: 'Dados bancários', type: DadosBancariosComprovanteDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DadosBancariosComprovanteDto)
  dadosBancarios?: DadosBancariosComprovanteDto;

  @ApiProperty({ description: 'Data de geração', example: '2024-01-15T10:30:00.000Z' })
  @IsDate()
  @Type(() => Date)
  dataGeracao: Date;

  @ApiPropertyOptional({ description: 'Número do comprovante' })
  @IsOptional()
  @IsString()
  numeroComprovante?: string;

  @ApiProperty({ description: 'Configuração de campos de assinatura', type: CamposAssinaturaDto })
  @ValidateNested()
  @Type(() => CamposAssinaturaDto)
  camposAssinatura: CamposAssinaturaDto;
}