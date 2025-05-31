import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IsNotEmpty, IsUUID, IsOptional, IsString, MaxLength, IsNumber, Min, IsDateString, IsMimeType } from 'class-validator';
import { Pagamento } from './pagamento.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';

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
  @IsNotEmpty({ message: 'ID do pagamento é obrigatório' })
  @IsUUID('4', { message: 'ID do pagamento deve ser um UUID válido' })
  pagamento_id: string;

  /**
   * Tipo de documento (ex: "comprovante_transferencia", "recibo", etc.)
   */
  @Column({ name: 'tipo_documento' })
  @IsNotEmpty({ message: 'Tipo de documento é obrigatório' })
  @IsString({ message: 'Tipo de documento deve ser uma string' })
  @MaxLength(100, { message: 'Tipo de documento deve ter no máximo 100 caracteres' })
  tipo_documento: string;

  /**
   * Nome original do arquivo enviado
   */
  @Column({ name: 'nome_arquivo' })
  @IsNotEmpty({ message: 'Nome do arquivo é obrigatório' })
  @IsString({ message: 'Nome do arquivo deve ser uma string' })
  @MaxLength(255, { message: 'Nome do arquivo deve ter no máximo 255 caracteres' })
  nome_arquivo: string;

  /**
   * Caminho/identificador do arquivo no sistema de armazenamento
   */
  @Column({ name: 'caminho_arquivo' })
  @IsNotEmpty({ message: 'Caminho do arquivo é obrigatório' })
  @IsString({ message: 'Caminho do arquivo deve ser uma string' })
  @MaxLength(500, { message: 'Caminho do arquivo deve ter no máximo 500 caracteres' })
  caminho_arquivo: string;

  /**
   * Tamanho do arquivo em bytes
   */
  @Column()
  @IsNotEmpty({ message: 'Tamanho do arquivo é obrigatório' })
  @IsNumber({}, { message: 'Tamanho deve ser um número' })
  @Min(1, { message: 'Tamanho deve ser maior que zero' })
  tamanho: number;

  /**
   * Tipo MIME do arquivo
   */
  @Column({ name: 'mime_type' })
  @IsNotEmpty({ message: 'Tipo MIME é obrigatório' })
  @IsString({ message: 'Tipo MIME deve ser uma string' })
  @MaxLength(100, { message: 'Tipo MIME deve ter no máximo 100 caracteres' })
  mime_type: string;

  /**
   * Data de upload do comprovante
   */
  @Column({ name: 'data_upload', type: 'timestamp' })
  @IsNotEmpty({ message: 'Data de upload é obrigatória' })
  data_upload: Date;

  /**
   * Referência ao usuário que fez o upload do comprovante
   */
  @Column({ name: 'uploaded_por' })
  @IsNotEmpty({ message: 'ID do usuário responsável pelo upload é obrigatório' })
  @IsUUID('4', { message: 'ID do usuário deve ser um UUID válido' })
  uploaded_por: string;

  /**
   * Data de criação do registro
   */
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  /**
   * Data da última atualização do registro
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  /**
   * Relacionamento com a entidade Pagamento
   */
  @ManyToOne(() => Pagamento, pagamento => pagamento.id)
  @JoinColumn({ name: 'pagamento_id' })
  pagamento: Pagamento;

  /**
   * Relacionamento com a entidade Usuario
   */
  @ManyToOne(() => Usuario, usuario => usuario.id)
  @JoinColumn({ name: 'uploaded_por' })
  responsavel_upload: Usuario;
}
