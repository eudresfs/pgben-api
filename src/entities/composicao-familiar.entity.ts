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
  OneToOne,
} from 'typeorm';
import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsEnum,
  Length,
  Validate,
} from 'class-validator';
import { Cidadao } from './cidadao.entity';
import { EscolaridadeEnum } from '../enums/escolaridade.enum';
import { CPFValidator } from '../modules/cidadao/validators/cpf-validator';
import { ParentescoEnum } from '../enums/parentesco.enum';
import { IsNIS } from '@/shared/validators/br-validators';

@Entity('composicao_familiar')
@Index(['cidadao_id', 'nome'], { unique: true })
export class ComposicaoFamiliar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'ID do cidadão é obrigatório' })
  cidadao_id: string;

  @ManyToOne(() => Cidadao, (cidadao) => cidadao.composicao_familiar, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cidadao_id' })
  cidadao: Cidadao;

  @Column()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  nome: string;

  @Column({ nullable: false })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @Length(11, 14, { message: 'CPF deve ter entre 11 e 14 caracteres' })
  @Validate(CPFValidator, { message: 'CPF inválido' })
  cpf: string;

  @Column({ nullable: true })
  @IsOptional()
  @Validate(IsNIS, { message: 'NIS inválido' })
  nis?: string;

  @Column('integer')
  @IsNotEmpty({ message: 'Idade do parente é obrigatório' })
  @IsNumber({}, { message: 'Idade deve ser um número' })
  @Min(0, { message: 'Idade não pode ser negativa' })
  idade: number;

  @Column()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  ocupacao: string;

  @Column({
    type: 'enum',
    enum: EscolaridadeEnum,
    enumName: 'escolaridade_enum',
    nullable: false,
  })
  @IsNotEmpty({ message: 'Escolaridade é obrigatória' })
  @IsEnum(EscolaridadeEnum, { message: 'Escolaridade inválida' })
  escolaridade: EscolaridadeEnum;

  @Column({
    type: 'enum',
    enum: ParentescoEnum,
    enumName: 'parentesco',
    default: ParentescoEnum.OUTRO,
  })
  @IsNotEmpty({ message: 'Parentesco é obrigatório' })
  parentesco: ParentescoEnum;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Renda deve ser um número' })
  @Min(0, { message: 'Renda não pode ser negativa' })
  renda: number;

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
   * Verifica se o membro foi criado recentemente (últimas 24 horas)
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
   * Verifica se o membro foi removido
   */
  foiRemovido(): boolean {
    return !!this.removed_at;
  }

  /**
   * Verifica se o membro está ativo
   */
  isAtivo(): boolean {
    return !this.removed_at;
  }

  /**
   * Verifica se é menor de idade
   */
  isMenorIdade(): boolean {
    return this.idade < 18;
  }

  /**
   * Verifica se é maior de idade
   */
  isMaiorIdade(): boolean {
    return this.idade >= 18;
  }

  /**
   * Verifica se é idoso (65 anos ou mais)
   */
  isIdoso(): boolean {
    return this.idade >= 65;
  }

  /**
   * Verifica se é criança (0-12 anos)
   */
  isCrianca(): boolean {
    return this.idade >= 0 && this.idade <= 12;
  }

  /**
   * Verifica se é adolescente (13-17 anos)
   */
  isAdolescente(): boolean {
    return this.idade >= 13 && this.idade <= 17;
  }

  /**
   * Verifica se é adulto (18-64 anos)
   */
  isAdulto(): boolean {
    return this.idade >= 18 && this.idade <= 64;
  }

  /**
   * Obtém a faixa etária
   */
  getFaixaEtaria(): string {
    if (this.isCrianca()) {return 'Criança';}
    if (this.isAdolescente()) {return 'Adolescente';}
    if (this.isAdulto()) {return 'Adulto';}
    if (this.isIdoso()) {return 'Idoso';}
    return 'Indefinido';
  }

  /**
   * Verifica se tem renda
   */
  temRenda(): boolean {
    return this.renda !== null && this.renda !== undefined && this.renda > 0;
  }

  /**
   * Obtém a renda formatada
   */
  getRendaFormatada(): string {
    if (!this.temRenda()) {return 'Sem renda';}
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.renda);
  }

  /**
   * Verifica se tem NIS
   */
  temNIS(): boolean {
    return !!(this.nis && this.nis.trim());
  }

  /**
   * Verifica se é cônjuge
   */
  isConjuge(): boolean {
    return this.parentesco === ParentescoEnum.CONJUGE;
  }

  /**
   * Verifica se é filho(a)
   */
  isFilho(): boolean {
    return this.parentesco === ParentescoEnum.FILHO;
  }

  /**
   * Verifica se é pai/mãe
   */
  isPai(): boolean {
    return (
      this.parentesco === ParentescoEnum.PAI ||
      this.parentesco === ParentescoEnum.MAE
    );
  }

  /**
   * Verifica se é irmão(ã)
   */
  isIrmao(): boolean {
    return this.parentesco === ParentescoEnum.IRMAO;
  }

  /**
   * Verifica se é avô/avó
   */
  isAvo(): boolean {
    return this.parentesco === ParentescoEnum.AVO;
  }

  /**
   * Verifica se é neto(a)
   */
  isNeto(): boolean {
    return this.parentesco === ParentescoEnum.NETO;
  }

  /**
   * Obtém a descrição do parentesco
   */
  getDescricaoParentesco(): string {
    const descricoes = {
      [ParentescoEnum.CONJUGE]: 'Cônjuge',
      [ParentescoEnum.FILHO]: 'Filho(a)',
      [ParentescoEnum.PAI]: 'Pai',
      [ParentescoEnum.MAE]: 'Mãe',
      [ParentescoEnum.IRMAO]: 'Irmão(ã)',
      [ParentescoEnum.AVO]: 'Avô/Avó',
      [ParentescoEnum.NETO]: 'Neto(a)',
      [ParentescoEnum.TIO]: 'Tio(a)',
      [ParentescoEnum.SOBRINHO]: 'Sobrinho(a)',
      [ParentescoEnum.OUTRO]: 'Outro',
    };
    return descricoes[this.parentesco] || this.parentesco;
  }

  /**
   * Obtém a descrição da escolaridade
   */
  getDescricaoEscolaridade(): string {
    const descricoes = {
      [EscolaridadeEnum.ANALFABETO]: 'Analfabeto',
      [EscolaridadeEnum.FUNDAMENTAL_INCOMPLETO]: 'Fundamental Incompleto',
      [EscolaridadeEnum.FUNDAMENTAL_COMPLETO]: 'Fundamental Completo',
      [EscolaridadeEnum.MEDIO_INCOMPLETO]: 'Médio Incompleto',
      [EscolaridadeEnum.MEDIO_COMPLETO]: 'Médio Completo',
      [EscolaridadeEnum.SUPERIOR_INCOMPLETO]: 'Superior Incompleto',
      [EscolaridadeEnum.SUPERIOR_COMPLETO]: 'Superior Completo',
      [EscolaridadeEnum.POS_GRADUACAO]: 'Pós-graduação',
    };
    return descricoes[this.escolaridade] || this.escolaridade;
  }

  /**
   * Verifica se pertence a um cidadão específico
   */
  pertenceAoCidadao(cidadaoId: string): boolean {
    return this.cidadao_id === cidadaoId;
  }

  /**
   * Obtém um resumo do membro familiar
   */
  getSummary(): string {
    const renda = this.temRenda()
      ? ` - ${this.getRendaFormatada()}`
      : ' - Sem renda';
    return `${this.nome} (${this.getDescricaoParentesco()}, ${this.idade} anos)${renda}`;
  }

  /**
   * Gera uma chave única para o membro
   */
  getUniqueKey(): string {
    return `${this.cidadao_id}_${this.cpf}_${this.parentesco}`;
  }

  /**
   * Verifica se os dados são consistentes
   */
  isConsistente(): boolean {
    // Verifica se tem cidadão
    if (!this.cidadao_id) {return false;}

    // Verifica se tem nome
    if (!this.nome || !this.nome.trim()) {return false;}

    // Verifica se tem CPF
    if (!this.cpf || !this.cpf.trim()) {return false;}

    // Verifica se a idade é válida
    if (this.idade < 0 || this.idade > 150) {return false;}

    // Verifica se tem ocupação
    if (!this.ocupacao || !this.ocupacao.trim()) {return false;}

    // Se tem renda, deve ser positiva
    if (this.renda !== null && this.renda !== undefined && this.renda < 0) {
      return false;
    }

    return true;
  }

  /**
   * Verifica se pode ser removido
   */
  podeSerRemovido(): boolean {
    // Não pode remover se já foi removido
    if (this.foiRemovido()) {return false;}

    // Outras validações específicas podem ser adicionadas
    return true;
  }

  /**
   * Clona o membro familiar (sem ID)
   */
  clone(): Partial<ComposicaoFamiliar> {
    return {
      cidadao_id: this.cidadao_id,
      nome: this.nome,
      cpf: this.cpf,
      nis: this.nis,
      idade: this.idade,
      ocupacao: this.ocupacao,
      escolaridade: this.escolaridade,
      parentesco: this.parentesco,
      renda: this.renda,
      observacoes: this.observacoes,
    };
  }

  /**
   * Verifica se é dependente econômico (menor de idade ou sem renda)
   */
  isDependenteEconomico(): boolean {
    return this.isMenorIdade() || !this.temRenda();
  }

  /**
   * Verifica se contribui para a renda familiar
   */
  contribuiParaRenda(): boolean {
    return this.temRenda() && this.isMaiorIdade();
  }

  /**
   * Obtém o CPF formatado
   */
  getCpfFormatado(): string {
    if (!this.cpf) {return '';}
    const cpfLimpo = this.cpf.replace(/\D/g, '');
    return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
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
  toSafeLog(): Partial<ComposicaoFamiliar> {
    return {
      id: this.id,
      nome: this.nome.substring(0, 3) + '***',
      idade: this.idade,
      parentesco: this.parentesco,
      escolaridade: this.escolaridade,
      ocupacao: this.ocupacao,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  /**
   * Verifica se é prioritário para benefícios (idoso, criança, deficiente)
   */
  isPrioritario(): boolean {
    return this.isIdoso() || this.isCrianca();
  }

  /**
   * Obtém sugestões de verificação para o membro
   */
  getSugestoesVerificacao(): string[] {
    const sugestoes: string[] = [];

    if (!this.temNIS()) {
      sugestoes.push('Cadastrar NIS do membro familiar');
    }

    if (
      this.isMaiorIdade() &&
      !this.temRenda() &&
      !this.ocupacao.toLowerCase().includes('estudante')
    ) {
      sugestoes.push('Verificar situação de trabalho/renda');
    }

    if (!this.observacoes && this.isPrioritario()) {
      sugestoes.push('Adicionar observações sobre condições especiais');
    }

    if (!this.isConsistente()) {
      sugestoes.push('Verificar consistência dos dados do membro');
    }

    return sugestoes;
  }

  /**
   * Calcula a contribuição percentual para a renda familiar
   */
  getContribuicaoPercentual(rendaFamiliarTotal: number): number {
    if (!this.temRenda() || !rendaFamiliarTotal || rendaFamiliarTotal <= 0) {
      return 0;
    }
    return (this.renda / rendaFamiliarTotal) * 100;
  }
}
