import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Solicitacao } from '../../solicitacao/entities/solicitacao.entity';
import { RequisitoDocumento } from './requisito-documento.entity';
import { CampoDinamicoBeneficio } from './campo-dinamico-beneficio.entity';

export enum Periodicidade {
  UNICO = 'unico',
  MENSAL = 'mensal',
  BIMESTRAL = 'bimestral',
  TRIMESTRAL = 'trimestral',
  SEMESTRAL = 'semestral',
  ANUAL = 'anual',
}

@Entity('tipo_beneficio')
@Index(['nome'], { unique: true })
export class TipoBeneficio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  nome: string;

  @Column('text')
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  descricao: string;

  @Column({
    type: 'enum',
    enum: Periodicidade,
    enumName: 'periodicidade',
    default: Periodicidade.UNICO,
  })
  periodicidade: Periodicidade;

  @Column('decimal', { precision: 10, scale: 2 })
  @IsNumber({}, { message: 'Valor deve ser um número' })
  @Min(0, { message: 'Valor não pode ser negativo' })
  valor: number;

  @Column({ default: true })
  ativo: boolean;

  @Column('jsonb', { nullable: true })
  criterios_elegibilidade: {
    idade_minima?: number;
    idade_maxima?: number;
    renda_maxima?: number;
    tempo_minimo_residencia?: number;
    outros?: string[];
  };

  @OneToMany(() => RequisitoDocumento, (requisito) => requisito.tipo_beneficio)
  requisitos_documentos: RequisitoDocumento[];

  @OneToMany(() => CampoDinamicoBeneficio, (campo) => campo.tipo_beneficio)
  campos_dinamicos: CampoDinamicoBeneficio[];

  @OneToMany(() => Solicitacao, (solicitacao) => solicitacao.tipo_beneficio)
  solicitacao: Solicitacao[];

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
   * Verifica se o benefício foi criado recentemente (últimas 24 horas)
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
   * Verifica se o benefício foi removido
   */
  foiRemovido(): boolean {
    return !!this.removed_at;
  }

  /**
   * Verifica se o benefício está ativo
   */
  isAtivo(): boolean {
    return this.ativo && !this.removed_at;
  }

  /**
   * Verifica se é benefício único
   */
  isBeneficioUnico(): boolean {
    return this.periodicidade === Periodicidade.UNICO;
  }

  /**
   * Verifica se é benefício recorrente
   */
  isBeneficioRecorrente(): boolean {
    return !this.isBeneficioUnico();
  }

  /**
   * Verifica se é benefício mensal
   */
  isBeneficioMensal(): boolean {
    return this.periodicidade === Periodicidade.MENSAL;
  }

  /**
   * Verifica se tem valor definido
   */
  temValor(): boolean {
    return this.valor !== null && this.valor !== undefined && this.valor > 0;
  }

  /**
   * Obtém o valor formatado em moeda brasileira
   */
  getValorFormatado(): string {
    if (!this.temValor()) return 'Valor não definido';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.valor);
  }

  /**
   * Obtém a descrição da periodicidade
   */
  getDescricaoPeriodicidade(): string {
    const descricoes = {
      [Periodicidade.UNICO]: 'Único',
      [Periodicidade.MENSAL]: 'Mensal',
      [Periodicidade.BIMESTRAL]: 'Bimestral',
      [Periodicidade.TRIMESTRAL]: 'Trimestral',
      [Periodicidade.SEMESTRAL]: 'Semestral',
      [Periodicidade.ANUAL]: 'Anual',
    };
    return descricoes[this.periodicidade] || 'Não definido';
  }

  /**
   * Verifica se tem critérios de elegibilidade definidos
   */
  temCriteriosElegibilidade(): boolean {
    return !!this.criterios_elegibilidade && Object.keys(this.criterios_elegibilidade).length > 0;
  }

  /**
   * Verifica se tem critério de idade mínima
   */
  temIdadeMinima(): boolean {
    return this.temCriteriosElegibilidade() && 
           this.criterios_elegibilidade.idade_minima !== undefined &&
           this.criterios_elegibilidade.idade_minima !== null;
  }

  /**
   * Verifica se tem critério de idade máxima
   */
  temIdadeMaxima(): boolean {
    return this.temCriteriosElegibilidade() && 
           this.criterios_elegibilidade.idade_maxima !== undefined &&
           this.criterios_elegibilidade.idade_maxima !== null;
  }

  /**
   * Verifica se tem critério de renda máxima
   */
  temRendaMaxima(): boolean {
    return this.temCriteriosElegibilidade() && 
           this.criterios_elegibilidade.renda_maxima !== undefined &&
           this.criterios_elegibilidade.renda_maxima !== null;
  }

  /**
   * Verifica se tem critério de tempo mínimo de residência
   */
  temTempoMinimoResidencia(): boolean {
    return this.temCriteriosElegibilidade() && 
           this.criterios_elegibilidade.tempo_minimo_residencia !== undefined &&
           this.criterios_elegibilidade.tempo_minimo_residencia !== null;
  }

  /**
   * Verifica se uma idade atende aos critérios
   */
  idadeAtendeAosCriterios(idade: number): boolean {
    if (!this.temCriteriosElegibilidade()) return true;
    
    if (this.temIdadeMinima() && idade < (this.criterios_elegibilidade?.idade_minima ?? 0)) {
      return false;
    }
    
    if (this.temIdadeMaxima() && idade > (this.criterios_elegibilidade?.idade_maxima ?? 0)) {
      return false;
    }
    
    return true;
  }

  /**
   * Verifica se uma renda atende aos critérios
   */
  rendaAtendeAosCriterios(renda: number): boolean {
    if (!this.temRendaMaxima()) return true;
    return this.criterios_elegibilidade.renda_maxima !== undefined && renda <= this.criterios_elegibilidade.renda_maxima;
  }

  /**
   * Verifica se o tempo de residência atende aos critérios
   */
  tempoResidenciaAtendeAosCriterios(tempoMeses: number): boolean {
    if (!this.temTempoMinimoResidencia()) return true;
    return this.criterios_elegibilidade.tempo_minimo_residencia !== undefined && tempoMeses >= this.criterios_elegibilidade.tempo_minimo_residencia;
  }

  /**
   * Obtém a faixa etária permitida
   */
  getFaixaEtaria(): string {
    if (!this.temIdadeMinima() && !this.temIdadeMaxima()) {
      return 'Qualquer idade';
    }
    
    if (this.temIdadeMinima() && !this.temIdadeMaxima()) {
      return `A partir de ${this.criterios_elegibilidade.idade_minima} anos`;
    }
    
    if (!this.temIdadeMinima() && this.temIdadeMaxima()) {
      return `Até ${this.criterios_elegibilidade.idade_maxima} anos`;
    }
    
    return `De ${this.criterios_elegibilidade.idade_minima} a ${this.criterios_elegibilidade.idade_maxima} anos`;
  }

  /**
   * Obtém a renda máxima formatada
   */
  getRendaMaximaFormatada(): string {
    if (!this.temRendaMaxima() || this.criterios_elegibilidade.renda_maxima === undefined) return 'Sem limite de renda';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.criterios_elegibilidade.renda_maxima);
  }

  /**
   * Obtém o tempo mínimo de residência formatado
   */
  getTempoMinimoResidenciaFormatado(): string {
    if (!this.temTempoMinimoResidencia()) return 'Sem exigência de tempo';
    
    const meses = this.criterios_elegibilidade.tempo_minimo_residencia;
    if (meses === undefined || meses < 12) {
      return `${meses ?? 0} mês(es)`;
    } else {
      const anos = Math.floor(meses / 12);
      const mesesRestantes = meses % 12;
      if (mesesRestantes === 0) {
        return `${anos} ano(s)`;
      } else {
        return `${anos} ano(s) e ${mesesRestantes} mês(es)`;
      }
    }
  }

  /**
   * Obtém lista de outros critérios
   */
  getOutrosCriterios(): string[] {
    if (!this.temCriteriosElegibilidade() || !this.criterios_elegibilidade.outros) {
      return [];
    }
    return this.criterios_elegibilidade.outros;
  }

  /**
   * Verifica se tem requisitos de documentos
   */
  temRequisitosDocumentos(): boolean {
    return this.requisitos_documentos && this.requisitos_documentos.length > 0;
  }

  /**
   * Obtém número de requisitos obrigatórios
   */
  getNumeroRequisitosObrigatorios(): number {
    if (!this.temRequisitosDocumentos()) return 0;
    return this.requisitos_documentos.filter(req => req.obrigatorio).length;
  }

  /**
   * Verifica se tem campos dinâmicos
   */
  temCamposDinamicos(): boolean {
    return this.campos_dinamicos && this.campos_dinamicos.length > 0;
  }

  /**
   * Obtém número de campos dinâmicos obrigatórios
   */
  getNumeroCamposDinamicosObrigatorios(): number {
    if (!this.temCamposDinamicos()) return 0;
    return this.campos_dinamicos.filter(campo => campo.obrigatorio).length;
  }

  /**
   * Verifica se pode ser solicitado (ativo e não removido)
   */
  podeSerSolicitado(): boolean {
    return this.isAtivo();
  }

  /**
   * Obtém um resumo do benefício
   */
  getSummary(): string {
    const valor = this.getValorFormatado();
    const periodicidade = this.getDescricaoPeriodicidade();
    const status = this.isAtivo() ? 'Ativo' : 'Inativo';
    return `${this.nome} - ${valor} (${periodicidade}) - ${status}`;
  }

  /**
   * Gera uma chave única para o benefício
   */
  getUniqueKey(): string {
    return `tipo_beneficio_${this.nome.toLowerCase().replace(/\s+/g, '_')}`;
  }

  /**
   * Verifica se o benefício é consistente
   */
  isConsistente(): boolean {
    // Verifica se tem nome
    if (!this.nome || this.nome.trim().length === 0) return false;
    
    // Verifica se tem descrição
    if (!this.descricao || this.descricao.trim().length === 0) return false;
    
    // Verifica se tem valor válido
    if (!this.temValor()) return false;
    
    // Verifica critérios de elegibilidade
    if (this.temCriteriosElegibilidade()) {
      if (this.temIdadeMinima() && this.temIdadeMaxima()) {
        if (this.criterios_elegibilidade.idade_minima !== undefined && this.criterios_elegibilidade.idade_maxima !== undefined && this.criterios_elegibilidade.idade_minima > this.criterios_elegibilidade.idade_maxima) {
          return false;
        }
      }
      
      if (this.temRendaMaxima() && this.criterios_elegibilidade.renda_maxima !== undefined && this.criterios_elegibilidade.renda_maxima < 0) {
        return false;
      }
      
      if (this.temTempoMinimoResidencia() && this.criterios_elegibilidade.tempo_minimo_residencia !== undefined && this.criterios_elegibilidade.tempo_minimo_residencia < 0) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Verifica se pode ser removido
   */
  podeSerRemovido(): boolean {
    // Não pode remover se já foi removido
    if (this.foiRemovido()) return false;
    
    // Pode implementar lógica adicional aqui
    // Por exemplo, verificar se tem solicitações ativas
    
    return true;
  }

  /**
   * Clona o tipo de benefício (sem ID)
   */
  clone(): Partial<TipoBeneficio> {
    return {
      nome: this.nome,
      descricao: this.descricao,
      periodicidade: this.periodicidade,
      valor: this.valor,
      ativo: this.ativo,
      criterios_elegibilidade: this.criterios_elegibilidade ? 
        JSON.parse(JSON.stringify(this.criterios_elegibilidade)) : null,
    };
  }

  /**
   * Verifica se é um benefício de alto valor
   */
  isAltoValor(): boolean {
    // Considera alto valor acima de R$ 1000
    return this.temValor() && this.valor > 1000;
  }

  /**
   * Obtém a complexidade do benefício baseada em critérios e requisitos
   */
  getComplexidade(): 'BAIXA' | 'MEDIA' | 'ALTA' {
    let pontos = 0;
    
    // Critérios de elegibilidade
    if (this.temCriteriosElegibilidade()) {
      pontos += Object.keys(this.criterios_elegibilidade).length;
    }
    
    // Requisitos de documentos
    if (this.temRequisitosDocumentos()) {
      pontos += this.requisitos_documentos.length;
    }
    
    // Campos dinâmicos
    if (this.temCamposDinamicos()) {
      pontos += this.campos_dinamicos.length;
    }
    
    if (pontos <= 3) return 'BAIXA';
    if (pontos <= 7) return 'MEDIA';
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
  toSafeLog(): Partial<TipoBeneficio> {
    return {
      id: this.id,
      nome: this.nome,
      periodicidade: this.periodicidade,
      ativo: this.ativo,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  /**
   * Obtém sugestões de melhoria para o benefício
   */
  getSugestoesMelhoria(): string[] {
    const sugestoes: string[] = [];
    
    if (!this.temCriteriosElegibilidade()) {
      sugestoes.push('Definir critérios de elegibilidade');
    }
    
    if (!this.temRequisitosDocumentos()) {
      sugestoes.push('Adicionar requisitos de documentos');
    }
    
    if (!this.isConsistente()) {
      sugestoes.push('Verificar e corrigir inconsistências nos dados');
    }
    
    if (!this.ativo) {
      sugestoes.push('Considerar reativar o benefício se necessário');
    }
    
    return sugestoes;
  }

  /**
   * Verifica se precisa de atualização (dados muito antigos)
   */
  precisaAtualizacao(): boolean {
    // Dados com mais de 1 ano podem precisar de revisão
    const umAnoAtras = new Date();
    umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
    return this.updated_at < umAnoAtras;
  }

  /**
   * Obtém estatísticas do benefício
   */
  getEstatisticas(): {
    valor: string;
    periodicidade: string;
    complexidade: string;
    criteriosElegibilidade: number;
    requisitosDocumentos: number;
    camposDinamicos: number;
  } {
    return {
      valor: this.getValorFormatado(),
      periodicidade: this.getDescricaoPeriodicidade(),
      complexidade: this.getComplexidade(),
      criteriosElegibilidade: this.temCriteriosElegibilidade() ? 
        Object.keys(this.criterios_elegibilidade).length : 0,
      requisitosDocumentos: this.temRequisitosDocumentos() ? 
        this.requisitos_documentos.length : 0,
      camposDinamicos: this.temCamposDinamicos() ? 
        this.campos_dinamicos.length : 0,
    };
  }
}
