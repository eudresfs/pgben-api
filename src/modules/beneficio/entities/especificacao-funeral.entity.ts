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
  IsString,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { TipoBeneficio } from './tipo-beneficio.entity';

/**
 * Enum para os tipos de urna funerária
 */
export enum TipoUrnaFuneraria {
  PADRAO = 'padrao',
  ESPECIAL = 'especial',
  INFANTIL = 'infantil',
  OBESO = 'obeso'
}

/**
 * Entidade para armazenar as configurações específicas do Auxílio Funeral
 * 
 * Define os parâmetros e regras específicas para o benefício de auxílio funeral,
 * permitindo a parametrização dinâmica das regras de negócio.
 */
@Entity('especificacao_funeral')
export class EspecificacaoFuneral {
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

  @Column('int')
  @IsNumber({}, { message: 'Prazo máximo após óbito deve ser um número' })
  @Min(1, { message: 'Prazo máximo após óbito deve ser maior que zero' })
  @Max(365, { message: 'Prazo máximo após óbito deve ser menor que 365 dias' })
  prazo_maximo_apos_obito: number;

  @Column('boolean', { default: true })
  @IsBoolean({ message: 'Requer certidão de óbito deve ser um booleano' })
  requer_certidao_obito: boolean;

  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Requer comprovante de residência deve ser um booleano' })
  requer_comprovante_residencia: boolean;

  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Requer comprovante de vínculo familiar deve ser um booleano' })
  requer_comprovante_vinculo_familiar: boolean;

  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Requer comprovante de despesas funerárias deve ser um booleano' })
  requer_comprovante_despesas: boolean;

  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Permite reembolso deve ser um booleano' })
  permite_reembolso: boolean;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Valor máximo de reembolso deve ser um número' })
  @Min(0, { message: 'Valor máximo de reembolso deve ser maior ou igual a zero' })
  valor_maximo_reembolso: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Valor fixo deve ser um número' })
  @Min(0, { message: 'Valor fixo deve ser maior ou igual a zero' })
  valor_fixo: number;

  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Inclui translado deve ser um booleano' })
  inclui_translado: boolean;

  @Column('boolean', { default: false })
  @IsBoolean({ message: 'Inclui isenção de taxas deve ser um booleano' })
  inclui_isencao_taxas: boolean;

  @Column('boolean', { default: true })
  @IsBoolean({ message: 'Limitado ao município deve ser um booleano' })
  limitado_ao_municipio: boolean;

  @Column('boolean', { default: true })
  @IsBoolean({ message: 'Inclui urna funerária deve ser um booleano' })
  inclui_urna_funeraria: boolean;

  @Column('boolean', { default: true })
  @IsBoolean({ message: 'Inclui edredom fúnebre deve ser um booleano' })
  inclui_edredom_funebre: boolean;

  @Column('boolean', { default: true })
  @IsBoolean({ message: 'Inclui despesas de sepultamento deve ser um booleano' })
  inclui_despesas_sepultamento: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString({ message: 'Serviço de sobreaviso deve ser uma string' })
  servico_sobreaviso: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Valor máximo deve ser um número' })
  @Min(0, { message: 'Valor máximo deve ser maior ou igual a zero' })
  valor_maximo: number;

  @Column('boolean', { default: true })
  @IsBoolean({ message: 'Permite cremação deve ser um booleano' })
  permite_cremacao: boolean;

  @Column('boolean', { default: true })
  @IsBoolean({ message: 'Permite sepultamento deve ser um booleano' })
  permite_sepultamento: boolean;

  @Column('simple-array', { nullable: true })
  @IsArray({ message: 'Documentos necessários deve ser um array' })
  @IsString({ each: true, message: 'Cada documento deve ser uma string' })
  @IsNotEmpty({ each: true, message: 'Cada documento não pode estar vazio' })
  documentos_necessarios: string[];

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
   * Verifica se requer certidão de óbito
   */
  requerCertidaoObito(): boolean {
    return this.requer_certidao_obito;
  }

  /**
   * Verifica se requer comprovante de residência
   */
  requerComprovanteResidencia(): boolean {
    return this.requer_comprovante_residencia;
  }

  /**
   * Verifica se requer comprovante de vínculo familiar
   */
  requerComprovanteVinculoFamiliar(): boolean {
    return this.requer_comprovante_vinculo_familiar;
  }

  /**
   * Verifica se requer comprovante de despesas
   */
  requerComprovanteDespesas(): boolean {
    return this.requer_comprovante_despesas;
  }

