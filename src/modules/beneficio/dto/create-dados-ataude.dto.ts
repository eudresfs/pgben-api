import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ParentescoEnum, TipoUrnaEnum, TransladoEnum } from '@/enums';
import { EnderecoDto } from '@/shared/dtos/endereco.dto';
import { ValidateTipoBeneficio } from '@/shared/validators/tipo-beneficio.validator';

/**
 * DTO para criação de dados específicos do cidadão para Benefício por Morte
 */
export class CreateDadosAtaudeDto {
  @ApiProperty({
    description: 'ID da solicitação de benefício',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: 'ID da solicitação é obrigatório' })
  @IsUUID('4', { message: 'ID da solicitação inválido' })
  @ValidateTipoBeneficio('ataude')
  solicitacao_id: string;

  @ApiProperty({
    description: 'Nome completo da pessoa falecida',
    example: 'João Silva Santos',
  })
  @IsNotEmpty({ message: 'Nome completo do falecido é obrigatório' })
  @MinLength(3, { message: 'Nome completo deve ter pelo menos 3 caracteres' })
  nome_completo_falecido: string;

  @ApiProperty({
    description: 'Data do óbito',
    example: '2024-01-15',
    type: 'string',
    format: 'date',
  })
  @IsNotEmpty({ message: 'Data do óbito é obrigatória' })
  @IsDateString({}, { message: 'Data do óbito deve ser uma data válida' })
  data_obito: string;

  @ApiProperty({
    description: 'Local onde ocorreu o óbito',
    example: 'Hospital Geral de Fortaleza',
  })
  @IsNotEmpty({ message: 'Local do óbito é obrigatório' })
  @MinLength(3, { message: 'Local do óbito deve ter pelo menos 3 caracteres' })
  local_obito: string;

  @ApiProperty({
    description: 'Data da autorização para o benefício',
    example: '2024-01-16',
    type: 'string',
    format: 'date',
  })
  @IsNotEmpty({ message: 'Data da autorização é obrigatória' })
  @IsDateString({}, { message: 'Data da autorização deve ser uma data válida' })
  data_autorizacao: string;

  @ApiProperty({
    description: 'Grau de parentesco do requerente com o falecido',
    enum: ParentescoEnum,
    example: ParentescoEnum.FILHO,
  })
  @IsNotEmpty({ message: 'Grau de parentesco é obrigatório' })
  @IsEnum(ParentescoEnum, { message: 'Grau de parentesco inválido' })
  grau_parentesco_requerente: ParentescoEnum;

  @ApiProperty({
    description: 'Tipo de urna necessária',
    enum: TipoUrnaEnum,
    example: TipoUrnaEnum.PADRAO,
  })
  @IsNotEmpty({ message: 'Tipo de urna é obrigatório' })
  @IsEnum(TipoUrnaEnum, { message: 'Tipo de urna inválido' })
  tipo_urna_necessaria: TipoUrnaEnum;

  @ApiPropertyOptional({
    description: 'Observações especiais sobre o caso',
    example: 'Família em situação de extrema vulnerabilidade social.',
  })
  @IsOptional()
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Declaração de óbito',
    example: '123456789',
  })
  @IsOptional()
  declaracao_obito?: string;

  @ApiPropertyOptional({
    description: 'Rota de translado necessário',
    example: ''
  })
  @IsOptional()
  translado?: string;

  @ApiPropertyOptional({
    description: 'Endereço do local do velório',
    type: EnderecoDto,
  })
  @IsOptional()
  endereco_velorio?: EnderecoDto;

  @ApiPropertyOptional({
    description: 'Endereço do cemitério',
    type: EnderecoDto,
  })
  @IsOptional()
  endereco_cemiterio?: EnderecoDto;

  @ApiPropertyOptional({
    description: 'Cartório emissor da certidão de óbito',
    example: 'Cartório do 1º Ofício de Fortaleza',
  })
  @IsOptional()
  cartorio_emissor?: string;
}

/**
 * DTO para atualização de dados específicos do cidadão para Auxílio Ataude
 */
export class UpdateDadosAtaudeDto {
  @ApiPropertyOptional({
    description: 'Nome completo da pessoa falecida',
    example: 'João Silva Santos',
  })
  @IsOptional()
  @MinLength(3, { message: 'Nome completo deve ter pelo menos 3 caracteres' })
  nome_completo_falecido?: string;

  @ApiPropertyOptional({
    description: 'Data do óbito',
    example: '2024-01-15',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data do óbito deve ser uma data válida' })
  data_obito?: string;

  @ApiPropertyOptional({
    description: 'Local onde ocorreu o óbito',
    example: 'Hospital Geral de Fortaleza',
  })
  @IsOptional()
  @MinLength(3, { message: 'Local do óbito deve ter pelo menos 3 caracteres' })
  local_obito?: string;

  @ApiPropertyOptional({
    description: 'Data da autorização para o benefício',
    example: '2024-01-16',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data da autorização deve ser uma data válida' })
  data_autorizacao?: string;

  @ApiPropertyOptional({
    description: 'Grau de parentesco do requerente com o falecido',
    enum: ParentescoEnum,
    example: ParentescoEnum.FILHO,
  })
  @IsOptional()
  @IsEnum(ParentescoEnum, { message: 'Grau de parentesco inválido' })
  grau_parentesco_requerente?: ParentescoEnum;

  @ApiPropertyOptional({
    description: 'Tipo de urna necessária',
    enum: TipoUrnaEnum,
    example: TipoUrnaEnum.PADRAO,
  })
  @IsOptional()
  @IsEnum(TipoUrnaEnum, { message: 'Tipo de urna inválido' })
  tipo_urna_necessaria?: TipoUrnaEnum;

  @ApiPropertyOptional({
    description: 'Observações especiais sobre o caso',
    example: 'Observações atualizadas após análise.',
  })
  @IsOptional()
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Declaração de óbito',
    example: '123456789',
  })
  @IsOptional()
  declaracao_obito?: string;

  @ApiPropertyOptional({
    description: 'Tipo de translado necessário',
    enum: TransladoEnum,
    example: TransladoEnum.SVO,
  })
  @IsOptional()
  @IsEnum(TransladoEnum, { message: 'Tipo de translado inválido' })
  translado?: TransladoEnum;

  @ApiPropertyOptional({
    description: 'Endereço do local do velório',
    type: EnderecoDto,
  })
  @IsOptional()
  endereco_velorio?: EnderecoDto;

  @ApiPropertyOptional({
    description: 'Endereço do cemitério',
    type: EnderecoDto,
  })
  @IsOptional()
  endereco_cemiterio?: EnderecoDto;

  @ApiPropertyOptional({
    description: 'Cartório emissor da certidão de óbito',
    example: 'Cartório do 1º Ofício de Fortaleza',
  })
  @IsOptional()
  cartorio_emissor?: string;
}
