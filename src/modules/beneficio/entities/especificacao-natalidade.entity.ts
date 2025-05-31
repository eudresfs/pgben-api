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
  IsOptional,
  Min,
} from 'class-validator';
import { TipoBeneficio } from './tipo-beneficio.entity';

/**
 * Entidade para especificação do benefício de Auxílio Natalidade
 *
 * Armazena configurações específicas do benefício de Auxílio Natalidade,
 * como itens do kit, tempo mínimo de gestação, etc.
 */
@Entity('especificacao_natalidade')
@Index(['tipo_beneficio_id'], { unique: true })
export class EspecificacaoNatalidade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Tipo de benefício é obrigatório' })
  tipo_beneficio_id: string;

  @OneToOne(() => TipoBeneficio)
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipo_beneficio: TipoBeneficio;

  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Tempo mínimo de gestação deve ser um número' })
  @Min(1, { message: 'Tempo mínimo de gestação deve ser maior que zero' })
  tempo_gestacao_minimo?: number;

  @Column({ type: 'integer' })
  @IsNotEmpty({ message: 'Prazo máximo após nascimento é obrigatório' })
  @IsNumber({}, { message: 'Prazo máximo após nascimento deve ser um número' })
  @Min(1, { message: 'Prazo máximo após nascimento deve ser maior que zero' })
  prazo_maximo_apos_nascimento: number;

  @Column({ default: false })
  @IsBoolean({ message: 'Requer pré-natal deve ser um booleano' })
  requer_pre_natal: boolean;

  @Column({ default: false })
  @IsBoolean({ message: 'Requer comprovante de residência deve ser um booleano' })
  requer_comprovante_residencia: boolean;

  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Número máximo de filhos deve ser um número' })
  @Min(1, { message: 'Número máximo de filhos deve ser maior que zero' })
  numero_maximo_filhos?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Valor complementar deve ser um número' })
  @Min(0, { message: 'Valor complementar não pode ser negativo' })
  valor_complementar?: number;

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
   * Verifica se tem tempo mínimo de gestação definido
   */
  temTempoGestacaoMinimo(): boolean {
    return this.tempo_gestacao_minimo !== null &&
           this.tempo_gestacao_minimo !== undefined &&
           this.tempo_gestacao_minimo > 0;
  }

  /**
   * Obtém o tempo mínimo de gestação
   */
  getTempoGestacaoMinimo(): number {
    return this.tempo_gestacao_minimo || 0;
  }

  /**
   * Formata o tempo mínimo de gestação
   */
  getTempoGestacaoMinimoFormatado(): string {
    if (!this.temTempoGestacaoMinimo()) {
      return 'Não definido';
    }
    const semanas = this.tempo_gestacao_minimo;
    if (!semanas || semanas < 4) {
      return semanas ? `${semanas} semana${semanas > 1 ? 's' : ''}` : 'Não definido';
    }
    const meses = Math.floor(semanas / 4);
    const semanasRestantes = semanas % 4;
    let resultado = `${meses} mês${meses > 1 ? 'es' : ''}`;
    if (semanasRestantes > 0) {
      resultado += ` e ${semanasRestantes} semana${semanasRestantes > 1 ? 's' : ''}`;
    }
    return resultado;
  }

  /**
   * Verifica se requer pré-natal
   */
  requerPreNatal(): boolean {
    return this.requer_pre_natal;
  }

  /**
   * Verifica se requer comprovante de residência
   */
  requerComprovanteResidencia(): boolean {
    return this.requer_comprovante_residencia;
  }

  /**
   * Verifica se tem limite de número de filhos
   */
  temLimiteNumeroFilhos(): boolean {
    return this.numero_maximo_filhos !== null &&
           this.numero_maximo_filhos !== undefined &&
           this.numero_maximo_filhos > 0;
  }

  /**
   * Obtém o número máximo de filhos
   */
  getNumeroMaximoFilhos(): number {
    return this.numero_maximo_filhos || 0;
  }

  /**
   * Verifica se tem valor complementar
   */
  temValorComplementar(): boolean {
    return this.valor_complementar !== null &&
           this.valor_complementar !== undefined &&
           this.valor_complementar > 0;
  }

  /**
   * Obtém o valor complementar
   */
  getValorComplementar(): number {
    return this.valor_complementar || 0;
  }

  /**
   * Formata o valor complementar
   */
  getValorComplementarFormatado(): string {
    if (!this.temValorComplementar()) {
      return 'Não definido';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.valor_complementar ?? 0);
  }

  /**
   * Calcula o prazo limite para solicitação
   */
  calcularPrazoLimite(dataNascimento: Date): Date {
    const prazoLimite = new Date(dataNascimento);
    prazoLimite.setDate(prazoLimite.getDate() + this.prazo_maximo_apos_nascimento);
    return prazoLimite;
  }

  /**
   * Verifica se ainda está dentro do prazo para solicitação
   */
  isDentroDoPrazo(dataNascimento: Date, dataSolicitacao: Date = new Date()): boolean {
    const prazoLimite = this.calcularPrazoLimite(dataNascimento);
    return dataSolicitacao <= prazoLimite;
  }

  /**
   * Calcula quantos dias restam para solicitação
   */
  getDiasRestantesPrazo(dataNascimento: Date, dataAtual: Date = new Date()): number {
    const prazoLimite = this.calcularPrazoLimite(dataNascimento);
    const diffTime = prazoLimite.getTime() - dataAtual.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  /**
   * Verifica se uma gestação atende ao tempo mínimo
   */
  gestacaoAtendeTempoMinimo(semanas: number): boolean {
    if (!this.temTempoGestacaoMinimo()) {
      return true; // Se não tem limite, qualquer gestação é válida
    }
    return semanas >= (this.tempo_gestacao_minimo ?? 0);
  }

  /**
   * Verifica se o número de filhos está dentro do limite
   */
  numeroFilhosDentroLimite(numeroFilhos: number): boolean {
    if (!this.temLimiteNumeroFilhos()) {
      return true; // Se não tem limite, qualquer número é válido
    }
    return numeroFilhos <= (this.numero_maximo_filhos ?? 0);
  }

  /**
   * Obtém os documentos obrigatórios
   */
  getDocumentosObrigatorios(): string[] {
    const documentos: string[] = [
      'Certidão de nascimento da criança',
      'Documento de identidade do requerente',
      'CPF do requerente',
    ];
    
    if (this.requerPreNatal()) {
      documentos.push('Cartão de pré-natal');
    }
    
    if (this.requerComprovanteResidencia()) {
      documentos.push('Comprovante de residência');
    }
    
    return documentos;
  }

  /**
   * Obtém o número de documentos obrigatórios
   */
  getNumeroDocumentosObrigatorios(): number {
    return this.getDocumentosObrigatorios().length;
  }

  /**
   * Calcula o valor total do benefício
   */
  calcularValorTotalBeneficio(valorBase: number): number {
    let valorTotal = valorBase;
    
    if (this.temValorComplementar()) {
      valorTotal += (this.valor_complementar ?? 0);
    }
    
    return valorTotal;
  }

  /**
   * Formata o valor total do benefício
   */
  getValorTotalBeneficioFormatado(valorBase: number): string {
    const valorTotal = this.calcularValorTotalBeneficio(valorBase);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valorTotal);
  }

  /**
   * Valida se uma solicitação atende aos critérios
   */
  validarSolicitacao(dados: {
    dataNascimento: Date;
    dataSolicitacao?: Date;
    semanasGestacao?: number;
    numeroFilhosExistentes?: number;
    temPreNatal?: boolean;
    temComprovanteResidencia?: boolean;
    documentosApresentados?: string[];
  }): {
    valida: boolean;
    motivos: string[];
    observacoes: string[];
  } {
    const motivos: string[] = [];
    const observacoes: string[] = [];
    const dataSolicitacao = dados.dataSolicitacao || new Date();
    
    // Verifica prazo
    if (!this.isDentroDoPrazo(dados.dataNascimento, dataSolicitacao)) {
      motivos.push(`Prazo para solicitação expirado. Limite: ${this.prazo_maximo_apos_nascimento} dias após nascimento`);
    }
    
    // Verifica tempo de gestação
    if (dados.semanasGestacao !== undefined && !this.gestacaoAtendeTempoMinimo(dados.semanasGestacao)) {
      motivos.push(`Tempo de gestação insuficiente. Mínimo: ${this.getTempoGestacaoMinimoFormatado()}`);
    }
    
    // Verifica número de filhos
    if (dados.numeroFilhosExistentes !== undefined) {
      const numeroTotalFilhos = dados.numeroFilhosExistentes + 1; // +1 pelo recém-nascido
      if (!this.numeroFilhosDentroLimite(numeroTotalFilhos)) {
        motivos.push(`Número de filhos excede o limite máximo de ${this.numero_maximo_filhos}`);
      }
    }
    
    // Verifica pré-natal
    if (this.requerPreNatal() && dados.temPreNatal === false) {
      motivos.push('Comprovante de pré-natal é obrigatório');
    }
    
    // Verifica comprovante de residência
    if (this.requerComprovanteResidencia() && dados.temComprovanteResidencia === false) {
      motivos.push('Comprovante de residência é obrigatório');
    }
    
    // Verifica documentos obrigatórios
    const documentosObrigatorios = this.getDocumentosObrigatorios();
    const documentosApresentados = dados.documentosApresentados || [];
    
    for (const docObrigatorio of documentosObrigatorios) {
      if (!documentosApresentados.includes(docObrigatorio)) {
        motivos.push(`Documento obrigatório não apresentado: ${docObrigatorio}`);
      }
    }
    
    // Observações sobre valor complementar
    if (this.temValorComplementar()) {
      observacoes.push(`Valor complementar de ${this.getValorComplementarFormatado()} será adicionado ao benefício`);
    }
    
    // Observação sobre prazo restante
    const diasRestantes = this.getDiasRestantesPrazo(dados.dataNascimento, dataSolicitacao);
    if (diasRestantes > 0 && diasRestantes <= 7) {
      observacoes.push(`Atenção: Restam apenas ${diasRestantes} dia(s) para solicitar o benefício`);
    }
    
    return {
      valida: motivos.length === 0,
      motivos,
      observacoes,
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
    const prazo = `${this.prazo_maximo_apos_nascimento} dias`;
    const gestacao = this.temTempoGestacaoMinimo() ? this.getTempoGestacaoMinimoFormatado() : 'Sem limite';
    const filhos = this.temLimiteNumeroFilhos() ? `Máx. ${this.numero_maximo_filhos} filhos` : 'Sem limite de filhos';
    const complementar = this.temValorComplementar() ? `+${this.getValorComplementarFormatado()}` : '';
    
    return `Prazo: ${prazo} | Gestação: ${gestacao} | ${filhos} ${complementar}`.trim();
  }

  /**
   * Gera uma chave única para a especificação
   */
  getUniqueKey(): string {
    return `especificacao_natalidade_${this.tipo_beneficio_id}`;
  }

  /**
   * Verifica se a especificação é consistente
   */
  isConsistente(): boolean {
    // Verifica se tem tipo de benefício
    if (!this.tipo_beneficio_id) return false;
    
    // Verifica se prazo é válido
    if (this.prazo_maximo_apos_nascimento < 1) return false;
    
    // Verifica se tempo de gestação é válido (se definido)
    if (this.temTempoGestacaoMinimo() && this.tempo_gestacao_minimo !== undefined && this.tempo_gestacao_minimo < 1) return false;
    
    // Verifica se número máximo de filhos é válido (se definido)
    if (this.temLimiteNumeroFilhos() && this.numero_maximo_filhos !== undefined && this.numero_maximo_filhos < 1) return false;
    
    // Verifica se valor complementar é válido (se definido)
    if (this.temValorComplementar() && this.valor_complementar !== undefined && this.valor_complementar < 0) return false;
    
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
  clone(): Partial<EspecificacaoNatalidade> {
    return {
      tipo_beneficio_id: this.tipo_beneficio_id,
      tempo_gestacao_minimo: this.tempo_gestacao_minimo,
      prazo_maximo_apos_nascimento: this.prazo_maximo_apos_nascimento,
      requer_pre_natal: this.requer_pre_natal,
      requer_comprovante_residencia: this.requer_comprovante_residencia,
      numero_maximo_filhos: this.numero_maximo_filhos,
      valor_complementar: this.valor_complementar,
    };
  }

  /**
   * Verifica se é uma especificação flexível
   */
  isFlexivel(): boolean {
    let pontos = 0;
    
    // Não tem limite de tempo de gestação
    if (!this.temTempoGestacaoMinimo()) pontos += 1;
    
    // Não tem limite de número de filhos
    if (!this.temLimiteNumeroFilhos()) pontos += 1;
    
    // Não requer pré-natal
    if (!this.requerPreNatal()) pontos += 1;
    
    // Não requer comprovante de residência
    if (!this.requerComprovanteResidencia()) pontos += 1;
    
    // Prazo generoso (mais de 30 dias)
    if (this.prazo_maximo_apos_nascimento > 30) pontos += 1;
    
    return pontos >= 3;
  }

  /**
   * Obtém o nível de exigência
   */
  getNivelExigencia(): 'BAIXA' | 'MEDIA' | 'ALTA' {
    let pontos = 0;
    
    if (this.temTempoGestacaoMinimo()) pontos += 1;
    if (this.temLimiteNumeroFilhos()) pontos += 1;
    if (this.requerPreNatal()) pontos += 1;
    if (this.requerComprovanteResidencia()) pontos += 1;
    if (this.prazo_maximo_apos_nascimento <= 15) pontos += 1;
    
    if (pontos <= 1) return 'BAIXA';
    if (pontos <= 3) return 'MEDIA';
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
  toSafeLog(): Partial<EspecificacaoNatalidade> {
    return {
      id: this.id,
      tipo_beneficio_id: this.tipo_beneficio_id,
      tempo_gestacao_minimo: this.tempo_gestacao_minimo,
      prazo_maximo_apos_nascimento: this.prazo_maximo_apos_nascimento,
      numero_maximo_filhos: this.numero_maximo_filhos,
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
      sugestoes.push('Muitas exigências - considerar flexibilizar alguns critérios');
    }
    
    if (this.prazo_maximo_apos_nascimento < 15) {
      sugestoes.push('Prazo muito curto - considerar aumentar para pelo menos 15 dias');
    }
    
    if (this.temTempoGestacaoMinimo() && this.tempo_gestacao_minimo !== undefined && this.tempo_gestacao_minimo > 36) {
      sugestoes.push('Tempo mínimo de gestação muito alto - considerar reduzir');
    }
    
    if (this.temLimiteNumeroFilhos() && this.numero_maximo_filhos === 1) {
      sugestoes.push('Limite de apenas 1 filho pode ser muito restritivo');
    }
    
    if (!this.temValorComplementar()) {
      sugestoes.push('Considerar adicionar valor complementar para aumentar o benefício');
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
    // Especificações com mais de 1 ano podem precisar de revisão
    const umAnoAtras = new Date();
    umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
    return this.updated_at < umAnoAtras;
  }

  /**
   * Obtém estatísticas da especificação
   */
  getEstatisticas(): {
    prazoMaximo: number;
    tempoGestacaoMinimo: number;
    numeroMaximoFilhos: number;
    valorComplementar: number;
    numeroDocumentos: number;
    nivelExigencia: string;
  } {
    return {
      prazoMaximo: this.prazo_maximo_apos_nascimento,
      tempoGestacaoMinimo: this.getTempoGestacaoMinimo(),
      numeroMaximoFilhos: this.getNumeroMaximoFilhos(),
      valorComplementar: this.getValorComplementar(),
      numeroDocumentos: this.getNumeroDocumentosObrigatorios(),
      nivelExigencia: this.getNivelExigencia(),
    };
  }

  /**
   * Simula uma solicitação de benefício
   */
  simularSolicitacao(dados: {
    dataNascimento: Date;
    semanasGestacao?: number;
    numeroFilhosExistentes?: number;
    valorBase: number;
  }): {
    elegivel: boolean;
    valorTotal: number;
    valorTotalFormatado: string;
    prazoRestante: number;
    documentosNecessarios: string[];
    observacoes: string[];
  } {
    const validacao = this.validarSolicitacao({
      dataNascimento: dados.dataNascimento,
      semanasGestacao: dados.semanasGestacao,
      numeroFilhosExistentes: dados.numeroFilhosExistentes,
    });
    
    const valorTotal = this.calcularValorTotalBeneficio(dados.valorBase);
    const prazoRestante = this.getDiasRestantesPrazo(dados.dataNascimento);
    
    return {
      elegivel: validacao.valida,
      valorTotal,
      valorTotalFormatado: this.getValorTotalBeneficioFormatado(dados.valorBase),
      prazoRestante,
      documentosNecessarios: this.getDocumentosObrigatorios(),
      observacoes: validacao.observacoes,
    };
  }
}
