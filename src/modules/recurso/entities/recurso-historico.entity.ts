import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { Recurso } from './recurso.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';

@Entity('recurso_historico')
@Index(['recurso_id'])
export class RecursoHistorico {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Recurso é obrigatório' })
  recurso_id: string;

  @ManyToOne(() => Recurso, (recurso) => recurso.historicos)
  @JoinColumn({ name: 'recurso_id' })
  recurso: Recurso;

  @Column()
  @IsNotEmpty({ message: 'Status anterior é obrigatório' })
  status_anterior: string;

  @Column()
  @IsNotEmpty({ message: 'Status novo é obrigatório' })
  status_novo: string;

  @Column({ nullable: true })
  usuario_id: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column('text', { nullable: true })
  observacao: string;

  @CreateDateColumn()
  created_at: Date;
}
