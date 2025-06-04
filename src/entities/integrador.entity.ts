import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IntegradorToken } from './integrador-token.entity';

/**
 * Entidade que representa um integrador externo (sistema ou parceiro)
 * que consome a API do PGBen.
 */
@Entity('integradores')
export class Integrador {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  nome: string;

  @Column({ length: 500, nullable: true })
  descricao: string;

  @Column({ nullable: true })
  responsavel: string;

  @Column({ nullable: true })
  emailContato: string;

  @Column({ nullable: true })
  telefoneContato: string;

  @Column({ default: true })
  ativo: boolean;

  @Column({ type: 'simple-array', nullable: true })
  permissoesEscopo: string[];

  @Column({ type: 'simple-array', nullable: true })
  ipPermitidos: string[];

  @Column({ type: 'timestamptz', nullable: true })
  ultimoAcesso: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  dataCriacao: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  dataAtualizacao: Date;

  @OneToMany(() => IntegradorToken, (token) => token.integrador)
  tokens: IntegradorToken[];
}
