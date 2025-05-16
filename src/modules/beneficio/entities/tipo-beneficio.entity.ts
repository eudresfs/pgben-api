import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index
} from 'typeorm';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Solicitacao } from '../../solicitacao/entities/solicitacao.entity';
import { RequisitoDocumento } from './requisito-documento.entity';
import { CampoDinamicoBeneficio } from './campo-dinamico-beneficio.entity';

export enum Periodicidade {
  UNICO = 'unico',
  MENSAL = 'mensal',
  TRIMESTRAL = 'trimestral',
  SEMESTRAL = 'semestral',
  ANUAL = 'anual',
}

@Entity('tipos_beneficio')
@Index(['nome'], { unique: true })
export class TipoBeneficio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  nome: string;

  @Column('text')
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  descricao: string;

  @Column({
    type: 'enum',
    enum: Periodicidade,
    default: Periodicidade.UNICO
  })
  periodicidade: Periodicidade;

  @Column('text')
  @IsNotEmpty({ message: 'Base jurídica é obrigatória' })
  base_juridica: string;

  @Column('decimal', { precision: 10, scale: 2 })
  @IsNumber({}, { message: 'Valor deve ser um número' })
  @Min(0, { message: 'Valor não pode ser negativo' })
  valor: number;

  @Column({ default: true })
  ativo: boolean;

  @Column('jsonb', { nullable: true })
  criterios_elegibilidade: {
    idade_minima?: number;
    idade_maxima?: number;
    renda_maxima?: number;
    tempo_minimo_residencia?: number;
    outros?: string[];
  };

  @OneToMany(() => RequisitoDocumento, requisito => requisito.tipo_beneficio)
  requisitos_documentos: RequisitoDocumento[];

  @OneToMany(() => CampoDinamicoBeneficio, campo => campo.tipo_beneficio)
  campos_dinamicos: CampoDinamicoBeneficio[];

  @OneToMany(() => Solicitacao, solicitacao => solicitacao.tipo_beneficio)
  solicitacao: Solicitacao[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}