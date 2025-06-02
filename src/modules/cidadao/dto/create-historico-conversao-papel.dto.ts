import { IsNotEmpty, IsUUID, IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoPapel, PaperType } from '../../../enums/tipo-papel.enum';

/**
 * DTO para criação de histórico de conversão de papel
 */
export class CreateHistoricoConversaoPapelDto {
  @IsNotEmpty({ message: 'ID do cidadão é obrigatório' })
  @IsUUID('4', { message: 'ID do cidadão inválido' })
  cidadao_id: string;

  @IsNotEmpty({ message: 'Papel anterior é obrigatório' })
  @IsEnum(TipoPapel, { message: 'Papel anterior inválido' })
  papel_anterior: PaperType;

  @IsNotEmpty({ message: 'Papel novo é obrigatório' })
  @IsEnum(TipoPapel, { message: 'Papel novo inválido' })
  papel_novo: PaperType;

  @IsOptional()
  @IsUUID('4', { message: 'ID da composição familiar inválido' })
  composicao_familiar_id?: string;

  @IsNotEmpty({ message: 'Justificativa é obrigatória' })
  @IsString({ message: 'Justificativa deve ser uma string' })
  justificativa: string;

  @IsOptional()
  @IsUUID('4', { message: 'ID do técnico notificado inválido' })
  tecnico_notificado_id?: string;
}
