import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsNumber,
  IsUUID,
  Min,
  ValidateIf,
  Length,
  Matches,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ValidateTipoBeneficio } from '@/shared/validators/tipo-beneficio.validator';
import { TipoContextoNatalidade } from '../../../enums';

/**
 * DTO para criação de dados específicos do cidadão para Auxílio Natalidade
 */
export class CreateDadosNatalidadeDto {
  @ApiProperty({
    description: 'ID da solicitação de benefício',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({
    message: 'O ID da solicitação é obrigatório e não pode estar vazio',
  })
  @IsUUID('4', {
    message:
      'O ID da solicitação deve ser um UUID válido no formato: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
  })
  @ValidateTipoBeneficio('natalidade')
  solicitacao_id: string;

  @ApiProperty({
    description: 'Tipo de contexto do benefício de natalidade',
    example: TipoContextoNatalidade.PRE_NATAL,
    enum: TipoContextoNatalidade,
    default: TipoContextoNatalidade.PRE_NATAL,
  })
  @IsOptional()
  @IsEnum(TipoContextoNatalidade, {
    message: 'Tipo de contexto deve ser PRE_NATAL ou POS_NATAL',
  })
  @Transform(({ value }) => {
    if (!value) {
      return TipoContextoNatalidade.PRE_NATAL;
    }
    return value;
  })
  tipo_contexto?: TipoContextoNatalidade = TipoContextoNatalidade.PRE_NATAL;

  @ApiProperty({
    description:
      'Indica se a gestante realiza pré-natal (obrigatório para contexto PRE_NATAL)',
    example: true,
    type: 'boolean',
  })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsNotEmpty({
    message: 'É obrigatório informar se a gestante realiza pré-natal',
  })
  @IsBoolean({
    message:
      'O campo "realiza pré-natal" deve ser verdadeiro (true) ou falso (false)',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      if (lowerValue === 'true' || lowerValue === '1') {
        return true;
      }
      if (lowerValue === 'false' || lowerValue === '0') {
        return false;
      }
      throw new Error(
        'Valor inválido para "realiza pré-natal". Use: true, false, 1 ou 0',
      );
    }
    if (typeof value === 'number') {
      if (value === 1) {
        return true;
      }
      if (value === 0) {
        return false;
      }
      throw new Error(
        'Valor numérico inválido para "realiza pré-natal". Use: 1 (true) ou 0 (false)',
      );
    }
    return value;
  })
  realiza_pre_natal: boolean;

  @ApiProperty({
    description:
      'Indica se é atendida pelo PSF/UBS (obrigatório para contexto PRE_NATAL)',
    example: true,
    type: 'boolean',
  })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsNotEmpty({
    message: 'É obrigatório informar se a gestante é atendida pelo PSF/UBS',
  })
  @IsBoolean({
    message:
      'O campo "atendida pelo PSF/UBS" deve ser verdadeiro (true) ou falso (false)',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      if (lowerValue === 'true' || lowerValue === '1') {
        return true;
      }
      if (lowerValue === 'false' || lowerValue === '0') {
        return false;
      }
      throw new Error(
        'Valor inválido para "atendida pelo PSF/UBS". Use: true, false, 1 ou 0',
      );
    }
    if (typeof value === 'number') {
      if (value === 1) {
        return true;
      }
      if (value === 0) {
        return false;
      }
      throw new Error(
        'Valor numérico inválido para "atendida pelo PSF/UBS". Use: 1 (true) ou 0 (false)',
      );
    }
    return value;
  })
  atendida_psf_ubs: boolean;

