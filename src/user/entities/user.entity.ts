import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { IsEmail, IsNotEmpty, Length, IsEnum } from 'class-validator';
import { Solicitacao } from '../../modules/solicitacao/entities/solicitacao.entity';
import { Unidade } from '../../modules/unidade/entities/unidade.entity';
import { Setor } from '../../modules/setor/entities/setor.entity';

// Enums
export enum UserRole {
  ADMIN = 'administrador',
  GESTOR_SEMTAS = 'gestor_semtas',
  TECNICO_SEMTAS = 'tecnico_semtas',
  TECNICO_UNIDADE = 'tecnico_unidade',
}

export enum UserStatus {
  ATIVO = 'ativo',
  INATIVO = 'inativo',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  nome: string;

  @Column({ unique: true })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @Column()
  senha_hash: string;

  @Column({ unique: true, nullable: true })
  @Length(11, 14, { message: 'CPF deve ter entre 11 e 14 caracteres' })
  cpf: string;

  @Column({ nullable: true })
  telefone: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.TECNICO_UNIDADE,
  })
  @IsEnum(UserRole, { message: 'Perfil inválido' })
  role: UserRole;

  @Column({ nullable: true })
  unidade_id: string;

  @ManyToOne(() => Unidade, { nullable: true })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @Column({ nullable: true })
  setor_id: string;

  @ManyToOne(() => Setor, { nullable: true })
  @JoinColumn({ name: 'setor_id' })
  setor: Setor;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ATIVO,
  })
  @IsEnum(UserStatus, { message: 'Status inválido' })
  status: UserStatus;

  @Column({ default: true })
  primeiro_acesso: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'removed_at' })
  removedAt: Date;

  @OneToMany(() => Solicitacao, (solicitacao) => solicitacao.tecnico)
  // Removidas referências circulares para Solicitacao
  // As consultas de solicitações por usuário devem ser feitas via repositório
  solicitacoes_abertas: Solicitacao[];

  @OneToMany(() => Solicitacao, (solicitacao) => solicitacao.aprovador)
  solicitacoes_aprovadas: Solicitacao[];

  @OneToMany(() => Solicitacao, (solicitacao) => solicitacao.liberador)
  solicitacoes_liberadas: Solicitacao[];
}
