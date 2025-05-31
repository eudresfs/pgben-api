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
import { IsNotEmpty, IsString, Length, MaxLength, MinLength, Validate, IsEmail, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { IsStrongPassword } from '../../../shared/validators/strong-password.validator';
import { Role } from './role.entity';
import { Status } from '../../../shared/enums/status.enum';

/**
 * Entidade de Usuário
 *
 * Representa um usuário do sistema com suas informações básicas,
 * credenciais de acesso e relacionamentos com outras entidades.
 */
@Entity('usuario')
@Index(['email'], { unique: true })
@Index(['cpf'], { unique: true })
@Index(['matricula'], { unique: true })
@Index(['status'])
@Index(['role_id'])
@Index(['unidade_id'])
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(2, { message: 'Nome deve ter no mínimo 2 caracteres' })
  @MaxLength(255, { message: 'Nome deve ter no máximo 255 caracteres' })
  nome: string;

  @Column({ unique: true, length: 255 })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  @MaxLength(255, { message: 'Email deve ter no máximo 255 caracteres' })
  email: string;

  @Column({ name: 'senha_hash' })
  @Exclude()
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @IsString({ message: 'Senha deve ser uma string' })
  @Validate(IsStrongPassword, {
    message: 'Senha deve ter no mínimo 8 caracteres, incluindo maiúscula, minúscula, número e caractere especial'
  })
  senhaHash: string;

  @Column({ unique: true, length: 11 })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @IsString({ message: 'CPF deve ser uma string' })
  @Length(11, 11, { message: 'CPF deve ter exatamente 11 caracteres' })
  @Validate(IsCPF, { message: 'CPF inválido' })
  cpf: string;

  @Column({ nullable: true, length: 15 })
  @IsOptional()
  @IsString({ message: 'Telefone deve ser uma string' })
  @MaxLength(15, { message: 'Telefone deve ter no máximo 15 caracteres' })
  @Validate(IsTelefone, { message: 'Telefone inválido' })
  telefone?: string;

  @Column({ unique: true, length: 20 })
  @IsNotEmpty({ message: 'Matrícula é obrigatória' })
  @IsString({ message: 'Matrícula deve ser uma string' })
  @MinLength(3, { message: 'Matrícula deve ter no mínimo 3 caracteres' })
  @MaxLength(20, { message: 'Matrícula deve ter no máximo 20 caracteres' })
  matricula: string;

  @Column({ name: 'role_id', nullable: true })
  role_id: string;

  @ManyToOne(() => Role, (role) => role.usuarios, {
    nullable: false,
    eager: false
  })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ name: 'unidade_id', nullable: true })
  unidade_id: string;

  @ManyToOne(() => Unidade, (unidade) => unidade.usuarios, {
    nullable: true,
    eager: false
  })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @Column({ name: 'setor_id', nullable: true })
  setor_id: string;

  @ManyToOne(() => Setor, (setor) => setor.usuarios, {
    nullable: true,
    eager: false
  })
  @JoinColumn({ name: 'setor_id' })
  setor: Setor;

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.ATIVO,
    enumName: 'status_usuario'
  })
  @IsOptional()
  @IsEnum(Status, { message: 'Status deve ser ATIVO ou INATIVO' })
  status: Status;

  @Column({ name: 'primeiro_acesso', default: true })
  @IsOptional()
  @IsBoolean({ message: 'Primeiro acesso deve ser um valor booleano' })
  primeiro_acesso: boolean;

  @Column({ name: 'tentativas_login', default: 0 })
  @IsOptional()
  tentativas_login: number;

  @Column({ name: 'ultimo_login', nullable: true })
  @IsOptional()
  ultimo_login: Date;

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.usuario, {
    cascade: ['remove'],
    lazy: true
  })
  refreshTokens: RefreshToken[];

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'removed_at' })
  removed_at: Date;

  /**
   * Verifica se o usuário está ativo
   * @returns true se o usuário estiver ativo
   */
  isAtivo(): boolean {
    return this.status === Status.ATIVO;
  }

  /**
   * Ativa o usuário
   */
  ativar(): void {
    this.status = Status.ATIVO;
  }

  /**
   * Desativa o usuário
   */
  desativar(): void {
    this.status = Status.INATIVO;
  }

  /**
   * Verifica se é o primeiro acesso do usuário
   * @returns true se for o primeiro acesso
   */
  isPrimeiroAcesso(): boolean {
    return this.primeiro_acesso;
  }

  /**
   * Marca que o usuário já fez o primeiro acesso
   */
  marcarPrimeiroAcessoRealizado(): void {
    this.primeiro_acesso = false;
  }

  /**
   * Obtém o nome completo formatado
   * @returns nome formatado
   */
  getNomeFormatado(): string {
    return this.nome.trim();
  }

  /**
   * Verifica se o usuário pode ser deletado
   * @returns true se pode ser deletado
   */
  podeSerDeletado(): boolean {
    return this.status === Status.INATIVO;
  }
}
