import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import {
  IsNotEmpty,
  IsOptional,
  Length,
  IsString,
  IsDateString,
} from 'class-validator';
import { Cidadao } from './cidadao.entity';

/**
 * Entidade que representa um endereço de um cidadão.
 * Mantém histórico completo usando vigência (data_inicio_vigencia / data_fim_vigencia).
 * Se `data_fim_vigencia` for NULL, o endereço é considerado o atual.
 */
@Entity('endereco')
@Index(['cidadao_id', 'data_fim_vigencia'])
export class Endereco {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK para o cidadão */
  @Column()
  cidadao_id: string;

  @ManyToOne(() => Cidadao, { eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cidadao_id' })
  cidadao: Cidadao;

  @Column()
  @IsNotEmpty({ message: 'Logradouro é obrigatório' })
  @IsString()
  logradouro: string;

  @Column()
  @IsNotEmpty({ message: 'Número é obrigatório' })
  numero: string;

  @Column({ nullable: true })
  @IsOptional()
  complemento: string;

  @Column()
  @IsNotEmpty({ message: 'Bairro é obrigatório' })
  bairro: string;

  @Column()
  @IsNotEmpty({ message: 'Cidade é obrigatória' })
  cidade: string;

  @Column({ length: 2 })
  @Length(2, 2, { message: 'Estado deve conter UF com 2 caracteres' })
  estado: string;

  @Column({ length: 8 })
  @Length(8, 8, { message: 'CEP deve conter 8 dígitos' })
  cep: string;

  @Column({ nullable: true })
  @IsOptional()
  ponto_referencia: string;

  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  tempo_de_residencia: number;

  @Column({ type: 'date', name: 'data_inicio_vigencia' })
  @IsDateString()
  data_inicio_vigencia: string;

  @Column({ type: 'date', name: 'data_fim_vigencia', nullable: true })
  @IsOptional()
  @IsDateString()
  data_fim_vigencia: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
