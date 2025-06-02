/* eslint-disable prettier/prettier */
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
  Index
} from 'typeorm';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { Unidade } from './unidade.entity';
import { Usuario } from './usuario.entity';

@Entity('setor')
@Index(['nome'])
@Index(['unidade_id'])
@Index(['status'])
export class Setor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  nome: string;

  @Column({ nullable: true, default: 'N/A' })
  sigla: string;

  @Column({ nullable: true })
  descricao: string;

  @Column({ nullable: false })
  unidade_id: string;

  @ManyToOne(() => Unidade, unidade => unidade.setores)
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @Column({ type: 'boolean', default: true })
  status: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;

  /**
   * Relacionamento com os usuários do setor
   */
  @OneToMany(() => Usuario, usuario => usuario.setor)
  usuarios: Usuario[];
}