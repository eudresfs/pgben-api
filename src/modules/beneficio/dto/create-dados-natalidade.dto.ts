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
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsCPF } from '@/shared/validators/br-validators';
import { ValidateTipoBeneficio } from '@/shared/validators/tipo-beneficio.validator';

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
    description: 'Indica se a gestante realiza pré-natal',
    example: true,
    type: 'boolean',
  })
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
    description: 'Indica se é atendida pelo PSF/UBS',
    example: true,
    type: 'boolean',
  })
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
    description: 'Indica se é uma gravidez de risco',
    example: false,
    type: 'boolean',
  })
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
    description: 'Data provável do parto',
    example: '2024-06-15',
    type: 'string',
    format: 'date',
  })
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
    description: 'Indica se é uma gravidez múltipla (gêmeos/trigêmeos)',
    example: false,
    type: 'boolean',
  })
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

  @ApiProperty({
    description: 'Chave PIX igual ao CPF (para critério de pecúnia)',
    example: '123.456.789-00',
  })
  @IsNotEmpty({
    message: 'A chave PIX (CPF) é obrigatória',
  })
  @IsString({
    message: 'A chave PIX deve ser uma string válida',
  })
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/, {
    message:
      'A chave PIX deve ser um CPF válido no formato XXX.XXX.XXX-XX ou apenas números',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        throw new Error('A chave PIX não pode estar vazia');
      }

      // Remove caracteres especiais para validação
      const numbersOnly = trimmed.replace(/\D/g, '');

      if (numbersOnly.length !== 11) {
        throw new Error('O CPF deve ter exatamente 11 dígitos');
      }

      return trimmed;
    }
    return value;
  })
  chave_pix: string;

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
}

/**
 * DTO para atualização de dados específicos do cidadão para Auxílio Natalidade
 */
export class UpdateDadosNatalidadeDto {
  @ApiPropertyOptional({
    description: 'Indica se a gestante realiza pré-natal',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Realiza pré-natal deve ser um booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  realiza_pre_natal?: boolean;

  @ApiPropertyOptional({
    description: 'Indica se é atendida pelo PSF/UBS',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Atendida pelo PSF/UBS deve ser um booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  atendida_psf_ubs?: boolean;

  @ApiPropertyOptional({
    description: 'Indica se é uma gravidez de risco',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Gravidez de risco deve ser um booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  gravidez_risco?: boolean;

  @ApiPropertyOptional({
    description: 'Data provável do parto',
    example: '2024-06-15',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
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
    description: 'Indica se é uma gravidez múltipla (gêmeos/trigêmeos)',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Gêmeos/Trigêmeos deve ser um booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  gemeos_trigemeos?: boolean;

  @ApiPropertyOptional({
    description: 'Indica se a gestante já tem outros filhos',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Já tem filhos deve ser um booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  ja_tem_filhos?: boolean;

  @ApiPropertyOptional({
    description: 'Quantidade de filhos que já possui',
    example: 2,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Quantidade de filhos deve ser um número' })
  @Min(0, { message: 'Quantidade de filhos não pode ser negativa' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const num = parseInt(value, 10);
      return isNaN(num) ? value : num;
    }
    return value;
  })
  quantidade_filhos?: number;

  @ApiPropertyOptional({
    description: 'Telefone cadastrado no CPF (para critério de pecúnia)',
    example: '(85) 99999-9999',
  })
  @IsOptional()
  @IsString({
    message: 'O telefone deve ser uma string válida',
  })
  @Matches(/^\(?\d{2}\)?[\s-]?9?\d{4}[\s-]?\d{4}$/, {
    message:
      'O telefone deve estar no formato válido: (XX) 9XXXX-XXXX ou XX 9XXXX-XXXX',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        return undefined;
      }
      // Remove caracteres especiais para validação
      const numbersOnly = trimmed.replace(/\D/g, '');
      if (numbersOnly.length < 10 || numbersOnly.length > 11) {
        throw new Error('O telefone deve ter 10 ou 11 dígitos');
      }
      return trimmed;
    }
    return value;
  })
  telefone_cadastrado_cpf?: string;

  @ApiPropertyOptional({
    description: 'Chave PIX igual ao CPF (para critério de pecúnia)',
    example: '123.456.789-00',
  })
  @IsOptional()
  @IsString({
    message: 'A chave PIX deve ser uma string válida',
  })
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/, {
    message:
      'A chave PIX deve ser um CPF válido no formato XXX.XXX.XXX-XX ou apenas números',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        return undefined;
      }

      // Remove caracteres especiais para validação
      const numbersOnly = trimmed.replace(/\D/g, '');

      if (numbersOnly.length !== 11) {
        throw new Error('O CPF deve ter exatamente 11 dígitos');
      }

      return trimmed;
    }
    return value;
  })
  chave_pix?: string;

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
}
