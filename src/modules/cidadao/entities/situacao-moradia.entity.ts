import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';
import { Cidadao } from './cidadao.entity';

export enum TipoMoradiaEnum {
  PROPRIA = 'propria',
  ALUGADA = 'alugada',
  CEDIDA = 'cedida',
  OCUPACAO = 'ocupacao',
  SITUACAO_RUA = 'situacao_rua',
  ABRIGO = 'abrigo',
  OUTRO = 'outro',
}

@Entity('situacao_moradia')
@Index(['cidadao_id'], { unique: true })
export class SituacaoMoradia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'ID do cidadão é obrigatório' })
  cidadao_id: string;

  @OneToOne(() => Cidadao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cidadao_id' })
  cidadao: Cidadao;

  @Column({
    type: 'enum',
    enum: TipoMoradiaEnum,
    enumName: 'tipo_moradia_enum',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(TipoMoradiaEnum, { message: 'Tipo de moradia inválido' })
  tipo_moradia: TipoMoradiaEnum;

  @Column({ nullable: true })
  @IsOptional()
  numero_comodos: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Valor do aluguel deve ser um número' })
  @Min(0, { message: 'Valor do aluguel não pode ser negativo' })
  valor_aluguel: number;

  @Column({ nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Tempo de moradia deve ser um número' })
  tempo_moradia: number;

  @Column({ nullable: true })
  @IsOptional()
  possui_banheiro: boolean;

  @Column({ nullable: true })
  @IsOptional()
  possui_energia_eletrica: boolean;

  @Column({ nullable: true })
  @IsOptional()
  possui_agua_encanada: boolean;

  @Column({ nullable: true })
  @IsOptional()
  possui_coleta_lixo: boolean;

  @Column({ nullable: true })
  @IsOptional()
  observacoes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
