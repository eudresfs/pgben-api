import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToMany } from 'typeorm';
import { IsNotEmpty, IsEnum } from 'class-validator';

export enum StatusSetor {
  ATIVO = 'ativo',
  INATIVO = 'inativo',
}

@Entity('setor')
export class Setor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  nome: string;

  @Column()
  @IsNotEmpty({ message: 'Sigla é obrigatória' })
  sigla: string;

  @Column({ nullable: true })
  descricao: string;

  @Column({
    type: 'enum',
    enum: StatusSetor,
    default: StatusSetor.ATIVO,
  })
  @IsEnum(StatusSetor, { message: 'Status inválido' })
  status: StatusSetor;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'removed_at' })
  removedAt: Date;
}