  @ApiProperty({
    description:
      'Indica se é uma gravidez de risco (obrigatório para contexto PRE_NATAL)',
    example: false,
    type: 'boolean',
  })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsNotEmpty({
    message: 'É obrigatório informar se é uma gravidez de risco',
  })
  @IsBoolean({
    message:
      'O campo "gravidez de risco" deve ser verdadeiro (true) ou falso (false)',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      if (lowerValue === 'true' || lowerValue === '1') {
        return true;
      }
      if (lowerValue === 'false' || lowerValue === '0') {
        return false;
      }
      throw new Error(
        'Valor inválido para "gravidez de risco". Use: true, false, 1 ou 0',
      );
    }
    if (typeof value === 'number') {
      if (value === 1) {
        return true;
      }
      if (value === 0) {
        return false;
      }
      throw new Error(
        'Valor numérico inválido para "gravidez de risco". Use: 1 (true) ou 0 (false)',
      );
    }
    return value;
  })
  gravidez_risco: boolean;

  @ApiProperty({
    description: 'Data provável do parto (obrigatório para contexto PRE_NATAL)',
    example: '2024-06-15',
    type: 'string',
    format: 'date',
  })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsNotEmpty({
    message: 'A data provável do parto é obrigatória',
  })
  @IsDateString(
    {},
    {
      message:
        'A data provável do parto deve ser uma data válida no formato YYYY-MM-DD (ex: 2024-06-15)',
    },
  )
  @Transform(({ value }) => {
    if (typeof value === 'string' && value.trim() === '') {
      throw new Error('A data provável do parto não pode estar vazia');
    }
    // Validação adicional para garantir que a data não seja no passado
    if (value) {
      const inputDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
    }
    return value;
  })
  data_provavel_parto: string;

  @ApiProperty({
    description:
      'Indica se é uma gravidez múltipla (gêmeos/trigêmeos) (obrigatório para contexto PRE_NATAL)',
    example: false,
    type: 'boolean',
  })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsNotEmpty({
    message:
      'É obrigatório informar se é uma gravidez múltipla (gêmeos/trigêmeos)',
  })
  @IsBoolean({
    message:
      'O campo "gêmeos/trigêmeos" deve ser verdadeiro (true) ou falso (false)',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      if (lowerValue === 'true' || lowerValue === '1') {
        return true;
      }
      if (lowerValue === 'false' || lowerValue === '0') {
        return false;
      }
      throw new Error(
        'Valor inválido para "gêmeos/trigêmeos". Use: true, false, 1 ou 0',
      );
    }
    if (typeof value === 'number') {
      if (value === 1) {
        return true;
      }
      if (value === 0) {
        return false;
      }
      throw new Error(
        'Valor numérico inválido para "gêmeos/trigêmeos". Use: 1 (true) ou 0 (false)',
      );
    }
    return value;
  })
  gemeos_trigemeos: boolean;

  @ApiProperty({
    description: 'Indica se a gestante já tem outros filhos',
    example: false,
    type: 'boolean',
  })
  @IsNotEmpty({
    message: 'É obrigatório informar se a gestante já tem outros filhos',
  })
  @IsBoolean({
    message:
      'O campo "já tem filhos" deve ser verdadeiro (true) ou falso (false)',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      if (lowerValue === 'true' || lowerValue === '1') {
        return true;
      }
      if (lowerValue === 'false' || lowerValue === '0') {
        return false;
      }
      throw new Error(
        'Valor inválido para "já tem filhos". Use: true, false, 1 ou 0',
      );
    }
    if (typeof value === 'number') {
      if (value === 1) {
        return true;
      }
      if (value === 0) {
        return false;
      }
      throw new Error(
        'Valor numérico inválido para "já tem filhos". Use: 1 (true) ou 0 (false)',
      );
    }
    return value;
  })
  ja_tem_filhos: boolean;

  @ApiProperty({
    description:
      'Quantidade de filhos que já possui (obrigatório se já_tem_filhos = true)',
    example: 2,
    minimum: 1,
    maximum: 20,
  })
  @ValidateIf((o) => o.ja_tem_filhos === true)
  @IsNotEmpty({
    message:
      'A quantidade de filhos é obrigatória quando a gestante já tem filhos',
  })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'A quantidade de filhos deve ser um número inteiro válido' },
  )
  @Min(1, {
    message:
      'A quantidade de filhos deve ser pelo menos 1 quando já tem filhos',
  })
  @Type(() => Number)
  @Transform(({ value, obj }) => {
    // Se já_tem_filhos é false, quantidade_filhos deve ser undefined ou 0
    if (obj.ja_tem_filhos === false) {
      return undefined;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        throw new Error(
          'A quantidade de filhos não pode estar vazia quando já tem filhos',
        );
      }
      const num = parseInt(trimmed, 10);
      if (isNaN(num)) {
        throw new Error('A quantidade de filhos deve ser um número válido');
      }
      if (num > 20) {
        throw new Error('A quantidade de filhos não pode ser superior a 20');
      }
      return num;
    }

    if (typeof value === 'number') {
      if (value > 20) {
        throw new Error('A quantidade de filhos não pode ser superior a 20');
      }
      return Math.floor(value); // Garante que seja um inteiro
    }

    return value;
  })
  quantidade_filhos?: number;

  @ApiPropertyOptional({
    description: 'Observações adicionais sobre o caso',
    example:
      'Gestante em situação de vulnerabilidade, necessita acompanhamento especial.',
  })
  @IsOptional()
  @IsString({
    message: 'As observações devem ser uma string válida',
  })
  @Length(0, 1000, {
    message: 'As observações não podem exceder 1000 caracteres',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
    }
    return value;
  })
  observacoes?: string;

  // Campos específicos para contexto PÓS-NATAL
  @ApiProperty({
    description:
      'Data de nascimento do recém-nascido (obrigatório para contexto POS_NATAL)',
    example: '2024-01-15',
    type: 'string',
    format: 'date',
  })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.POS_NATAL)
  @IsNotEmpty({
    message: 'A data de nascimento é obrigatória para contexto pós-natal',
  })
  @IsDateString(
    {},
    {
      message:
        'A data de nascimento deve ser uma data válida no formato YYYY-MM-DD (ex: 2024-01-15)',
    },
  )
  @Transform(({ value }) => {
    if (typeof value === 'string' && value.trim() === '') {
      throw new Error('A data de nascimento não pode estar vazia');
    }
    return value;
  })
  data_nascimento?: string;

  @ApiProperty({
    description: 'Nome do recém-nascido (obrigatório para contexto POS_NATAL)',
    example: 'João Silva Santos',
  })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.POS_NATAL)
  @IsNotEmpty({
    message: 'O nome do recém-nascido é obrigatório para contexto pós-natal',
  })
  @IsString({
    message: 'O nome do recém-nascido deve ser uma string válida',
  })
  @Length(2, 100, {
    message: 'O nome do recém-nascido deve ter entre 2 e 100 caracteres',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        throw new Error('O nome do recém-nascido não pode estar vazio');
      }
      return trimmed;
    }
    return value;
  })
  nome_recem_nascido?: string;

  @ApiProperty({
    description:
      'Número da certidão de nascimento (obrigatório para contexto POS_NATAL)',
    example: '123456 01 55 2024 1 12345 123 1234567-89',
  })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.POS_NATAL)
  @IsNotEmpty({
    message:
      'O número da certidão de nascimento é obrigatório para contexto pós-natal',
  })
  @IsString({
    message: 'O número da certidão de nascimento deve ser uma string válida',
  })
  @Length(10, 50, {
    message:
      'O número da certidão de nascimento deve ter entre 10 e 50 caracteres',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        throw new Error(
          'O número da certidão de nascimento não pode estar vazio',
        );
      }
      return trimmed;
    }
    return value;
  })
  numero_certidao_nascimento?: string;

  @ApiPropertyOptional({
    description:
      'Cartório de registro do nascimento (opcional para contexto POS_NATAL)',
    example: 'Cartório do 1º Ofício de Registro Civil',
  })
  @IsOptional()
  @IsString({
    message: 'O cartório de registro deve ser uma string válida',
  })
  @Length(5, 200, {
    message: 'O cartório de registro deve ter entre 5 e 200 caracteres',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
    }
    return value;
  })
  cartorio_registro?: string;

  @ApiPropertyOptional({
    description:
      'Peso do recém-nascido em gramas (opcional para contexto POS_NATAL)',
    example: 3250,
    minimum: 500,
    maximum: 8000,
  })
  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'O peso do nascimento deve ser um número válido' },
  )
  @Min(500, {
    message: 'O peso do nascimento deve ser pelo menos 500 gramas',
  })
  @Type(() => Number)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        return undefined;
      }
      const num = parseInt(trimmed, 10);
      if (isNaN(num)) {
        throw new Error('O peso do nascimento deve ser um número válido');
      }
      if (num > 8000) {
        throw new Error(
          'O peso do nascimento não pode ser superior a 8000 gramas',
        );
      }
      return num;
    }

    if (typeof value === 'number') {
      if (value > 8000) {
        throw new Error(
          'O peso do nascimento não pode ser superior a 8000 gramas',
        );
      }
      return Math.floor(value);
    }

    return value;
  })
  peso_nascimento?: number;
}

