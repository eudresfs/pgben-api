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
import { IsNotEmpty } from 'class-validator';
import { TipoBeneficio } from './tipo-beneficio.entity';
import { TipoDocumento } from '../enums';

@Entity('requisito_documento')
@Index(['tipo_beneficio_id', 'tipo_documento'], { unique: true })
export class RequisitoDocumento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Tipo de benefício é obrigatório' })
  tipo_beneficio_id: string;

  @ManyToOne(
    () => TipoBeneficio,
    (tipoBeneficio) => tipoBeneficio.requisito_documento,
  )
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipo_beneficio: TipoBeneficio;

  @Column({
    type: 'enum',
    enum: TipoDocumento,
    enumName: 'tipo_documento_enum',
  })
  @IsNotEmpty({ message: 'Tipo de documento é obrigatório' })
  tipo_documento: TipoDocumento;

  @Column({ type: 'varchar', length: 255 })
  @IsNotEmpty({ message: 'Nome do documento é obrigatório' })
  nome: string;

  @Column({ default: true })
  obrigatorio: boolean;

  @Column('text', { nullable: true })
  descricao: string;

  @Column('jsonb', { nullable: true })
  validacoes: {
    formato?: string[];
    tamanho_maximo?: number;
    validade_maxima?: number;
  };

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
   * Verifica se o requisito foi criado recentemente (últimas 24 horas)
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
   * Verifica se o requisito foi removido
   */
  foiRemovido(): boolean {
    return !!this.removed_at;
  }

  /**
   * Verifica se o requisito está ativo
   */
  isAtivo(): boolean {
    return !this.removed_at;
  }

  /**
   * Verifica se é um documento obrigatório
   */
  isObrigatorio(): boolean {
    return this.obrigatorio;
  }

  /**
   * Verifica se é um documento opcional
   */
  isOpcional(): boolean {
    return !this.obrigatorio;
  }

  /**
   * Verifica se é documento de identificação
   */
  isDocumentoIdentificacao(): boolean {
    return this.tipo_documento === TipoDocumento.RG || 
           this.tipo_documento === TipoDocumento.CPF;
  }

  /**
   * Verifica se é documento de comprovação
   */
  isDocumentoComprovacao(): boolean {
    return this.tipo_documento === TipoDocumento.COMPROVANTE_RESIDENCIA ||
           this.tipo_documento === TipoDocumento.COMPROVANTE_RENDA;
  }

  /**
   * Verifica se é certidão
   */
  isCertidao(): boolean {
    return this.tipo_documento === TipoDocumento.CERTIDAO_NASCIMENTO;
  }

  /**
   * Verifica se é documento médico
   */
  isDocumentoMedico(): boolean {
    return this.tipo_documento === TipoDocumento.DECLARACAO_MEDICA;
  }

  /**
   * Verifica se é documento de moradia
   */
  isDocumentoMoradia(): boolean {
    return this.tipo_documento === TipoDocumento.CONTRATO_ALUGUEL ||
           this.tipo_documento === TipoDocumento.COMPROVANTE_RESIDENCIA;
  }

  /**
   * Obtém a descrição do tipo de documento
   */
  getDescricaoTipoDocumento(): string {
    const descricoes = {
      [TipoDocumento.RG]: 'Registro Geral (RG)',
      [TipoDocumento.CPF]: 'Cadastro de Pessoa Física (CPF)',
      [TipoDocumento.COMPROVANTE_RESIDENCIA]: 'Comprovante de Residência',
      [TipoDocumento.COMPROVANTE_RENDA]: 'Comprovante de Renda',
      [TipoDocumento.CERTIDAO_NASCIMENTO]: 'Certidão de Nascimento',
      [TipoDocumento.DECLARACAO_MEDICA]: 'Declaração Médica',
      [TipoDocumento.CONTRATO_ALUGUEL]: 'Contrato de Aluguel',
      [TipoDocumento.OUTRO]: 'Outro Documento',
    };
    return descricoes[this.tipo_documento] || 'Documento não identificado';
  }

  /**
   * Verifica se tem validações definidas
   */
  temValidacoes(): boolean {
    return !!this.validacoes && Object.keys(this.validacoes).length > 0;
  }

  /**
   * Verifica se tem validação de formato
   */
  temValidacaoFormato(): boolean {
    return this.temValidacoes() && 
           !!this.validacoes.formato && 
           this.validacoes.formato.length > 0;
  }

  /**
   * Verifica se tem validação de tamanho
   */
  temValidacaoTamanho(): boolean {
    return this.temValidacoes() && 
           this.validacoes.tamanho_maximo !== undefined &&
           this.validacoes.tamanho_maximo !== null;
  }

  /**
   * Verifica se tem validação de validade
   */
  temValidacaoValidade(): boolean {
    return this.temValidacoes() && 
           this.validacoes.validade_maxima !== undefined &&
           this.validacoes.validade_maxima !== null;
  }

  /**
   * Obtém os formatos aceitos
   */
  getFormatosAceitos(): string[] {
    if (!this.temValidacaoFormato()) return [];
    return this.validacoes.formato || [];
  }

  /**
   * Obtém o tamanho máximo em MB
   */
  getTamanhoMaximo(): number | null {
    if (!this.temValidacaoTamanho()) return null;
    return this.validacoes.tamanho_maximo ?? null;
  }

  /**
   * Obtém a validade máxima em dias
   */
  getValidadeMaxima(): number | null {
    if (!this.temValidacaoValidade()) return null;
    return this.validacoes.validade_maxima ?? null;
  }

  /**
   * Obtém o tamanho máximo formatado
   */
  getTamanhoMaximoFormatado(): string {
    const tamanho = this.getTamanhoMaximo();
    if (!tamanho) return 'Sem limite de tamanho';
    
    if (tamanho < 1) {
      return `${(tamanho * 1024).toFixed(0)} KB`;
    } else {
      return `${tamanho} MB`;
    }
  }

  /**
   * Obtém a validade máxima formatada
   */
  getValidadeMaximaFormatada(): string {
    const validade = this.getValidadeMaxima();
    if (!validade) return 'Sem limite de validade';
    
    if (validade < 30) {
      return `${validade} dia(s)`;
    } else if (validade < 365) {
      const meses = Math.floor(validade / 30);
      return `${meses} mês(es)`;
    } else {
      const anos = Math.floor(validade / 365);
      return `${anos} ano(s)`;
    }
  }

  /**
   * Verifica se um formato é aceito
   */
  formatoEhAceito(formato: string): boolean {
    if (!this.temValidacaoFormato()) return true;
    return this.getFormatosAceitos().includes(formato.toLowerCase());
  }

  /**
   * Verifica se um tamanho é válido (em bytes)
   */
  tamanhoEhValido(tamanhoBytes: number): boolean {
    const tamanhoMaximo = this.getTamanhoMaximo();
    if (!tamanhoMaximo) return true;
    
    const tamanhoMaximoBytes = tamanhoMaximo * 1024 * 1024; // Converte MB para bytes
    return tamanhoBytes <= tamanhoMaximoBytes;
  }

  /**
   * Verifica se uma data de emissão é válida
   */
  dataEmissaoEhValida(dataEmissao: Date): boolean {
    const validadeMaxima = this.getValidadeMaxima();
    if (!validadeMaxima) return true;
    
    const agora = new Date();
    const diffTime = Math.abs(agora.getTime() - dataEmissao.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= validadeMaxima;
  }

  /**
   * Verifica se pertence a um tipo de benefício
   */
  pertenceAoTipoBeneficio(tipoBeneficioId: string): boolean {
    return this.tipo_beneficio_id === tipoBeneficioId;
  }

  /**
   * Obtém um resumo do requisito
   */
  getSummary(): string {
    const descricao = this.getDescricaoTipoDocumento();
    const obrigatoriedade = this.isObrigatorio() ? 'Obrigatório' : 'Opcional';
    return `${descricao} - ${obrigatoriedade}`;
  }

  /**
   * Gera uma chave única para o requisito
   */
  getUniqueKey(): string {
    return `requisito_${this.tipo_beneficio_id}_${this.tipo_documento}`;
  }

  /**
   * Verifica se o requisito é consistente
   */
  isConsistente(): boolean {
    // Verifica se tem tipo de benefício
    if (!this.tipo_beneficio_id) return false;
    
    // Verifica se tem tipo de documento válido
    if (!Object.values(TipoDocumento).includes(this.tipo_documento)) return false;
    
    // Verifica validações se existirem
    if (this.temValidacoes()) {
      if (this.temValidacaoTamanho() && this.validacoes.tamanho_maximo !== undefined && this.validacoes.tamanho_maximo <= 0) {
        return false;
      }
      
      if (this.temValidacaoValidade() && this.validacoes.validade_maxima !== undefined && this.validacoes.validade_maxima <= 0) {
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
    // Por exemplo, verificar se tem documentos associados
    
    return true;
  }

  /**
   * Clona o requisito (sem ID)
   */
  clone(): Partial<RequisitoDocumento> {
    return {
      tipo_beneficio_id: this.tipo_beneficio_id,
      tipo_documento: this.tipo_documento,
      obrigatorio: this.obrigatorio,
      descricao: this.descricao,
      validacoes: this.validacoes ? 
        JSON.parse(JSON.stringify(this.validacoes)) : null,
    };
  }

  /**
   * Verifica se é um requisito crítico
   */
  isCritico(): boolean {
    // Documentos de identificação são sempre críticos
    if (this.isDocumentoIdentificacao()) return true;
    
    // Documentos obrigatórios são críticos
    if (this.isObrigatorio()) return true;
    
    return false;
  }

  /**
   * Obtém a categoria do documento
   */
  getCategoria(): 'IDENTIFICACAO' | 'COMPROVACAO' | 'CERTIDAO' | 'MEDICO' | 'MORADIA' | 'OUTRO' {
    if (this.isDocumentoIdentificacao()) return 'IDENTIFICACAO';
    if (this.isDocumentoComprovacao()) return 'COMPROVACAO';
    if (this.isCertidao()) return 'CERTIDAO';
    if (this.isDocumentoMedico()) return 'MEDICO';
    if (this.isDocumentoMoradia()) return 'MORADIA';
    return 'OUTRO';
  }

  /**
   * Obtém a prioridade do documento (1 = mais prioritário)
   */
  getPrioridade(): number {
    if (this.isDocumentoIdentificacao()) return 1;
    if (this.isObrigatorio()) return 2;
    return 3;
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
  toSafeLog(): Partial<RequisitoDocumento> {
    return {
      id: this.id,
      tipo_documento: this.tipo_documento,
      obrigatorio: this.obrigatorio,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  /**
   * Obtém sugestões de melhoria para o requisito
   */
  getSugestoesMelhoria(): string[] {
    const sugestoes: string[] = [];
    
    if (!this.descricao || this.descricao.trim().length === 0) {
      sugestoes.push('Adicionar descrição detalhada do documento');
    }
    
    if (!this.temValidacoes()) {
      sugestoes.push('Definir validações para o documento');
    }
    
    if (this.isDocumentoIdentificacao() && !this.isObrigatorio()) {
      sugestoes.push('Documentos de identificação devem ser obrigatórios');
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
    // Dados com mais de 6 meses podem precisar de revisão
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
    return this.updated_at < seisMesesAtras;
  }

  /**
   * Obtém estatísticas do requisito
   */
  getEstatisticas(): {
    categoria: string;
    prioridade: number;
    obrigatorio: boolean;
    temValidacoes: boolean;
    formatosAceitos: number;
    tamanhoMaximo: string;
    validadeMaxima: string;
  } {
    return {
      categoria: this.getCategoria(),
      prioridade: this.getPrioridade(),
      obrigatorio: this.isObrigatorio(),
      temValidacoes: this.temValidacoes(),
      formatosAceitos: this.getFormatosAceitos().length,
      tamanhoMaximo: this.getTamanhoMaximoFormatado(),
      validadeMaxima: this.getValidadeMaximaFormatada(),
    };
  }
}
