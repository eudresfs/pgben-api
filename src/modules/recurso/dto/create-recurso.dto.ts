import {
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para criação de um recurso de primeira instância
 */
export class CreateRecursoDto {
  /**
   * ID da solicitação que está sendo contestada
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @IsUUID()
  @IsNotEmpty({ message: 'ID da solicitação é obrigatório' })
  solicitacao_id: string;

  /**
   * Justificativa para o recurso
   * @example "Discordo da decisão pois apresentei todos os documentos necessários."
   */
  @IsString()
  @IsNotEmpty({ message: 'Justificativa é obrigatória' })
  justificativa: string;

  /**
   * Documentos adicionais para análise do recurso
   */
  @IsOptional()
  @IsArray()
  documentos?: {
    nome: string;
    tipo: string;
    conteudo: string;
  }[];

  /**
   * Motivo do indeferimento original (preenchido automaticamente pelo sistema)
   */
  @IsOptional()
  @IsString()
  motivo_indeferimento?: string;

  /**
   * ID do setor responsável pela análise (preenchido automaticamente pelo sistema)
   */
  @IsOptional()
  @IsUUID()
  setor_responsavel_id?: string;
}
