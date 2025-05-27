import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { RefreshToken } from '../../../auth/entities/refresh-token.entity';
import { Unidade } from '../../unidade/entities/unidade.entity';
import { Setor } from '../../unidade/entities/setor.entity';
import { IsCPF, IsTelefone } from '../../../shared/validators/br-validators';
import { IsNotEmpty, IsString, Length, MaxLength, MinLength, Validate } from 'class-validator';
import { IsStrongPassword } from '../../../shared/validators/strong-password.validator';
import { Role } from './role.entity';

/**
 * Entidade de usuário
 *
 * Representa um usuário do sistema com suas informações básicas e permissões
 */
@Entity('usuario')
@Index(['email'], { unique: true })
@Index(['cpf'], { unique: true })
@Index(['matricula'], { unique: true })
@Index(['unidadeId'])
@Index(['setorId'])
@Index(['role_id'])
@Index(['status'])
export class Usuario {
  [x: string]: any;
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  nome: string;

  @Column({ unique: true })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @Column({ name: 'senha_hash' })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @Exclude()
  @Validate(IsStrongPassword, {message: 'A senha não pode conter informações pessoais ou ser uma senha comum'})
  senhaHash: string;

  @Column({ unique: true, nullable: false })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @Length(11, 14, { message: 'CPF deve ter entre 11 e 14 caracteres' })
  @Validate(IsCPF, { message: 'CPF inválido' })
  cpf: string;

  @Column({ nullable: false })
  @IsNotEmpty({ message: 'Telefone é obrigatório' })
  @Validate(IsTelefone, { message: 'Telefone inválido, deve conter DDD + número (10 ou 11 dígitos no total)' })
  telefone: string;

  @Column({ unique: true, nullable: false })
  @MinLength(5, { message: 'Matrícula deve ter no mínimo 5 caracteres' })
  matricula: string;

  @Column({ name: 'role_id', nullable: true })
  role_id: string;

  @ManyToOne(() => Role, (role) => role.usuarios)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ name: 'unidade_id', nullable: true })
  unidadeId: string;

  @ManyToOne(() => Unidade, (unidade) => unidade.usuarios)
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @Column({ name: 'setor_id', nullable: true })
  setorId: string;

  @ManyToOne(() => Setor, (setor) => setor.usuarios)
  @JoinColumn({ name: 'setor_id' })
  setor: Setor;

  @Column({
    type: 'enum',
    enum: ['ativo', 'inativo'],
    default: 'ativo',
  })
  status: string;

  @Column({ name: 'primeiro_acesso', default: true })
  primeiro_acesso: boolean;

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.usuario)
  refreshTokens: RefreshToken[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
