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
import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Cidadao } from './cidadao.entity';
import { TipoConta, TipoChavePix } from '../enums/info-bancaria.enum';

/**
 * Entidade de Informações Bancárias do Cidadão
 *
 * Armazena dados bancários prioritariamente da conta poupança social do Banco do Brasil
 * e informações da chave PIX para facilitar pagamentos de benefícios eventuais.
 */
@Entity('info_bancaria')
@Index(['cidadao_id'], { unique: true }) // Um cidadão pode ter apenas uma conta bancária principal
@Index(['conta', 'agencia', 'banco'])
@Index(['chave_pix'])
export class InfoBancaria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Relacionamento com o cidadão
   */
  @Column({ name: 'cidadao_id', type: 'uuid' })
  cidadao_id: string;

  @ManyToOne(() => Cidadao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cidadao_id' })
  cidadao: Cidadao;

  /**
   * Dados bancários
   */
  @Column({ length: 3 })
  @IsOptional()
  @IsString({ message: 'Código do banco deve ser uma string' })
  @Matches(/^\d{3}$/, { message: 'Código do banco deve ter 3 dígitos' })
  banco: string; // Ex: '001' para Banco do Brasil

  @Column({ length: 100 })
  @IsOptional()
  @IsString({ message: 'Nome do banco deve ser uma string' })
  @MaxLength(100, { message: 'Nome do banco deve ter no máximo 100 caracteres' })
  nome_banco: string; // Ex: 'Banco do Brasil S.A.'

  @Column({ length: 10 })
  @IsOptional()
  @IsString({ message: 'Agência deve ser uma string' })
  @Matches(/^\d{4,5}(-\d)?$/, { message: 'Agência deve ter formato válido (ex: 1234 ou 1234-5)' })
  agencia: string;

  @Column({ length: 20 })
  @IsOptional()
  @IsString({ message: 'Conta deve ser uma string' })
  @Matches(/^\d{1,15}(-\d)?$/, { message: 'Conta deve ter formato válido' })
  conta: string;

  @Column({
    type: 'enum',
    enum: TipoConta,
    enumName: 'tipo_conta_enum',
    default: TipoConta.POUPANCA_SOCIAL,
  })
  @IsEnum(TipoConta, { message: 'Tipo de conta inválido' })
  @IsOptional()
  tipo_conta: TipoConta;

  /**
   * Dados PIX
   */
  @Column({ length: 255, nullable: true })
  @IsNotEmpty({ message: 'Chave PIX é obrigatória' })
  @IsString({ message: 'Chave PIX deve ser uma string' })
  @MaxLength(255, { message: 'Chave PIX deve ter no máximo 255 caracteres' })
  chave_pix: string;

  @Column({
    type: 'enum',
    enum: TipoChavePix,
    enumName: 'tipo_chave_pix_enum',
    nullable: true,
  })
  @IsNotEmpty({ message: 'Tipo da chave PIX é obrigatório' })
  @IsEnum(TipoChavePix, { message: 'Tipo de chave PIX inválido' })
  tipo_chave_pix: TipoChavePix;

  /**
   * Campos de controle
   */
  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Observações devem ser uma string' })
  observacoes: string;

  /**
   * Campos de auditoria
   */
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}