  /**
   * Verifica se permite reembolso
   */
  permiteReembolso(): boolean {
    return this.permite_reembolso;
  }

  /**
   * Verifica se tem valor máximo de reembolso definido
   */
  temValorMaximoReembolso(): boolean {
    return this.valor_maximo_reembolso !== null &&
           this.valor_maximo_reembolso !== undefined &&
           this.valor_maximo_reembolso > 0;
  }

  /**
   * Obtém o valor máximo de reembolso
   */
  getValorMaximoReembolso(): number {
    return this.valor_maximo_reembolso || 0;
  }

  /**
   * Formata o valor máximo de reembolso
   */
  getValorMaximoReembolsoFormatado(): string {
    if (!this.temValorMaximoReembolso()) {
      return 'Não definido';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.valor_maximo_reembolso);
  }

  /**
   * Verifica se tem valor fixo definido
   */
  temValorFixo(): boolean {
    return this.valor_fixo !== null &&
           this.valor_fixo !== undefined &&
           this.valor_fixo > 0;
  }

  /**
   * Obtém o valor fixo
   */
  getValorFixo(): number {
    return this.valor_fixo || 0;
  }

  /**
   * Formata o valor fixo
   */
  getValorFixoFormatado(): string {
    if (!this.temValorFixo()) {
      return 'Não definido';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.valor_fixo);
  }

  /**
   * Verifica se inclui translado
   */
  incluiTranslado(): boolean {
    return this.inclui_translado;
  }

  /**
   * Verifica se inclui isenção de taxas
   */
  incluiIsencaoTaxas(): boolean {
    return this.inclui_isencao_taxas;
  }

  /**
   * Verifica se é limitado ao município
   */
  isLimitadoAoMunicipio(): boolean {
    return this.limitado_ao_municipio;
  }

  /**
   * Verifica se inclui urna funerária
   */
  incluiUrnaFuneraria(): boolean {
    return this.inclui_urna_funeraria;
  }

  /**
   * Verifica se inclui edredom fúnebre
   */
  incluiEdredomFunebre(): boolean {
    return this.inclui_edredom_funebre;
  }

  /**
   * Verifica se inclui despesas de sepultamento
   */
  incluiDespesasSepultamento(): boolean {
    return this.inclui_despesas_sepultamento;
  }

  /**
   * Verifica se tem serviço de sobreaviso
   */
  temServicoSobreaviso(): boolean {
    return !!this.servico_sobreaviso && this.servico_sobreaviso.trim().length > 0;
  }

  /**
   * Verifica se tem valor máximo definido
   */
  temValorMaximo(): boolean {
    return this.valor_maximo !== null &&
           this.valor_maximo !== undefined &&
           this.valor_maximo > 0;
  }

  /**
   * Obtém o valor máximo
   */
  getValorMaximo(): number {
    return this.valor_maximo || 0;
  }

  /**
   * Formata o valor máximo
   */
  getValorMaximoFormatado(): string {
    if (!this.temValorMaximo()) {
      return 'Não definido';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.valor_maximo);
  }

  /**
   * Verifica se permite cremação
   */
  permiteCremacao(): boolean {
    return this.permite_cremacao;
  }

  /**
   * Verifica se permite sepultamento
   */
  permiteSepultamento(): boolean {
    return this.permite_sepultamento;
  }

  /**
   * Verifica se tem documentos necessários definidos
   */
  temDocumentosNecessarios(): boolean {
    return this.documentos_necessarios && this.documentos_necessarios.length > 0;
  }

  /**
   * Obtém a lista de documentos necessários
   */
  getDocumentosNecessarios(): string[] {
    return this.documentos_necessarios || [];
  }

  /**
   * Verifica se um documento é necessário
   */
  isDocumentoNecessario(documento: string): boolean {
    return this.getDocumentosNecessarios().includes(documento);
  }

  /**
   * Obtém o número de documentos necessários
   */
  getNumeroDocumentosNecessarios(): number {
    return this.getDocumentosNecessarios().length;
  }

  /**
   * Calcula o prazo limite para solicitação
   */
  calcularPrazoLimite(dataObito: Date): Date {
    const prazoLimite = new Date(dataObito);
    prazoLimite.setDate(prazoLimite.getDate() + this.prazo_maximo_apos_obito);
    return prazoLimite;
  }

