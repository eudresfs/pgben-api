import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Integrador } from './integrador.entity';

/**
 * Entidade que representa um token de acesso para um integrador específico.
 * Armazena informações sobre o token, seus escopos de permissão e status.
 */
@Entity('integrador_tokens')
export class IntegradorToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Integrador, (integrador) => integrador.tokens, {
    nullable: false,
  })
  @JoinColumn({ name: 'integrador_id' })
  integrador: Integrador;

  @Column({ name: 'integrador_id' })
  integradorId: string;

  @Column({ length: 100 })
  nome: string;

  @Column({ length: 500, nullable: true })
  descricao: string;

  // Armazenamos apenas o hash do token para segurança, nunca o token em si
  @Column({ length: 64 })
  tokenHash: string;

  @Column({ type: 'simple-array', nullable: true })
  escopos: string[];

  // A coluna pode ser null para tokens sem expiração
  @Column({ type: 'timestamptz', nullable: true })
  dataExpiracao: Date;

  @Column({ default: false })
  revogado: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  dataRevogacao: Date;

  @Column({ nullable: true })
  motivoRevogacao: string;

  @Column({ type: 'timestamptz', nullable: true })
  ultimoUso: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  dataCriacao: Date;
}
