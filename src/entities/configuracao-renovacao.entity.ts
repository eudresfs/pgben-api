import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import {
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  IsUUID,
} from 'class-validator';
import { TipoBeneficio } from './tipo-beneficio.entity';

/**
 * Entidade de Configuração de Renovação Automática
 *
 * Armazena as configurações para renovação automática de benefícios,
 * permitindo definir regras específicas por tipo de benefício.
 */
@Entity('configuracao_renovacao')
@Index(['tipo_beneficio_id'])
export class ConfiguracaoRenovacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tipo_beneficio_id', type: 'uuid' })
  @IsNotEmpty({ message: 'ID do tipo de benefício é obrigatório' })
  @IsUUID('4', { message: 'ID do tipo de benefício inválido' })
  tipo_beneficio_id: string;

  @ManyToOne(() => TipoBeneficio, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipo_beneficio: TipoBeneficio;

  @Column({ name: 'renovacao_automatica', type: 'boolean', default: false })
  @IsBoolean({ message: 'Renovação automática deve ser um booleano' })
  renovacao_automatica: boolean;

  @Column({ name: 'dias_antecedencia_renovacao', type: 'integer', default: 7 })
  @IsNumber({}, { message: 'Dias de antecedência deve ser um número' })
  @Min(1, { message: 'Dias de antecedência deve ser no mínimo 1' })
  dias_antecedencia_renovacao: number;

  @Column({ name: 'numero_maximo_renovacoes', type: 'integer', nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Número máximo de renovações deve ser um número' })
  @Min(0, { message: 'Número máximo de renovações não pode ser negativo' })
  numero_maximo_renovacoes?: number;

  @Column({
    name: 'requer_aprovacao_renovacao',
    type: 'boolean',
    default: true,
  })
  @IsBoolean({ message: 'Requer aprovação de renovação deve ser um booleano' })
  requer_aprovacao_renovacao: boolean;

  @Column({ name: 'ativo', type: 'boolean', default: true })
  @IsBoolean({ message: 'Ativo deve ser um booleano' })
  ativo: boolean;

  @Column({ name: 'usuario_id', type: 'uuid' })
  @IsNotEmpty({ message: 'ID do usuário é obrigatório' })
  @IsUUID('4', { message: 'ID do usuário inválido' })
  usuario_id: string;

  @Column({ name: 'observacoes', type: 'text', nullable: true })
  @IsOptional()
  observacoes?: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  // Getters e Setters
  get createdAt(): Date {
    return this.created_at;
  }

  get updatedAt(): Date {
    return this.updated_at;
  }

  // Métodos Utilitários

  /**
   * Verifica se a configuração foi criada recentemente (últimas 24 horas)
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
   * Verifica se a configuração está ativa
   */
  isAtivo(): boolean {
    return this.ativo;
  }

  /**
   * Verifica se a renovação automática está habilitada
   */
  isRenovacaoAutomaticaHabilitada(): boolean {
    return this.renovacao_automatica && this.ativo;
  }

  /**
   * Verifica se requer aprovação para renovação
   */
  requerAprovacaoRenovacao(): boolean {
    return this.requer_aprovacao_renovacao;
  }

  /**
   * Verifica se tem limite de renovações
   */
  temLimiteRenovacoes(): boolean {
    return (
      this.numero_maximo_renovacoes !== null &&
      this.numero_maximo_renovacoes !== undefined &&
      this.numero_maximo_renovacoes > 0
    );
  }

  /**
   * Obtém o número máximo de renovações
   */
  getNumeroMaximoRenovacoes(): number | null {
    return this.numero_maximo_renovacoes || null;
  }

  /**
   * Obtém os dias de antecedência para renovação
   */
  getDiasAntecedenciaRenovacao(): number {
    return this.dias_antecedencia_renovacao;
  }

  /**
   * Calcula a data limite para iniciar o processo de renovação
   * baseado na data de vencimento do benefício
   */
  calcularDataInicioRenovacao(dataVencimento: Date): Date {
    const dataInicio = new Date(dataVencimento);
    dataInicio.setDate(dataInicio.getDate() - this.dias_antecedencia_renovacao);
    return dataInicio;
  }

  /**
   * Verifica se é hora de iniciar o processo de renovação
   */
  isHoraDeRenovar(dataVencimento: Date): boolean {
    if (!this.isRenovacaoAutomaticaHabilitada()) {return false;}

    const agora = new Date();
    const dataInicioRenovacao =
      this.calcularDataInicioRenovacao(dataVencimento);

    return agora >= dataInicioRenovacao;
  }

  /**
   * Verifica se ainda pode renovar baseado no limite
   */
  podeRenovar(numeroRenovacoesRealizadas: number): boolean {
    if (!this.isRenovacaoAutomaticaHabilitada()) {return false;}

    if (!this.temLimiteRenovacoes()) {return true;}

    return (
      this.numero_maximo_renovacoes !== undefined &&
      numeroRenovacoesRealizadas < this.numero_maximo_renovacoes
    );
  }

  /**
   * Calcula quantas renovações ainda são possíveis
   */
  getRenovacoesRestantes(numeroRenovacoesRealizadas: number): number {
    if (!this.temLimiteRenovacoes()) {return -1;} // Ilimitado

    const restantes =
      (this.numero_maximo_renovacoes ?? 0) - numeroRenovacoesRealizadas;
    return Math.max(0, restantes);
  }

  /**
   * Verifica se pertence a um tipo de benefício
   */
  pertenceAoTipoBeneficio(tipoBeneficioId: string): boolean {
    return this.tipo_beneficio_id === tipoBeneficioId;
  }

  /**
   * Verifica se foi configurado por um usuário
   */
  foiConfiguradoPorUsuario(usuarioId: string): boolean {
    return this.usuario_id === usuarioId;
  }

  /**
   * Obtém um resumo da configuração
   */
  getSummary(): string {
    const renovacao = this.isRenovacaoAutomaticaHabilitada()
      ? 'Habilitada'
      : 'Desabilitada';
    const aprovacao = this.requerAprovacaoRenovacao()
      ? 'Requer aprovação'
      : 'Automática';
    const limite = this.temLimiteRenovacoes()
      ? `Máx: ${this.numero_maximo_renovacoes}`
      : 'Ilimitado';

    return `Renovação: ${renovacao} | ${aprovacao} | ${limite} | ${this.dias_antecedencia_renovacao} dias antecedência`;
  }

  /**
   * Gera uma chave única para a configuração
   */
  getUniqueKey(): string {
    return `config_renovacao_${this.tipo_beneficio_id}`;
  }

  /**
   * Verifica se a configuração é consistente
   */
  isConsistente(): boolean {
    // Verifica se tem tipo de benefício
    if (!this.tipo_beneficio_id) {return false;}

    // Verifica se tem usuário
    if (!this.usuario_id) {return false;}

    // Verifica se dias de antecedência é válido
    if (this.dias_antecedencia_renovacao < 1) {return false;}

    // Se tem limite, deve ser positivo
    if (
      this.temLimiteRenovacoes() &&
      this.numero_maximo_renovacoes !== undefined &&
      this.numero_maximo_renovacoes <= 0
    ) {
      return false;
    }

    return true;
  }

  /**
   * Verifica se pode ser removida
   */
  podeSerRemovida(): boolean {
    // Pode implementar lógica adicional aqui
    // Por exemplo, verificar se tem benefícios ativos usando esta configuração
    return true;
  }

  /**
   * Clona a configuração (sem ID)
   */
  clone(): Partial<ConfiguracaoRenovacao> {
    return {
      tipo_beneficio_id: this.tipo_beneficio_id,
      renovacao_automatica: this.renovacao_automatica,
      dias_antecedencia_renovacao: this.dias_antecedencia_renovacao,
      numero_maximo_renovacoes: this.numero_maximo_renovacoes,
      requer_aprovacao_renovacao: this.requer_aprovacao_renovacao,
      ativo: this.ativo,
      usuario_id: this.usuario_id,
      observacoes: this.observacoes,
    };
  }

  /**
   * Verifica se é uma configuração crítica
   */
  isCritica(): boolean {
    // Configurações com renovação automática sem aprovação são críticas
    return (
      this.isRenovacaoAutomaticaHabilitada() && !this.requerAprovacaoRenovacao()
    );
  }

  /**
   * Obtém o nível de automação
   */
  getNivelAutomacao(): 'MANUAL' | 'SEMI_AUTOMATICO' | 'AUTOMATICO' {
    if (!this.renovacao_automatica) {return 'MANUAL';}
    if (this.requer_aprovacao_renovacao) {return 'SEMI_AUTOMATICO';}
    return 'AUTOMATICO';
  }

  /**
   * Obtém a descrição do nível de automação
   */
  getDescricaoNivelAutomacao(): string {
    const descricoes = {
      MANUAL: 'Renovação manual - requer intervenção do usuário',
      SEMI_AUTOMATICO:
        'Renovação semi-automática - processo automático com aprovação',
      AUTOMATICO: 'Renovação totalmente automática - sem intervenção manual',
    };
    return descricoes[this.getNivelAutomacao()];
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
  toSafeLog(): Partial<ConfiguracaoRenovacao> {
    return {
      id: this.id,
      tipo_beneficio_id: this.tipo_beneficio_id,
      renovacao_automatica: this.renovacao_automatica,
      dias_antecedencia_renovacao: this.dias_antecedencia_renovacao,
      numero_maximo_renovacoes: this.numero_maximo_renovacoes,
      requer_aprovacao_renovacao: this.requer_aprovacao_renovacao,
      ativo: this.ativo,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  /**
   * Obtém sugestões de melhoria para a configuração
   */
  getSugestoesMelhoria(): string[] {
    const sugestoes: string[] = [];

    if (!this.observacoes || this.observacoes.trim().length === 0) {
      sugestoes.push('Adicionar observações sobre a configuração');
    }

    if (
      this.isRenovacaoAutomaticaHabilitada() &&
      !this.requerAprovacaoRenovacao()
    ) {
      sugestoes.push('Considerar exigir aprovação para renovações automáticas');
    }

    if (!this.temLimiteRenovacoes()) {
      sugestoes.push('Considerar definir um limite máximo de renovações');
    }

    if (this.dias_antecedencia_renovacao < 7) {
      sugestoes.push(
        'Considerar aumentar os dias de antecedência para pelo menos 7 dias',
      );
    }

    if (!this.isConsistente()) {
      sugestoes.push('Verificar e corrigir inconsistências nos dados');
    }

    return sugestoes;
  }

  /**
   * Verifica se precisa de atualização (dados muito antigos)
   */
  precisaAtualizacao(): boolean {
    // Configurações com mais de 1 ano podem precisar de revisão
    const umAnoAtras = new Date();
    umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
    return this.updated_at < umAnoAtras;
  }

  /**
   * Obtém estatísticas da configuração
   */
  getEstatisticas(): {
    nivelAutomacao: string;
    diasAntecedencia: number;
    temLimite: boolean;
    limiteRenovacoes: number | null;
    requerAprovacao: boolean;
    ativo: boolean;
  } {
    return {
      nivelAutomacao: this.getNivelAutomacao(),
      diasAntecedencia: this.dias_antecedencia_renovacao,
      temLimite: this.temLimiteRenovacoes(),
      limiteRenovacoes: this.getNumeroMaximoRenovacoes(),
      requerAprovacao: this.requer_aprovacao_renovacao,
      ativo: this.ativo,
    };
  }

  /**
   * Simula o processo de renovação
   */
  simularRenovacao(
    dataVencimento: Date,
    numeroRenovacoesRealizadas: number,
  ): {
    podeRenovar: boolean;
    dataInicioRenovacao: Date;
    renovacoesRestantes: number;
    requerAprovacao: boolean;
    motivo?: string;
  } {
    const podeRenovar = this.podeRenovar(numeroRenovacoesRealizadas);
    const dataInicioRenovacao =
      this.calcularDataInicioRenovacao(dataVencimento);
    const renovacoesRestantes = this.getRenovacoesRestantes(
      numeroRenovacoesRealizadas,
    );

    let motivo: string | undefined;
    if (!podeRenovar) {
      if (!this.isRenovacaoAutomaticaHabilitada()) {
        motivo = 'Renovação automática não está habilitada';
      } else if (
        this.temLimiteRenovacoes() &&
        this.numero_maximo_renovacoes !== undefined &&
        numeroRenovacoesRealizadas >= this.numero_maximo_renovacoes
      ) {
        motivo = 'Limite máximo de renovações atingido';
      }
    }

    return {
      podeRenovar,
      dataInicioRenovacao,
      renovacoesRestantes,
      requerAprovacao: this.requer_aprovacao_renovacao,
      motivo,
    };
  }
}
