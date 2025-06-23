import { IsUUID, IsNotEmpty, IsOptional, IsBoolean, IsDateString, IsInt, Min } from 'class-validator';

export class CreateConcessaoDto {
  @IsUUID('4')
  @IsNotEmpty()
  solicitacaoId: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  ordemPrioridade?: number;

  @IsBoolean()
  @IsOptional()
  determinacaoJudicialFlag?: boolean;

  @IsDateString()
  @IsOptional()
  dataInicio?: string;
}
