import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PapelCidadao } from './papel-cidadao.entity';

/**
 * Entidade de Regra de Conflito de Papel
 *
 * Armazena as regras que definem conflitos entre papéis no sistema,
 * garantindo a integridade das regras de negócio.
 */
@Entity('regra_conflito_papel')
export class RegraConflitoPapel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'papel_origem_id', type: 'uuid' })
  papel_origem_id: string;

  @ManyToOne(() => PapelCidadao)
  @JoinColumn({ name: 'papel_origem_id' })
  papel_origem: PapelCidadao;

  @Column({ name: 'papel_destino_id', type: 'uuid' })
  papel_destino_id: string;

  @ManyToOne(() => PapelCidadao)
  @JoinColumn({ name: 'papel_destino_id' })
  papel_destino: PapelCidadao;

  @Column({ type: 'varchar', length: 255 })
  descricao: string;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updated_by: string;

  // Getters e Setters
  get papelOrigemId(): string {
    return this.papel_origem_id;
  }

  set papelOrigemId(value: string) {
    this.papel_origem_id = value;
  }

  get papelDestinoId(): string {
    return this.papel_destino_id;
  }

  set papelDestinoId(value: string) {
    this.papel_destino_id = value;
  }

  get createdAt(): Date {
    return this.created_at;
  }

  get updatedAt(): Date {
    return this.updated_at;
  }

  get createdBy(): string {
    return this.created_by;
  }

  get updatedBy(): string {
    return this.updated_by;
  }

  // Métodos Utilitários

  /**
   * Verifica se a regra foi criada recentemente (últimas 24 horas)
   */
  isCriadoRecentemente(): boolean {
    const agora = new Date();
    const umDiaAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
    return this.created_at > umDiaAtras;
  }

  /**
   * Calcula a idade da regra em dias
   */
  getIdadeEmDias(): number {
    const agora = new Date();
    const diffTime = Math.abs(agora.getTime() - this.created_at.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Verifica se a regra está ativa
   */
  isAtivo(): boolean {
    return this.ativo;
  }

  /**
   * Verifica se a regra foi modificada recentemente (últimas 24 horas)
   */
  foiModificadoRecentemente(): boolean {
    const agora = new Date();
    const umDiaAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
    return this.updated_at > umDiaAtras;
  }

  /**
   * Verifica se tem criador definido
   */
  temCriador(): boolean {
    return !!this.created_by;
  }

  /**
   * Verifica se tem editor definido
   */
  temEditor(): boolean {
    return !!this.updated_by;
  }

  /**
   * Verifica se foi criada por um usuário específico
   */
  foiCriadaPor(usuarioId: string): boolean {
    return this.created_by === usuarioId;
  }

  /**
   * Verifica se foi editada por um usuário específico
   */
  foiEditadaPor(usuarioId: string): boolean {
    return this.updated_by === usuarioId;
  }

  /**
   * Verifica se envolve um papel específico (origem ou destino)
   */
  envolvePapel(papelId: string): boolean {
    return (
      this.papel_origem_id === papelId || this.papel_destino_id === papelId
    );
  }

  /**
   * Verifica se é uma regra bidirecional (origem e destino são iguais)
   */
  isBidirecional(): boolean {
    return this.papel_origem_id === this.papel_destino_id;
  }

  /**
   * Obtém um resumo da regra
   */
  getSummary(): string {
    const status = this.isAtivo() ? 'Ativa' : 'Inativa';
    const tipo = this.isBidirecional() ? 'Bidirecional' : 'Unidirecional';
    return `${this.descricao} (${tipo}) - ${status}`;
  }

  /**
   * Gera uma chave única para a regra
   */
  getUniqueKey(): string {
    return `regra_${this.papel_origem_id}_${this.papel_destino_id}`;
  }

  /**
   * Verifica se a regra é consistente
   */
  isConsistente(): boolean {
    // Verifica se tem papéis origem e destino
    if (!this.papel_origem_id || !this.papel_destino_id) {return false;}

    // Verifica se tem descrição
    if (!this.descricao || this.descricao.trim().length === 0) {return false;}

    // Verifica se a descrição não é muito curta
    if (this.descricao.trim().length < 10) {return false;}

    return true;
  }

  /**
   * Verifica se pode ser removida
   */
  podeSerRemovida(): boolean {
    // Regras podem ser desativadas ao invés de removidas
    return true;
  }

  /**
   * Clona a regra (sem ID)
   */
  clone(): Partial<RegraConflitoPapel> {
    return {
      papel_origem_id: this.papel_origem_id,
      papel_destino_id: this.papel_destino_id,
      descricao: this.descricao,
      ativo: this.ativo,
    };
  }

  /**
   * Verifica se é uma regra crítica (afeta papéis importantes)
   */
  isCritica(): boolean {
    // Esta verificação dependeria dos tipos de papel envolvidos
    // Por enquanto, considera todas as regras como potencialmente críticas
    return this.isAtivo();
  }

  /**
   * Verifica se requer aprovação para mudanças
   */
  requerAprovacao(): boolean {
    // Regras ativas sempre requerem aprovação para mudanças
    return this.isAtivo();
  }

  /**
   * Obtém o tipo de conflito baseado na descrição
   */
  getTipoConflito(): 'INCOMPATIBILIDADE' | 'RESTRICAO' | 'VALIDACAO' | 'OUTRO' {
    const descricaoLower = this.descricao.toLowerCase();

    if (
      descricaoLower.includes('incompatível') ||
      descricaoLower.includes('conflito')
    ) {
      return 'INCOMPATIBILIDADE';
    }

    if (
      descricaoLower.includes('não pode') ||
      descricaoLower.includes('proibido')
    ) {
      return 'RESTRICAO';
    }

    if (
      descricaoLower.includes('validar') ||
      descricaoLower.includes('verificar')
    ) {
      return 'VALIDACAO';
    }

    return 'OUTRO';
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
  toSafeLog(): Partial<RegraConflitoPapel> {
    return {
      id: this.id,
      descricao: this.descricao,
      ativo: this.ativo,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  /**
   * Verifica se a regra precisa de revisão (muito antiga)
   */
  precisaRevisao(): boolean {
    // Regras com mais de 1 ano podem precisar de revisão
    return this.getIdadeEmDias() > 365;
  }

  /**
   * Obtém sugestões de melhoria para a regra
   */
  getSugestoesMelhoria(): string[] {
    const sugestoes: string[] = [];

    if (!this.isConsistente()) {
      sugestoes.push('Verificar e corrigir inconsistências na regra');
    }

    if (this.descricao.length < 20) {
      sugestoes.push('Expandir descrição da regra para maior clareza');
    }

    if (this.precisaRevisao()) {
      sugestoes.push('Revisar regra (criada há mais de 1 ano)');
    }

    if (!this.temCriador()) {
      sugestoes.push('Definir responsável pela criação da regra');
    }

    if (this.isBidirecional()) {
      sugestoes.push('Verificar se regra bidirecional está correta');
    }

    return sugestoes;
  }

  /**
   * Verifica se pode ser aplicada a um contexto específico
   */
  podeSerAplicada(contexto: {
    papelOrigemId: string;
    papelDestinoId: string;
  }): boolean {
    if (!this.isAtivo()) {return false;}

    // Verifica correspondência direta
    if (
      this.papel_origem_id === contexto.papelOrigemId &&
      this.papel_destino_id === contexto.papelDestinoId
    ) {
      return true;
    }

    // Se for bidirecional, verifica correspondência inversa
    if (
      this.isBidirecional() &&
      this.papel_origem_id === contexto.papelDestinoId &&
      this.papel_destino_id === contexto.papelOrigemId
    ) {
      return true;
    }

    return false;
  }

  /**
   * Obtém estatísticas da regra
   */
  getEstatisticas(): {
    idadeEmDias: number;
    tipo: string;
    status: string;
    ultimaModificacao: string;
  } {
    return {
      idadeEmDias: this.getIdadeEmDias(),
      tipo: this.getTipoConflito(),
      status: this.isAtivo() ? 'Ativa' : 'Inativa',
      ultimaModificacao: this.getAtualizacaoFormatada(),
    };
  }
}
