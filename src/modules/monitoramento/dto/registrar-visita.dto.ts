import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsNumber,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ParentescoEnum,
  ResultadoVisita,
  TipoVisita,
} from '../../../enums';

/**
 * DTO para registro de visita domiciliar realizada
 * 
 * @description
 * Define os dados necessários para registrar uma visita domiciliar
 * que foi executada, incluindo todas as avaliações e observações.
 * 
 * @author Sistema PGBEN
 * @since 2025-01-15
 */
export class RegistrarVisitaDto {
  /**
   * ID do agendamento que originou esta visita
   */
  @ApiProperty({
    description: 'ID do agendamento que originou esta visita',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsNotEmpty({ message: 'ID do agendamento é obrigatório' })
  @IsUUID('4', { message: 'ID do agendamento deve ser um UUID válido' })
  agendamento_id: string;

  /**
   * Data e hora em que a visita foi realizada
   */
  @ApiProperty({
    description: 'Data e hora em que a visita foi efetivamente realizada',
    example: '2025-01-20T15:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  @IsNotEmpty({ message: 'Data e hora da visita são obrigatórias' })
  @IsDateString({}, { message: 'Data e hora devem estar em formato válido' })
  data_visita: string;

  /**
   * Tipo da visita realizada
   */
  @ApiProperty({
    description: 'Tipo da visita que foi realizada',
    enum: TipoVisita,
    example: TipoVisita.CONTINUIDADE,
    enumName: 'TipoVisita',
  })
  @IsNotEmpty({ message: 'Tipo da visita é obrigatório' })
  @IsEnum(TipoVisita, { message: 'Tipo de visita inválido' })
  tipo_visita: TipoVisita;

  /**
   * Resultado da avaliação da visita
   */
  @ApiProperty({
    description: 'Resultado da avaliação realizada durante a visita',
    enum: ResultadoVisita,
    example: ResultadoVisita.CONFORME,
    enumName: 'ResultadoVisita',
  })
  @IsNotEmpty({ message: 'Resultado da visita é obrigatório' })
  @IsEnum(ResultadoVisita, { message: 'Resultado da visita inválido' })
  resultado: ResultadoVisita;

  /**
   * Indica se o beneficiário estava presente
   */
  @ApiProperty({
    description: 'Indica se o beneficiário estava presente durante a visita',
    example: true,
  })
  @IsNotEmpty({ message: 'Informação sobre presença do beneficiário é obrigatória' })
  @IsBoolean({ message: 'Campo de presença deve ser verdadeiro ou falso' })
  beneficiario_presente: boolean;

  /**
   * Nome da pessoa que atendeu (se não foi o beneficiário)
   */
  @ApiPropertyOptional({
    description: 'Nome da pessoa que atendeu a visita (se não foi o beneficiário)',
    example: 'Maria Silva (mãe)',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Nome da pessoa que atendeu deve ser um texto' })
  @MaxLength(255, {
    message: 'Nome da pessoa que atendeu deve ter no máximo 255 caracteres',
  })
  pessoa_atendeu?: string;

  /**
   * Relação da pessoa que atendeu com o beneficiário
   */
  @ApiPropertyOptional({
    description: 'Relação da pessoa que atendeu com o beneficiário',
    example: ParentescoEnum.MAE,
    enum: ParentescoEnum,
  })
  @IsOptional()
  @IsEnum(ParentescoEnum, {
    message: 'Relação deve ser um valor válido do enum ParentescoEnum',
  })
  relacao_pessoa_atendeu?: ParentescoEnum;


  /**
   * Endereço onde foi realizada a visita
   */
  @ApiProperty({
    description: 'Endereço onde a visita foi efetivamente realizada',
    example: 'Rua das Flores, 123, Apt 45 - Bairro Centro - Natal/RN',
    maxLength: 500,
  })
  @IsNotEmpty({ message: 'Endereço visitado é obrigatório' })
  @IsString({ message: 'Endereço visitado deve ser um texto' })
  @MaxLength(500, {
    message: 'Endereço visitado deve ter no máximo 500 caracteres',
  })
  endereco_visitado: string;

  /**
   * Avaliação das condições habitacionais
   */
  @ApiPropertyOptional({
    description: 'Avaliação detalhada das condições habitacionais encontradas',
    example: 'Casa em bom estado de conservação, com saneamento básico adequado. Ambiente limpo e organizado.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'Condições habitacionais devem ser um texto' })
  @MaxLength(2000, {
    message: 'Condições habitacionais devem ter no máximo 2000 caracteres',
  })
  condicoes_habitacionais?: string;

  /**
   * Avaliação da situação socioeconômica
   */
  @ApiPropertyOptional({
    description: 'Avaliação da situação socioeconômica atual da família',
    example: 'Família mantém situação de vulnerabilidade. Beneficiário desempregado, renda familiar limitada ao benefício.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'Situação socioeconômica deve ser um texto' })
  @MaxLength(2000, {
    message: 'Situação socioeconômica deve ter no máximo 2000 caracteres',
  })
  situacao_socioeconomica?: string;

  /**
   * Composição familiar observada
   */
  @ApiPropertyOptional({
    description: 'Observações sobre a composição familiar atual',
    example: 'Beneficiário reside com esposa e 2 filhos menores. Todos presentes durante a visita.',
    maxLength: 1500,
  })
  @IsOptional()
  @IsString({ message: 'Composição familiar deve ser um texto' })
  @MaxLength(1500, {
    message: 'Composição familiar deve ter no máximo 1500 caracteres',
  })
  composicao_familiar_observada?: string;

  /**
   * Verificação dos critérios de elegibilidade
   */
  @ApiPropertyOptional({
    description: 'Indica se os critérios de elegibilidade para o benefício estão sendo mantidos',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Campo de critérios deve ser verdadeiro ou falso' })
  criterios_elegibilidade_mantidos?: boolean;

  /**
   * Observações sobre os critérios de elegibilidade
   */
  @ApiPropertyOptional({
    description: 'Observações detalhadas sobre a verificação dos critérios de elegibilidade',
    example: 'Todos os critérios mantidos. Situação de vulnerabilidade permanece inalterada.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Observações dos critérios devem ser um texto' })
  @MaxLength(1000, {
    message: 'Observações dos critérios devem ter no máximo 1000 caracteres',
  })
  observacoes_criterios?: string;

  /**
   * Necessidades identificadas
   */
  @ApiPropertyOptional({
    description: 'Necessidades ou demandas identificadas durante a visita',
    example: 'Necessidade de acompanhamento psicológico para a criança. Orientação sobre programas de qualificação profissional.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'Necessidades identificadas devem ser um texto' })
  @MaxLength(2000, {
    message: 'Necessidades identificadas devem ter no máximo 2000 caracteres',
  })
  necessidades_identificadas?: string;

  /**
   * Encaminhamentos realizados
   */
  @ApiPropertyOptional({
    description: 'Encaminhamentos realizados ou orientações fornecidas',
    example: 'Encaminhado para CAPS infantil. Orientado sobre inscrição em cursos do SENAC.',
    maxLength: 1500,
  })
  @IsOptional()
  @IsString({ message: 'Encaminhamentos devem ser um texto' })
  @MaxLength(1500, {
    message: 'Encaminhamentos devem ter no máximo 1500 caracteres',
  })
  encaminhamentos_realizados?: string;

  /**
   * Recomendações para próximas visitas
   */
  @ApiPropertyOptional({
    description: 'Recomendações ou orientações para futuras visitas',
    example: 'Acompanhar evolução do tratamento psicológico. Verificar inserção em programa de qualificação.',
    maxLength: 1500,
  })
  @IsOptional()
  @IsString({ message: 'Recomendações devem ser um texto' })
  @MaxLength(1500, {
    message: 'Recomendações devem ter no máximo 1500 caracteres',
  })
  recomendacoes?: string;

  /**
   * Parecer técnico sobre a manutenção do benefício
   */
  @ApiPropertyOptional({
    description: 'Parecer técnico fundamentado sobre a continuidade do benefício',
    example: 'Recomenda-se a manutenção do benefício por mais 3 meses, considerando a situação de vulnerabilidade persistente.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'Parecer técnico deve ser um texto' })
  @MaxLength(2000, {
    message: 'Parecer técnico deve ter no máximo 2000 caracteres',
  })
  parecer_tecnico?: string;

  /**
   * Recomendação sobre renovação do benefício
   */
  @ApiPropertyOptional({
    description: 'Indica se recomenda a renovação do benefício',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Campo de recomendação deve ser verdadeiro ou falso' })
  recomenda_renovacao?: boolean;

  /**
   * Justificativa da recomendação
   */
  @ApiPropertyOptional({
    description: 'Justificativa detalhada da recomendação sobre renovação',
    example: 'Situação de vulnerabilidade mantida. Família ainda não conseguiu autonomia financeira.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Justificativa deve ser um texto' })
  @MaxLength(1000, {
    message: 'Justificativa deve ter no máximo 1000 caracteres',
  })
  justificativa_recomendacao?: string;

  /**
   * Nota de avaliação geral (1-10)
   */
  @ApiPropertyOptional({
    description: 'Nota de avaliação geral da situação (escala de 1 a 10)',
    example: 7,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Nota deve ser um número' })
  @Min(1, { message: 'Nota mínima é 1' })
  @Max(10, { message: 'Nota máxima é 10' })
  nota_avaliacao?: number;

  /**
   * Observações gerais da visita
   */
  @ApiPropertyOptional({
    description: 'Observações gerais sobre a visita realizada',
    example: 'Visita transcorreu sem intercorrências. Família receptiva e colaborativa.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'Observações gerais devem ser um texto' })
  @MaxLength(2000, {
    message: 'Observações gerais devem ter no máximo 2000 caracteres',
  })
  observacoes_gerais?: string;

  /**
   * Motivo da não realização (se aplicável)
   */
  @ApiPropertyOptional({
    description: 'Motivo pelo qual a visita não foi realizada (quando aplicável)',
    example: 'Beneficiário não estava em casa após 3 tentativas de contato',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Motivo da não realização deve ser um texto' })
  @MaxLength(500, {
    message: 'Motivo da não realização deve ter no máximo 500 caracteres',
  })
  motivo_nao_realizacao?: string;

  /**
   * Indica se há necessidade de nova visita
   */
  @ApiProperty({
    description: 'Indica se há necessidade de agendar uma nova visita',
    example: false,
    default: false,
  })
  @IsBoolean({ message: 'Campo de nova visita deve ser verdadeiro ou falso' })
  necessita_nova_visita: boolean = false;

  /**
   * Prazo sugerido para próxima visita (em dias)
   */
  @ApiPropertyOptional({
    description: 'Prazo sugerido para a próxima visita (em dias)',
    example: 30,
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Prazo deve ser um número' })
  @Min(1, { message: 'Prazo mínimo é 1 dia' })
  @Max(365, { message: 'Prazo máximo é 365 dias' })
  prazo_proxima_visita?: number;

  /**
   * Dados complementares em formato livre
   */
  @ApiPropertyOptional({
    description: 'Dados complementares específicos da visita',
    example: {
      fotos_anexadas: ['foto1.jpg', 'foto2.jpg'],
      documentos_coletados: ['comprovante_renda.pdf'],
      observacoes_tecnicas: 'Verificar situação em 15 dias'
    },
  })
  @IsOptional()
  dados_complementares?: Record<string, any>;
}