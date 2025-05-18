import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Pagamento } from './pagamento.entity';

/**
 * Entidade que representa um comprovante de pagamento no sistema.
 * 
 * Esta entidade armazena informações sobre documentos comprobatórios
 * anexados para comprovar a realização de pagamentos.
 * 
 * @author Equipe PGBen
 */
@Entity('comprovante_pagamento')
export class ComprovantePagamento {
  /**
   * Identificador único do comprovante
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Referência ao pagamento relacionado a este comprovante
   */
  @Column({ name: 'pagamento_id' })
  pagamentoId: string;

  /**
   * Tipo de documento (ex: "comprovante_transferencia", "recibo", etc.)
   */
  @Column({ name: 'tipo_documento' })
  tipoDocumento: string;

  /**
   * Nome original do arquivo enviado
   */
  @Column({ name: 'nome_arquivo' })
  nomeArquivo: string;

  /**
   * Caminho/identificador do arquivo no sistema de armazenamento
   */
  @Column({ name: 'caminho_arquivo' })
  caminhoArquivo: string;

  /**
   * Tamanho do arquivo em bytes
   */
  @Column()
  tamanho: number;

  /**
   * Tipo MIME do arquivo
   */
  @Column({ name: 'mime_type' })
  mimeType: string;

  /**
   * Data de upload do comprovante
   */
  @Column({ name: 'data_upload', type: 'timestamp' })
  dataUpload: Date;

  /**
   * Referência ao usuário que fez o upload do comprovante
   */
  @Column({ name: 'uploaded_por' })
  uploadedPor: string;

  /**
   * Data de criação do registro
   */
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  /**
   * Data da última atualização do registro
   */
  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  /**
   * Relacionamento com a entidade Pagamento
   */
  @ManyToOne(() => Pagamento, pagamento => pagamento.id)
  @JoinColumn({ name: 'pagamento_id' })
  pagamento: Pagamento;

  /**
   * Relacionamento com a entidade Usuario será implementado após a criação das entidades relacionadas
   */
  // @ManyToOne(() => Usuario)
  // @JoinColumn({ name: 'uploaded_por' })
  // responsavelUpload: Usuario;
}
