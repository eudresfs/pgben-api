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
import {
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';
import { TipoBeneficio } from './tipo-beneficio.entity';

/**
 * Enum para definir os tipos de dados suportados pelos campos dinâmicos
 */
export enum TipoDado {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  ARRAY = 'array',
  OBJECT = 'object',
}

/**
 * Entidade para campos dinâmicos de benefícios
 *
 * Permite definir campos específicos para cada tipo de benefício,
 * com validações e regras de negócio próprias.
 */
@Entity('campo_dinamico_beneficio')
@Index(['tipo_beneficio_id', 'nome'], { unique: true })
export class CampoDinamicoBeneficio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Tipo de benefício é obrigatório' })
  tipo_beneficio_id: string;

  @ManyToOne(
    () => TipoBeneficio,
    (tipoBeneficio) => tipoBeneficio.campos_dinamicos,
  )
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipo_beneficio: TipoBeneficio;

  @Column()
  @IsNotEmpty({ message: 'Label é obrigatório' })
  label: string;

  @Column()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  nome: string;

  @Column({
    type: 'enum',
    enum: TipoDado,
    enumName: 'tipo_dado',
  })
  @IsNotEmpty({ message: 'Tipo de dado é obrigatório' })
  @IsEnum(TipoDado, { message: 'Tipo de dado inválido' })
  tipo: TipoDado;

  @Column({ default: false })
  @IsBoolean({ message: 'Obrigatório deve ser um booleano' })
  obrigatorio: boolean;

  @Column('text', { nullable: true })
  @IsOptional()
  descricao: string;

  @Column('jsonb', { nullable: true })
  validacoes: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    enum?: string[];
    format?: string;
  };

  @Column({ default: 1 })
  @IsNumber({}, { message: 'Ordem deve ser um número' })
  @Min(1, { message: 'Ordem deve ser maior que zero' })
  ordem: number;

  @Column({ default: true })
  @IsBoolean({ message: 'Ativo deve ser um booleano' })
  ativo: boolean;

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
   * Verifica se o campo foi criado recentemente (últimas 24 horas)
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
   * Verifica se o campo foi removido
   */
  foiRemovido(): boolean {
    return !!this.removed_at;
  }

  /**
   * Verifica se o campo está ativo
   */
  isAtivo(): boolean {
    return this.ativo && !this.removed_at;
  }

  /**
   * Verifica se é um campo obrigatório
   */
  isObrigatorio(): boolean {
    return this.obrigatorio;
  }

  /**
   * Verifica se é um campo opcional
   */
  isOpcional(): boolean {
    return !this.obrigatorio;
  }

  /**
   * Verifica se é campo de texto
   */
  isCampoTexto(): boolean {
    return this.tipo === TipoDado.STRING;
  }

  /**
   * Verifica se é campo numérico
   */
  isCampoNumerico(): boolean {
    return this.tipo === TipoDado.NUMBER;
  }

  /**
   * Verifica se é campo booleano
   */
  isCampoBooleano(): boolean {
    return this.tipo === TipoDado.BOOLEAN;
  }

  /**
   * Verifica se é campo de data
   */
  isCampoData(): boolean {
    return this.tipo === TipoDado.DATE;
  }

  /**
   * Verifica se é campo de array
   */
  isCampoArray(): boolean {
    return this.tipo === TipoDado.ARRAY;
  }

  /**
   * Verifica se é campo de objeto
   */
  isCampoObjeto(): boolean {
    return this.tipo === TipoDado.OBJECT;
  }

  /**
   * Obtém a descrição do tipo de dado
   */
  getDescricaoTipoDado(): string {
    const descricoes = {
      [TipoDado.STRING]: 'Texto',
      [TipoDado.NUMBER]: 'Número',
      [TipoDado.BOOLEAN]: 'Verdadeiro/Falso',
      [TipoDado.DATE]: 'Data',
      [TipoDado.ARRAY]: 'Lista',
      [TipoDado.OBJECT]: 'Objeto',
    };
    return descricoes[this.tipo] || 'Tipo não identificado';
  }

  /**
   * Verifica se tem validações definidas
   */
  temValidacoes(): boolean {
    return !!this.validacoes && Object.keys(this.validacoes).length > 0;
  }

  /**
   * Verifica se tem validação de valor mínimo
   */
  temValidacaoMin(): boolean {
    return this.temValidacoes() && 
           this.validacoes.min !== undefined &&
           this.validacoes.min !== null;
  }

  /**
   * Verifica se tem validação de valor máximo
   */
  temValidacaoMax(): boolean {
    return this.temValidacoes() && 
           this.validacoes.max !== undefined &&
           this.validacoes.max !== null;
  }

  /**
   * Verifica se tem validação de comprimento mínimo
   */
  temValidacaoMinLength(): boolean {
    return this.temValidacoes() && 
           this.validacoes.minLength !== undefined &&
           this.validacoes.minLength !== null;
  }

  /**
   * Verifica se tem validação de comprimento máximo
   */
  temValidacaoMaxLength(): boolean {
    return this.temValidacoes() && 
           this.validacoes.maxLength !== undefined &&
           this.validacoes.maxLength !== null;
  }

  /**
   * Verifica se tem validação de padrão (regex)
   */
  temValidacaoPattern(): boolean {
    return this.temValidacoes() && 
           !!this.validacoes.pattern;
  }

  /**
   * Verifica se tem validação de enum (lista de valores)
   */
  temValidacaoEnum(): boolean {
    return this.temValidacoes() && 
           !!this.validacoes.enum &&
           this.validacoes.enum.length > 0;
  }

  /**
   * Verifica se tem validação de formato
   */
  temValidacaoFormat(): boolean {
    return this.temValidacoes() && 
           !!this.validacoes.format;
  }

  /**
   * Obtém o valor mínimo
   */
  getValorMinimo(): number | null {
    if (!this.temValidacaoMin()) return null;
    return this.validacoes.min ?? null;
  }

  /**
   * Obtém o valor máximo
   */
  getValorMaximo(): number | null {
    if (!this.temValidacaoMax()) return null;
    return this.validacoes.max ?? null;
  }

  /**
   * Obtém o comprimento mínimo
   */
  getComprimentoMinimo(): number | null {
    if (!this.temValidacaoMinLength()) return null;
    return this.validacoes.minLength ?? null;
  }

  /**
   * Obtém o comprimento máximo
   */
  getComprimentoMaximo(): number | null {
    if (!this.temValidacaoMaxLength()) return null;
    return this.validacoes.maxLength ?? null;
  }

  /**
   * Obtém o padrão regex
   */
  getPadrao(): string | null {
    if (!this.temValidacaoPattern()) return null;
    return this.validacoes.pattern ?? null;
  }

  /**
   * Obtém os valores do enum
   */
  getValoresEnum(): string[] {
    if (!this.temValidacaoEnum()) return [];
    return this.validacoes.enum ?? [];
  }

  /**
   * Obtém o formato
   */
  getFormato(): string | null {
    if (!this.temValidacaoFormat()) return null;
    return this.validacoes.format ?? null;
  }

  /**
   * Valida um valor contra as regras do campo
   */
  validarValor(valor: any): { valido: boolean; erros: string[] } {
    const erros: string[] = [];

    // Verifica se é obrigatório
    if (this.isObrigatorio() && (valor === null || valor === undefined || valor === '')) {
      erros.push(`${this.label} é obrigatório`);
      return { valido: false, erros };
    }

    // Se não tem valor e não é obrigatório, é válido
    if (valor === null || valor === undefined || valor === '') {
      return { valido: true, erros: [] };
    }

    // Validações por tipo
    switch (this.tipo) {
      case TipoDado.STRING:
        if (typeof valor !== 'string') {
          erros.push(`${this.label} deve ser um texto`);
        } else {
          const comprimentoMinimo = this.getComprimentoMinimo();
          if (this.temValidacaoMinLength() && comprimentoMinimo !== null && valor.length < comprimentoMinimo) {
            erros.push(`${this.label} deve ter pelo menos ${comprimentoMinimo} caracteres`);
          }
          const comprimentoMaximo = this.getComprimentoMaximo();
          if (this.temValidacaoMaxLength() && comprimentoMaximo !== null && valor.length > comprimentoMaximo) {
            erros.push(`${this.label} deve ter no máximo ${comprimentoMaximo} caracteres`);
          }
          if (this.temValidacaoPattern()) {
            const padrao = this.getPadrao();
            if (padrao !== null) {
              const regex = new RegExp(padrao);
              if (!regex.test(valor)) {
                erros.push(`${this.label} não atende ao formato exigido`);
              }
            }
          }
          if (this.temValidacaoEnum() && !this.getValoresEnum().includes(valor)) {
            erros.push(`${this.label} deve ser um dos valores: ${this.getValoresEnum().join(', ')}`);
          }
        }
        break;

      case TipoDado.NUMBER:
        const numero = Number(valor);
        if (isNaN(numero)) {
          erros.push(`${this.label} deve ser um número`);
        } else {
          const valorMinimo = this.getValorMinimo();
          if (this.temValidacaoMin() && valorMinimo !== null && numero < valorMinimo) {
            erros.push(`${this.label} deve ser maior ou igual a ${valorMinimo}`);
          }
          const valorMaximo = this.getValorMaximo();
          if (this.temValidacaoMax() && valorMaximo !== null && numero > valorMaximo) {
            erros.push(`${this.label} deve ser menor ou igual a ${valorMaximo}`);
          }
        }
        break;

      case TipoDado.BOOLEAN:
        if (typeof valor !== 'boolean') {
          erros.push(`${this.label} deve ser verdadeiro ou falso`);
        }
        break;

      case TipoDado.DATE:
        const data = new Date(valor);
        if (isNaN(data.getTime())) {
          erros.push(`${this.label} deve ser uma data válida`);
        }
        break;

      case TipoDado.ARRAY:
        if (!Array.isArray(valor)) {
          erros.push(`${this.label} deve ser uma lista`);
        } else {
          const valorMinimo = this.getValorMinimo();
          const valorMaximo = this.getValorMaximo();
          if (this.temValidacaoMin() && valorMinimo !== null && valor.length < valorMinimo) {
            erros.push(`${this.label} deve ter pelo menos ${valorMinimo} itens`);
          }
          if (this.temValidacaoMax() && valorMaximo !== null && valor.length > valorMaximo) {
            erros.push(`${this.label} deve ter no máximo ${valorMaximo} itens`);
          }
        }
        break;

      case TipoDado.OBJECT:
        if (typeof valor !== 'object' || Array.isArray(valor)) {
          erros.push(`${this.label} deve ser um objeto`);
        }
        break;
    }

    return { valido: erros.length === 0, erros };
  }

  /**
   * Verifica se pertence a um tipo de benefício
   */
  pertenceAoTipoBeneficio(tipoBeneficioId: string): boolean {
    return this.tipo_beneficio_id === tipoBeneficioId;
  }

  /**
   * Obtém um resumo do campo
   */
  getSummary(): string {
    const tipo = this.getDescricaoTipoDado();
    const obrigatoriedade = this.isObrigatorio() ? 'Obrigatório' : 'Opcional';
    const status = this.isAtivo() ? 'Ativo' : 'Inativo';
    return `${this.label} (${tipo}) - ${obrigatoriedade} - ${status}`;
  }

  /**
   * Gera uma chave única para o campo
   */
  getUniqueKey(): string {
    return `campo_${this.tipo_beneficio_id}_${this.nome}`;
  }

  /**
   * Verifica se o campo é consistente
   */
  isConsistente(): boolean {
    // Verifica se tem tipo de benefício
    if (!this.tipo_beneficio_id) return false;
    
    // Verifica se tem label
    if (!this.label || this.label.trim().length === 0) return false;
    
    // Verifica se tem nome
    if (!this.nome || this.nome.trim().length === 0) return false;
    
    // Verifica se tem tipo válido
    if (!Object.values(TipoDado).includes(this.tipo)) return false;
    
    // Verifica se a ordem é válida
    if (this.ordem < 1) return false;
    
    // Verifica validações se existirem
    if (this.temValidacoes()) {
      if (this.temValidacaoMin() && this.temValidacaoMax()) {
        const valorMinimo = this.getValorMinimo();
        const valorMaximo = this.getValorMaximo();
        if (valorMinimo !== null && valorMaximo !== null && valorMinimo > valorMaximo) {
          return false;
        }
      }
      
      if (this.temValidacaoMinLength() && this.temValidacaoMaxLength()) {
        const comprimentoMinimo = this.getComprimentoMinimo();
        const comprimentoMaximo = this.getComprimentoMaximo();
        if (comprimentoMinimo !== null && comprimentoMaximo !== null && comprimentoMinimo > comprimentoMaximo) {
          return false;
        }
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
    // Por exemplo, verificar se tem dados associados
    
    return true;
  }

  /**
   * Clona o campo (sem ID)
   */
  clone(): Partial<CampoDinamicoBeneficio> {
    return {
      tipo_beneficio_id: this.tipo_beneficio_id,
      label: this.label,
      nome: this.nome,
      tipo: this.tipo,
      obrigatorio: this.obrigatorio,
      descricao: this.descricao,
      validacoes: this.validacoes ? 
        JSON.parse(JSON.stringify(this.validacoes)) : null,
      ordem: this.ordem,
      ativo: this.ativo,
    };
  }

  /**
   * Verifica se é um campo crítico
   */
  isCritico(): boolean {
    // Campos obrigatórios são críticos
    if (this.isObrigatorio()) return true;
    
    // Campos com ordem baixa (primeiros) são mais críticos
    if (this.ordem <= 3) return true;
    
    return false;
  }

  /**
   * Obtém a complexidade do campo baseada em validações
   */
  getComplexidade(): 'BAIXA' | 'MEDIA' | 'ALTA' {
    let pontos = 0;
    
    // Tipo de dado complexo
    if (this.isCampoObjeto() || this.isCampoArray()) pontos += 2;
    
    // Validações
    if (this.temValidacoes()) {
      pontos += Object.keys(this.validacoes).length;
    }
    
    // Obrigatório
    if (this.isObrigatorio()) pontos += 1;
    
    if (pontos <= 2) return 'BAIXA';
    if (pontos <= 5) return 'MEDIA';
    return 'ALTA';
  }

  /**
   * Obtém a categoria do campo
   */
  getCategoria(): 'BASICO' | 'AVANCADO' | 'COMPLEXO' {
    if (this.isCampoTexto() || this.isCampoNumerico() || this.isCampoBooleano()) {
      return this.temValidacoes() ? 'AVANCADO' : 'BASICO';
    }
    return 'COMPLEXO';
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
  toSafeLog(): Partial<CampoDinamicoBeneficio> {
    return {
      id: this.id,
      label: this.label,
      nome: this.nome,
      tipo: this.tipo,
      obrigatorio: this.obrigatorio,
      ordem: this.ordem,
      ativo: this.ativo,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  /**
   * Obtém sugestões de melhoria para o campo
   */
  getSugestoesMelhoria(): string[] {
    const sugestoes: string[] = [];
    
    if (!this.descricao || this.descricao.trim().length === 0) {
      sugestoes.push('Adicionar descrição detalhada do campo');
    }
    
    if (!this.temValidacoes() && (this.isCampoTexto() || this.isCampoNumerico())) {
      sugestoes.push('Definir validações para o campo');
    }
    
    if (this.isCampoTexto() && !this.temValidacaoMaxLength()) {
      sugestoes.push('Definir comprimento máximo para campos de texto');
    }
    
    if (!this.isConsistente()) {
      sugestoes.push('Verificar e corrigir inconsistências nos dados');
    }
    
    if (!this.ativo) {
      sugestoes.push('Considerar reativar o campo se necessário');
    }
    
    return sugestoes;
  }

  /**
   * Verifica se precisa de atualização (dados muito antigos)
   */
  precisaAtualizacao(): boolean {
    // Dados com mais de 6 meses podem precisar de revisão
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
    return this.updated_at < seisMesesAtras;
  }

  /**
   * Obtém estatísticas do campo
   */
  getEstatisticas(): {
    categoria: string;
    complexidade: string;
    tipo: string;
    obrigatorio: boolean;
    temValidacoes: boolean;
    numeroValidacoes: number;
    ordem: number;
  } {
    return {
      categoria: this.getCategoria(),
      complexidade: this.getComplexidade(),
      tipo: this.getDescricaoTipoDado(),
      obrigatorio: this.isObrigatorio(),
      temValidacoes: this.temValidacoes(),
      numeroValidacoes: this.temValidacoes() ? Object.keys(this.validacoes).length : 0,
      ordem: this.ordem,
    };
  }
}
