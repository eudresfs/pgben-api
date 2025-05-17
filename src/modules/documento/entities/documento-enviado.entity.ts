import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Documento } from './documento.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';

@Entity('documentos_enviados')
@Index(['documento_id'])
export class DocumentoEnviado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Documento é obrigatório' })
  documento_id: string;

  @ManyToOne(() => Documento, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documento_id' })
  documento: Documento;

  @Column()
  @IsNotEmpty({ message: 'Nome do arquivo é obrigatório' })
  nome_arquivo: string;

  @Column()
  @IsNotEmpty({ message: 'Caminho do arquivo é obrigatório' })
  caminho_arquivo: string;

  @Column()
  @IsNumber({}, { message: 'Tamanho deve ser um número' })
  @Min(0, { message: 'Tamanho não pode ser negativo' })
  tamanho: number;

  @Column()
  @IsNotEmpty({ message: 'Tipo MIME é obrigatório' })
  mime_type: string;

  @Column({ type: 'timestamp' })
  @IsNotEmpty({ message: 'Data de envio é obrigatória' })
  data_envio: Date;

  @Column()
  @IsNotEmpty({ message: 'Usuário que enviou é obrigatório' })
  enviado_por_id: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'enviado_por_id' })
  enviado_por: Usuario;

  @Column({ default: false })
  verificado: boolean;

  @Column({ nullable: true })
  verificado_por_id: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'verificado_por_id' })
  verificado_por: Usuario;

  @Column({ type: 'timestamp', nullable: true })
  data_verificacao: Date;

  @Column('text', { nullable: true })
  observacoes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
