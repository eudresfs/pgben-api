import { IsNotEmpty, IsOptional, IsUUID, IsString, IsEnum } from 'class-validator';
import { StatusRecurso } from '../../../entities/recurso.entity';

/**
 * DTO para análise de um recurso
 */
export class AnalisarRecursoDto {
  /**
   * Novo status do recurso
   * @example "deferido"
   */
  @IsEnum(StatusRecurso, { message: 'Status inválido' })
  @IsNotEmpty({ message: 'Status é obrigatório' })
  status: StatusRecurso;

  /**
   * Parecer da análise
   * @example "Após análise da documentação, verificou-se que o beneficiário atende aos requisitos."
   */
  @IsString()
  @IsNotEmpty({ message: 'Parecer é obrigatório' })
  parecer: string;

  /**
   * Observação adicional (opcional)
   * @example "Encaminhar para setor responsável para providências."
   */
  @IsOptional()
  @IsString()
  observacao?: string;
}
