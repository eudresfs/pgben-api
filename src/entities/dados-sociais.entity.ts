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
  IsOptional,
  IsNumber,
  Min,
  IsEnum,
  ValidateIf,
  IsString,
  IsBoolean,
} from 'class-validator';
import { Cidadao } from './cidadao.entity';
import { EscolaridadeEnum } from '../enums/escolaridade.enum';
import { SituacaoTrabalhoEnum } from '../enums/situacao-trabalho.enum';
import { ModalidadeBpcEnum } from '../enums/modalidade-bpc.enum';
import { TipoInsercaoEnum } from '../enums/tipo-insercao.enum';

@Entity('dados_sociais')
@Index(['cidadao_id'], { unique: true })
export class DadosSociais {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'ID do cidadão é obrigatório' })
  cidadao_id: string;

  @OneToOne(() => Cidadao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cidadao_id' })
  cidadao: Cidadao;

  @Column({
    type: 'enum',
    enum: EscolaridadeEnum,
    enumName: 'escolaridade_enum',
    nullable: false,
  })
  @IsNotEmpty({ message: 'Escolaridade é obrigatória' })
  @IsEnum(EscolaridadeEnum, { message: 'Escolaridade inválida' })
  escolaridade: EscolaridadeEnum;

  @Column({ nullable: true })
  @IsOptional()
  @IsBoolean({
    message: 'O campo publico_prioritario deve ser um true ou false',
  })
  publico_prioritario: boolean;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Renda deve ser um número' })
  @Min(0, { message: 'Renda não pode ser negativa' })
  renda: number;

  @Column({ nullable: true })
  @IsOptional()
  @IsString({ message: 'O campo ocupacao_beneficiario deve ser um texto' })
  ocupacao_beneficiario: string;

  @Column({ default: false })
  @IsBoolean({
    message: 'O campo exerce_atividade_remunerada deve ser um valor booleano',
  })
  exerce_atividade_remunerada: boolean;

  @Column({
    type: 'enum',
    enum: TipoInsercaoEnum,
    enumName: 'tipo_insercao_enum',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(TipoInsercaoEnum, { message: 'Tipo de inserção inválido' })
  @ValidateIf((o) => o.exerce_atividade_remunerada === true)
  @IsNotEmpty({
    message:
      'Tipo de inserção é obrigatório quando exerce atividade remunerada',
  })
  tipo_insercao_beneficiario: TipoInsercaoEnum;

  @Column({ default: false })
  @IsBoolean({ message: 'O campo recebe_pbf deve ser um valor booleano' })
  recebe_pbf: boolean;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Valor PBF deve ser um número' })
  @Min(0, { message: 'Valor do PBF não pode ser negativa' })
  valor_pbf: number;

  @Column({ default: false })
  @IsBoolean({ message: 'O campo recebe_bpc deve ser um valor booleano' })
  recebe_bpc: boolean;

  @Column({
    type: 'enum',
    enum: ModalidadeBpcEnum,
    enumName: 'modalidade_bpc_enum',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(ModalidadeBpcEnum, { message: 'Modalidade BPC inválida' })
  @ValidateIf((o) => o.recebe_bpc === true)
  @IsNotEmpty({ message: 'Modalidade BPC é obrigatória quando recebe BPC' })
  modalidade_bpc: ModalidadeBpcEnum;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Valor do BPC deve ser um número' })
  @Min(0, { message: 'Valor do BPC não pode ser negativa' })
  @ValidateIf((o) => o.recebe_bpc === true)
  @IsNotEmpty({ message: 'Valor BPC é obrigatório quando recebe BPC' })
  valor_bpc: number;

  @Column({ default: false })
  @IsBoolean({
    message: 'O campo recebe_tributo_crianca deve ser um valor booleano',
  })
  recebe_tributo_crianca: boolean;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Valor do tributo criança deve ser um número' })
  @Min(0, { message: 'Valor do tributo criança não pode ser negativo' })
  @ValidateIf((o) => o.recebe_tributo_crianca === true)
  @IsNotEmpty({
    message:
      'Valor tributo criança é obrigatório quando recebe tributo criança',
  })
  valor_tributo_crianca: number;

  @Column({ default: false })
  @IsBoolean({ message: 'O campo pensao_morte deve ser um valor booleano' })
  pensao_morte: boolean;

  @Column({ default: false })
  @IsBoolean({ message: 'O campo aposentadoria deve ser um valor booleano' })
  aposentadoria: boolean;

  @Column({ default: false })
  @IsBoolean({
    message: 'O campo outros_beneficios deve ser um valor booleano',
  })
  outros_beneficios: boolean;

  @Column({ nullable: true })
  @IsOptional()
  @IsString({
    message: 'O campo descricao_outros_beneficios deve ser um texto',
  })
  @ValidateIf((o) => o.outros_beneficios === true)
  @IsNotEmpty({
    message:
      'Descrição outros benefícios é obrigatória quando outros benefícios é verdadeiro',
  })
  descricao_outros_beneficios: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString({ message: 'O campo curso_profissionalizante deve ser um texto' })
  curso_profissionalizante: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsBoolean({
    message:
      'O campo interesse_curso_profissionalizante deve ser um true ou false',
  })
  interesse_curso_profissionalizante: boolean;

  @Column({
    type: 'enum',
    enum: SituacaoTrabalhoEnum,
    enumName: 'situacao_trabalho_enum',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(SituacaoTrabalhoEnum, { message: 'Situação de trabalho inválida' })
  situacao_trabalho: SituacaoTrabalhoEnum;

  @Column({ nullable: true })
  @IsOptional()
  @IsString({ message: 'O campo area_trabalho deve ser um texto' })
  area_trabalho: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsBoolean({
    message: 'O campo familiar_apto_trabalho deve ser um true ou false',
  })
  familiar_apto_trabalho: boolean;

  @Column({ nullable: true })
  @IsOptional()
  @IsString({ message: 'O campo area_interesse_familiar deve ser um texto' })
  area_interesse_familiar: string;

  @Column({ nullable: true })
  @IsOptional()
  observacoes: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString({ message: 'O campo nome_conjuge deve ser um texto' })
  nome_conjuge: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString({ message: 'O campo ocupacao_conjuge deve ser um texto' })
  ocupacao_conjuge: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsBoolean({
    message:
      'O campo exerce_atividade_remunerada_conjuge deve ser um valor booleano',
  })
  exerce_atividade_remunerada_conjuge: boolean;

  @Column({
    type: 'enum',
    enum: TipoInsercaoEnum,
    enumName: 'tipo_insercao_conjuge_enum',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(TipoInsercaoEnum, { message: 'Tipo de inserção do cônjuge inválido' })
  @ValidateIf((o) => o.exerce_atividade_remunerada_conjuge === true)
  @IsNotEmpty({
    message:
      'Tipo de inserção do cônjuge é obrigatório quando cônjuge exerce atividade remunerada',
  })
  tipo_insercao_conjuge: TipoInsercaoEnum;

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
   * Verifica se os dados foram criados recentemente (últimas 24 horas)
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
   * Verifica se os dados foram removidos
   */
  foiRemovido(): boolean {
    return !!this.removed_at;
  }

  /**
   * Verifica se os dados estão ativos
   */
  isAtivo(): boolean {
    return !this.removed_at;
  }

  /**
   * Verifica se é público prioritário
   */
  isPublicoPrioritario(): boolean {
    return !!this.publico_prioritario;
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
    if (!this.temRenda()) {
      return 'Sem renda';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.renda);
  }

  /**
   * Verifica se recebe Programa Bolsa Família
   */
  recebePBF(): boolean {
    return this.recebe_pbf;
  }

  /**
   * Obtém o valor do PBF formatado
   */
  getValorPBFFormatado(): string {
    if (!this.recebe_pbf || !this.valor_pbf) {
      return 'Não recebe';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.valor_pbf);
  }

  /**
   * Verifica se recebe Benefício de Prestação Continuada
   */
  recebeBPC(): boolean {
    return this.recebe_bpc;
  }

  /**
   * Obtém o valor do BPC formatado
   */
  getValorBPCFormatado(): string {
    if (!this.recebe_bpc || !this.valor_bpc) {
      return 'Não recebe';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.valor_bpc);
  }

  /**
   * Verifica se recebe algum benefício social
   */
  recebeBeneficioSocial(): boolean {
    return (
      this.recebePBF() ||
      this.recebeBPC() ||
      this.recebe_tributo_crianca ||
      this.pensao_morte ||
      this.aposentadoria ||
      this.outros_beneficios
    );
  }

  /**
   * Calcula o total de benefícios recebidos
   */
  getTotalBeneficios(): number {
    let total = 0;
    if (this.recebe_pbf && this.valor_pbf) {
      total += this.valor_pbf;
    }
    if (this.recebe_bpc && this.valor_bpc) {
      total += this.valor_bpc;
    }
    if (this.recebe_tributo_crianca && this.valor_tributo_crianca) {
      total += this.valor_tributo_crianca;
    }
    return total;
  }

  /**
   * Obtém o total de benefícios formatado
   */
  getTotalBeneficiosFormatado(): string {
    const total = this.getTotalBeneficios();
    if (total === 0) {
      return 'Nenhum benefício';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(total);
  }

  /**
   * Verifica se tem interesse em curso profissionalizante
   */
  temInteresseCursoProfissionalizante(): boolean {
    return !!this.interesse_curso_profissionalizante;
  }

  /**
   * Verifica se já fez curso profissionalizante
   */
  jafezCursoProfissionalizante(): boolean {
    return !!(
      this.curso_profissionalizante && this.curso_profissionalizante.trim()
    );
  }

  /**
   * Verifica se está empregado
   */
  isEmpregado(): boolean {
    return this.situacao_trabalho === SituacaoTrabalhoEnum.EMPREGADO_FORMAL;
  }

  /**
   * Verifica se está desempregado
   */
  isDesempregado(): boolean {
    return this.situacao_trabalho === SituacaoTrabalhoEnum.DESEMPREGADO;
  }

  /**
   * Verifica se é autônomo
   */
  isAutonomo(): boolean {
    return this.situacao_trabalho === SituacaoTrabalhoEnum.AUTONOMO;
  }

  /**
   * Verifica se é aposentado
   */
  isAposentado(): boolean {
    return this.situacao_trabalho === SituacaoTrabalhoEnum.APOSENTADO;
  }

  /**
   * Verifica se é pensionista
   */
  isPensionista(): boolean {
    return this.situacao_trabalho === SituacaoTrabalhoEnum.PENSIONISTA;
  }

  /**
   * Verifica se tem familiar apto ao trabalho
   */
  temFamiliarAptoTrabalho(): boolean {
    return !!this.familiar_apto_trabalho;
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
   * Obtém a descrição da situação de trabalho
   */
  getDescricaoSituacaoTrabalho(): string {
    if (!this.situacao_trabalho) {
      return 'Não informado';
    }

    const descricoes = {
      [SituacaoTrabalhoEnum.EMPREGADO_FORMAL]: 'Empregado',
      [SituacaoTrabalhoEnum.DESEMPREGADO]: 'Desempregado',
      [SituacaoTrabalhoEnum.AUTONOMO]: 'Autônomo',
      [SituacaoTrabalhoEnum.APOSENTADO]: 'Aposentado',
      [SituacaoTrabalhoEnum.PENSIONISTA]: 'Pensionista',
      [SituacaoTrabalhoEnum.ESTUDANTE]: 'Estudante',
      [SituacaoTrabalhoEnum.DO_LAR]: 'Do lar',
    };
    return descricoes[this.situacao_trabalho] || this.situacao_trabalho;
  }

  /**
   * Verifica se pertence a um cidadão específico
   */
  pertenceAoCidadao(cidadaoId: string): boolean {
    return this.cidadao_id === cidadaoId;
  }

  /**
   * Obtém um resumo dos dados sociais
   */
  getSummary(): string {
    const escolaridade = this.getDescricaoEscolaridade();
    const situacao = this.getDescricaoSituacaoTrabalho();
    const renda = this.getRendaFormatada();
    const beneficios = this.recebeBeneficioSocial()
      ? ' - Recebe benefícios'
      : '';
    return `${escolaridade} - ${situacao} - ${renda}${beneficios}`;
  }

  /**
   * Gera uma chave única para os dados
   */
  getUniqueKey(): string {
    return `dados_sociais_${this.cidadao_id}`;
  }

  /**
   * Verifica se os dados são consistentes
   */
  isConsistente(): boolean {
    // Verifica se tem cidadão
    if (!this.cidadao_id) {
      return false;
    }

    // Verifica se tem escolaridade
    if (!this.escolaridade) {
      return false;
    }

    // Se recebe PBF, deve ter valor
    if (this.recebe_pbf && (!this.valor_pbf || this.valor_pbf <= 0)) {
      return false;
    }

    // Se recebe BPC, deve ter valor e modalidade
    if (
      this.recebe_bpc &&
      (!this.valor_bpc || this.valor_bpc <= 0 || !this.modalidade_bpc)
    ) {
      return false;
    }

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
    if (this.foiRemovido()) {
      return false;
    }

    // Outras validações específicas podem ser adicionadas
    return true;
  }

  /**
   * Clona os dados sociais (sem ID)
   */
  clone(): Partial<DadosSociais> {
    return {
      cidadao_id: this.cidadao_id,
      escolaridade: this.escolaridade,
      publico_prioritario: this.publico_prioritario,
      renda: this.renda,
      ocupacao_beneficiario: this.ocupacao_beneficiario,
      exerce_atividade_remunerada: this.exerce_atividade_remunerada,
      tipo_insercao_beneficiario: this.tipo_insercao_beneficiario,
      recebe_pbf: this.recebe_pbf,
      valor_pbf: this.valor_pbf,
      recebe_bpc: this.recebe_bpc,
      modalidade_bpc: this.modalidade_bpc,
      valor_bpc: this.valor_bpc,
      recebe_tributo_crianca: this.recebe_tributo_crianca,
      valor_tributo_crianca: this.valor_tributo_crianca,
      pensao_morte: this.pensao_morte,
      aposentadoria: this.aposentadoria,
      outros_beneficios: this.outros_beneficios,
      descricao_outros_beneficios: this.descricao_outros_beneficios,
      curso_profissionalizante: this.curso_profissionalizante,
      interesse_curso_profissionalizante:
        this.interesse_curso_profissionalizante,
      situacao_trabalho: this.situacao_trabalho,
      area_trabalho: this.area_trabalho,
      familiar_apto_trabalho: this.familiar_apto_trabalho,
      area_interesse_familiar: this.area_interesse_familiar,
      nome_conjuge: this.nome_conjuge,
      ocupacao_conjuge: this.ocupacao_conjuge,
      exerce_atividade_remunerada_conjuge:
        this.exerce_atividade_remunerada_conjuge,
      tipo_insercao_conjuge: this.tipo_insercao_conjuge,
      observacoes: this.observacoes,
    };
  }

  /**
   * Verifica se é elegível para programas de capacitação
   */
  isElegivelCapacitacao(): boolean {
    return this.isDesempregado() || this.temInteresseCursoProfissionalizante();
  }

  /**
   * Verifica se tem potencial de geração de renda
   */
  temPotencialGeracaoRenda(): boolean {
    return (
      this.temFamiliarAptoTrabalho() ||
      this.temInteresseCursoProfissionalizante() ||
      this.jafezCursoProfissionalizante()
    );
  }

  /**
   * Calcula a renda total (própria + benefícios)
   */
  getRendaTotal(): number {
    let total = 0;
    if (this.renda) {
      total += this.renda;
    }
    total += this.getTotalBeneficios();
    return total;
  }

  /**
   * Obtém a renda total formatada
   */
  getRendaTotalFormatada(): string {
    const total = this.getRendaTotal();
    if (total === 0) {
      return 'Sem renda';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(total);
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
  toSafeLog(): Partial<DadosSociais> {
    return {
      id: this.id,
      escolaridade: this.escolaridade,
      publico_prioritario: this.publico_prioritario,
      situacao_trabalho: this.situacao_trabalho,
      recebe_pbf: this.recebe_pbf,
      recebe_bpc: this.recebe_bpc,
      interesse_curso_profissionalizante:
        this.interesse_curso_profissionalizante,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  /**
   * Obtém sugestões de melhoria para os dados sociais
   */
  getSugestoesMelhoria(): string[] {
    const sugestoes: string[] = [];

    if (!this.ocupacao_beneficiario && this.isEmpregado()) {
      sugestoes.push('Definir ocupação para pessoa empregada');
    }

    if (!this.area_trabalho && (this.isEmpregado() || this.isAutonomo())) {
      sugestoes.push('Especificar área de trabalho');
    }

    if (this.isDesempregado() && !this.temInteresseCursoProfissionalizante()) {
      sugestoes.push('Verificar interesse em capacitação profissional');
    }

    if (this.recebe_pbf && !this.valor_pbf) {
      sugestoes.push('Informar valor do Programa Bolsa Família');
    }

    if (this.recebe_bpc && (!this.valor_bpc || !this.modalidade_bpc)) {
      sugestoes.push('Completar informações do BPC (valor e tipo)');
    }

    if (!this.isConsistente()) {
      sugestoes.push('Verificar consistência dos dados sociais');
    }

    return sugestoes;
  }

  /**
   * Verifica se precisa de atualização (dados antigos)
   */
  precisaAtualizacao(): boolean {
    const seiseMesesAtras = new Date();
    seiseMesesAtras.setMonth(seiseMesesAtras.getMonth() - 6);
    return this.updated_at < seiseMesesAtras;
  }

  /**
   * Verifica se recebe tributo criança
   */
  recebeTributoCrianca(): boolean {
    return this.recebe_tributo_crianca;
  }

  /**
   * Obtém o valor do tributo criança formatado
   */
  getValorTributoCriancaFormatado(): string {
    if (!this.recebe_tributo_crianca || !this.valor_tributo_crianca) {
      return 'Não recebe';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.valor_tributo_crianca);
  }

  /**
   * Verifica se recebe pensão por morte
   */
  recebePensaoMorte(): boolean {
    return this.pensao_morte;
  }

  /**
   * Verifica se é aposentado
   */
  isAposentadoBeneficio(): boolean {
    return this.aposentadoria;
  }

  /**
   * Verifica se recebe outros benefícios
   */
  recebeOutrosBeneficios(): boolean {
    return this.outros_beneficios;
  }

  /**
   * Obtém a descrição da modalidade BPC
   */
  getDescricaoModalidadeBPC(): string {
    if (!this.modalidade_bpc) {
      return 'Não informado';
    }

    const descricoes = {
      [ModalidadeBpcEnum.IDOSO]: 'Idoso',
      [ModalidadeBpcEnum.PCD]: 'Pessoa com Deficiência',
    };
    return descricoes[this.modalidade_bpc] || this.modalidade_bpc;
  }

  /**
   * Verifica se o beneficiario exerce atividade remunerada
   */
  beneficiarioExerceAtividadeRemunerada(): boolean {
    return this.exerce_atividade_remunerada;
  }

  /**
   * Obtém a descrição do tipo de inserção do beneficiario
   */
  getDescricaoTipoInsercaobeneficiario(): string {
    if (!this.tipo_insercao_beneficiario) {
      return 'Não informado';
    }

    const descricoes = {
      [TipoInsercaoEnum.FORMAL]: 'Formal',
      [TipoInsercaoEnum.INFORMAL]: 'Informal',
    };
    return (
      descricoes[this.tipo_insercao_beneficiario] ||
      this.tipo_insercao_beneficiario
    );
  }

  /**
   * Verifica se tem cônjuge
   */
  temConjuge(): boolean {
    return !!(this.nome_conjuge && this.nome_conjuge.trim());
  }

  /**
   * Verifica se o cônjuge exerce atividade remunerada
   */
  conjugeExerceAtividadeRemunerada(): boolean {
    return !!this.exerce_atividade_remunerada_conjuge;
  }

  /**
   * Obtém a descrição do tipo de inserção do cônjuge
   */
  getDescricaoTipoInsercaoConjuge(): string {
    if (!this.tipo_insercao_conjuge) {
      return 'Não informado';
    }

    const descricoes = {
      [TipoInsercaoEnum.FORMAL]: 'Formal',
      [TipoInsercaoEnum.INFORMAL]: 'Informal',
    };
    return descricoes[this.tipo_insercao_conjuge] || this.tipo_insercao_conjuge;
  }

  /**
   * Obtém um resumo dos benefícios recebidos
   */
  getResumoBeneficios(): string {
    const beneficios: string[] = [];

    if (this.recebePBF()) {
      beneficios.push(`PBF: ${this.getValorPBFFormatado()}`);
    }

    if (this.recebeBPC()) {
      beneficios.push(
        `BPC ${this.getDescricaoModalidadeBPC()}: ${this.getValorBPCFormatado()}`,
      );
    }

    if (this.recebeTributoCrianca()) {
      beneficios.push(
        `Tributo Criança: ${this.getValorTributoCriancaFormatado()}`,
      );
    }

    if (this.recebePensaoMorte()) {
      beneficios.push('Pensão por Morte');
    }

    if (this.isAposentadoBeneficio()) {
      beneficios.push('Aposentadoria');
    }

    if (this.recebeOutrosBeneficios()) {
      beneficios.push(
        `Outros: ${this.descricao_outros_beneficios || 'Não especificado'}`,
      );
    }

    return beneficios.length > 0 ? beneficios.join(', ') : 'Nenhum benefício';
  }

  /**
   * Obtém um resumo da situação de trabalho da família
   */
  getResumoTrabalhoFamilia(): string {
    const situacoes: string[] = [];

    if (this.ocupacao_beneficiario) {
      const tipoInsercao = this.beneficiarioExerceAtividadeRemunerada()
        ? ` (${this.getDescricaoTipoInsercaobeneficiario()})`
        : '';
      situacoes.push(
        `beneficiario: ${this.ocupacao_beneficiario}${tipoInsercao}`,
      );
    }

    if (this.temConjuge() && this.ocupacao_conjuge) {
      const tipoInsercao = this.conjugeExerceAtividadeRemunerada()
        ? ` (${this.getDescricaoTipoInsercaoConjuge()})`
        : '';
      situacoes.push(`Cônjuge: ${this.ocupacao_conjuge}${tipoInsercao}`);
    }

    return situacoes.length > 0 ? situacoes.join(', ') : 'Não informado';
  }

  /**
   * Verifica se a família tem renda do trabalho
   */
  familiaTemRendaTrabalho(): boolean {
    return (
      this.beneficiarioExerceAtividadeRemunerada() ||
      this.conjugeExerceAtividadeRemunerada()
    );
  }

  /**
   * Verifica se a família está em situação de vulnerabilidade
   */
  familiaEmVulnerabilidade(): boolean {
    const temRendaBaixa = !this.renda || this.renda < 500; // Valor exemplo
    const dependeBeneficios = this.recebeBeneficioSocial();
    const semTrabalhoFormal =
      !this.beneficiarioExerceAtividadeRemunerada() ||
      this.tipo_insercao_beneficiario === TipoInsercaoEnum.INFORMAL;

    return temRendaBaixa && (dependeBeneficios || semTrabalhoFormal);
  }
}
