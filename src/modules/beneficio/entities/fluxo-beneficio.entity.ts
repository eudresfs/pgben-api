import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';
import { TipoBeneficio } from './tipo-beneficio.entity';

export enum TipoEtapa {
  ABERTURA = 'abertura',
  ANALISE_DOCUMENTOS = 'analise_documentos',
  ANALISE_TECNICA = 'analise_tecnica',
  APROVACAO = 'aprovacao',
  LIBERACAO = 'liberacao',
}

export enum PerfilResponsavel {
  TECNICO_UNIDADE = 'tecnico_unidade',
  TECNICO_SEMTAS = 'tecnico_semtas',
  GESTOR_SEMTAS = 'gestor_semtas',
  ADMIN = 'admin',
}

@Entity('fluxo_beneficio')
@Index(['tipo_beneficio_id', 'ordem'], { unique: true })
export class FluxoBeneficio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Tipo de benefício é obrigatório' })
  tipo_beneficio_id: string;

  @ManyToOne(() => TipoBeneficio, (tipoBeneficio) => tipoBeneficio.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipo_beneficio: TipoBeneficio;

  @Column()
  @IsNotEmpty({ message: 'Nome da etapa é obrigatório' })
  nome_etapa: string;

  @Column({
    type: 'enum',
    enum: TipoEtapa,
    enumName: 'tipo_etapa',
  })
  @IsNotEmpty({ message: 'Tipo de etapa é obrigatório' })
  @IsEnum(TipoEtapa, { message: 'Tipo de etapa inválido' })
  tipo_etapa: TipoEtapa;

  @Column()
  @IsNumber({}, { message: 'Ordem deve ser um número' })
  @Min(1, { message: 'Ordem deve ser maior que zero' })
  ordem: number;

  @Column({
    type: 'enum',
    enum: PerfilResponsavel,
    enumName: 'perfil_responsavel',
  })
  @IsNotEmpty({ message: 'Perfil responsável é obrigatório' })
  @IsEnum(PerfilResponsavel, { message: 'Perfil responsável inválido' })
  perfil_responsavel: PerfilResponsavel;

  @Column({ nullable: true })
  @IsOptional()
  setor_id: string;

  @Column('text', { nullable: true })
  @IsOptional()
  descricao: string;

  @Column({ default: true })
  obrigatorio: boolean;

  @Column({ default: false })
  permite_retorno: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
