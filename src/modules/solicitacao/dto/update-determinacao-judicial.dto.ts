import { IsOptional, IsString, IsDate, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para atualização de determinação judicial no contexto de solicitação
 */
export class SolicitacaoUpdateDeterminacaoJudicialDto {
  @IsOptional()
  @IsString({ message: 'Número do processo deve ser uma string' })
  numero_processo?: string;

  @IsOptional()
  @IsString({ message: 'Órgão judicial deve ser uma string' })
  orgao_judicial?: string;

  @IsOptional()
  @IsString({ message: 'Comarca deve ser uma string' })
  comarca?: string;

  @IsOptional()
  @IsString({ message: 'Juiz deve ser uma string' })
  juiz?: string;

  @IsOptional()
  @IsDate({ message: 'Data da decisão deve ser uma data válida' })
  @Type(() => Date)
  data_decisao?: Date;

  @IsOptional()
  @IsString({ message: 'Descrição da decisão deve ser uma string' })
  descricao_decisao?: string;

  @IsOptional()
  @IsDate({ message: 'Prazo de cumprimento deve ser uma data válida' })
  @Type(() => Date)
  prazo_cumprimento?: Date;

  @IsOptional()
  @IsDate({ message: 'Data de cumprimento deve ser uma data válida' })
  @Type(() => Date)
  data_cumprimento?: Date;

  @IsOptional()
  @IsString({ message: 'Observações devem ser uma string' })
  observacoes?: string;

  @IsOptional()
  @IsUrl({}, { message: 'URL do documento deve ser uma URL válida' })
  documento_url?: string;
}
