import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsString,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { TipoBeneficio } from './tipo-beneficio.entity';

/**
 * Enum para os tipos de entrega de cesta básica
 */
export enum TipoEntregaCestaBasica {
  PRESENCIAL = 'presencial',
  DOMICILIAR = 'domiciliar',
  CARTAO_ALIMENTACAO = 'cartao_alimentacao',
}

/**
 * Enum para os tipos de periodicidade de entrega
 */
export enum PeriodicidadeEntrega {
  UNICA = 'unica',
  MENSAL = 'mensal',
  BIMESTRAL = 'bimestral',
  TRIMESTRAL = 'trimestral',
  SEMESTRAL = 'semestral',
  ANUAL = 'anual',
}

/**
 * Enum para definir a periodicidade da cesta básica
 */
export enum PeriodicidadeCestaBasica {
  UNICA = 'unica',
  MENSAL = 'mensal',
  BIMESTRAL = 'bimestral',
  TRIMESTRAL = 'trimestral',
  SEMESTRAL = 'semestral',
}

/**
 * Entidade para armazenar as configurações específicas da Cesta Básica
 * 
 * Define os parâmetros e regras específicas para o benefício de cesta básica,
 * permitindo a parametrização dinâmica das regras de negócio.
 */
@Entity('especificacao_cesta_basica')
export class EspecificacaoCestaBasica {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Tipo de benefício é obrigatório' })
  @Index({ unique: true })
  tipo_beneficio_id: string;

  @ManyToOne(
    () => TipoBeneficio,
    { onDelete: 'CASCADE' }
  )
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipo_beneficio: TipoBeneficio;

  @Column({
    type: 'enum',
    enum: TipoEntregaCestaBasica,
    default: TipoEntregaCestaBasica.PRESENCIAL,
  })
  @IsEnum(TipoEntregaCestaBasica, { message: 'Tipo de entrega inválido' })
  tipo_entrega: TipoEntregaCestaBasica;
  
  @Column({
    type: 'enum',
    enum: PeriodicidadeEntrega,
    default: PeriodicidadeEntrega.UNICA,
  })
  @IsEnum(PeriodicidadeEntrega, { message: 'Periodicidade de entrega inválida' })
  periodicidade: PeriodicidadeEntrega;

  @Column({
    type: 'enum',
    enum: PeriodicidadeCestaBasica,
    default: PeriodicidadeCestaBasica.UNICA,
  })
  @IsEnum(PeriodicidadeCestaBasica, { message: 'Periodicidade inválida' })
  periodicidade_cesta: PeriodicidadeCestaBasica;

  @Column('int', { default: 1 })
  @IsNumber({}, { message: 'Quantidade de entregas deve ser um número' })
  @Min(1, { message: 'Quantidade de entregas deve ser maior que zero' })
  quantidade_entregas: number;

  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Exige comprovante de residência deve ser um booleano' })
  exige_comprovante_residencia: boolean;
  
  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Exige comprovação de vulnerabilidade deve ser um booleano' })
  exige_comprovacao_vulnerabilidade: boolean;
  
  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Permite substituição de itens deve ser um booleano' })
  permite_substituicao_itens: boolean;
  
  @Column({ type: 'simple-json', nullable: true })
  @IsOptional()
  @IsArray({ message: 'Itens obrigatórios deve ser um array' })
  itens_obrigatorios: string[];
  
  @Column({ type: 'simple-json', nullable: true })
  @IsOptional()
  @IsArray({ message: 'Itens opcionais deve ser um array' })
  itens_opcionais: string[];
  
  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString({ message: 'Local de entrega deve ser uma string' })
  local_entrega: string;
  
  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString({ message: 'Horário de entrega deve ser uma string' })
  horario_entrega: string;
  
  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Exige agendamento deve ser um booleano' })
  exige_agendamento: boolean;

  @Column('boolean', { default: true })
  @IsBoolean({ message: 'Requer comprovante de renda deve ser um booleano' })
  requer_comprovante_renda: boolean;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Renda máxima per capita deve ser um número' })
  @Min(0, { message: 'Renda máxima per capita deve ser maior ou igual a zero' })
  renda_maxima_per_capita: number;

