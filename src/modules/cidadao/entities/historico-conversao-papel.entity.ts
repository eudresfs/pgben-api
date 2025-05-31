import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Cidadao } from './cidadao.entity';
import { TipoPapel, PaperType } from '../enums/tipo-papel.enum';

/**
 * Entidade de Histórico de Conversão de Papel
 *
 * Registra o histórico de conversões de papéis de cidadãos no sistema,
 * permitindo rastrear quando um cidadão foi convertido de um papel para outro.
 */
@Entity('historico_conversao_papel')
@Index(['cidadao_id', 'created_at'])
export class HistoricoConversaoPapel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cidadao_id', type: 'uuid' })
  cidadao_id: string;

  @ManyToOne(() => Cidadao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cidadao_id' })
  cidadao: Cidadao;

  @Column({
    name: 'papel_anterior',
    type: 'enum',
    enum: TipoPapel,
    enumName: 'tipo_papel',
  })
  papel_anterior: PaperType;

  @Column({
    name: 'papel_novo',
    type: 'enum',
    enum: TipoPapel,
    enumName: 'tipo_papel',
  })
  papel_novo: PaperType;

  @Column({ name: 'composicao_familiar_id', type: 'uuid', nullable: true })
  composicao_familiar_id: string;

  @Column({ name: 'usuario_id', type: 'uuid' })
  usuario_id: string;

  @Column({ name: 'justificativa', type: 'text' })
  justificativa: string;

  @Column({ name: 'notificacao_enviada', type: 'boolean', default: false })
  notificacao_enviada: boolean;

  @Column({ name: 'tecnico_notificado_id', type: 'uuid', nullable: true })
  tecnico_notificado_id: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  // Getters e Setters
  get cidadaoId(): string {
    return this.cidadao_id;
  }

  set cidadaoId(value: string) {
    this.cidadao_id = value;
  }

  get usuarioId(): string {
    return this.usuario_id;
  }

  set usuarioId(value: string) {
    this.usuario_id = value;
  }

  get composicaoFamiliarId(): string {
    return this.composicao_familiar_id;
  }

  set composicaoFamiliarId(value: string) {
    this.composicao_familiar_id = value;
  }

  get tecnicoNotificadoId(): string {
    return this.tecnico_notificado_id;
  }

  set tecnicoNotificadoId(value: string) {
    this.tecnico_notificado_id = value;
  }

  get createdAt(): Date {
    return this.created_at;
  }

  // Métodos Utilitários

  /**
   * Verifica se a conversão foi criada recentemente (últimas 24 horas)
   */
  isCriadoRecentemente(): boolean {
    const agora = new Date();
    const umDiaAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
    return this.created_at > umDiaAtras;
  }

  /**
   * Calcula a idade do registro em dias
   */
  getIdadeRegistroEmDias(): number {
    const agora = new Date();
    const diffTime = Math.abs(agora.getTime() - this.created_at.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Verifica se a notificação foi enviada
   */
  isNotificacaoEnviada(): boolean {
    return this.notificacao_enviada;
  }

  /**
   * Verifica se tem técnico notificado
   */
  temTecnicoNotificado(): boolean {
    return !!this.tecnico_notificado_id;
  }

  /**
   * Verifica se tem composição familiar associada
   */
  temComposicaoFamiliar(): boolean {
    return !!this.composicao_familiar_id;
  }

  /**
   * Verifica se é uma promoção (papel novo é "superior" ao anterior)
   */
  isPromocao(): boolean {
    const hierarquia = {
      [TipoPapel.DEPENDENTE]: 1,
      [TipoPapel.BENEFICIARIO]: 2,
      [TipoPapel.REPRESENTANTE_LEGAL]: 3,
      [TipoPapel.REQUERENTE]: 4,
    };
    
    return hierarquia[this.papel_novo] > hierarquia[this.papel_anterior];
  }

  /**
   * Verifica se é uma redução de papel
   */
  isReducao(): boolean {
    const hierarquia = {
      [TipoPapel.DEPENDENTE]: 1,
      [TipoPapel.BENEFICIARIO]: 2,
      [TipoPapel.REPRESENTANTE_LEGAL]: 3,
      [TipoPapel.REQUERENTE]: 4,
    };
    
    return hierarquia[this.papel_novo] < hierarquia[this.papel_anterior];
  }

  /**
   * Verifica se é uma mudança lateral (mesmo nível hierárquico)
   */
  isMudancaLateral(): boolean {
    return !this.isPromocao() && !this.isReducao();
  }

  /**
   * Obtém a descrição do papel anterior
   */
  getDescricaoPapelAnterior(): string {
    const descricoes = {
      [TipoPapel.REQUERENTE]: 'Responsável Familiar',
      [TipoPapel.BENEFICIARIO]: 'Beneficiário',
      [TipoPapel.REPRESENTANTE_LEGAL]: 'Representante Legal',
      [TipoPapel.DEPENDENTE]: 'Dependente',
    };
    return descricoes[this.papel_anterior] || this.papel_anterior;
  }

  /**
   * Obtém a descrição do papel novo
   */
  getDescricaoPapelNovo(): string {
    const descricoes = {
      [TipoPapel.REQUERENTE]: 'Responsável Familiar',
      [TipoPapel.BENEFICIARIO]: 'Beneficiário',
      [TipoPapel.REPRESENTANTE_LEGAL]: 'Representante Legal',
      [TipoPapel.DEPENDENTE]: 'Dependente',
    };
    return descricoes[this.papel_novo] || this.papel_novo;
  }

  /**
   * Obtém a descrição da mudança
   */
  getDescricaoMudanca(): string {
    const anterior = this.getDescricaoPapelAnterior();
    const novo = this.getDescricaoPapelNovo();
    
    if (this.isPromocao()) {
      return `Promoção: ${anterior} → ${novo}`;
    } else if (this.isReducao()) {
      return `Redução: ${anterior} → ${novo}`;
    } else {
      return `Mudança: ${anterior} → ${novo}`;
    }
  }

  /**
   * Verifica se pertence a um cidadão específico
   */
  pertenceAoCidadao(cidadaoId: string): boolean {
    return this.cidadao_id === cidadaoId;
  }

  /**
   * Verifica se foi executado por um usuário específico
   */
  foiExecutadoPorUsuario(usuarioId: string): boolean {
    return this.usuario_id === usuarioId;
  }

  /**
   * Verifica se o técnico notificado é específico
   */
  tecnicoNotificadoEh(tecnicoId: string): boolean {
    return this.tecnico_notificado_id === tecnicoId;
  }

  /**
   * Obtém um resumo da conversão
   */
  getSummary(): string {
    const mudanca = this.getDescricaoMudanca();
    const data = this.getCriacaoFormatada();
    const notificacao = this.isNotificacaoEnviada() ? ' (Notificado)' : '';
    return `${mudanca} em ${data}${notificacao}`;
  }

  /**
   * Gera uma chave única para o histórico
   */
  getUniqueKey(): string {
    return `historico_${this.cidadao_id}_${this.created_at.getTime()}`;
  }

  /**
   * Verifica se o histórico é consistente
   */
  isConsistente(): boolean {
    // Verifica se tem cidadão
    if (!this.cidadao_id) return false;
    
    // Verifica se tem usuário
    if (!this.usuario_id) return false;
    
    // Verifica se tem papéis válidos
    if (!this.papel_anterior || !this.papel_novo) return false;
    
    // Verifica se os papéis são diferentes
    if (this.papel_anterior === this.papel_novo) return false;
    
    // Verifica se tem justificativa
    if (!this.justificativa || this.justificativa.trim().length === 0) return false;
    
    return true;
  }

  /**
   * Clona o histórico (sem ID)
   */
  clone(): Partial<HistoricoConversaoPapel> {
    return {
      cidadao_id: this.cidadao_id,
      papel_anterior: this.papel_anterior,
      papel_novo: this.papel_novo,
      composicao_familiar_id: this.composicao_familiar_id,
      usuario_id: this.usuario_id,
      justificativa: this.justificativa,
      notificacao_enviada: this.notificacao_enviada,
      tecnico_notificado_id: this.tecnico_notificado_id,
    };
  }

  /**
   * Verifica se é uma conversão crítica (requer atenção especial)
   */
  isCritico(): boolean {
    // Conversões para responsável familiar são críticas
    if (this.papel_novo === TipoPapel.REQUERENTE) return true;
    
    // Remoção de responsável familiar é crítica
    if (this.papel_anterior === TipoPapel.REQUERENTE) return true;
    
    // Conversões recentes sem notificação são críticas
    if (this.isCriadoRecentemente() && !this.isNotificacaoEnviada()) return true;
    
    return false;
  }

  /**
   * Verifica se requer aprovação adicional
   */
  requerAprovacao(): boolean {
    // Mudanças para responsável familiar requerem aprovação
    if (this.papel_novo === TipoPapel.REQUERENTE) return true;
    
    // Reduções de papel requerem aprovação
    if (this.isReducao()) return true;
    
    return false;
  }

  /**
   * Obtém o tipo de impacto da conversão
   */
  getTipoImpacto(): 'ALTO' | 'MEDIO' | 'BAIXO' {
    if (this.isCritico()) return 'ALTO';
    if (this.requerAprovacao()) return 'MEDIO';
    return 'BAIXO';
  }

  /**
   * Formata a data de criação
   */
  getCriacaoFormatada(): string {
    return this.created_at.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Remove informações sensíveis para logs
   */
  toSafeLog(): Partial<HistoricoConversaoPapel> {
    return {
      id: this.id,
      papel_anterior: this.papel_anterior,
      papel_novo: this.papel_novo,
      notificacao_enviada: this.notificacao_enviada,
      created_at: this.created_at,
    };
  }

  /**
   * Verifica se a notificação está pendente há muito tempo
   */
  notificacaoPendenteMuitoTempo(): boolean {
    if (this.isNotificacaoEnviada()) return false;
    
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
    return this.created_at < seteDiasAtras;
  }

  /**
   * Obtém sugestões de ação para o histórico
   */
  getSugestoesAcao(): string[] {
    const sugestoes: string[] = [];
    
    if (!this.isNotificacaoEnviada()) {
      sugestoes.push('Enviar notificação sobre a conversão');
    }
    
    if (this.notificacaoPendenteMuitoTempo()) {
      sugestoes.push('Notificação pendente há mais de 7 dias - verificar urgência');
    }
    
    if (this.isCritico() && !this.temTecnicoNotificado()) {
      sugestoes.push('Conversão crítica - notificar técnico responsável');
    }
    
    if (!this.isConsistente()) {
      sugestoes.push('Verificar consistência dos dados do histórico');
    }
    
    return sugestoes;
  }

  /**
   * Verifica se pode ser auditado
   */
  podeSerAuditado(): boolean {
    return this.isConsistente() && this.getIdadeRegistroEmDias() >= 1;
  }

  /**
   * Obtém estatísticas da conversão
   */
  getEstatisticas(): {
    tipo_mudanca: string;
    impacto: string;
    dias_desde_conversao: number;
    notificacao_status: string;
  } {
    return {
      tipo_mudanca: this.isPromocao() ? 'PROMOCAO' : this.isReducao() ? 'REDUCAO' : 'LATERAL',
      impacto: this.getTipoImpacto(),
      dias_desde_conversao: this.getIdadeRegistroEmDias(),
      notificacao_status: this.isNotificacaoEnviada() ? 'ENVIADA' : 'PENDENTE'
    };
  }
}