/**
 * DTO para atualização de dados específicos do cidadão para Auxílio Natalidade
 */
export class UpdateDadosNatalidadeDto {
  @ApiPropertyOptional({
    description: 'Tipo de contexto da natalidade',
    enum: TipoContextoNatalidade,
    example: TipoContextoNatalidade.PRE_NATAL,
  })
  @IsOptional()
  @IsEnum(TipoContextoNatalidade, {
    message: 'O tipo de contexto deve ser PRE_NATAL ou POS_NATAL',
  })
  tipo_contexto?: TipoContextoNatalidade;

  @ApiPropertyOptional({
    description:
      'Indica se a gestante realiza pré-natal (obrigatório para contexto PRE_NATAL)',
    example: true,
    type: 'boolean',
  })
  @IsOptional()
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsBoolean({
    message: 'O campo realiza_pre_natal deve ser um valor booleano',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim().toLowerCase();
      if (trimmed === 'true' || trimmed === '1') return true;
      if (trimmed === 'false' || trimmed === '0') return false;
      throw new Error('O campo realiza_pre_natal deve ser true, false, 1 ou 0');
    }
    return value;
  })
  realiza_pre_natal?: boolean;

  @ApiPropertyOptional({
    description:
      'Indica se é atendida pelo PSF/UBS (obrigatório para contexto PRE_NATAL)',
    example: true,
    type: 'boolean',
  })
  @IsOptional()
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsBoolean({
    message: 'O campo atendida_psf_ubs deve ser um valor booleano',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim().toLowerCase();
      if (trimmed === 'true' || trimmed === '1') return true;
      if (trimmed === 'false' || trimmed === '0') return false;
      throw new Error('O campo atendida_psf_ubs deve ser true, false, 1 ou 0');
    }
    return value;
  })
  atendida_psf_ubs?: boolean;

  @ApiPropertyOptional({
    description:
      'Indica se é uma gravidez de risco (obrigatório para contexto PRE_NATAL)',
    example: false,
    type: 'boolean',
  })
  @IsOptional()
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsBoolean({
    message: 'O campo gravidez_risco deve ser um valor booleano',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim().toLowerCase();
      if (trimmed === 'true' || trimmed === '1') return true;
      if (trimmed === 'false' || trimmed === '0') return false;
      throw new Error('O campo gravidez_risco deve ser true, false, 1 ou 0');
    }
    return value;
  })
  gravidez_risco?: boolean;

  @ApiPropertyOptional({
    description: 'Data provável do parto (obrigatório para contexto PRE_NATAL)',
    example: '2024-06-15',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsDateString(
    {},
    {
      message:
        'A data provável do parto deve ser uma data válida no formato YYYY-MM-DD (ex: 2024-06-15)',
    },
  )
  @Transform(({ value }) => {
    if (typeof value === 'string' && value.trim() === '') {
      throw new Error('A data provável do parto não pode estar vazia');
    }
    // Validação adicional para garantir que a data não seja no passado
    if (value) {
      const inputDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (inputDate < today) {
        throw new Error(
          'A data provável do parto não pode ser anterior à data atual',
        );
      }
    }
    return value;
  })
  data_provavel_parto?: string;

  @ApiPropertyOptional({
    description:
      'Indica se é uma gravidez múltipla (gêmeos/trigêmeos) (obrigatório para contexto PRE_NATAL)',
    example: false,
    type: 'boolean',
  })
  @IsOptional()
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsBoolean({
    message: 'O campo gemeos_trigemeos deve ser um valor booleano',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim().toLowerCase();
      if (trimmed === 'true' || trimmed === '1') return true;
      if (trimmed === 'false' || trimmed === '0') return false;
      throw new Error('O campo gemeos_trigemeos deve ser true, false, 1 ou 0');
    }
    return value;
  })
  gemeos_trigemeos?: boolean;

  @ApiPropertyOptional({
    description: 'Indica se a gestante já tem outros filhos',
    example: false,
    type: 'boolean',
  })
  @IsOptional()
  @IsBoolean({
    message: 'O campo ja_tem_filhos deve ser um valor booleano',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim().toLowerCase();
      if (trimmed === 'true' || trimmed === '1') return true;
      if (trimmed === 'false' || trimmed === '0') return false;
      throw new Error('O campo ja_tem_filhos deve ser true, false, 1 ou 0');
    }
    return value;
  })
  ja_tem_filhos?: boolean;

  @ApiPropertyOptional({
    description:
      'Quantidade de filhos que já possui (obrigatório se ja_tem_filhos = true)',
    example: 2,
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @ValidateIf((o) => o.ja_tem_filhos === true)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'A quantidade de filhos deve ser um número inteiro válido' },
  )
  @Min(1, {
    message:
      'A quantidade de filhos deve ser pelo menos 1 quando já tem filhos',
  })
  @Type(() => Number)
  @Transform(({ value, obj }) => {
    // Se já_tem_filhos é false, quantidade_filhos deve ser undefined ou 0
    if (obj.ja_tem_filhos === false) {
      return undefined;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        throw new Error(
          'A quantidade de filhos não pode estar vazia quando já tem filhos',
        );
      }
      const num = parseInt(trimmed, 10);
      if (isNaN(num)) {
        throw new Error('A quantidade de filhos deve ser um número válido');
      }
      if (num > 20) {
        throw new Error('A quantidade de filhos não pode ser superior a 20');
      }
      return num;
    }

    if (typeof value === 'number') {
      if (value > 20) {
        throw new Error('A quantidade de filhos não pode ser superior a 20');
      }
      return Math.floor(value); // Garante que seja um inteiro
    }

    return value;
  })
  quantidade_filhos?: number;

  @ApiPropertyOptional({
    description: 'Observações adicionais sobre o caso',
    example:
      'Gestante em situação de vulnerabilidade, necessita acompanhamento especial.',
  })
  @IsOptional()
  @IsString({
    message: 'As observações devem ser uma string válida',
  })
  @Length(0, 1000, {
    message: 'As observações não podem exceder 1000 caracteres',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
    }
    return value;
  })
  observacoes?: string;

  // Campos específicos para contexto PÓS-NATAL
  @ApiPropertyOptional({
    description:
      'Data de nascimento do recém-nascido (obrigatório para contexto POS_NATAL)',
    example: '2024-01-15',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.POS_NATAL)
  @IsDateString(
    {},
    {
      message:
        'A data de nascimento deve ser uma data válida no formato YYYY-MM-DD (ex: 2024-01-15)',
    },
  )
  @Transform(({ value }) => {
    if (typeof value === 'string' && value.trim() === '') {
      throw new Error('A data de nascimento não pode estar vazia');
    }
    return value;
  })
  data_nascimento?: string;

  @ApiPropertyOptional({
    description: 'Nome do recém-nascido (obrigatório para contexto POS_NATAL)',
    example: 'João Silva Santos',
  })
  @IsOptional()
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.POS_NATAL)
  @IsString({
    message: 'O nome do recém-nascido deve ser uma string válida',
  })
  @Length(2, 100, {
    message: 'O nome do recém-nascido deve ter entre 2 e 100 caracteres',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        throw new Error('O nome do recém-nascido não pode estar vazio');
      }
      return trimmed;
    }
    return value;
  })
  nome_recem_nascido?: string;

  @ApiPropertyOptional({
    description:
      'Número da certidão de nascimento (obrigatório para contexto POS_NATAL)',
    example: '123456 01 55 2024 1 12345 123 1234567-89',
  })
  @IsOptional()
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.POS_NATAL)
  @IsString({
    message: 'O número da certidão de nascimento deve ser uma string válida',
  })
  @Length(10, 50, {
    message:
      'O número da certidão de nascimento deve ter entre 10 e 50 caracteres',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        throw new Error(
          'O número da certidão de nascimento não pode estar vazio',
        );
      }
      return trimmed;
    }
    return value;
  })
  numero_certidao_nascimento?: string;

  @ApiPropertyOptional({
    description:
      'Cartório de registro do nascimento (opcional para contexto POS_NATAL)',
    example: 'Cartório do 1º Ofício de Registro Civil',
  })
  @IsOptional()
  @IsString({
    message: 'O cartório de registro deve ser uma string válida',
  })
  @Length(5, 200, {
    message: 'O cartório de registro deve ter entre 5 e 200 caracteres',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
    }
    return value;
  })
  cartorio_registro?: string;

  @ApiPropertyOptional({
    description:
      'Peso do recém-nascido em gramas (opcional para contexto POS_NATAL)',
    example: 3250,
    minimum: 500,
    maximum: 8000,
  })
  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'O peso do nascimento deve ser um número válido' },
  )
  @Min(500, {
    message: 'O peso do nascimento deve ser pelo menos 500 gramas',
  })
  @Type(() => Number)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        return undefined;
      }
      const num = parseInt(trimmed, 10);
      if (isNaN(num)) {
        throw new Error('O peso do nascimento deve ser um número válido');
      }
      if (num > 8000) {
        throw new Error(
          'O peso do nascimento não pode ser superior a 8000 gramas',
        );
      }
      return num;
    }

    if (typeof value === 'number') {
      if (value > 8000) {
        throw new Error(
          'O peso do nascimento não pode ser superior a 8000 gramas',
        );
      }
      return Math.floor(value);
    }

    return value;
  })
  peso_nascimento?: number;
}
