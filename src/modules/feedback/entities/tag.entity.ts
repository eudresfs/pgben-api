import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  Index
} from 'typeorm';
import { Feedback } from './feedback.entity';

/**
 * Entidade para armazenar tags dos feedbacks
 */
@Entity('tags')
@Index(['nome'], { unique: true })
@Index(['ativo', 'contador_uso'])
@Index(['categoria'])
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    comment: 'Nome da tag (único)'
  })
  nome: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Descrição da tag'
  })
  descricao: string;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
    comment: 'Categoria da tag (ex: funcionalidade, bug, interface)'
  })
  @Index()
  categoria: string;

  @Column({
    type: 'varchar',
    length: 7,
    nullable: true,
    comment: 'Cor da tag em formato hexadecimal (#RRGGBB)'
  })
  cor: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Contador de quantas vezes a tag foi usada'
  })
  @Index()
  contador_uso: number;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Indica se a tag está ativa para uso'
  })
  @Index()
  ativo: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Indica se a tag é sugerida automaticamente pelo sistema'
  })
  sugerida_sistema: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Ordem de exibição da tag (menor valor = maior prioridade)'
  })
  ordem_exibicao: number;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Data e hora de criação da tag'
  })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    comment: 'Data e hora da última atualização'
  })
  updated_at: Date;

  // Relacionamentos
  @ManyToMany(() => Feedback, feedback => feedback.tags)
  feedbacks: Feedback[];

  // Métodos auxiliares
  /**
   * Incrementa o contador de uso da tag
   */
  incrementarUso(): void {
    this.contador_uso += 1;
  }

  /**
   * Decrementa o contador de uso da tag
   */
  decrementarUso(): void {
    if (this.contador_uso > 0) {
      this.contador_uso -= 1;
    }
  }

  /**
   * Verifica se a tag é popular (usado mais de 10 vezes)
   */
  isPopular(): boolean {
    return this.contador_uso >= 10;
  }

  /**
   * Retorna a cor da tag ou uma cor padrão
   */
  getCorOuPadrao(): string {
    return this.cor || '#6B7280'; // Cor cinza padrão
  }

  /**
   * Formata o nome da tag para exibição
   */
  getNomeFormatado(): string {
    return this.nome.toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Verifica se a tag pode ser removida (não está sendo usada)
   */
  podeSerRemovida(): boolean {
    return this.contador_uso === 0 && this.ativo;
  }
}