  /**
   * Verifica se ainda está dentro do prazo para solicitação
   */
  isDentroDoPrazo(dataObito: Date, dataSolicitacao: Date = new Date()): boolean {
    const prazoLimite = this.calcularPrazoLimite(dataObito);
    return dataSolicitacao <= prazoLimite;
  }

  /**
   * Calcula quantos dias restam para solicitação
   */
  getDiasRestantesPrazo(dataObito: Date, dataAtual: Date = new Date()): number {
    const prazoLimite = this.calcularPrazoLimite(dataObito);
    const diffTime = prazoLimite.getTime() - dataAtual.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  /**
   * Obtém os serviços incluídos no benefício
   */
  getServicosIncluidos(): string[] {
    const servicos: string[] = [];
    
    if (this.incluiUrnaFuneraria()) {
      servicos.push('Urna funerária');
    }
    
    if (this.incluiEdredomFunebre()) {
      servicos.push('Edredom fúnebre');
    }
    
    if (this.incluiDespesasSepultamento()) {
      servicos.push('Despesas de sepultamento');
    }
    
    if (this.incluiTranslado()) {
      servicos.push('Translado');
    }
    
    if (this.incluiIsencaoTaxas()) {
      servicos.push('Isenção de taxas');
    }
    
    if (this.temServicoSobreaviso()) {
      servicos.push(`Sobreaviso: ${this.servico_sobreaviso}`);
    }
    
    return servicos;
  }

  /**
   * Obtém os tipos de destinação permitidos
   */
  getTiposDestinacaoPermitidos(): string[] {
    const tipos: string[] = [];
    
    if (this.permiteCremacao()) {
      tipos.push('Cremação');
    }
    
    if (this.permiteSepultamento()) {
      tipos.push('Sepultamento');
    }
    
    return tipos;
  }

  /**
   * Obtém os documentos obrigatórios
   */
  getDocumentosObrigatorios(): string[] {
    const documentos: string[] = [];
    
    if (this.requerCertidaoObito()) {
      documentos.push('Certidão de óbito');
    }
    
    if (this.requerComprovanteResidencia()) {
      documentos.push('Comprovante de residência');
    }
    
    if (this.requerComprovanteVinculoFamiliar()) {
      documentos.push('Comprovante de vínculo familiar');
    }
    
    if (this.requerComprovanteDespesas()) {
      documentos.push('Comprovante de despesas funerárias');
    }
    
    // Adiciona documentos específicos da lista
    documentos.push(...this.getDocumentosNecessarios());
    
    // Remove duplicatas
    return [...new Set(documentos)];
  }

  /**
   * Calcula o valor do benefício baseado no tipo
   */
  calcularValorBeneficio(valorDespesas?: number): number {
    // Se tem valor fixo, retorna ele
    if (this.temValorFixo()) {
      return this.valor_fixo;
    }
    
    // Se permite reembolso e tem valor de despesas
    if (this.permiteReembolso() && valorDespesas !== undefined) {
      if (this.temValorMaximoReembolso()) {
        return Math.min(valorDespesas, this.valor_maximo_reembolso);
      }
      return valorDespesas;
    }
    
    // Se tem valor máximo definido
    if (this.temValorMaximo()) {
      return this.valor_maximo;
    }
    
    return 0;
  }

  /**
   * Formata o valor do benefício
   */
  getValorBeneficioFormatado(valorDespesas?: number): string {
    const valor = this.calcularValorBeneficio(valorDespesas);
    if (valor === 0) {
      return 'Não definido';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  }

  /**
   * Valida se uma solicitação atende aos critérios
   */
  validarSolicitacao(dados: {
    dataObito: Date;
    dataSolicitacao?: Date;
    valorDespesas?: number;
    tipoDestinacao?: 'cremacao' | 'sepultamento';
    documentosApresentados?: string[];
    dentroMunicipio?: boolean;
  }): {
    valida: boolean;
    motivos: string[];
    observacoes: string[];
  } {
    const motivos: string[] = [];
    const observacoes: string[] = [];
    const dataSolicitacao = dados.dataSolicitacao || new Date();
    
    // Verifica prazo
    if (!this.isDentroDoPrazo(dados.dataObito, dataSolicitacao)) {
      const diasRestantes = this.getDiasRestantesPrazo(dados.dataObito, dataSolicitacao);
      motivos.push(`Prazo para solicitação expirado. Limite: ${this.prazo_maximo_apos_obito} dias após óbito`);
    }
    
    // Verifica limitação geográfica
    if (this.isLimitadoAoMunicipio() && dados.dentroMunicipio === false) {
      motivos.push('Benefício limitado ao município de residência');
    }
    
    // Verifica tipo de destinação
    if (dados.tipoDestinacao) {
      if (dados.tipoDestinacao === 'cremacao' && !this.permiteCremacao()) {
        motivos.push('Cremação não é permitida nesta especificação');
      }
      if (dados.tipoDestinacao === 'sepultamento' && !this.permiteSepultamento()) {
        motivos.push('Sepultamento não é permitido nesta especificação');
      }
    }
    
    // Verifica documentos obrigatórios
    const documentosObrigatorios = this.getDocumentosObrigatorios();
    const documentosApresentados = dados.documentosApresentados || [];
    
    for (const docObrigatorio of documentosObrigatorios) {
      if (!documentosApresentados.includes(docObrigatorio)) {
        motivos.push(`Documento obrigatório não apresentado: ${docObrigatorio}`);
      }
    }
    
    // Verifica valor de reembolso
    if (this.permiteReembolso() && dados.valorDespesas !== undefined) {
      if (this.temValorMaximoReembolso() && dados.valorDespesas > this.valor_maximo_reembolso) {
        observacoes.push(`Valor de despesas (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados.valorDespesas)}) excede o limite máximo. Será reembolsado apenas ${this.getValorMaximoReembolsoFormatado()}`);
      }
    }
    
    // Observações sobre serviços incluídos
    const servicosIncluidos = this.getServicosIncluidos();
    if (servicosIncluidos.length > 0) {
      observacoes.push(`Serviços incluídos: ${servicosIncluidos.join(', ')}`);
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
    const prazo = `${this.prazo_maximo_apos_obito} dias`;
    const valor = this.temValorFixo() ? this.getValorFixoFormatado() : 
                  this.temValorMaximo() ? `Até ${this.getValorMaximoFormatado()}` : 'Valor variável';
    const servicos = this.getServicosIncluidos().length;
    
    return `Prazo: ${prazo} | Valor: ${valor} | ${servicos} serviço(s) incluído(s)`;
  }

  /**
   * Gera uma chave única para a especificação
   */
  getUniqueKey(): string {
    return `especificacao_funeral_${this.tipo_beneficio_id}`;
  }

  /**
   * Verifica se a especificação é consistente
   */
  isConsistente(): boolean {
    // Verifica se tem tipo de benefício
    if (!this.tipo_beneficio_id) return false;
    
    // Verifica se prazo é válido
    if (this.prazo_maximo_apos_obito < 1) return false;
    
    // Verifica se permite pelo menos um tipo de destinação
    if (!this.permiteCremacao() && !this.permiteSepultamento()) {
      return false;
    }
    
    // Se permite reembolso, deve ter valor máximo ou valor fixo
    if (this.permiteReembolso() && !this.temValorMaximoReembolso() && !this.temValorFixo()) {
      return false;
    }
    
    // Valores devem ser positivos se definidos
    if (this.temValorFixo() && this.valor_fixo <= 0) return false;
    if (this.temValorMaximo() && this.valor_maximo <= 0) return false;
    if (this.temValorMaximoReembolso() && this.valor_maximo_reembolso <= 0) return false;
    
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
  clone(): Partial<EspecificacaoFuneral> {
    return {
      tipo_beneficio_id: this.tipo_beneficio_id,
      prazo_maximo_apos_obito: this.prazo_maximo_apos_obito,
      requer_certidao_obito: this.requer_certidao_obito,
      requer_comprovante_residencia: this.requer_comprovante_residencia,
      requer_comprovante_vinculo_familiar: this.requer_comprovante_vinculo_familiar,
      requer_comprovante_despesas: this.requer_comprovante_despesas,
      permite_reembolso: this.permite_reembolso,
      valor_maximo_reembolso: this.valor_maximo_reembolso,
      valor_fixo: this.valor_fixo,
      inclui_translado: this.inclui_translado,
      inclui_isencao_taxas: this.inclui_isencao_taxas,
      limitado_ao_municipio: this.limitado_ao_municipio,
      inclui_urna_funeraria: this.inclui_urna_funeraria,
      inclui_edredom_funebre: this.inclui_edredom_funebre,
      inclui_despesas_sepultamento: this.inclui_despesas_sepultamento,
      servico_sobreaviso: this.servico_sobreaviso,
      valor_maximo: this.valor_maximo,
      permite_cremacao: this.permite_cremacao,
      permite_sepultamento: this.permite_sepultamento,
      documentos_necessarios: this.documentos_necessarios ? [...this.documentos_necessarios] : undefined,
    };
  }

  /**
   * Verifica se é uma especificação abrangente
   */
  isAbrangente(): boolean {
    let pontos = 0;
    
    // Inclui muitos serviços
    if (this.getServicosIncluidos().length >= 4) pontos += 2;
    
    // Permite ambos os tipos de destinação
    if (this.permiteCremacao() && this.permiteSepultamento()) pontos += 1;
    
    // Tem prazo generoso
    if (this.prazo_maximo_apos_obito >= 30) pontos += 1;
    
    // Permite reembolso
    if (this.permiteReembolso()) pontos += 1;
    
    // Não é limitado ao município
    if (!this.isLimitadoAoMunicipio()) pontos += 1;
    
    return pontos >= 4;
  }

  /**
   * Obtém o nível de exigência documental
   */
  getNivelExigenciaDocumental(): 'BAIXA' | 'MEDIA' | 'ALTA' {
    const documentosObrigatorios = this.getDocumentosObrigatorios().length;
    
    if (documentosObrigatorios <= 2) return 'BAIXA';
    if (documentosObrigatorios <= 4) return 'MEDIA';
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
  toSafeLog(): Partial<EspecificacaoFuneral> {
    return {
      id: this.id,
      tipo_beneficio_id: this.tipo_beneficio_id,
      prazo_maximo_apos_obito: this.prazo_maximo_apos_obito,
      valor_fixo: this.valor_fixo,
      valor_maximo: this.valor_maximo,
      limitado_ao_municipio: this.limitado_ao_municipio,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  /**
   * Obtém sugestões de melhoria para a especificação
   */
  getSugestoesMelhoria(): string[] {
    const sugestoes: string[] = [];
    
    if (this.getNivelExigenciaDocumental() === 'ALTA') {
      sugestoes.push('Muitos documentos obrigatórios - considerar simplificar');
    }
    
    if (!this.permiteCremacao() && !this.permiteSepultamento()) {
      sugestoes.push('Deve permitir pelo menos um tipo de destinação');
    }
    
    if (this.prazo_maximo_apos_obito < 7) {
      sugestoes.push('Prazo muito curto - considerar aumentar para pelo menos 7 dias');
    }
    
    if (!this.temValorFixo() && !this.temValorMaximo() && !this.permiteReembolso()) {
      sugestoes.push('Definir valor fixo, valor máximo ou permitir reembolso');
    }
    
    if (this.permiteReembolso() && !this.temValorMaximoReembolso()) {
      sugestoes.push('Definir valor máximo para reembolso');
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
    numeroServicos: number;
    numeroDocumentos: number;
    valorMaximo: number;
    nivelExigencia: string;
    tiposDestinacao: number;
  } {
    return {
      prazoMaximo: this.prazo_maximo_apos_obito,
      numeroServicos: this.getServicosIncluidos().length,
      numeroDocumentos: this.getDocumentosObrigatorios().length,
      valorMaximo: this.getValorMaximo(),
      nivelExigencia: this.getNivelExigenciaDocumental(),
      tiposDestinacao: this.getTiposDestinacaoPermitidos().length,
    };
  }

  /**
   * Simula uma solicitação de benefício
   */
  simularSolicitacao(dados: {
    dataObito: Date;
    valorDespesas?: number;
    tipoDestinacao?: 'cremacao' | 'sepultamento';
    dentroMunicipio?: boolean;
  }): {
    elegivel: boolean;
    valorBeneficio: number;
    valorBeneficioFormatado: string;
    prazoRestante: number;
    servicosIncluidos: string[];
    documentosNecessarios: string[];
    observacoes: string[];
  } {
    const validacao = this.validarSolicitacao(dados);
    const valorBeneficio = this.calcularValorBeneficio(dados.valorDespesas);
    const prazoRestante = this.getDiasRestantesPrazo(dados.dataObito);
    
    return {
      elegivel: validacao.valida,
      valorBeneficio,
      valorBeneficioFormatado: this.getValorBeneficioFormatado(dados.valorDespesas),
      prazoRestante,
      servicosIncluidos: this.getServicosIncluidos(),
      documentosNecessarios: this.getDocumentosObrigatorios(),
      observacoes: validacao.observacoes,
    };
  }
}
