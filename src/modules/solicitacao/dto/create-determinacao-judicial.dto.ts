import { IsNotEmpty, IsOptional, IsString, IsUUID, IsDate, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para criação de determinação judicial no contexto de solicitação
 */
export class SolicitacaoCreateDeterminacaoJudicialDto {
  @IsNotEmpty({ message: 'ID da solicitação é obrigatório' })
  @IsUUID('4', { message: 'ID da solicitação inválido' })
  solicitacao_id: string;

  @IsNotEmpty({ message: 'Número do processo é obrigatório' })
  @IsString({ message: 'Número do processo deve ser uma string' })
  numero_processo: string;

  @IsNotEmpty({ message: 'Órgão judicial é obrigatório' })
  @IsString({ message: 'Órgão judicial deve ser uma string' })
  orgao_judicial: string;

  @IsNotEmpty({ message: 'Comarca é obrigatória' })
  @IsString({ message: 'Comarca deve ser uma string' })
  comarca: string;

  @IsNotEmpty({ message: 'Juiz é obrigatório' })
  @IsString({ message: 'Juiz deve ser uma string' })
  juiz: string;

  @IsNotEmpty({ message: 'Data da decisão é obrigatória' })
  @IsDate({ message: 'Data da decisão deve ser uma data válida' })
  @Type(() => Date)
  data_decisao: Date;

  @IsNotEmpty({ message: 'Descrição da decisão é obrigatória' })
  @IsString({ message: 'Descrição da decisão deve ser uma string' })
  descricao_decisao: string;

  @IsOptional()
  @IsDate({ message: 'Prazo de cumprimento deve ser uma data válida' })
  @Type(() => Date)
  prazo_cumprimento?: Date;

  @IsOptional()
  @IsString({ message: 'Observações devem ser uma string' })
  observacoes?: string;

  @IsOptional()
  @IsUrl({}, { message: 'URL do documento deve ser uma URL válida' })
  documento_url?: string;
}
