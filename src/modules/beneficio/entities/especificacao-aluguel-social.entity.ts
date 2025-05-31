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
import {
  IsNotEmpty,
  IsBoolean,
  IsNumber,
  IsArray,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { TipoBeneficio } from './tipo-beneficio.entity';

/**
 * Enum para definir os motivos válidos para concessão de Aluguel Social
 */
export enum MotivoAluguelSocial {
  CALAMIDADE = 'calamidade',
  DESASTRE = 'desastre',
  VULNERABILIDADE = 'vulnerabilidade',
  DESPEJO = 'despejo',
  VIOLENCIA = 'violencia',
  AREA_RISCO = 'area_risco',
  OUTRO = 'outro',
}

/**
 * Entidade para especificação do benefício de Aluguel Social
 *
 * Armazena configurações específicas do benefício de Aluguel Social,
 * como duração máxima, motivos válidos, etc.
 */
@Entity('especificacao_aluguel_social')
@Index(['tipo_beneficio_id'], { unique: true })
export class EspecificacaoAluguelSocial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Tipo de benefício é obrigatório' })
  tipo_beneficio_id: string;

  @OneToOne(() => TipoBeneficio)
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipo_beneficio: TipoBeneficio;

  @Column({ type: 'integer' })
  @IsNotEmpty({ message: 'Duração máxima é obrigatória' })
  @IsNumber({}, { message: 'Duração máxima deve ser um número' })
  @Min(1, { message: 'Duração máxima deve ser maior que zero' })
  @Max(48, { message: 'Duração máxima não pode exceder 48 meses' })
  duracao_maxima_meses: number;

  @Column({ default: false })
  @IsBoolean({ message: 'Permite prorrogação deve ser um booleano' })
  permite_prorrogacao: boolean;

  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Tempo máximo de prorrogação deve ser um número' })
  @Min(1, { message: 'Tempo máximo de prorrogação deve ser maior que zero' })
  tempo_maximo_prorrogacao_meses?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @IsNotEmpty({ message: 'Valor máximo é obrigatório' })
  @IsNumber({}, { message: 'Valor máximo deve ser um número' })
  @Min(0, { message: 'Valor máximo não pode ser negativo' })
  valor_maximo: number;

  @Column('simple-array')
  @IsArray({ message: 'Motivos válidos deve ser um array' })
  motivos_validos: MotivoAluguelSocial[];

  @Column({ default: true })
  @IsBoolean({ message: 'Requer comprovante de aluguel deve ser um booleano' })
  requer_comprovante_aluguel: boolean;

  @Column({ default: false })
  @IsBoolean({ message: 'Requer vistoria deve ser um booleano' })
  requer_vistoria: boolean;

  @Column({ default: false })
  @IsBoolean({ message: 'Pago diretamente ao locador deve ser um booleano' })
  pago_diretamente_locador: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Percentual máximo da renda deve ser um número' })
  @Min(0, { message: 'Percentual máximo da renda não pode ser negativo' })
  @Max(100, { message: 'Percentual máximo da renda não pode exceder 100%' })
  percentual_maximo_renda?: number;

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
   * Verifica se permite prorrogação
   */
  permiteProrrogacao(): boolean {
    return this.permite_prorrogacao;
  }

  /**
   * Verifica se tem tempo máximo de prorrogação definido
   */
  temTempoMaximoProrrogacao(): boolean {
    return this.tempo_maximo_prorrogacao_meses !== null &&
           this.tempo_maximo_prorrogacao_meses !== undefined &&
           this.tempo_maximo_prorrogacao_meses > 0;
  }

  /**
   * Obtém o tempo máximo de prorrogação
   */
  getTempoMaximoProrrogacao(): number {
    return this.tempo_maximo_prorrogacao_meses || 0;
  }

  /**
   * Calcula a duração total máxima (inicial + prorrogação)
   */
  getDuracaoTotalMaxima(): number {
    let total = this.duracao_maxima_meses;
    if (this.permiteProrrogacao() && this.temTempoMaximoProrrogacao()) {
      total += this.getTempoMaximoProrrogacao();
    }
    return total;
  }

  /**
   * Verifica se requer comprovante de aluguel
   */
  requerComprovanteAluguel(): boolean {
    return this.requer_comprovante_aluguel;
  }

  /**
   * Verifica se requer vistoria
   */
  requerVistoria(): boolean {
    return this.requer_vistoria;
  }

  /**
   * Verifica se é pago diretamente ao locador
   */
  isPagoDiretamenteLocador(): boolean {
    return this.pago_diretamente_locador;
  }

  /**
   * Verifica se tem percentual máximo de renda definido
   */
  temPercentualMaximoRenda(): boolean {
    return this.percentual_maximo_renda !== null &&
           this.percentual_maximo_renda !== undefined &&
           this.percentual_maximo_renda > 0;
  }

  /**
   * Obtém o percentual máximo da renda
   */
  getPercentualMaximoRenda(): number {
    return this.percentual_maximo_renda || 0;
  }

  /**
   * Formata o valor máximo
   */
  getValorMaximoFormatado(): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.valor_maximo);
  }

  /**
   * Verifica se um motivo é válido
   */
  isMotivoValido(motivo: MotivoAluguelSocial): boolean {
    return this.motivos_validos.includes(motivo);
  }

  /**
   * Obtém a descrição de um motivo
   */
  getDescricaoMotivo(motivo: MotivoAluguelSocial): string {
    const descricoes = {
      [MotivoAluguelSocial.CALAMIDADE]: 'Calamidade Pública',
      [MotivoAluguelSocial.DESASTRE]: 'Desastre Natural',
      [MotivoAluguelSocial.VULNERABILIDADE]: 'Situação de Vulnerabilidade',
      [MotivoAluguelSocial.DESPEJO]: 'Despejo Judicial',
      [MotivoAluguelSocial.VIOLENCIA]: 'Violência Doméstica',
      [MotivoAluguelSocial.AREA_RISCO]: 'Área de Risco',
      [MotivoAluguelSocial.OUTRO]: 'Outro Motivo',
    };
    return descricoes[motivo] || 'Motivo não identificado';
  }

  /**
   * Obtém todos os motivos válidos com descrições
   */
  getMotivosValidosComDescricoes(): { motivo: MotivoAluguelSocial; descricao: string }[] {
    return this.motivos_validos.map(motivo => ({
      motivo,
      descricao: this.getDescricaoMotivo(motivo),
    }));
  }

  /**
   * Calcula o valor máximo baseado na renda (se configurado)
   */
  calcularValorMaximoBaseadoRenda(rendaFamiliar: number): number {
    if (!this.temPercentualMaximoRenda()) {
      return this.valor_maximo;
    }
    
    const valorBaseadoRenda = (rendaFamiliar * this.getPercentualMaximoRenda()) / 100;
    return Math.min(this.valor_maximo, valorBaseadoRenda);
  }

  /**
   * Valida se um valor de aluguel está dentro dos limites
   */
  validarValorAluguel(valorAluguel: number, rendaFamiliar?: number): {
    valido: boolean;
    valorMaximoPermitido: number;
    motivo?: string;
  } {
    const valorMaximoPermitido = rendaFamiliar ? 
      this.calcularValorMaximoBaseadoRenda(rendaFamiliar) : 
      this.valor_maximo;
    
    const valido = valorAluguel <= valorMaximoPermitido;
    
    return {
      valido,
      valorMaximoPermitido,
      motivo: valido ? undefined : 
        `Valor do aluguel (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorAluguel)}) excede o limite máximo permitido (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorMaximoPermitido)})`
    };
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
    const duracao = this.permiteProrrogacao() ? 
      `${this.duracao_maxima_meses} meses (+ ${this.getTempoMaximoProrrogacao()} prorrogação)` :
      `${this.duracao_maxima_meses} meses`;
    
    const valor = this.getValorMaximoFormatado();
    const motivos = this.motivos_validos.length;
    
    return `Duração: ${duracao} | Valor máx: ${valor} | ${motivos} motivos válidos`;
  }

  /**
   * Gera uma chave única para a especificação
   */
  getUniqueKey(): string {
    return `especificacao_aluguel_${this.tipo_beneficio_id}`;
  }

  /**
   * Verifica se a especificação é consistente
   */
  isConsistente(): boolean {
    // Verifica se tem tipo de benefício
    if (!this.tipo_beneficio_id) return false;
    
    // Verifica se duração máxima é válida
    if (this.duracao_maxima_meses < 1 || this.duracao_maxima_meses > 48) return false;
    
    // Verifica se valor máximo é válido
    if (this.valor_maximo <= 0) return false;
    
    // Verifica se tem motivos válidos
    if (!this.motivos_validos || this.motivos_validos.length === 0) return false;
    
    // Se permite prorrogação, deve ter tempo definido
    if (this.permiteProrrogacao() && !this.temTempoMaximoProrrogacao()) {
      return false;
    }
    
    // Se tem percentual de renda, deve estar entre 0 e 100
    if (this.temPercentualMaximoRenda()) {
      if (this.getPercentualMaximoRenda() <= 0 || this.getPercentualMaximoRenda() > 100) {
        return false;
      }
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
  clone(): Partial<EspecificacaoAluguelSocial> {
    return {
      tipo_beneficio_id: this.tipo_beneficio_id,
      duracao_maxima_meses: this.duracao_maxima_meses,
      permite_prorrogacao: this.permite_prorrogacao,
      tempo_maximo_prorrogacao_meses: this.tempo_maximo_prorrogacao_meses,
      valor_maximo: this.valor_maximo,
      motivos_validos: [...this.motivos_validos],
      requer_comprovante_aluguel: this.requer_comprovante_aluguel,
      requer_vistoria: this.requer_vistoria,
      pago_diretamente_locador: this.pago_diretamente_locador,
      percentual_maximo_renda: this.percentual_maximo_renda,
    };
  }

  /**
   * Verifica se é uma especificação restritiva
   */
  isRestritiva(): boolean {
    let pontos = 0;
    
    // Duração baixa
    if (this.duracao_maxima_meses <= 6) pontos += 2;
    
    // Valor baixo (menos de 1 salário mínimo - assumindo R$ 1.320)
    if (this.valor_maximo < 1320) pontos += 2;
    
    // Poucos motivos válidos
    if (this.motivos_validos.length <= 2) pontos += 1;
    
    // Requer vistoria
    if (this.requer_vistoria) pontos += 1;
    
    // Percentual baixo de renda
    if (this.temPercentualMaximoRenda() && this.getPercentualMaximoRenda() < 30) {
      pontos += 1;
    }
    
    return pontos >= 3;
  }

  /**
   * Obtém o nível de flexibilidade
   */
  getNivelFlexibilidade(): 'BAIXA' | 'MEDIA' | 'ALTA' {
    let pontos = 0;
    
    // Permite prorrogação
    if (this.permiteProrrogacao()) pontos += 2;
    
    // Duração longa
    if (this.duracao_maxima_meses >= 12) pontos += 1;
    
    // Valor alto
    if (this.valor_maximo >= 2000) pontos += 1;
    
    // Muitos motivos válidos
    if (this.motivos_validos.length >= 5) pontos += 1;
    
    // Não requer vistoria
    if (!this.requer_vistoria) pontos += 1;
    
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
  toSafeLog(): Partial<EspecificacaoAluguelSocial> {
    return {
      id: this.id,
      tipo_beneficio_id: this.tipo_beneficio_id,
      duracao_maxima_meses: this.duracao_maxima_meses,
      permite_prorrogacao: this.permite_prorrogacao,
      valor_maximo: this.valor_maximo,
      motivos_validos: this.motivos_validos,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  /**
   * Obtém sugestões de melhoria para a especificação
   */
  getSugestoesMelhoria(): string[] {
    const sugestoes: string[] = [];
    
    if (this.isRestritiva()) {
      sugestoes.push('Especificação muito restritiva - considerar flexibilizar critérios');
    }
    
    if (!this.permiteProrrogacao()) {
      sugestoes.push('Considerar permitir prorrogação em casos especiais');
    }
    
    if (this.motivos_validos.length < 3) {
      sugestoes.push('Considerar adicionar mais motivos válidos');
    }
    
    if (!this.temPercentualMaximoRenda()) {
      sugestoes.push('Considerar definir percentual máximo baseado na renda familiar');
    }
    
    if (!this.requer_vistoria && this.valor_maximo > 2000) {
      sugestoes.push('Para valores altos, considerar exigir vistoria');
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
    duracaoMaxima: number;
    duracaoTotalMaxima: number;
    valorMaximo: number;
    numeroMotivosValidos: number;
    nivelFlexibilidade: string;
    permiteProrrogacao: boolean;
    requerVistoria: boolean;
    pagoDiretamenteLocador: boolean;
  } {
    return {
      duracaoMaxima: this.duracao_maxima_meses,
      duracaoTotalMaxima: this.getDuracaoTotalMaxima(),
      valorMaximo: this.valor_maximo,
      numeroMotivosValidos: this.motivos_validos.length,
      nivelFlexibilidade: this.getNivelFlexibilidade(),
      permiteProrrogacao: this.permite_prorrogacao,
      requerVistoria: this.requer_vistoria,
      pagoDiretamenteLocador: this.pago_diretamente_locador,
    };
  }

  /**
   * Simula a elegibilidade para o benefício
   */
  simularElegibilidade(dados: {
    motivo: MotivoAluguelSocial;
    valorAluguel: number;
    rendaFamiliar?: number;
    temComprovanteAluguel?: boolean;
  }): {
    elegivel: boolean;
    motivos: string[];
    valorMaximoPermitido: number;
    observacoes: string[];
  } {
    const motivos: string[] = [];
    const observacoes: string[] = [];
    
    // Verifica motivo
    if (!this.isMotivoValido(dados.motivo)) {
      motivos.push(`Motivo '${this.getDescricaoMotivo(dados.motivo)}' não é válido para este benefício`);
    }
    
    // Verifica valor do aluguel
    const validacaoValor = this.validarValorAluguel(dados.valorAluguel, dados.rendaFamiliar);
    if (!validacaoValor.valido) {
      motivos.push(validacaoValor.motivo!);
    }
    
    // Verifica comprovante de aluguel
    if (this.requerComprovanteAluguel() && !dados.temComprovanteAluguel) {
      motivos.push('Comprovante de aluguel é obrigatório');
    }
    
    // Observações
    if (this.requerVistoria()) {
      observacoes.push('Será necessária vistoria do imóvel');
    }
    
    if (this.isPagoDiretamenteLocador()) {
      observacoes.push('Pagamento será feito diretamente ao locador');
    }
    
    if (this.permiteProrrogacao()) {
      observacoes.push(`Benefício pode ser prorrogado por até ${this.getTempoMaximoProrrogacao()} meses`);
    }
    
    return {
      elegivel: motivos.length === 0,
      motivos,
      valorMaximoPermitido: validacaoValor.valorMaximoPermitido,
      observacoes,
    };
  }
}
