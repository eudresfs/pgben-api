import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsString, MaxLength, MinLength, IsBoolean, IsOptional } from 'class-validator';
import { Usuario } from './usuario.entity';
import { Status } from '../enums/status.enum';

/**
 * Entidade de Role (Papel)
 *
 * Representa um papel/função que um usuário pode ter no sistema,
 * substituindo o antigo enum Role. Esta entidade permite relacionamentos
 * com permissões e outros recursos do sistema.
 */
@Entity('role')
@Index(['nome'], { unique: true })
@Index(['status'])
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  @IsNotEmpty({ message: 'Nome da role é obrigatório' })
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(2, { message: 'Nome deve ter no mínimo 2 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  nome: string;

  @Column({ nullable: true, length: 500 })
  @IsOptional()
  @IsString({ message: 'Descrição deve ser uma string' })
  @MaxLength(500, { message: 'Descrição deve ter no máximo 500 caracteres' })
  descricao: string;

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.ATIVO,
    enumName: 'status_role'
  })
  @IsOptional()
  @IsBoolean({ message: 'Status deve ser um valor booleano' })
  status: Status;

  @OneToMany(() => Usuario, (usuario) => usuario.role, {
    cascade: false,
    lazy: true
  })
  usuarios: Usuario[];

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  /**
   * Verifica se a role está ativa
   * @returns true se a role estiver ativa
   */
  isAtiva(): boolean {
    return this.status === Status.ATIVO;
  }

  /**
   * Ativa a role
   */
  ativar(): void {
    this.status = Status.ATIVO;
  }

  /**
   * Desativa a role
   */
  desativar(): void {
    this.status = Status.INATIVO;
  }
}
