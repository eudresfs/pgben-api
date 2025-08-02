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
  IsOptional,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Cidadao } from './cidadao.entity';
import { TipoConta, TipoChavePix } from '../enums/info-bancaria.enum';

/**
 * Entidade de Informações Bancárias do Cidadão
 *
 * Armazena dados bancários prioritariamente da conta poupança social do Banco do Brasil
 * e informações da chave PIX para facilitar pagamentos de benefícios eventuais.
 */
@Entity('info_bancaria')
@Index(['cidadao_id'], { unique: true })
@Index(['conta', 'agencia', 'banco'])
@Index(['chave_pix'])
export class InfoBancaria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Relacionamento com o cidadão
   */
  @Column({ name: 'cidadao_id', type: 'uuid' })
  cidadao_id: string;

  @ManyToOne(() => Cidadao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cidadao_id' })
  cidadao: Cidadao;

  /**
   * Dados bancários
   */
  @Column({ length: 3 })
  @IsOptional()
  @IsString({ message: 'Código do banco deve ser uma string' })
  @Matches(/^\d{3}$/, { message: 'Código do banco deve ter 3 dígitos' })
  banco: string; // Ex: '001' para Banco do Brasil

  @Column({ length: 100 })
  @IsOptional()
  @IsString({ message: 'Nome do banco deve ser uma string' })
  @MaxLength(100, {
    message: 'Nome do banco deve ter no máximo 100 caracteres',
  })
  nome_banco: string; // Ex: 'Banco do Brasil S.A.'

  @Column({ length: 10 })
  @IsOptional()
  @IsString({ message: 'Agência deve ser uma string' })
  @Matches(/^\d{4,5}(-\d)?$/, {
    message: 'Agência deve ter formato válido (ex: 1234 ou 1234-5)',
  })
  agencia: string;

  @Column({ length: 20 })
  @IsOptional()
  @IsString({ message: 'Conta deve ser uma string' })
  @Matches(/^\d{1,15}(-\d)?$/, { message: 'Conta deve ter formato válido' })
  conta: string;

  @Column({
    type: 'enum',
    enum: TipoConta,
    enumName: 'tipo_conta_enum',
    default: TipoConta.POUPANCA_SOCIAL,
  })
  @IsEnum(TipoConta, { message: 'Tipo de conta inválido' })
  @IsOptional()
  tipo_conta: TipoConta;

  /**
   * Dados PIX
   */
  @Column({ length: 255, nullable: true })
  @IsNotEmpty({ message: 'Chave PIX é obrigatória' })
  @IsString({ message: 'Chave PIX deve ser uma string' })
  @MaxLength(255, { message: 'Chave PIX deve ter no máximo 255 caracteres' })
  chave_pix: string;

  @Column({
    type: 'enum',
    enum: TipoChavePix,
    enumName: 'tipo_chave_pix_enum',
    nullable: true,
  })
  @IsNotEmpty({ message: 'Tipo da chave PIX é obrigatório' })
  @IsEnum(TipoChavePix, { message: 'Tipo de chave PIX inválido' })
  tipo_chave_pix: TipoChavePix;

  /**
   * Campos de controle
   */
  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Observações devem ser uma string' })
  observacoes: string;

  /**
   * Campos de auditoria
   */
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
   * Verifica se as informações foram criadas recentemente (últimas 24 horas)
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
   * Verifica se as informações foram removidas
   */
  foiRemovido(): boolean {
    return !!this.removed_at;
  }

  /**
   * Verifica se as informações estão ativas
   */
  isAtivo(): boolean {
    return this.ativo && !this.removed_at;
  }

  /**
   * Verifica se tem dados bancários completos
   */
  temDadosBancariosCompletos(): boolean {
    return !!(this.banco && this.agencia && this.conta && this.nome_banco);
  }

  /**
   * Verifica se tem chave PIX
   */
  temChavePix(): boolean {
    return !!(this.chave_pix && this.tipo_chave_pix);
  }

  /**
   * Verifica se é conta do Banco do Brasil
   */
  isBancoBrasil(): boolean {
    return this.banco === '001';
  }

  /**
   * Verifica se é poupança social
   */
  isPoupancaSocial(): boolean {
    return this.tipo_conta === TipoConta.POUPANCA_SOCIAL;
  }

  /**
   * Verifica se é conta corrente
   */
  isContaCorrente(): boolean {
    return this.tipo_conta === TipoConta.CORRENTE;
  }

  /**
   * Verifica se é conta poupança
   */
  isContaPoupanca(): boolean {
    return this.tipo_conta === TipoConta.POUPANCA;
  }

  /**
   * Verifica se a chave PIX é CPF
   */
  isChavePixCPF(): boolean {
    return this.tipo_chave_pix === TipoChavePix.CPF;
  }

  /**
   * Verifica se a chave PIX é email
   */
  isChavePixEmail(): boolean {
    return this.tipo_chave_pix === TipoChavePix.EMAIL;
  }

  /**
   * Verifica se a chave PIX é telefone
   */
  isChavePixTelefone(): boolean {
    return this.tipo_chave_pix === TipoChavePix.TELEFONE;
  }

  /**
   * Verifica se a chave PIX é aleatória
   */
  isChavePixAleatoria(): boolean {
    return this.tipo_chave_pix === TipoChavePix.ALEATORIA;
  }

  /**
   * Obtém a descrição do tipo de conta
   */
  getDescricaoTipoConta(): string {
    const descricoes = {
      [TipoConta.CORRENTE]: 'Conta Corrente',
      [TipoConta.POUPANCA]: 'Conta Poupança',
      [TipoConta.POUPANCA_SOCIAL]: 'Poupança Social',
    };
    return descricoes[this.tipo_conta] || this.tipo_conta;
  }

  /**
   * Obtém a descrição do tipo de chave PIX
   */
  getDescricaoTipoChavePix(): string {
    if (!this.tipo_chave_pix) {
      return 'Não informado';
    }

    const descricoes = {
      [TipoChavePix.CPF]: 'CPF',
      [TipoChavePix.EMAIL]: 'E-mail',
      [TipoChavePix.TELEFONE]: 'Telefone',
      [TipoChavePix.ALEATORIA]: 'Chave Aleatória',
    };
    return descricoes[this.tipo_chave_pix] || this.tipo_chave_pix;
  }

  /**
   * Formata a conta bancária
   */
  getContaFormatada(): string {
    if (!this.temDadosBancariosCompletos()) {
      return 'Não informado';
    }
    return `${this.banco} - Ag: ${this.agencia} - Conta: ${this.conta}`;
  }

  /**
   * Obtém o nome do banco formatado
   */
  getBancoFormatado(): string {
    if (!this.banco) {
      return 'Não informado';
    }
    return this.nome_banco ? `${this.nome_banco} (${this.banco})` : this.banco;
  }

  /**
   * Formata a chave PIX (mascarando dados sensíveis)
   */
  getChavePixFormatada(): string {
    if (!this.chave_pix) {
      return 'Não informado';
    }

    switch (this.tipo_chave_pix) {
      case TipoChavePix.CPF:
        return this.chave_pix.replace(
          /(\d{3})(\d{3})(\d{3})(\d{2})/,
          '$1.***.$3-**',
        );
      case TipoChavePix.EMAIL:
        const [local, domain] = this.chave_pix.split('@');
        return `${local.substring(0, 2)}***@${domain}`;
      case TipoChavePix.TELEFONE:
        return this.chave_pix.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-****');
      case TipoChavePix.ALEATORIA:
        return `${this.chave_pix.substring(0, 8)}...${this.chave_pix.substring(-4)}`;
      default:
        return '***';
    }
  }

  /**
   * Verifica se pertence a um cidadão específico
   */
  pertenceAoCidadao(cidadaoId: string): boolean {
    return this.cidadao_id === cidadaoId;
  }

  /**
   * Obtém um resumo das informações bancárias
   */
  getSummary(): string {
    const banco = this.getBancoFormatado();
    const conta = this.getDescricaoTipoConta();
    const pix = this.temChavePix()
      ? ` - PIX: ${this.getDescricaoTipoChavePix()}`
      : '';
    return `${banco} - ${conta}${pix}`;
  }

  /**
   * Gera uma chave única para as informações
   */
  getUniqueKey(): string {
    return `info_bancaria_${this.cidadao_id}`;
  }

  /**
   * Verifica se as informações são consistentes
   */
  isConsistente(): boolean {
    // Verifica se tem cidadão
    if (!this.cidadao_id) {
      return false;
    }

    // Se tem dados bancários, devem estar completos
    if (this.banco || this.agencia || this.conta) {
      if (!this.temDadosBancariosCompletos()) {
        return false;
      }
    }

    // Se tem chave PIX, deve ter tipo
    if (this.chave_pix && !this.tipo_chave_pix) {
      return false;
    }
    if (this.tipo_chave_pix && !this.chave_pix) {
      return false;
    }

    // Validação específica por tipo de chave PIX
    if (this.temChavePix()) {
      switch (this.tipo_chave_pix) {
        case TipoChavePix.CPF:
          return /^\d{11}$/.test(this.chave_pix.replace(/\D/g, ''));
        case TipoChavePix.EMAIL:
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.chave_pix);
        case TipoChavePix.TELEFONE:
          return /^\d{10,11}$/.test(this.chave_pix.replace(/\D/g, ''));
        case TipoChavePix.ALEATORIA:
          return this.chave_pix.length >= 32;
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

    // Outras validações específicas podem ser adicionadas
    return true;
  }

  /**
   * Clona as informações bancárias (sem ID)
   */
  clone(): Partial<InfoBancaria> {
    return {
      cidadao_id: this.cidadao_id,
      banco: this.banco,
      nome_banco: this.nome_banco,
      agencia: this.agencia,
      conta: this.conta,
      tipo_conta: this.tipo_conta,
      chave_pix: this.chave_pix,
      tipo_chave_pix: this.tipo_chave_pix,
      ativo: this.ativo,
      observacoes: this.observacoes,
    };
  }

  /**
   * Verifica se é elegível para recebimento de benefícios
   */
  isElegivelBeneficios(): boolean {
    // Deve ter pelo menos dados bancários ou PIX
    return this.temDadosBancariosCompletos() || this.temChavePix();
  }

  /**
   * Verifica se é preferencial para pagamentos (Banco do Brasil + Poupança Social)
   */
  isPreferencialPagamentos(): boolean {
    return this.isBancoBrasil() && this.isPoupancaSocial();
  }

  /**
   * Obtém o método de pagamento preferido
   */
  getMetodoPagamentoPreferido(): 'CONTA_BANCARIA' | 'PIX' | 'INDEFINIDO' {
    if (this.isPreferencialPagamentos()) {
      return 'CONTA_BANCARIA';
    }
    if (this.temChavePix()) {
      return 'PIX';
    }
    if (this.temDadosBancariosCompletos()) {
      return 'CONTA_BANCARIA';
    }
    return 'INDEFINIDO';
  }

  /**
   * Verifica se precisa de validação adicional
   */
  precisaValidacao(): boolean {
    // Informações muito antigas precisam de validação
    if (this.getIdadeRegistroEmDias() > 365) {
      return true;
    }

    // Informações inconsistentes precisam de validação
    if (!this.isConsistente()) {
      return true;
    }

    // Contas não preferenciais podem precisar de validação
    if (this.temDadosBancariosCompletos() && !this.isPreferencialPagamentos()) {
      return true;
    }

    return false;
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
  toSafeLog(): Partial<InfoBancaria> {
    return {
      id: this.id,
      banco: this.banco,
      nome_banco: this.nome_banco,
      tipo_conta: this.tipo_conta,
      tipo_chave_pix: this.tipo_chave_pix,
      ativo: this.ativo,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  /**
   * Obtém sugestões de melhoria para as informações bancárias
   */
  getSugestoesMelhoria(): string[] {
    const sugestoes: string[] = [];

    if (!this.temDadosBancariosCompletos() && !this.temChavePix()) {
      sugestoes.push(
        'Adicionar dados bancários ou chave PIX para recebimento de benefícios',
      );
    }

    if (!this.isPreferencialPagamentos() && this.temDadosBancariosCompletos()) {
      sugestoes.push(
        'Considerar abertura de Poupança Social no Banco do Brasil para facilitar pagamentos',
      );
    }

    if (!this.temChavePix()) {
      sugestoes.push(
        'Cadastrar chave PIX para agilizar recebimento de benefícios',
      );
    }

    if (this.precisaValidacao()) {
      sugestoes.push('Validar e atualizar informações bancárias');
    }

    if (!this.isConsistente()) {
      sugestoes.push(
        'Verificar e corrigir inconsistências nos dados bancários',
      );
    }

    return sugestoes;
  }

  /**
   * Verifica se as informações estão atualizadas
   */
  isAtualizado(): boolean {
    const seiseMesesAtras = new Date();
    seiseMesesAtras.setMonth(seiseMesesAtras.getMonth() - 6);
    return this.updated_at > seiseMesesAtras;
  }

  /**
   * Obtém o status das informações bancárias
   */
  getStatus(): 'COMPLETO' | 'PARCIAL' | 'INCOMPLETO' | 'INATIVO' {
    if (!this.isAtivo()) {
      return 'INATIVO';
    }

    if (this.temDadosBancariosCompletos() && this.temChavePix()) {
      return 'COMPLETO';
    }

    if (this.temDadosBancariosCompletos() || this.temChavePix()) {
      return 'PARCIAL';
    }

    return 'INCOMPLETO';
  }

  /**
   * Calcula a pontuação de completude (0-100)
   */
  getPontuacaoCompletude(): number {
    let pontos = 0;

    if (this.banco) {
      pontos += 15;
    }
    if (this.nome_banco) {
      pontos += 10;
    }
    if (this.agencia) {
      pontos += 15;
    }
    if (this.conta) {
      pontos += 15;
    }
    if (this.tipo_conta) {
      pontos += 10;
    }
    if (this.chave_pix) {
      pontos += 20;
    }
    if (this.tipo_chave_pix) {
      pontos += 15;
    }

    return pontos;
  }
}
