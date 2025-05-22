import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsString,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { TipoBeneficio } from './tipo-beneficio.entity';

/**
 * Enum para os tipos de entrega de cesta básica
 */
export enum TipoEntregaCestaBasica {
  PRESENCIAL = 'presencial',
  DOMICILIAR = 'domiciliar',
  CARTAO_ALIMENTACAO = 'cartao_alimentacao',
}

/**
 * Enum para os tipos de periodicidade de entrega
 */
export enum PeriodicidadeEntrega {
  UNICA = 'unica',
  MENSAL = 'mensal',
  BIMESTRAL = 'bimestral',
  TRIMESTRAL = 'trimestral',
  SEMESTRAL = 'semestral',
  ANUAL = 'anual',
}

/**
 * Enum para definir a periodicidade da cesta básica
 */
export enum PeriodicidadeCestaBasica {
  UNICA = 'unica',
  MENSAL = 'mensal',
  BIMESTRAL = 'bimestral',
  TRIMESTRAL = 'trimestral',
  SEMESTRAL = 'semestral',
}

/**
 * Entidade para armazenar as configurações específicas da Cesta Básica
 * 
 * Define os parâmetros e regras específicas para o benefício de cesta básica,
 * permitindo a parametrização dinâmica das regras de negócio.
 */
@Entity('especificacao_cesta_basica')
export class EspecificacaoCestaBasica {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Tipo de benefício é obrigatório' })
  @Index({ unique: true })
  tipo_beneficio_id: string;

  @ManyToOne(
    () => TipoBeneficio,
    { onDelete: 'CASCADE' }
  )
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipo_beneficio: TipoBeneficio;

  @Column({
    type: 'enum',
    enum: TipoEntregaCestaBasica,
    default: TipoEntregaCestaBasica.PRESENCIAL,
  })
  @IsEnum(TipoEntregaCestaBasica, { message: 'Tipo de entrega inválido' })
  tipo_entrega: TipoEntregaCestaBasica;
  
  @Column({
    type: 'enum',
    enum: PeriodicidadeEntrega,
    default: PeriodicidadeEntrega.UNICA,
  })
  @IsEnum(PeriodicidadeEntrega, { message: 'Periodicidade de entrega inválida' })
  periodicidade: PeriodicidadeEntrega;

  @Column({
    type: 'enum',
    enum: PeriodicidadeCestaBasica,
    default: PeriodicidadeCestaBasica.UNICA,
  })
  @IsEnum(PeriodicidadeCestaBasica, { message: 'Periodicidade inválida' })
  periodicidade_cesta: PeriodicidadeCestaBasica;

  @Column('int', { default: 1 })
  @IsNumber({}, { message: 'Quantidade de entregas deve ser um número' })
  @Min(1, { message: 'Quantidade de entregas deve ser maior que zero' })
  quantidade_entregas: number;

  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Exige comprovante de residência deve ser um booleano' })
  exige_comprovante_residencia: boolean;
  
  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Exige comprovação de vulnerabilidade deve ser um booleano' })
  exige_comprovacao_vulnerabilidade: boolean;
  
  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Permite substituição de itens deve ser um booleano' })
  permite_substituicao_itens: boolean;
  
  @Column({ type: 'simple-json', nullable: true })
  @IsOptional()
  @IsArray({ message: 'Itens obrigatórios deve ser um array' })
  itens_obrigatorios: string[];
  
  @Column({ type: 'simple-json', nullable: true })
  @IsOptional()
  @IsArray({ message: 'Itens opcionais deve ser um array' })
  itens_opcionais: string[];
  
  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString({ message: 'Local de entrega deve ser uma string' })
  local_entrega: string;
  
  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString({ message: 'Horário de entrega deve ser uma string' })
  horario_entrega: string;
  
  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Exige agendamento deve ser um booleano' })
  exige_agendamento: boolean;

  @Column('boolean', { default: true })
  @IsBoolean({ message: 'Requer comprovante de renda deve ser um booleano' })
  requer_comprovante_renda: boolean;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Renda máxima per capita deve ser um número' })
  @Min(0, { message: 'Renda máxima per capita deve ser maior ou igual a zero' })
  renda_maxima_per_capita: number;

  @Column('int', { nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Quantidade mínima de dependentes deve ser um número' })
  @Min(0, { message: 'Quantidade mínima de dependentes deve ser maior ou igual a zero' })
  quantidade_minima_dependentes: number;

  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Prioriza famílias com crianças deve ser um booleano' })
  prioriza_familias_com_criancas: boolean;

  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Prioriza idosos deve ser um booleano' })
  prioriza_idosos: boolean;

  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Prioriza pessoas com deficiência deve ser um booleano' })
  prioriza_pcd: boolean;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Valor da cesta deve ser um número' })
  @Min(0, { message: 'Valor da cesta deve ser maior ou igual a zero' })
  valor_cesta: number;



  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
