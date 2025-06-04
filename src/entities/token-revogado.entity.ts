import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entidade que armazena tokens revogados para consulta rápida durante a validação.
 * Esta tabela é utilizada para manter um registro de tokens que foram invalidados
 * antes de sua expiração natural, servindo como uma "lista negra" que é consultada
 * a cada validação de token.
 */
@Entity('tokens_revogados')
export class TokenRevogado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 64 })
  @Index() // Índice para consulta rápida
  tokenHash: string;

  @Column({ nullable: false })
  integradorId: string;

  @Column({ nullable: true })
  motivoRevogacao: string;

  @Column({ type: 'timestamptz', nullable: true })
  dataExpiracao: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  dataCriacao: Date;

  // Data em que este registro pode ser removido do banco (limpeza)
  @Column({ type: 'timestamptz', nullable: true })
  @Index() // Índice para facilitar limpeza periódica
  dataLimpeza: Date;
}
