import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';

/**
 * DTO para criação de requisito documental
 * 
 * Define os documentos necessários para solicitação de um benefício
 */
export class CreateRequisitoDocumentoDto {
  @ApiProperty({ 
    description: 'Nome do documento requerido', 
    example: 'Comprovante de Residência' 
  })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @IsString({ message: 'Nome deve ser um texto' })
  @MaxLength(100, { message: 'Nome não pode ter mais de 100 caracteres' })
  nome: string;

  @ApiProperty({ 
    description: 'Descrição do documento e suas especificações',
    example: 'Comprovante de residência dos últimos 3 meses (conta de água, luz ou telefone)'
  })
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  @IsString({ message: 'Descrição deve ser um texto' })
  descricao: string;

  @ApiProperty({ 
    description: 'Indica se o documento é obrigatório para a solicitação',
    default: true
  })
  @IsBoolean({ message: 'Obrigatoriedade deve ser um booleano' })
  obrigatorio: boolean;

  @ApiPropertyOptional({ 
    description: 'Observações adicionais sobre o documento',
    example: 'Caso não possua comprovante em seu nome, apresentar declaração do titular'
  })
  @IsOptional()
  @IsString({ message: 'Observações devem ser um texto' })
  observacoes?: string;
}
