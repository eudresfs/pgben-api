import {
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  MaxLength,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MotivoEncerramentoBeneficio } from '../../../enums/motivo-encerramento-beneficio.enum';
import { StatusVulnerabilidade } from '../../../enums/status-vulnerabilidade.enum';
import { CreateDocumentoComprobatorioDto } from './create-documento-comprobatorio.dto';

/**
 * DTO para criação de registro de resultado de benefício cessado.
 * 
 * Conforme Lei de Benefícios Eventuais do SUAS (Lei nº 8.742/1993),
 * este DTO estrutura as informações necessárias para documentar
 * adequadamente o encerramento de um benefício eventual.
 * 
 * Atende aos requisitos de registro estabelecidos pela LOAS e
 * regulamentações do Conselho Nacional de Assistência Social (CNAS).
 */
export class CreateResultadoBeneficioCessadoDto {
  @ApiProperty({
    description: 'ID da concessão que foi cessada',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsNotEmpty({ message: 'ID da concessão é obrigatório' })
  @IsUUID('4', { message: 'ID da concessão deve ser um UUID válido' })
  concessaoId: string;

  @ApiProperty({
    description: 'Motivo principal do encerramento do benefício',
    enum: MotivoEncerramentoBeneficio,
    example: MotivoEncerramentoBeneficio.SUPERACAO_VULNERABILIDADE,
  })
  @IsNotEmpty({ message: 'Motivo do encerramento é obrigatório' })
  @IsEnum(MotivoEncerramentoBeneficio, {
    message: 'Motivo do encerramento deve ser um valor válido',
  })
  motivoEncerramento: MotivoEncerramentoBeneficio;

  @ApiProperty({
    description: 'Descrição detalhada do motivo do encerramento',
    example: 'Família conseguiu emprego formal e renda suficiente para subsistência',
    maxLength: 1000,
  })
  @IsNotEmpty({ message: 'Descrição do motivo é obrigatória' })
  @IsString({ message: 'Descrição do motivo deve ser um texto' })
  @MaxLength(1000, {
    message: 'Descrição do motivo não pode exceder 1000 caracteres',
  })
  descricaoMotivo: string;

  @ApiProperty({
    description: 'Status atual da vulnerabilidade da família',
    enum: StatusVulnerabilidade,
    example: StatusVulnerabilidade.SUPERADA,
  })
  @IsNotEmpty({ message: 'Status da vulnerabilidade é obrigatório' })
  @IsEnum(StatusVulnerabilidade, {
    message: 'Status da vulnerabilidade deve ser um valor válido',
  })
  statusVulnerabilidade: StatusVulnerabilidade;

  @ApiProperty({
    description: 'Avaliação detalhada da situação de vulnerabilidade',
    example: 'Família demonstrou autonomia financeira e social, com condições adequadas de moradia e alimentação',
    maxLength: 1000,
  })
  @IsNotEmpty({ message: 'Avaliação da vulnerabilidade é obrigatória' })
  @IsString({ message: 'Avaliação da vulnerabilidade deve ser um texto' })
  @MaxLength(1000, {
    message: 'Avaliação da vulnerabilidade não pode exceder 1000 caracteres',
  })
  avaliacaoVulnerabilidade: string;

  @ApiPropertyOptional({
    description: 'Observações adicionais sobre o encerramento',
    example: 'Família foi encaminhada para acompanhamento no CRAS local',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Observações devem ser um texto' })
  @MaxLength(500, {
    message: 'Observações não podem exceder 500 caracteres',
  })
  observacoes?: string;

  @ApiProperty({
    description: 'Indica se há necessidade de acompanhamento posterior',
    example: true,
  })
  @IsNotEmpty({ message: 'Indicação de acompanhamento posterior é obrigatória' })
  @IsBoolean({ message: 'Acompanhamento posterior deve ser verdadeiro ou falso' })
  acompanhamentoPosterior: boolean;

  @ApiPropertyOptional({
    description: 'Detalhes sobre o acompanhamento posterior necessário',
    example: 'Acompanhamento trimestral no CRAS para verificação da manutenção da autonomia',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Detalhes do acompanhamento devem ser um texto' })
  @MaxLength(500, {
    message: 'Detalhes do acompanhamento não podem exceder 500 caracteres',
  })
  detalhesAcompanhamento?: string;

  @ApiPropertyOptional({
    description: 'Recomendações para a família ou outros serviços',
    example: 'Manter acompanhamento educacional das crianças e participação em grupos comunitários',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Recomendações devem ser um texto' })
  @MaxLength(500, {
    message: 'Recomendações não podem exceder 500 caracteres',
  })
  recomendacoes?: string;

  @ApiPropertyOptional({
    description: 'Lista de documentos comprobatórios (provas sociais)',
    type: [CreateDocumentoComprobatorioDto],
    minItems: 1,
    maxItems: 20,
  })
  @IsOptional()
  @IsArray({ message: 'Documentos comprobatórios devem ser uma lista' })
  @ArrayMaxSize(15, {
    message: 'Máximo de 15 documentos comprobatórios permitidos',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateDocumentoComprobatorioDto)
  documentosComprobatorios?: CreateDocumentoComprobatorioDto[];
}