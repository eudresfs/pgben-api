import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateResultadoBeneficioCessadoDto } from './create-resultado-beneficio-cessado.dto';

/**
 * DTO para criação de resultado de benefício cessado com arquivos separados.
 * 
 * Estende o DTO base incluindo validação específica para arquivos
 * de prova social e documentação técnica conforme exigências do SUAS.
 */
export class CreateResultadoBeneficioCessadoWithFilesDto extends CreateResultadoBeneficioCessadoDto {
  /**
   * Arquivos de prova social (fotos e testemunhos do cidadão).
   * 
   * Incluem fotografias que comprovem a situação atual da família,
   * testemunhos de vizinhos ou líderes comunitários, e outros
   * documentos que evidenciem a condição social relatada.
   * 
   * Limitado a 5 arquivos por solicitação.
   */
  @ApiProperty({
    description: 'Arquivos de prova social (fotos e testemunhos)',
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    required: false,
    maxItems: 5,
    example: ['foto_moradia.jpg', 'testemunho_vizinho.pdf'],
  })
  @IsOptional()
  @IsArray()
  provaSocial?: Express.Multer.File[];

  /**
   * Arquivos de documentação técnica (laudos, entrevistas e relatórios).
   * 
   * Incluem relatórios técnicos elaborados pela equipe do SUAS,
   * laudos médicos ou psicológicos, atas de entrevistas,
   * e outros documentos técnicos especializados.
   * 
   * Limitado a 10 arquivos por solicitação.
   */
  @ApiProperty({
    description: 'Arquivos de documentação técnica (laudos, relatórios)',
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    required: false,
    maxItems: 10,
    example: ['relatorio_tecnico.pdf', 'laudo_medico.pdf', 'ata_entrevista.docx'],
  })
  @IsOptional()
  @IsArray()
  documentacaoTecnica?: Express.Multer.File[];
}

/**
 * Interface para tipagem dos arquivos recebidos no controller.
 */
export interface ResultadoUploadedFiles {
  provaSocial?: Express.Multer.File[];
  documentacaoTecnica?: Express.Multer.File[];
}