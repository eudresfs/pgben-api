import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
} from 'typeorm';
import {
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsOptional,
  IsString,
  IsDate,
  IsBoolean,
  MaxLength,
  IsArray,
} from 'class-validator';
import { Concessao } from './concessao.entity';
import { Usuario } from './usuario.entity';
import { DocumentoComprobatorio } from './documento-comprobatorio.entity';
import { StatusVulnerabilidade } from '../enums/status-vulnerabilidade.enum';
import { MotivoEncerramentoBeneficio } from '../enums/motivo-encerramento-beneficio.enum';

/**
 * Entidade que registra o resultado de um benefício cessado.
 * 
 * Conforme Lei de Benefícios Eventuais do SUAS (Lei nº 8.742/1993 - LOAS),
 * esta entidade documenta as informações relevantes sobre o encerramento
 * do benefício, incluindo motivos, status da vulnerabilidade e provas sociais.
 * 
 * Atende aos requisitos da Lei nº 12.435/2011 e Decreto nº 6.307/2007
 * para documentação adequada dos benefícios eventuais.
 */
@Entity('resultado_beneficio_cessado')
@Index('idx_resultado_concessao_id', ['concessaoId'], { unique: true })
@Index('idx_resultado_data_registro', ['dataRegistro'])
@Index('idx_resultado_tecnico_responsavel', ['tecnicoResponsavelId'])
@Index('idx_resultado_status_vulnerabilidade', ['statusVulnerabilidade'])
export class ResultadoBeneficioCessado {
  /** Identificador único do registro de resultado */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Referência à concessão que foi cessada */
  @Column({ name: 'concessao_id', unique: true })
  @IsNotEmpty({ message: 'ID da concessão é obrigatório' })
  @IsUUID('4', { message: 'ID da concessão inválido' })
  concessaoId: string;

  @OneToOne(() => Concessao)
  @JoinColumn({ name: 'concessao_id' })
  concessao: Concessao;

  /** Técnico responsável pelo registro do resultado */
  @Column({ name: 'tecnico_responsavel_id' })
  @IsNotEmpty({ message: 'ID do técnico responsável é obrigatório' })
  @IsUUID('4', { message: 'ID do técnico responsável inválido' })
  tecnicoResponsavelId: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'tecnico_responsavel_id' })
  tecnicoResponsavel: Usuario;

  /** 
   * Documentos comprobatórios anexados ao resultado
   * Provas sociais como fotos e documentos conforme SUAS
   */
  @OneToMany(() => DocumentoComprobatorio, (documento) => documento.resultadoBeneficioCessado, {
    cascade: true,
    eager: false,
  })
  documentosComprobatorios: DocumentoComprobatorio[];

  /** Data de registro do resultado */
  @Column({ name: 'data_registro', type: 'timestamp' })
  @IsNotEmpty({ message: 'Data de registro é obrigatória' })
  @IsDate({ message: 'Data de registro inválida' })
  dataRegistro: Date;

  /** Tipo do motivo de encerramento conforme LOAS */
  @Column({
    name: 'tipo_motivo_encerramento',
    type: 'enum',
    enum: MotivoEncerramentoBeneficio,
    enumName: 'tipo_motivo_encerramento_enum',
  })
  @IsEnum(MotivoEncerramentoBeneficio, { 
    message: 'Tipo de motivo de encerramento inválido' 
  })
  tipoMotivoEncerramento: MotivoEncerramentoBeneficio;

  /** 
   * Descrição detalhada do motivo do encerramento
   * Conforme Art. 22 da LOAS - informações sobre a situação que gerou o encerramento
   */
  @Column({ name: 'motivo_detalhado', type: 'text' })
  @IsNotEmpty({ message: 'Motivo detalhado é obrigatório' })
  @IsString({ message: 'Motivo detalhado deve ser um texto' })
  @MaxLength(2000, { message: 'Motivo detalhado não pode exceder 2000 caracteres' })
  motivoDetalhado: string;

  /** 
   * Status da vulnerabilidade após cessação do benefício
   * Conforme Decreto nº 6.307/2007 - avaliação da superação da vulnerabilidade
   */
  @Column({
    name: 'status_vulnerabilidade',
    type: 'enum',
    enum: StatusVulnerabilidade,
    enumName: 'status_vulnerabilidade_enum',
  })
  @IsEnum(StatusVulnerabilidade, { 
    message: 'Status da vulnerabilidade inválido' 
  })
  statusVulnerabilidade: StatusVulnerabilidade;

  /** 
   * Descrição da situação atual da vulnerabilidade
   * Documenta se a vulnerabilidade foi superada e como
   */
  @Column({ name: 'descricao_vulnerabilidade', type: 'text' })
  @IsNotEmpty({ message: 'Descrição da vulnerabilidade é obrigatória' })
  @IsString({ message: 'Descrição da vulnerabilidade deve ser um texto' })
  @MaxLength(1500, { message: 'Descrição da vulnerabilidade não pode exceder 1500 caracteres' })
  descricaoVulnerabilidade: string;

  /** 
   * Indica se houve superação da vulnerabilidade temporária
   * Conforme LOAS Art. 22 - avaliação da autonomia e dignidade alcançadas
   */
  @Column({ name: 'vulnerabilidade_superada', type: 'boolean' })
  @IsBoolean({ message: 'Campo vulnerabilidade superada deve ser verdadeiro ou falso' })
  vulnerabilidadeSuperada: boolean;

  /** 
   * Observações técnicas sobre o caso
   * Avaliação técnica conforme NOB/SUAS
   */
  @Column({ name: 'observacoes_tecnicas', type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Observações técnicas devem ser um texto' })
  @MaxLength(1000, { message: 'Observações técnicas não podem exceder 1000 caracteres' })
  observacoesTecnicas: string | null;

  /** 
   * Recomendações para acompanhamento futuro
   * Orientações para continuidade do atendimento no SUAS
   */
  @Column({ name: 'recomendacoes_acompanhamento', type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Recomendações de acompanhamento devem ser um texto' })
  @MaxLength(1000, { message: 'Recomendações de acompanhamento não podem exceder 1000 caracteres' })
  recomendacoesAcompanhamento: string | null;

  /** 
   * Indica se o cidadão foi encaminhado para outros serviços do SUAS
   * Conforme integração do Sistema Único de Assistência Social
   */
  @Column({ name: 'encaminhado_outros_servicos', type: 'boolean', default: false })
  @IsBoolean({ message: 'Campo encaminhado para outros serviços deve ser verdadeiro ou falso' })
  encaminhadoOutrosServicos: boolean;

  /** 
   * Descrição dos serviços para os quais foi encaminhado
   * Detalhamento dos encaminhamentos realizados
   */
  @Column({ name: 'servicos_encaminhamento', type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Serviços de encaminhamento devem ser um texto' })
  @MaxLength(800, { message: 'Serviços de encaminhamento não podem exceder 800 caracteres' })
  servicosEncaminhamento: string | null;

  /** 
   * Avaliação da efetividade do benefício
   * Análise do impacto do benefício na situação da família
   */
  @Column({ name: 'avaliacao_efetividade', type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Avaliação de efetividade deve ser um texto' })
  @MaxLength(1200, { message: 'Avaliação de efetividade não pode exceder 1200 caracteres' })
  avaliacaoEfetividade: string | null;

  /** Campos de auditoria */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}