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
import { TipoDocumentoEnum } from '../enums';

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
    enum: TipoDocumentoEnum,
    enumName: 'tipo_documento_enum',
  })
  @IsNotEmpty({ message: 'Tipo de documento é obrigatório' })
  tipo_documento: TipoDocumentoEnum;

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

  @Column('text', { nullable: true })
  observacoes: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  template_url: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  template_nome: string;

  @Column('text', { nullable: true })
  template_descricao: string;

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
    return (
      this.tipo_documento === TipoDocumentoEnum.RG ||
      this.tipo_documento === TipoDocumentoEnum.CPF
    );
  }

  /**
   * Verifica se é documento de comprovação
   */
  isDocumentoComprovacao(): boolean {
    return (
      this.tipo_documento === TipoDocumentoEnum.COMPROVANTE_RESIDENCIA ||
      this.tipo_documento === TipoDocumentoEnum.COMPROVANTE_RENDA
    );
  }

  /**
   * Verifica se é certidão
   */
  isCertidao(): boolean {
    return this.tipo_documento === TipoDocumentoEnum.CERTIDAO_NASCIMENTO;
  }

  /**
   * Verifica se é documento médico
   */
  isDocumentoMedico(): boolean {
    return this.tipo_documento === TipoDocumentoEnum.DECLARACAO_MEDICA;
  }

  /**
   * Verifica se é documento de moradia
   */
  isDocumentoMoradia(): boolean {
    return (
      this.tipo_documento === TipoDocumentoEnum.CONTRATO_ALUGUEL ||
      this.tipo_documento === TipoDocumentoEnum.COMPROVANTE_RESIDENCIA
    );
  }

  /**
   * Obtém a descrição do tipo de documento
   */
  getDescricaoTipoDocumento(): string {
    const descricoes = {
      // Documentos de identificação
      [TipoDocumentoEnum.CPF]: 'Cadastro de Pessoa Física (CPF)',
      [TipoDocumentoEnum.RG]: 'Registro Geral (RG)',
      [TipoDocumentoEnum.CNH]: 'Carteira Nacional de Habilitação (CNH)',
      [TipoDocumentoEnum.PASSAPORTE]: 'Passaporte',

      // Certidões
      [TipoDocumentoEnum.CERTIDAO_NASCIMENTO]: 'Certidão de Nascimento',
      [TipoDocumentoEnum.CERTIDAO_CASAMENTO]: 'Certidão de Casamento',
      [TipoDocumentoEnum.CERTIDAO_OBITO]: 'Certidão de Óbito',

      // Comprovantes básicos
      [TipoDocumentoEnum.COMPROVANTE_RESIDENCIA]: 'Comprovante de Residência',
      [TipoDocumentoEnum.COMPROVANTE_RENDA]: 'Comprovante de Renda',
      [TipoDocumentoEnum.COMPROVANTE_ESCOLARIDADE]:
        'Comprovante de Escolaridade',

      // Documentos médicos e de saúde
      [TipoDocumentoEnum.DECLARACAO_MEDICA]: 'Declaração Médica',
      [TipoDocumentoEnum.CARTAO_VACINA]: 'Cartão de Vacinação',
      [TipoDocumentoEnum.CARTAO_SUS]: 'Cartão do SUS',
      [TipoDocumentoEnum.LAUDO_MEDICO]: 'Laudo Médico',
      [TipoDocumentoEnum.ATESTADO_MEDICO]: 'Atestado Médico',
      [TipoDocumentoEnum.EXAME_PRE_NATAL]: 'Exame Pré-Natal',

      // Documentos habitacionais
      [TipoDocumentoEnum.CONTRATO_ALUGUEL]: 'Contrato de Aluguel',
      [TipoDocumentoEnum.ESCRITURA_IMOVEL]: 'Escritura do Imóvel',
      [TipoDocumentoEnum.IPTU]: 'IPTU',
      [TipoDocumentoEnum.CONTA_AGUA]: 'Conta de Água',
      [TipoDocumentoEnum.CONTA_LUZ]: 'Conta de Luz',
      [TipoDocumentoEnum.CONTA_TELEFONE]: 'Conta de Telefone',

      // Documentos trabalhistas e previdenciários
      [TipoDocumentoEnum.CARTEIRA_TRABALHO]: 'Carteira de Trabalho',
      [TipoDocumentoEnum.COMPROVANTE_DESEMPREGO]: 'Comprovante de Desemprego',
      [TipoDocumentoEnum.EXTRATO_FGTS]: 'Extrato do FGTS',
      [TipoDocumentoEnum.COMPROVANTE_APOSENTADORIA]:
        'Comprovante de Aposentadoria',
      [TipoDocumentoEnum.COMPROVANTE_PENSAO]: 'Comprovante de Pensão',
      [TipoDocumentoEnum.COMPROVANTE_BENEFICIO_INSS]:
        'Comprovante de Benefício INSS',

      // Documentos bancários
      [TipoDocumentoEnum.EXTRATO_BANCARIO]: 'Extrato Bancário',
      [TipoDocumentoEnum.COMPROVANTE_PIX]: 'Comprovante PIX',
      [TipoDocumentoEnum.DADOS_BANCARIOS]: 'Dados Bancários',

      // Documentos familiares e sociais
      [TipoDocumentoEnum.DECLARACAO_COMPOSICAO_FAMILIAR]:
        'Declaração de Composição Familiar',
      [TipoDocumentoEnum.DECLARACAO_UNIAO_ESTAVEL]:
        'Declaração de União Estável',
      [TipoDocumentoEnum.GUARDA_MENOR]: 'Termo de Guarda de Menor',
      [TipoDocumentoEnum.TUTELA]: 'Termo de Tutela',

      // Documentos específicos para benefícios
      [TipoDocumentoEnum.BOLETIM_OCORRENCIA]: 'Boletim de Ocorrência',
      [TipoDocumentoEnum.MEDIDA_PROTETIVA]: 'Medida Protetiva',
      [TipoDocumentoEnum.TERMO_ACOLHIMENTO]: 'Termo de Acolhimento',
      [TipoDocumentoEnum.RELATORIO_SOCIAL]: 'Relatório Social',
      [TipoDocumentoEnum.PARECER_TECNICO]: 'Parecer Técnico',

      // Documentos de programas sociais
      [TipoDocumentoEnum.CARTAO_CADUNICO]: 'Cartão CadÚnico',
      [TipoDocumentoEnum.FOLHA_RESUMO_CADUNICO]: 'Folha Resumo CadÚnico',
      [TipoDocumentoEnum.COMPROVANTE_BOLSA_FAMILIA]:
        'Comprovante Bolsa Família',
      [TipoDocumentoEnum.COMPROVANTE_BPC]: 'Comprovante BPC',

      // Documentos educacionais
      [TipoDocumentoEnum.DECLARACAO_ESCOLAR]: 'Declaração Escolar',
      [TipoDocumentoEnum.HISTORICO_ESCOLAR]: 'Histórico Escolar',
      [TipoDocumentoEnum.MATRICULA_ESCOLAR]: 'Comprovante de Matrícula Escolar',

      // Documentos específicos para mortalidade
      [TipoDocumentoEnum.DECLARACAO_OBITO]: 'Declaração de Óbito',
      [TipoDocumentoEnum.AUTORIZACAO_SEPULTAMENTO]:
        'Autorização de Sepultamento',
      [TipoDocumentoEnum.COMPROVANTE_PARENTESCO]: 'Comprovante de Parentesco',

      // Documentos específicos para natalidade
      [TipoDocumentoEnum.CARTAO_PRE_NATAL]: 'Cartão Pré-Natal',
      [TipoDocumentoEnum.DECLARACAO_NASCIDO_VIVO]: 'Declaração de Nascido Vivo',
      [TipoDocumentoEnum.COMPROVANTE_GESTACAO]: 'Comprovante de Gestação',

      // Documentos específicos para passagens
      [TipoDocumentoEnum.COMPROVANTE_VIAGEM]: 'Comprovante de Viagem',
      [TipoDocumentoEnum.AUTORIZACAO_VIAGEM]: 'Autorização de Viagem',
      [TipoDocumentoEnum.BILHETE_PASSAGEM]: 'Bilhete de Passagem',

      // Documentos diversos
      [TipoDocumentoEnum.PROCURACAO]: 'Procuração',
      [TipoDocumentoEnum.DECLARACAO_HIPOSSUFICIENCIA]:
        'Declaração de Hipossuficiência',
      [TipoDocumentoEnum.TERMO_RESPONSABILIDADE]: 'Termo de Responsabilidade',
      [TipoDocumentoEnum.FOTO_3X4]: 'Foto 3x4',
      [TipoDocumentoEnum.OUTRO]: 'Outro Documento',
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
    return (
      this.temValidacoes() &&
      !!this.validacoes.formato &&
      this.validacoes.formato.length > 0
    );
  }

  /**
   * Verifica se tem validação de tamanho
   */
  temValidacaoTamanho(): boolean {
    return (
      this.temValidacoes() &&
      this.validacoes.tamanho_maximo !== undefined &&
      this.validacoes.tamanho_maximo !== null
    );
  }

  /**
   * Verifica se tem validação de validade
   */
  temValidacaoValidade(): boolean {
    return (
      this.temValidacoes() &&
      this.validacoes.validade_maxima !== undefined &&
      this.validacoes.validade_maxima !== null
    );
  }

  /**
   * Obtém os formatos aceitos
   */
  getFormatosAceitos(): string[] {
    if (!this.temValidacaoFormato()) {
      return [];
    }
    return this.validacoes.formato || [];
  }

  /**
   * Obtém o tamanho máximo em MB
   */
  getTamanhoMaximo(): number | null {
    if (!this.temValidacaoTamanho()) {
      return null;
    }
    return this.validacoes.tamanho_maximo ?? null;
  }

  /**
   * Obtém a validade máxima em dias
   */
  getValidadeMaxima(): number | null {
    if (!this.temValidacaoValidade()) {
      return null;
    }
    return this.validacoes.validade_maxima ?? null;
  }

  /**
   * Obtém o tamanho máximo formatado
   */
  getTamanhoMaximoFormatado(): string {
    const tamanho = this.getTamanhoMaximo();
    if (!tamanho) {
      return 'Sem limite de tamanho';
    }

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
    if (!validade) {
      return 'Sem limite de validade';
    }

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
    if (!this.temValidacaoFormato()) {
      return true;
    }
    return this.getFormatosAceitos().includes(formato.toLowerCase());
  }

  /**
   * Verifica se um tamanho é válido (em bytes)
   */
  tamanhoEhValido(tamanhoBytes: number): boolean {
    const tamanhoMaximo = this.getTamanhoMaximo();
    if (!tamanhoMaximo) {
      return true;
    }

    const tamanhoMaximoBytes = tamanhoMaximo * 1024 * 1024; // Converte MB para bytes
    return tamanhoBytes <= tamanhoMaximoBytes;
  }

  /**
   * Verifica se uma data de emissão é válida
   */
  dataEmissaoEhValida(dataEmissao: Date): boolean {
    const validadeMaxima = this.getValidadeMaxima();
    if (!validadeMaxima) {
      return true;
    }

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
    if (!this.tipo_beneficio_id) {
      return false;
    }

    // Verifica se tem tipo de documento válido
    if (!Object.values(TipoDocumentoEnum).includes(this.tipo_documento)) {
      return false;
    }

    // Verifica validações se existirem
    if (this.temValidacoes()) {
      if (
        this.temValidacaoTamanho() &&
        this.validacoes.tamanho_maximo !== undefined &&
        this.validacoes.tamanho_maximo <= 0
      ) {
        return false;
      }

      if (
        this.temValidacaoValidade() &&
        this.validacoes.validade_maxima !== undefined &&
        this.validacoes.validade_maxima <= 0
      ) {
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
    if (this.foiRemovido()) {
      return false;
    }

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
      validacoes: this.validacoes
        ? JSON.parse(JSON.stringify(this.validacoes))
        : null,
    };
  }

  /**
   * Verifica se é um requisito crítico
   */
  isCritico(): boolean {
    // Documentos de identificação são sempre críticos
    if (this.isDocumentoIdentificacao()) {
      return true;
    }

    // Documentos obrigatórios são críticos
    if (this.isObrigatorio()) {
      return true;
    }

    return false;
  }

  /**
   * Obtém a categoria do documento
   */
  getCategoria():
    | 'IDENTIFICACAO'
    | 'COMPROVACAO'
    | 'CERTIDAO'
    | 'MEDICO'
    | 'MORADIA'
    | 'OUTRO' {
    if (this.isDocumentoIdentificacao()) {
      return 'IDENTIFICACAO';
    }
    if (this.isDocumentoComprovacao()) {
      return 'COMPROVACAO';
    }
    if (this.isCertidao()) {
      return 'CERTIDAO';
    }
    if (this.isDocumentoMedico()) {
      return 'MEDICO';
    }
    if (this.isDocumentoMoradia()) {
      return 'MORADIA';
    }
    return 'OUTRO';
  }

  /**
   * Obtém a prioridade do documento (1 = mais prioritário)
   */
  getPrioridade(): number {
    if (this.isDocumentoIdentificacao()) {
      return 1;
    }
    if (this.isObrigatorio()) {
      return 2;
    }
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
    temTemplate: boolean;
  } {
    return {
      categoria: this.getCategoria(),
      prioridade: this.getPrioridade(),
      obrigatorio: this.isObrigatorio(),
      temValidacoes: this.temValidacoes(),
      formatosAceitos: this.getFormatosAceitos().length,
      tamanhoMaximo: this.getTamanhoMaximoFormatado(),
      validadeMaxima: this.getValidadeMaximaFormatada(),
      temTemplate: this.temTemplate(),
    };
  }

  // Métodos para Template

  /**
   * Verifica se possui template disponível
   */
  temTemplate(): boolean {
    return !!this.template_url && this.template_url.trim().length > 0;
  }

  /**
   * Verifica se o template possui nome definido
   */
  temNomeTemplate(): boolean {
    return !!this.template_nome && this.template_nome.trim().length > 0;
  }

  /**
   * Verifica se o template possui descrição
   */
  temDescricaoTemplate(): boolean {
    return !!this.template_descricao && this.template_descricao.trim().length > 0;
  }

  /**
   * Obtém o nome do template ou um nome padrão
   */
  getNomeTemplate(): string {
    if (this.temNomeTemplate()) {
      return this.template_nome;
    }
    return `template-${this.tipo_documento.toLowerCase().replace(/_/g, '-')}`;
  }

  /**
   * Obtém a descrição do template ou uma descrição padrão
   */
  getDescricaoTemplate(): string {
    if (this.temDescricaoTemplate()) {
      return this.template_descricao;
    }
    return `Template para ${this.getDescricaoTipoDocumento()}`;
  }

  /**
   * Verifica se a URL do template é válida (formato básico)
   */
  templateUrlEhValida(): boolean {
    if (!this.temTemplate()) {
      return false;
    }
    try {
      new URL(this.template_url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtém a extensão do arquivo template baseada na URL
   */
  getExtensaoTemplate(): string | null {
    if (!this.temTemplate()) {
      return null;
    }
    try {
      const url = new URL(this.template_url);
      const pathname = url.pathname;
      const lastDot = pathname.lastIndexOf('.');
      if (lastDot === -1) {
        return null;
      }
      return pathname.substring(lastDot + 1).toLowerCase();
    } catch {
      return null;
    }
  }

  /**
   * Verifica se o template é um PDF
   */
  templateEhPdf(): boolean {
    const extensao = this.getExtensaoTemplate();
    return extensao === 'pdf';
  }

  /**
   * Verifica se o template é uma imagem
   */
  templateEhImagem(): boolean {
    const extensao = this.getExtensaoTemplate();
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extensao || '');
  }

  /**
   * Verifica se o template é um documento do Office
   */
  templateEhDocumentoOffice(): boolean {
    const extensao = this.getExtensaoTemplate();
    return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extensao || '');
  }

  /**
   * Obtém informações completas do template
   */
  getInfoTemplate(): {
    temTemplate: boolean;
    url: string | null;
    nome: string;
    descricao: string;
    extensao: string | null;
    ehPdf: boolean;
    ehImagem: boolean;
    ehDocumentoOffice: boolean;
    urlValida: boolean;
  } {
    return {
      temTemplate: this.temTemplate(),
      url: this.template_url || null,
      nome: this.getNomeTemplate(),
      descricao: this.getDescricaoTemplate(),
      extensao: this.getExtensaoTemplate(),
      ehPdf: this.templateEhPdf(),
      ehImagem: this.templateEhImagem(),
      ehDocumentoOffice: this.templateEhDocumentoOffice(),
      urlValida: this.templateUrlEhValida(),
    };
  }

  /**
   * Atualiza as informações do template
   */
  atualizarTemplate(templateUrl?: string, templateNome?: string, templateDescricao?: string): void {
    if (templateUrl !== undefined) {
      this.template_url = templateUrl;
    }
    if (templateNome !== undefined) {
      this.template_nome = templateNome;
    }
    if (templateDescricao !== undefined) {
      this.template_descricao = templateDescricao;
    }
  }

  /**
   * Remove o template do requisito
   */
  removerTemplate(): void {
    this.template_url = null;
    this.template_nome = null;
    this.template_descricao = null;
  }

  /**
   * Verifica se o template está completo (tem URL, nome e descrição)
   */
  templateEstaCompleto(): boolean {
    return this.temTemplate() && this.temNomeTemplate() && this.temDescricaoTemplate();
  }

  /**
   * Obtém sugestões de melhoria incluindo template
   */
  getSugestoesMelhoriaComTemplate(): string[] {
    const sugestoes = this.getSugestoesMelhoria();

    if (!this.temTemplate()) {
      sugestoes.push('Considerar adicionar um template/modelo do documento');
    } else {
      if (!this.templateUrlEhValida()) {
        sugestoes.push('Verificar se a URL do template está válida');
      }
      if (!this.temNomeTemplate()) {
        sugestoes.push('Adicionar nome descritivo para o template');
      }
      if (!this.temDescricaoTemplate()) {
        sugestoes.push('Adicionar descrição ou instruções para o template');
      }
    }

    return sugestoes;
  }

  /**
   * Clona o requisito incluindo informações de template
   */
  cloneComTemplate(): Partial<RequisitoDocumento> {
    const clone = this.clone();
    return {
      ...clone,
      observacoes: this.observacoes,
      template_url: this.template_url,
      template_nome: this.template_nome,
      template_descricao: this.template_descricao,
    };
  }
}
