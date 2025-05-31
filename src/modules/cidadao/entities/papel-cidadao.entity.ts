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
import { Cidadao } from './cidadao.entity';
import { ComposicaoFamiliar } from './composicao-familiar.entity';
import { TipoPapel, PaperType } from '../enums/tipo-papel.enum';

/**
 * Entidade de Papel do Cidadão
 *
 * Estabelece uma relação N:M entre cidadãos e os papéis que podem assumir no sistema.
 * Um mesmo cidadão pode ter múltiplos papéis em diferentes contextos.
 */
@Entity('papel_cidadao')
@Index(['cidadao_id', 'tipo_papel'], { unique: true })
export class PapelCidadao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cidadao_id', type: 'uuid' })
  cidadao_id: string;

  @ManyToOne(() => Cidadao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cidadao_id' })
  cidadao: Cidadao;
  
  @Column({ name: 'composicao_familiar_id', type: 'uuid', nullable: true })
  composicao_familiar_id: string;

  @ManyToOne(() => ComposicaoFamiliar, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'composicao_familiar_id' })
  composicao_familiar: ComposicaoFamiliar;

  @Column({
    name: 'tipo_papel',
    type: 'enum',
    enum: TipoPapel,
    enumName: 'tipo_papel',
  })
  tipo_papel: PaperType;

  @Column({ type: 'jsonb', nullable: true })
  metadados: {
    grau_parentesco?: string;
    documento_representacao?: string;
    data_validade_representacao?: Date;
    [key: string]: any;
  };

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'removed_at' })
  removed_at: Date;

  // Getters e Setters
  get cidadaoId(): string {
    return this.cidadao_id;
  }

  set cidadaoId(value: string) {
    this.cidadao_id = value;
  }

  get composicaoFamiliarId(): string {
    return this.composicao_familiar_id;
  }

  set composicaoFamiliarId(value: string) {
    this.composicao_familiar_id = value;
  }

  get tipoPapel(): PaperType {
    return this.tipo_papel;
  }

  set tipoPapel(value: PaperType) {
    this.tipo_papel = value;
  }

  get createdAt(): Date {
    return this.created_at;
  }

  get updatedAt(): Date {
    return this.updated_at;
  }

  get removedAt(): Date {
    return this.removed_at;
  }

  // Métodos Utilitários

  /**
   * Verifica se o papel foi criado recentemente (últimas 24 horas)
   */
  isCriadoRecentemente(): boolean {
    const agora = new Date();
    const umDiaAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
    return this.created_at > umDiaAtras;
  }

  /**
   * Calcula a idade do papel em dias
   */
  getIdadeEmDias(): number {
    const agora = new Date();
    const diffTime = Math.abs(agora.getTime() - this.created_at.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Verifica se o papel está ativo
   */
  isAtivo(): boolean {
    return this.ativo && !this.removed_at;
  }

  /**
   * Verifica se o papel foi removido
   */
  foiRemovido(): boolean {
    return !!this.removed_at;
  }

  /**
   * Verifica se é um papel de beneficiário
   */
  isBeneficiario(): boolean {
    return this.tipo_papel === TipoPapel.BENEFICIARIO;
  }

  /**
   * Verifica se é um papel de representante legal
   */
  isRepresentanteLegal(): boolean {
    return this.tipo_papel === TipoPapel.REPRESENTANTE_LEGAL;
  }

  /**
   * Verifica se é um papel de dependente
   */
  isDependente(): boolean {
    return this.tipo_papel === TipoPapel.DEPENDENTE;
  }

  /**
   * Verifica se tem grau de parentesco definido
   */
  temGrauParentesco(): boolean {
    return !!(this.metadados?.grau_parentesco);
  }

  /**
   * Obtém o grau de parentesco
   */
  getGrauParentesco(): string | null {
    return this.metadados?.grau_parentesco || null;
  }

  /**
   * Verifica se tem documento de representação
   */
  temDocumentoRepresentacao(): boolean {
    return !!(this.metadados?.documento_representacao);
  }

  /**
   * Verifica se a representação está válida (não expirou)
   */
  isRepresentacaoValida(): boolean {
    if (!this.metadados?.data_validade_representacao) {
      return true; // Se não tem data de validade, considera válida
    }
    return new Date(this.metadados.data_validade_representacao) > new Date();
  }

  /**
   * Verifica se pertence a uma composição familiar específica
   */
  pertenceAComposicaoFamiliar(composicaoId: string): boolean {
    return this.composicao_familiar_id === composicaoId;
  }

  /**
   * Verifica se pertence a um cidadão específico
   */
  pertenceAoCidadao(cidadaoId: string): boolean {
    return this.cidadao_id === cidadaoId;
  }

  /**
   * Obtém um resumo do papel
   */
  getSummary(): string {
    const status = this.isAtivo() ? 'Ativo' : 'Inativo';
    const grau = this.temGrauParentesco() ? ` (${this.getGrauParentesco()})` : '';
    return `${this.tipo_papel}${grau} - ${status}`;
  }

  /**
   * Gera uma chave única para o papel
   */
  getUniqueKey(): string {
    return `${this.cidadao_id}_${this.tipo_papel}_${this.composicao_familiar_id || 'null'}`;
  }

  /**
   * Verifica se o papel é consistente
   */
  isConsistente(): boolean {
    // Verifica se tem cidadão
    if (!this.cidadao_id) return false;
    
    // Verifica se tem tipo de papel
    if (!this.tipo_papel) return false;
    
    // Se é representante legal, deve ter documento
    if (this.isRepresentanteLegal() && !this.temDocumentoRepresentacao()) {
      return false;
    }
    
    // Se tem data de validade, deve estar válida
    if (this.metadados?.data_validade_representacao && !this.isRepresentacaoValida()) {
      return false;
    }
    
    return true;
  }

  /**
   * Verifica se pode ser removido
   */
  podeSerRemovido(): boolean {
    // Não pode remover se já foi removido
    if (this.foiRemovido()) return false;
    
    // Responsável familiar só pode ser removido se houver outro responsável
    // Esta verificação seria feita no serviço
    return true;
  }

  /**
   * Clona o papel (sem ID)
   */
  clone(): Partial<PapelCidadao> {
    return {
      cidadao_id: this.cidadao_id,
      composicao_familiar_id: this.composicao_familiar_id,
      tipo_papel: this.tipo_papel,
      metadados: this.metadados ? { ...this.metadados } : undefined,
      ativo: this.ativo,
    };
  }

  /**
   * Verifica se requer documentação especial
   */
  requerDocumentacaoEspecial(): boolean {
    return this.isRepresentanteLegal();
  }

  /**
   * Obtém a descrição do tipo de papel
   */
  getDescricaoTipoPapel(): string {
    const descricoes = {
      [TipoPapel.REQUERENTE]: 'Solicitante',
      [TipoPapel.BENEFICIARIO]: 'Beneficiário',
      [TipoPapel.REPRESENTANTE_LEGAL]: 'Representante Legal',
      [TipoPapel.DEPENDENTE]: 'Dependente',
    };
    return descricoes[this.tipo_papel] || this.tipo_papel;
  }

  /**
   * Formata a data de criação
   */
  getCriacaoFormatada(): string {
    return this.created_at.toLocaleDateString('pt-BR');
  }

  /**
   * Formata a data de atualização
   */
  getAtualizacaoFormatada(): string {
    return this.updated_at.toLocaleDateString('pt-BR');
  }

  /**
   * Remove informações sensíveis para logs
   */
  toSafeLog(): Partial<PapelCidadao> {
    return {
      id: this.id,
      tipo_papel: this.tipo_papel,
      ativo: this.ativo,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  /**
   * Verifica se o papel expira em breve (próximos 30 dias)
   */
  expiraEmBreve(): boolean {
    if (!this.metadados?.data_validade_representacao) {
      return false;
    }
    
    const dataValidade = new Date(this.metadados.data_validade_representacao);
    const trintaDiasFrente = new Date();
    trintaDiasFrente.setDate(trintaDiasFrente.getDate() + 30);
    
    return dataValidade <= trintaDiasFrente;
  }

  /**
   * Obtém sugestões de verificação para o papel
   */
  getSugestoesVerificacao(): string[] {
    const sugestoes: string[] = [];
    
    if (this.isRepresentanteLegal() && !this.temDocumentoRepresentacao()) {
      sugestoes.push('Adicionar documento de representação legal');
    }
    
    if (this.expiraEmBreve()) {
      sugestoes.push('Renovar documento de representação (expira em breve)');
    }
    
    if (!this.temGrauParentesco() && this.isDependente()) {
      sugestoes.push('Definir grau de parentesco para dependente');
    }
    
    if (!this.isConsistente()) {
      sugestoes.push('Verificar consistência dos dados do papel');
    }
    
    return sugestoes;
  }
}
