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
  IsBoolean,
  IsEmail,
  Length,
  ValidateIf,
  IsString,
} from 'class-validator';
import { Cidadao } from './cidadao.entity';

/**
 * Entidade que representa um meio de contato de um cidadão.
 * Suporta múltiplos registros e permite indicar se o contato é do próprio
 * beneficiário ou de terceiros (familiares, responsáveis, etc.).
 */
@Entity('contato')
@Index(['cidadao_id', 'is_whatsapp'])
export class Contato {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK para o cidadão */
  @Column()
  cidadao_id: string;

  @ManyToOne(() => Cidadao, { eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cidadao_id' })
  cidadao: Cidadao;

  /** Telefone no formato nacional (apenas dígitos) */
  @Column({ nullable: true })
  @IsOptional()
  @Length(10, 15, { message: 'Telefone deve ter entre 10 e 15 dígitos' })
  telefone: string;

  /** Indica se o telefone é WhatsApp */
  @Column({ default: false })
  @IsBoolean()
  @ValidateIf((o) => o.telefone)
  is_whatsapp: boolean;

  /** Indica se o proprietário do telefone possui smartphone */
  @Column({ default: false })
  @IsBoolean()
  @ValidateIf((o) => o.telefone)
  possui_smartphone: boolean;

  /** Email de contato */
  @Column({ nullable: true })
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  /** Username/handle do Instagram */
  @Column({ nullable: true })
  @IsOptional()
  instagram: string;

  /** Username/handle do Facebook */
  @Column({ nullable: true })
  @IsOptional()
  facebook: string;

  /** Se o contato pertence ao próprio beneficiário */
  @Column({ default: true })
  @IsBoolean()
  proprietario: boolean;

  /** Nome do contato quando não é o próprio beneficiário */
  @Column({ nullable: true })
  @ValidateIf((o) => !o.proprietario)
  @IsNotEmpty({ message: 'Nome do contato é obrigatório se não for o proprietário' })
  @IsString()
  nome_contato: string;

  /** Grau de parentesco do contato com o beneficiário */
  @Column({ nullable: true })
  @IsOptional()
  grau_parentesco: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
