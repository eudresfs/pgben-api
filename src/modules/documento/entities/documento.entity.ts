import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Solicitacao } from '../../solicitacao/entities/solicitacao.entity';
// Temporariamente comentado até que a entidade User seja criada
// import { User } from '../../../user/entities/user.entity';
import { TipoDocumento } from '../../beneficio/entities/requisito-documento.entity';

@Entity('documentos')
@Index(['solicitacao_id', 'tipo_documento'])
export class Documento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Solicitação é obrigatória' })
  solicitacao_id: string;

  @ManyToOne(() => Solicitacao, (solicitacao) => solicitacao.documentos)
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;

  @Column({
    type: 'enum',
    enum: TipoDocumento
  })
  @IsNotEmpty({ message: 'Tipo de documento é obrigatório' })
  tipo_documento: TipoDocumento;

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
  @IsNotEmpty({ message: 'Data de upload é obrigatória' })
  data_upload: Date;

  @Column()
  @IsNotEmpty({ message: 'Usuário que fez upload é obrigatório' })
  uploader_id: string;

  // Temporariamente comentado até que a entidade User seja criada
  // @ManyToOne(() => User)
  // @JoinColumn({ name: 'uploader_id' })
  // uploader: User;

  @Column('jsonb', { nullable: true })
  metadados: {
    hash?: string;
    validade?: Date;
    verificado?: boolean;
    observacoes?: string;
  };

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}