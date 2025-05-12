import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { TipoBeneficio } from './tipo-beneficio.entity';

export enum TipoDocumento {
  RG = 'rg',
  CPF = 'cpf',
  COMPROVANTE_RESIDENCIA = 'comprovante_residencia',
  COMPROVANTE_RENDA = 'comprovante_renda',
  CERTIDAO_NASCIMENTO = 'certidao_nascimento',
  DECLARACAO_MEDICA = 'declaracao_medica',
  CONTRATO_ALUGUEL = 'contrato_aluguel',
  OUTRO = 'outro',
}

@Entity('requisitos_documento')
@Index(['tipo_beneficio_id', 'tipo_documento'], { unique: true })
export class RequisitoDocumento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Tipo de benefício é obrigatório' })
  tipo_beneficio_id: string;

  @ManyToOne(() => TipoBeneficio, tipoBeneficio => tipoBeneficio.requisitos_documentos)
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipo_beneficio: TipoBeneficio;

  @Column({
    type: 'enum',
    enum: TipoDocumento
  })
  @IsNotEmpty({ message: 'Tipo de documento é obrigatório' })
  tipo_documento: TipoDocumento;

  @Column({ default: true })
  obrigatorio: boolean;

  @Column('text', { nullable: true })
  descricao: string;

  @Column('jsonb', { nullable: true })
  validacoes: {
    formato?: string[];
    tamanho_maximo?: number;
    validade_maxima?: number;
  };

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}