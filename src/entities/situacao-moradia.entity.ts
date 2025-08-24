import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';
import { Cidadao } from './cidadao.entity';
import {
  TipoMoradiaEnum,
  ProgramaHabitacionalEnum,
  TipoDesastreEnum,
  TipoDespesaEnum,
} from '../enums/situacao-moradia.enum';

@Entity('situacao_moradia')
@Index(['cidadao_id'], { unique: true })
export class SituacaoMoradia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'ID do cidadão é obrigatório' })
  cidadao_id: string;

  @OneToOne(() => Cidadao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cidadao_id' })
  cidadao: Cidadao;

  @Column({
    type: 'enum',
    enum: TipoMoradiaEnum,
    enumName: 'tipo_moradia_enum',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(TipoMoradiaEnum, { message: 'Tipo de moradia inválido' })
  tipo_moradia: TipoMoradiaEnum;

  @Column({ nullable: true })
  @IsOptional()
  numero_comodos: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Valor do aluguel deve ser um número' })
  @Min(0, { message: 'Valor do aluguel não pode ser negativo' })
  valor_aluguel: number;

  @Column({ nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Tempo de moradia deve ser um número' })
  tempo_moradia: number;

  @Column({ nullable: true })
  @IsOptional()
  possui_banheiro: boolean;

  @Column({ nullable: true })
  @IsOptional()
  possui_energia_eletrica: boolean;

  @Column({ nullable: true })
  @IsOptional()
  possui_agua_encanada: boolean;

  @Column({ nullable: true })
  @IsOptional()
  possui_coleta_lixo: boolean;

  // Seção 3 - Situações Especiais
  @Column({ type: 'boolean', nullable: true })
  @IsOptional()
  moradia_cedida: boolean;

  @Column({ type: 'boolean', nullable: true })
  @IsOptional()
  moradia_invadida: boolean;

  @Column({
    type: 'enum',
    enum: TipoDesastreEnum,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(TipoDesastreEnum)
  tipo_desastre: TipoDesastreEnum;

  @Column({ nullable: true })
  @IsOptional()
  descricao_desastre: string;

  @Column({ nullable: true })
  @IsOptional()
  outro_tipo_moradia: string;

  // Seção 4 - Programas Habitacionais
  @Column({
    type: 'enum',
    enum: ProgramaHabitacionalEnum,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(ProgramaHabitacionalEnum)
  programa_habitacional: ProgramaHabitacionalEnum;

  @Column({ type: 'boolean', nullable: true })
  @IsOptional()
  inscrito_programa_habitacional: boolean;

  @Column({ type: 'boolean', nullable: true })
  @IsOptional()
  reside_2_anos_natal: boolean;

  // Seção 5 - Despesas Mensais
  @Column('jsonb', { nullable: true })
  @IsOptional()
  despesas_mensais: Array<{
    tipo: TipoDespesaEnum;
    valor: number;
    descricao?: string;
  }>;

  @Column({ nullable: true })
  @IsOptional()
  observacoes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;

  // Getters e Setters
  get cidadaoId(): string {
    return this.cidadao_id;
  }

  set cidadaoId(value: string) {
    this.cidadao_id = value;
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
   * Verifica se a situação foi criada recentemente (últimas 24 horas)
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
   * Verifica se a situação foi removida
   */
  foiRemovido(): boolean {
    return !!this.removed_at;
  }

  /**
   * Verifica se a situação está ativa
   */
  isAtivo(): boolean {
    return !this.removed_at;
  }

  /**
   * Verifica se é moradia própria
   */
  isMoradiaPropria(): boolean {
    return this.tipo_moradia === TipoMoradiaEnum.PROPRIA;
  }

  /**
   * Verifica se é moradia alugada
   */
  isMoradiaAlugada(): boolean {
    return this.tipo_moradia === TipoMoradiaEnum.ALUGADA;
  }

  /**
   * Verifica se é moradia cedida
   */
  isMoradiaCedida(): boolean {
    return this.tipo_moradia === TipoMoradiaEnum.CEDIDA;
  }

  /**
   * Verifica se é ocupação
   */
  isOcupacao(): boolean {
    return this.tipo_moradia === TipoMoradiaEnum.OCUPACAO;
  }

  /**
   * Verifica se está em situação de rua
   */
  isSituacaoRua(): boolean {
    return this.tipo_moradia === TipoMoradiaEnum.SITUACAO_RUA;
  }

  /**
   * Verifica se está em abrigo
   */
  isAbrigo(): boolean {
    return this.tipo_moradia === TipoMoradiaEnum.ABRIGO;
  }

  /**
   * Verifica se tem moradia estável (própria ou alugada)
   */
  temMoradiaEstavel(): boolean {
    return this.isMoradiaPropria() || this.isMoradiaAlugada();
  }

  /**
   * Verifica se tem moradia precária (ocupação, situação de rua, abrigo)
   */
  temMoradiaPrecaria(): boolean {
    return this.isOcupacao() || this.isSituacaoRua() || this.isAbrigo();
  }

  /**
   * Verifica se tem valor de aluguel definido
   */
  temValorAluguel(): boolean {
    return (
      this.valor_aluguel !== null &&
      this.valor_aluguel !== undefined &&
      this.valor_aluguel > 0
    );
  }

  /**
   * Obtém o valor do aluguel formatado
   */
  getValorAluguelFormatado(): string {
    if (!this.temValorAluguel()) {
      return 'Não informado';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.valor_aluguel);
  }

  /**
   * Verifica se tem número de cômodos definido
   */
  temNumeroComodos(): boolean {
    return (
      this.numero_comodos !== null &&
      this.numero_comodos !== undefined &&
      this.numero_comodos > 0
    );
  }

  /**
   * Verifica se a moradia é adequada (tem infraestrutura básica)
   */
  isMoradiaAdequada(): boolean {
    return (
      this.possui_banheiro &&
      this.possui_energia_eletrica &&
      this.possui_agua_encanada &&
      this.possui_coleta_lixo
    );
  }

  /**
   * Conta quantos itens de infraestrutura possui
   */
  getItensInfraestrutura(): number {
    let count = 0;
    if (this.possui_banheiro) {
      count++;
    }
    if (this.possui_energia_eletrica) {
      count++;
    }
    if (this.possui_agua_encanada) {
      count++;
    }
    if (this.possui_coleta_lixo) {
      count++;
    }
    return count;
  }

  /**
   * Obtém a pontuação de adequação da moradia (0-100)
   */
  getPontuacaoAdequacao(): number {
    let pontos = 0;

    // Tipo de moradia (40 pontos)
    if (this.isMoradiaPropria()) {
      pontos += 40;
    } else if (this.isMoradiaAlugada()) {
      pontos += 35;
    } else if (this.isMoradiaCedida()) {
      pontos += 25;
    } else if (this.isOcupacao()) {
      pontos += 15;
    } else if (this.isAbrigo()) {
      pontos += 10;
    } else if (this.isSituacaoRua()) {
      pontos += 0;
    }

    // Infraestrutura (60 pontos - 15 cada)
    pontos += this.getItensInfraestrutura() * 15;

    return Math.min(pontos, 100);
  }

  /**
   * Verifica se tem tempo de moradia definido
   */
  temTempoMoradia(): boolean {
    return (
      this.tempo_moradia !== null &&
      this.tempo_moradia !== undefined &&
      this.tempo_moradia > 0
    );
  }

  /**
   * Verifica se mora há muito tempo no local (mais de 5 anos)
   */
  moraMuitoTempo(): boolean {
    return this.temTempoMoradia() && this.tempo_moradia >= 60; // 60 meses = 5 anos
  }

  /**
   * Verifica se mora há pouco tempo no local (menos de 1 ano)
   */
  moraPoucoTempo(): boolean {
    return this.temTempoMoradia() && this.tempo_moradia < 12; // menos de 12 meses
  }

  /**
   * Obtém a descrição do tipo de moradia
   */
  getDescricaoTipoMoradia(): string {
    const descricoes = {
      [TipoMoradiaEnum.PROPRIA]: 'Própria',
      [TipoMoradiaEnum.ALUGADA]: 'Alugada',
      [TipoMoradiaEnum.CEDIDA]: 'Cedida',
      [TipoMoradiaEnum.OCUPACAO]: 'Ocupação',
      [TipoMoradiaEnum.SITUACAO_RUA]: 'Situação de Rua',
      [TipoMoradiaEnum.ABRIGO]: 'Abrigo',
      [TipoMoradiaEnum.OUTRO]: 'Outro',
    };
    return descricoes[this.tipo_moradia] || 'Não informado';
  }

  /**
   * Obtém a descrição do tempo de moradia
   */
  getDescricaoTempoMoradia(): string {
    if (!this.temTempoMoradia()) {
      return 'Não informado';
    }

    if (this.tempo_moradia < 12) {
      return `${this.tempo_moradia} mês(es)`;
    } else {
      const anos = Math.floor(this.tempo_moradia / 12);
      const meses = this.tempo_moradia % 12;
      if (meses === 0) {
        return `${anos} ano(s)`;
      } else {
        return `${anos} ano(s) e ${meses} mês(es)`;
      }
    }
  }

  /**
   * Obtém lista de itens de infraestrutura disponíveis
   */
  getItensInfraestruturaDisponiveis(): string[] {
    const itens: string[] = [];
    if (this.possui_banheiro) {
      itens.push('Banheiro');
    }
    if (this.possui_energia_eletrica) {
      itens.push('Energia Elétrica');
    }
    if (this.possui_agua_encanada) {
      itens.push('Água Encanada');
    }
    if (this.possui_coleta_lixo) {
      itens.push('Coleta de Lixo');
    }
    return itens;
  }

  /**
   * Obtém lista de itens de infraestrutura faltantes
   */
  getItensInfraestruturaFaltantes(): string[] {
    const itens: string[] = [];
    if (!this.possui_banheiro) {
      itens.push('Banheiro');
    }
    if (!this.possui_energia_eletrica) {
      itens.push('Energia Elétrica');
    }
    if (!this.possui_agua_encanada) {
      itens.push('Água Encanada');
    }
    if (!this.possui_coleta_lixo) {
      itens.push('Coleta de Lixo');
    }
    return itens;
  }

  /**
   * Verifica se pertence a um cidadão específico
   */
  pertenceAoCidadao(cidadaoId: string): boolean {
    return this.cidadao_id === cidadaoId;
  }

  /**
   * Obtém um resumo da situação de moradia
   */
  getSummary(): string {
    const tipo = this.getDescricaoTipoMoradia();
    const adequacao = this.getPontuacaoAdequacao();
    const tempo = this.temTempoMoradia()
      ? ` - ${this.getDescricaoTempoMoradia()}`
      : '';
    return `${tipo} (${adequacao}% adequada)${tempo}`;
  }

  /**
   * Gera uma chave única para a situação
   */
  getUniqueKey(): string {
    return `situacao_moradia_${this.cidadao_id}`;
  }

  /**
   * Verifica se a situação é consistente
   */
  isConsistente(): boolean {
    // Verifica se tem cidadão
    if (!this.cidadao_id) {
      return false;
    }

    // Se é alugada, deve ter valor do aluguel
    if (this.isMoradiaAlugada() && !this.temValorAluguel()) {
      return false;
    }

    // Se tem valor de aluguel, deve ser moradia alugada
    if (this.temValorAluguel() && !this.isMoradiaAlugada()) {
      return false;
    }

    // Situação de rua não deveria ter infraestrutura
    if (this.isSituacaoRua() && this.getItensInfraestrutura() > 0) {
      return false;
    }

    return true;
  }

  /**
   * Verifica se pode ser removida
   */
  podeSerRemovido(): boolean {
    // Não pode remover se já foi removido
    if (this.foiRemovido()) {
      return false;
    }

    return true;
  }

  /**
   * Clona a situação de moradia (sem ID)
   */
  clone(): Partial<SituacaoMoradia> {
    return {
      cidadao_id: this.cidadao_id,
      tipo_moradia: this.tipo_moradia,
      numero_comodos: this.numero_comodos,
      valor_aluguel: this.valor_aluguel,
      tempo_moradia: this.tempo_moradia,
      possui_banheiro: this.possui_banheiro,
      possui_energia_eletrica: this.possui_energia_eletrica,
      possui_agua_encanada: this.possui_agua_encanada,
      possui_coleta_lixo: this.possui_coleta_lixo,
      observacoes: this.observacoes,
    };
  }

  /**
   * Verifica se é elegível para auxílio moradia
   */
  isElegivelAuxilioMoradia(): boolean {
    // Situações que podem ser elegíveis para auxílio
    return (
      this.isMoradiaAlugada() ||
      this.temMoradiaPrecaria() ||
      !this.isMoradiaAdequada()
    );
  }

  /**
   * Verifica se é prioritário para programas habitacionais
   */
  isPrioritarioHabitacao(): boolean {
    return (
      this.isSituacaoRua() ||
      this.isAbrigo() ||
      this.isOcupacao() ||
      this.getPontuacaoAdequacao() < 50
    );
  }

  /**
   * Obtém o nível de vulnerabilidade habitacional
   */
  getNivelVulnerabilidade(): 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO' {
    if (this.isSituacaoRua()) {
      return 'CRITICO';
    }
    if (this.isAbrigo() || this.isOcupacao()) {
      return 'ALTO';
    }
    if (!this.isMoradiaAdequada() || this.getPontuacaoAdequacao() < 50) {
      return 'MEDIO';
    }
    return 'BAIXO';
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
  toSafeLog(): Partial<SituacaoMoradia> {
    return {
      id: this.id,
      tipo_moradia: this.tipo_moradia,
      numero_comodos: this.numero_comodos,
      tempo_moradia: this.tempo_moradia,
      possui_banheiro: this.possui_banheiro,
      possui_energia_eletrica: this.possui_energia_eletrica,
      possui_agua_encanada: this.possui_agua_encanada,
      possui_coleta_lixo: this.possui_coleta_lixo,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  /**
   * Obtém sugestões de melhoria para a situação de moradia
   */
  getSugestoesMelhoria(): string[] {
    const sugestoes: string[] = [];

    if (this.temMoradiaPrecaria()) {
      sugestoes.push('Buscar programas habitacionais ou auxílio moradia');
    }

    if (!this.isMoradiaAdequada()) {
      const faltantes = this.getItensInfraestruturaFaltantes();
      sugestoes.push(`Melhorar infraestrutura: ${faltantes.join(', ')}`);
    }

    if (this.isMoradiaAlugada() && !this.temValorAluguel()) {
      sugestoes.push('Informar valor do aluguel para análise de benefícios');
    }

    if (!this.temTempoMoradia()) {
      sugestoes.push('Informar tempo de moradia no local atual');
    }

    if (!this.temNumeroComodos()) {
      sugestoes.push('Informar número de cômodos da moradia');
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
    // Dados com mais de 6 meses podem precisar de atualização
    const seiseMesesAtras = new Date();
    seiseMesesAtras.setMonth(seiseMesesAtras.getMonth() - 6);
    return this.updated_at < seiseMesesAtras;
  }

  /**
   * Obtém estatísticas da situação de moradia
   */
  getEstatisticas(): {
    pontuacaoAdequacao: number;
    nivelVulnerabilidade: string;
    itensInfraestrutura: number;
    tempoMoradia: string;
    elegibilidadeAuxilio: boolean;
  } {
    return {
      pontuacaoAdequacao: this.getPontuacaoAdequacao(),
      nivelVulnerabilidade: this.getNivelVulnerabilidade(),
      itensInfraestrutura: this.getItensInfraestrutura(),
      tempoMoradia: this.getDescricaoTempoMoradia(),
      elegibilidadeAuxilio: this.isElegivelAuxilioMoradia(),
    };
  }
}
