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
  IsString,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { TipoBeneficio } from './tipo-beneficio.entity';

/**
 * Enum para os tipos de urna funerária
 */
export enum TipoUrnaFuneraria {
  PADRAO = 'padrao',
  ESPECIAL = 'especial',
  INFANTIL = 'infantil',
  OBESO = 'obeso'
}

/**
 * Entidade para armazenar as configurações específicas do Auxílio Funeral
 * 
 * Define os parâmetros e regras específicas para o benefício de auxílio funeral,
 * permitindo a parametrização dinâmica das regras de negócio.
 */
@Entity('especificacao_funeral')
export class EspecificacaoFuneral {
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

  @Column('int')
  @IsNumber({}, { message: 'Prazo máximo após óbito deve ser um número' })
  @Min(1, { message: 'Prazo máximo após óbito deve ser maior que zero' })
  @Max(365, { message: 'Prazo máximo após óbito deve ser menor que 365 dias' })
  prazo_maximo_apos_obito: number;

  @Column('boolean', { default: true })
  @IsBoolean({ message: 'Requer certidão de óbito deve ser um booleano' })
  requer_certidao_obito: boolean;

  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Requer comprovante de residência deve ser um booleano' })
  requer_comprovante_residencia: boolean;

  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Requer comprovante de vínculo familiar deve ser um booleano' })
  requer_comprovante_vinculo_familiar: boolean;

  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Requer comprovante de despesas funerárias deve ser um booleano' })
  requer_comprovante_despesas: boolean;

  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Permite reembolso deve ser um booleano' })
  permite_reembolso: boolean;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Valor máximo de reembolso deve ser um número' })
  @Min(0, { message: 'Valor máximo de reembolso deve ser maior ou igual a zero' })
  valor_maximo_reembolso: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Valor fixo deve ser um número' })
  @Min(0, { message: 'Valor fixo deve ser maior ou igual a zero' })
  valor_fixo: number;

  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Inclui translado deve ser um booleano' })
  inclui_translado: boolean;

  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Inclui isenção de taxas deve ser um booleano' })
  inclui_isencao_taxas: boolean;

  @Column('boolean', { default: true })
  @IsBoolean({ message: 'Limitado ao município deve ser um booleano' })
  limitado_ao_municipio: boolean;

  @Column('boolean', { default: true })
  @IsBoolean({ message: 'Inclui urna funerária deve ser um booleano' })
  inclui_urna_funeraria: boolean;

  @Column('boolean', { default: true })
  @IsBoolean({ message: 'Inclui edredom fúnebre deve ser um booleano' })
  inclui_edredom_funebre: boolean;

  @Column('boolean', { default: true })
  @IsBoolean({ message: 'Inclui despesas de sepultamento deve ser um booleano' })
  inclui_despesas_sepultamento: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString({ message: 'Serviço de sobreaviso deve ser uma string' })
  servico_sobreaviso: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Valor máximo deve ser um número' })
  @Min(0, { message: 'Valor máximo deve ser maior ou igual a zero' })
  valor_maximo: number;

  @Column('boolean', { default: true })
  @IsBoolean({ message: 'Permite cremação deve ser um booleano' })
  permite_cremacao: boolean;

  @Column('boolean', { default: true })
  @IsBoolean({ message: 'Permite sepultamento deve ser um booleano' })
  permite_sepultamento: boolean;

  @Column('simple-array', { nullable: true })
  @IsArray({ message: 'Documentos necessários deve ser um array' })
  @IsString({ each: true, message: 'Cada documento deve ser uma string' })
  @IsNotEmpty({ each: true, message: 'Cada documento não pode estar vazio' })
  documentos_necessarios: string[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
