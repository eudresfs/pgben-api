import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToOne,
  JoinColumn,
  Index
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

export enum TipoConstrucaoEnum {
  ALVENARIA = 'alvenaria',
  MADEIRA = 'madeira',
  MISTA = 'mista',
  TAIPA = 'taipa',
  PALAFITA = 'palafita',
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
    nullable: true
  })
  @IsOptional()
  @IsEnum(TipoMoradiaEnum, { message: 'Tipo de moradia inválido' })
  tipo_moradia: TipoMoradiaEnum;

  @Column({
    type: 'enum',
    enum: TipoConstrucaoEnum,
    nullable: true
  })
  @IsOptional()
  @IsEnum(TipoConstrucaoEnum, { message: 'Tipo de construção inválido' })
  tipo_construcao: TipoConstrucaoEnum;

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
  tempo_moradia: number;

  @Column({ default: false })
  possui_banheiro: boolean;

  @Column({ default: false })
  possui_energia_eletrica: boolean;

  @Column({ default: false })
  possui_agua_encanada: boolean;

  @Column({ default: false })
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