  @Column('int', { nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Quantidade mínima de dependentes deve ser um número' })
  @Min(0, { message: 'Quantidade mínima de dependentes deve ser maior ou igual a zero' })
  quantidade_minima_dependentes: number;

  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Prioriza famílias com crianças deve ser um booleano' })
  prioriza_familias_com_criancas: boolean;

  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Prioriza idosos deve ser um booleano' })
  prioriza_idosos: boolean;

  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Prioriza pessoas com deficiência deve ser um booleano' })
  prioriza_pcd: boolean;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Valor da cesta deve ser um número' })
  @Min(0, { message: 'Valor da cesta deve ser maior ou igual a zero' })
  valor_cesta: number;



  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;

  // Getters e Setters
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
   * Verifica se a especificação foi criada recentemente (últimas 24 horas)
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
   * Verifica se foi removida
   */
  foiRemovida(): boolean {
    return !!this.removed_at;
  }

  /**
   * Verifica se está ativa
   */
  isAtiva(): boolean {
    return !this.removed_at;
  }

  /**
   * Verifica se é entrega presencial
   */
  isEntregaPresencial(): boolean {
    return this.tipo_entrega === TipoEntregaCestaBasica.PRESENCIAL;
  }

  /**
   * Verifica se é entrega domiciliar
   */
  isEntregaDomiciliar(): boolean {
    return this.tipo_entrega === TipoEntregaCestaBasica.DOMICILIAR;
  }

  /**
   * Verifica se é cartão alimentação
   */
  isCartaoAlimentacao(): boolean {
    return this.tipo_entrega === TipoEntregaCestaBasica.CARTAO_ALIMENTACAO;
  }

  /**
   * Obtém a descrição do tipo de entrega
   */
  getDescricaoTipoEntrega(): string {
    const descricoes = {
      [TipoEntregaCestaBasica.PRESENCIAL]: 'Retirada Presencial',
      [TipoEntregaCestaBasica.DOMICILIAR]: 'Entrega Domiciliar',
      [TipoEntregaCestaBasica.CARTAO_ALIMENTACAO]: 'Cartão Alimentação',
    };
    return descricoes[this.tipo_entrega] || 'Tipo não identificado';
  }

  /**
   * Verifica se é entrega única
   */
  isEntregaUnica(): boolean {
    return this.periodicidade === PeriodicidadeEntrega.UNICA;
  }

  /**
   * Verifica se é entrega recorrente
   */
  isEntregaRecorrente(): boolean {
    return !this.isEntregaUnica();
  }

  /**
   * Obtém a descrição da periodicidade
   */
  getDescricaoPeriodicidade(): string {
    const descricoes = {
      [PeriodicidadeEntrega.UNICA]: 'Entrega Única',
      [PeriodicidadeEntrega.MENSAL]: 'Mensal',
      [PeriodicidadeEntrega.BIMESTRAL]: 'Bimestral',
      [PeriodicidadeEntrega.TRIMESTRAL]: 'Trimestral',
      [PeriodicidadeEntrega.SEMESTRAL]: 'Semestral',
      [PeriodicidadeEntrega.ANUAL]: 'Anual',
    };
    return descricoes[this.periodicidade] || 'Periodicidade não identificada';
  }

  /**
   * Calcula o número de dias entre entregas
   */
  getDiasEntreEntregas(): number {
    const dias = {
      [PeriodicidadeEntrega.UNICA]: 0,
      [PeriodicidadeEntrega.MENSAL]: 30,
      [PeriodicidadeEntrega.BIMESTRAL]: 60,
      [PeriodicidadeEntrega.TRIMESTRAL]: 90,
      [PeriodicidadeEntrega.SEMESTRAL]: 180,
      [PeriodicidadeEntrega.ANUAL]: 365,
    };
    return dias[this.periodicidade] || 0;
  }

  /**
   * Calcula a próxima data de entrega
   */
  calcularProximaEntrega(ultimaEntrega: Date): Date | null {
    if (this.isEntregaUnica()) {
      return null;
    }
    
    const diasParaProxima = this.getDiasEntreEntregas();
    const proximaEntrega = new Date(ultimaEntrega);
    proximaEntrega.setDate(proximaEntrega.getDate() + diasParaProxima);
    
    return proximaEntrega;
  }

  /**
   * Verifica se exige comprovante de residência
   */
  exigeComprovanteResidencia(): boolean {
    return this.exige_comprovante_residencia;
  }

  /**
   * Verifica se exige comprovação de vulnerabilidade
   */
  exigeComprovacaoVulnerabilidade(): boolean {
    return this.exige_comprovacao_vulnerabilidade;
  }

  /**
   * Verifica se permite substituição de itens
   */
  permiteSubstituicaoItens(): boolean {
    return this.permite_substituicao_itens;
  }

  /**
   * Verifica se tem itens obrigatórios definidos
   */
  temItensObrigatorios(): boolean {
    return this.itens_obrigatorios && this.itens_obrigatorios.length > 0;
  }

  /**
   * Verifica se tem itens opcionais definidos
   */
  temItensOpcionais(): boolean {
    return this.itens_opcionais && this.itens_opcionais.length > 0;
  }

  /**
   * Obtém todos os itens (obrigatórios + opcionais)
   */
  getTodosItens(): string[] {
    const obrigatorios = this.itens_obrigatorios || [];
    const opcionais = this.itens_opcionais || [];
    return [...obrigatorios, ...opcionais];
  }

  /**
   * Verifica se um item está na lista
   */
  contemItem(item: string): boolean {
    return this.getTodosItens().includes(item);
  }

  /**
   * Verifica se um item é obrigatório
   */
  isItemObrigatorio(item: string): boolean {
    return this.itens_obrigatorios ? this.itens_obrigatorios.includes(item) : false;
  }

  /**
   * Verifica se exige agendamento
   */
  exigeAgendamento(): boolean {
    return this.exige_agendamento;
  }

  /**
   * Verifica se requer comprovante de renda
   */
  requerComprovanteRenda(): boolean {
    return this.requer_comprovante_renda;
  }

  /**
   * Verifica se tem renda máxima per capita definida
   */
  temRendaMaximaPerCapita(): boolean {
    return this.renda_maxima_per_capita !== null &&
           this.renda_maxima_per_capita !== undefined &&
           this.renda_maxima_per_capita > 0;
  }

  /**
   * Obtém a renda máxima per capita
   */
  getRendaMaximaPerCapita(): number {
    return this.renda_maxima_per_capita || 0;
  }

  /**
   * Formata a renda máxima per capita
   */
  getRendaMaximaPerCapitaFormatada(): string {
    if (!this.temRendaMaximaPerCapita()) {
      return 'Não definida';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.renda_maxima_per_capita);
  }

  /**
   * Verifica se tem quantidade mínima de dependentes
   */
  temQuantidadeMinimaDependentes(): boolean {
    return this.quantidade_minima_dependentes !== null &&
           this.quantidade_minima_dependentes !== undefined &&
           this.quantidade_minima_dependentes > 0;
  }

  /**
   * Obtém a quantidade mínima de dependentes
   */
  getQuantidadeMinimaDependentes(): number {
    return this.quantidade_minima_dependentes || 0;
  }

  /**
   * Verifica se prioriza famílias com crianças
   */
  priorizaFamiliasComCriancas(): boolean {
    return this.prioriza_familias_com_criancas;
  }

  /**
   * Verifica se prioriza idosos
   */
  priorizaIdosos(): boolean {
    return this.prioriza_idosos;
  }

  /**
   * Verifica se prioriza pessoas com deficiência
   */
  priorizaPcd(): boolean {
    return this.prioriza_pcd;
  }

  /**
   * Obtém os critérios de priorização
   */
  getCriteriosPriorizacao(): string[] {
    const criterios: string[] = [];
    
    if (this.priorizaFamiliasComCriancas()) {
      criterios.push('Famílias com crianças');
    }
    
    if (this.priorizaIdosos()) {
      criterios.push('Famílias com idosos');
    }
    
    if (this.priorizaPcd()) {
      criterios.push('Pessoas com deficiência');
    }
    
    return criterios;
  }

  /**
   * Verifica se tem valor da cesta definido
   */
  temValorCesta(): boolean {
    return this.valor_cesta !== null &&
           this.valor_cesta !== undefined &&
           this.valor_cesta > 0;
  }

  /**
   * Obtém o valor da cesta
   */
  getValorCesta(): number {
    return this.valor_cesta || 0;
  }

  /**
   * Formata o valor da cesta
   */
  getValorCestaFormatado(): string {
    if (!this.temValorCesta()) {
      return 'Não definido';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.valor_cesta);
  }

  /**
   * Calcula o valor total do benefício
   */
  calcularValorTotal(): number {
    if (!this.temValorCesta()) {
      return 0;
    }
    
    return this.valor_cesta * this.quantidade_entregas;
  }

  /**
   * Formata o valor total do benefício
   */
  getValorTotalFormatado(): string {
    const valorTotal = this.calcularValorTotal();
    if (valorTotal === 0) {
      return 'Não definido';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valorTotal);
  }

  /**
   * Valida se uma família atende aos critérios de renda
   */
  validarCriteriosRenda(rendaPerCapita: number): {
    valido: boolean;
    motivo?: string;
  } {
    if (!this.temRendaMaximaPerCapita()) {
      return { valido: true };
    }
    
    const valido = rendaPerCapita <= this.renda_maxima_per_capita;
    
    return {
      valido,
      motivo: valido ? undefined : 
        `Renda per capita (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rendaPerCapita)}) excede o limite máximo (${this.getRendaMaximaPerCapitaFormatada()})`
    };
  }

  /**
   * Valida se uma família atende aos critérios de dependentes
   */
  validarCriteriosDependentes(quantidadeDependentes: number): {
    valido: boolean;
    motivo?: string;
  } {
    if (!this.temQuantidadeMinimaDependentes()) {
      return { valido: true };
    }
    
    const valido = quantidadeDependentes >= this.quantidade_minima_dependentes;
    
    return {
      valido,
      motivo: valido ? undefined : 
        `Quantidade de dependentes (${quantidadeDependentes}) é menor que o mínimo exigido (${this.quantidade_minima_dependentes})`
    };
  }

  /**
   * Calcula a pontuação de prioridade de uma família
   */
  calcularPontuacaoPrioridade(familia: {
    temCriancas?: boolean;
    temIdosos?: boolean;
    temPcd?: boolean;
  }): number {
    let pontuacao = 0;
    
    if (this.priorizaFamiliasComCriancas() && familia.temCriancas) {
      pontuacao += 3;
    }
    
    if (this.priorizaIdosos() && familia.temIdosos) {
      pontuacao += 2;
    }
    
    if (this.priorizaPcd() && familia.temPcd) {
      pontuacao += 2;
    }
    
    return pontuacao;
  }

  /**
   * Verifica se pertence a um tipo de benefício
   */
  pertenceAoTipoBeneficio(tipoBeneficioId: string): boolean {
    return this.tipo_beneficio_id === tipoBeneficioId;
  }

  /**
   * Obtém um resumo da especificação
   */
  getSummary(): string {
    const entrega = this.getDescricaoTipoEntrega();
    const periodicidade = this.getDescricaoPeriodicidade();
    const valor = this.getValorCestaFormatado();
    const entregas = this.quantidade_entregas;
    
    return `${entrega} | ${periodicidade} | ${entregas} entrega(s) | Valor: ${valor}`;
  }

  /**
   * Gera uma chave única para a especificação
   */
  getUniqueKey(): string {
    return `especificacao_cesta_${this.tipo_beneficio_id}`;
  }

  /**
   * Verifica se a especificação é consistente
   */
  isConsistente(): boolean {
    // Verifica se tem tipo de benefício
    if (!this.tipo_beneficio_id) return false;
    
    // Verifica se quantidade de entregas é válida
    if (this.quantidade_entregas < 1) return false;
    
    // Se é entrega domiciliar, deve ter local de entrega
    if (this.isEntregaDomiciliar() && !this.local_entrega) {
      return false;
    }
    
    // Se exige agendamento, deve ter horário definido
    if (this.exigeAgendamento() && !this.horario_entrega) {
      return false;
    }
    
    // Se tem renda máxima, deve ser positiva
    if (this.temRendaMaximaPerCapita() && this.renda_maxima_per_capita <= 0) {
      return false;
    }
    
    // Se tem valor da cesta, deve ser positivo
    if (this.temValorCesta() && this.valor_cesta <= 0) {
      return false;
    }
    
    return true;
  }

  /**
   * Verifica se pode ser removida
   */
  podeSerRemovida(): boolean {
    // Não pode remover se já foi removida
    if (this.foiRemovida()) return false;
    
    // Pode implementar lógica adicional aqui
    // Por exemplo, verificar se tem benefícios ativos usando esta especificação
    
    return true;
  }

  /**
   * Clona a especificação (sem ID)
   */
  clone(): Partial<EspecificacaoCestaBasica> {
    return {
      tipo_beneficio_id: this.tipo_beneficio_id,
      tipo_entrega: this.tipo_entrega,
      periodicidade: this.periodicidade,
      periodicidade_cesta: this.periodicidade_cesta,
      quantidade_entregas: this.quantidade_entregas,
      exige_comprovante_residencia: this.exige_comprovante_residencia,
      exige_comprovacao_vulnerabilidade: this.exige_comprovacao_vulnerabilidade,
      permite_substituicao_itens: this.permite_substituicao_itens,
      itens_obrigatorios: this.itens_obrigatorios ? [...this.itens_obrigatorios] : undefined,
      itens_opcionais: this.itens_opcionais ? [...this.itens_opcionais] : undefined,
      local_entrega: this.local_entrega,
      horario_entrega: this.horario_entrega,
      exige_agendamento: this.exige_agendamento,
      requer_comprovante_renda: this.requer_comprovante_renda,
      renda_maxima_per_capita: this.renda_maxima_per_capita,
      quantidade_minima_dependentes: this.quantidade_minima_dependentes,
      prioriza_familias_com_criancas: this.prioriza_familias_com_criancas,
      prioriza_idosos: this.prioriza_idosos,
      prioriza_pcd: this.prioriza_pcd,
      valor_cesta: this.valor_cesta,
    };
  }

  /**
   * Verifica se é uma especificação complexa
   */
  isComplexa(): boolean {
    let pontos = 0;
    
    // Entrega domiciliar é mais complexa
    if (this.isEntregaDomiciliar()) pontos += 2;
    
    // Entrega recorrente é mais complexa
    if (this.isEntregaRecorrente()) pontos += 1;
    
    // Múltiplas entregas
    if (this.quantidade_entregas > 1) pontos += 1;
    
    // Exige agendamento
    if (this.exigeAgendamento()) pontos += 1;
    
    // Tem critérios de priorização
    if (this.getCriteriosPriorizacao().length > 0) pontos += 1;
    
    // Tem muitos itens
    if (this.getTodosItens().length > 10) pontos += 1;
    
    return pontos >= 3;
  }

  /**
   * Obtém o nível de exigência
   */
  getNivelExigencia(): 'BAIXA' | 'MEDIA' | 'ALTA' {
    let pontos = 0;
    
    // Exigências de documentação
    if (this.exigeComprovanteResidencia()) pontos += 1;
    if (this.exigeComprovacaoVulnerabilidade()) pontos += 1;
    if (this.requerComprovanteRenda()) pontos += 1;
    
    // Critérios restritivos
    if (this.temRendaMaximaPerCapita()) pontos += 1;
    if (this.temQuantidadeMinimaDependentes()) pontos += 1;
    
    // Exigências operacionais
    if (this.exigeAgendamento()) pontos += 1;
    if (!this.permiteSubstituicaoItens()) pontos += 1;
    
    if (pontos <= 2) return 'BAIXA';
    if (pontos <= 4) return 'MEDIA';
    return 'ALTA';
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
  toSafeLog(): Partial<EspecificacaoCestaBasica> {
    return {
      id: this.id,
      tipo_beneficio_id: this.tipo_beneficio_id,
      tipo_entrega: this.tipo_entrega,
      periodicidade: this.periodicidade,
      quantidade_entregas: this.quantidade_entregas,
      valor_cesta: this.valor_cesta,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  /**
   * Obtém sugestões de melhoria para a especificação
   */
  getSugestoesMelhoria(): string[] {
    const sugestoes: string[] = [];
    
    if (this.getNivelExigencia() === 'ALTA') {
      sugestoes.push('Especificação muito exigente - considerar flexibilizar critérios');
    }
    
    if (!this.temItensObrigatorios()) {
      sugestoes.push('Considerar definir itens obrigatórios para a cesta');
    }
    
    if (!this.temValorCesta()) {
      sugestoes.push('Definir valor da cesta para melhor controle orçamentário');
    }
    
    if (this.isEntregaDomiciliar() && !this.local_entrega) {
      sugestoes.push('Definir local de entrega para entregas domiciliares');
    }
    
    if (this.exigeAgendamento() && !this.horario_entrega) {
      sugestoes.push('Definir horário de entrega quando exige agendamento');
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
    // Especificações com mais de 6 meses podem precisar de revisão
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
    return this.updated_at < seisMesesAtras;
  }

  /**
   * Obtém estatísticas da especificação
   */
  getEstatisticas(): {
    tipoEntrega: string;
    periodicidade: string;
    quantidadeEntregas: number;
    valorTotal: number;
    numeroItens: number;
    nivelExigencia: string;
    criteriosPriorizacao: number;
  } {
    return {
      tipoEntrega: this.getDescricaoTipoEntrega(),
      periodicidade: this.getDescricaoPeriodicidade(),
      quantidadeEntregas: this.quantidade_entregas,
      valorTotal: this.calcularValorTotal(),
      numeroItens: this.getTodosItens().length,
      nivelExigencia: this.getNivelExigencia(),
      criteriosPriorizacao: this.getCriteriosPriorizacao().length,
    };
  }

  /**
   * Simula a elegibilidade para o benefício
   */
  simularElegibilidade(dados: {
    rendaPerCapita?: number;
    quantidadeDependentes?: number;
    temCriancas?: boolean;
    temIdosos?: boolean;
    temPcd?: boolean;
    temComprovanteResidencia?: boolean;
    temComprovanteVulnerabilidade?: boolean;
    temComprovanteRenda?: boolean;
  }): {
    elegivel: boolean;
    motivos: string[];
    pontuacaoPrioridade: number;
    observacoes: string[];
  } {
    const motivos: string[] = [];
    const observacoes: string[] = [];
    
    // Verifica critérios de renda
    if (dados.rendaPerCapita !== undefined) {
      const validacaoRenda = this.validarCriteriosRenda(dados.rendaPerCapita);
      if (!validacaoRenda.valido) {
        motivos.push(validacaoRenda.motivo!);
      }
    }
    
    // Verifica critérios de dependentes
    if (dados.quantidadeDependentes !== undefined) {
      const validacaoDependentes = this.validarCriteriosDependentes(dados.quantidadeDependentes);
      if (!validacaoDependentes.valido) {
        motivos.push(validacaoDependentes.motivo!);
      }
    }
    
    // Verifica documentos obrigatórios
    if (this.exigeComprovanteResidencia() && !dados.temComprovanteResidencia) {
      motivos.push('Comprovante de residência é obrigatório');
    }
    
    if (this.exigeComprovacaoVulnerabilidade() && !dados.temComprovanteVulnerabilidade) {
      motivos.push('Comprovação de vulnerabilidade é obrigatória');
    }
    
    if (this.requerComprovanteRenda() && !dados.temComprovanteRenda) {
      motivos.push('Comprovante de renda é obrigatório');
    }
    
    // Calcula pontuação de prioridade
    const pontuacaoPrioridade = this.calcularPontuacaoPrioridade({
      temCriancas: dados.temCriancas,
      temIdosos: dados.temIdosos,
      temPcd: dados.temPcd,
    });
    
    // Observações
    if (this.exigeAgendamento()) {
      observacoes.push('Será necessário agendar a entrega');
    }
    
    if (this.isEntregaDomiciliar()) {
      observacoes.push('Entrega será realizada no domicílio');
    }
    
    if (this.isEntregaRecorrente()) {
      observacoes.push(`Benefício será entregue ${this.getDescricaoPeriodicidade().toLowerCase()}`);
    }
    
    if (pontuacaoPrioridade > 0) {
      observacoes.push(`Família possui prioridade (pontuação: ${pontuacaoPrioridade})`);
    }
    
    return {
      elegivel: motivos.length === 0,
      motivos,
      pontuacaoPrioridade,
      observacoes,
    };
  }
}
