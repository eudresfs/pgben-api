import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import {
  IsNotEmpty,
  Length,
  IsOptional,
  IsEnum,
  Validate,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CPFValidator } from '../modules/cidadao/validators/cpf-validator';
import { NISValidator } from '../modules/cidadao/validators/nis-validator';

import { ComposicaoFamiliar } from './composicao-familiar.entity';
import { Sexo } from '../enums/sexo.enum';
import { Unidade } from './unidade.entity';
import { EstadoCivil } from '../enums/estado-civil.enum';
import { Solicitacao } from './solicitacao.entity';
import { Documento } from './documento.entity';
import { DadosSociais } from './dados-sociais.entity';
import { InfoBancaria } from './info-bancaria.entity';

@Entity('cidadao')
@Index(['cpf'], { unique: true })
@Index(['nis'], { unique: true, where: 'nis IS NOT NULL' })
@Index(['nome'])
@Index(['created_at'])
@Index(['unidade_id'])
@Index('idx_cidadao_nome_trgm')
export class Cidadao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  nome: string;

  @Column()
  @IsOptional()
  nome_social: string;

  @Column({ unique: true })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @Length(11, 14, { message: 'CPF deve ter entre 11 e 14 caracteres' })
  @Validate(CPFValidator, { message: 'CPF inválido' })
  cpf: string;

  @Column()
  @IsNotEmpty({ message: 'RG é obrigatório' })
  rg: string;

  @Column({ unique: true, nullable: false })
  @Length(11, 11, { message: 'NIS deve ter 11 caracteres' })
  @Validate(NISValidator, { message: 'NIS inválido' })
  nis: string;

  @Column({ unique: true })
  @IsNotEmpty({ message: 'Nome da mãe é obrigatório' })
  @IsString({ message: 'Nome da mãe deve ser uma string' })
  @MinLength(3, { message: 'Nome da mãe deve ter no mínimo 3 caracteres' })
  @MaxLength(100, { message: 'Nome da mãe deve ter no máximo 100 caracteres' })
  nome_mae: string;

  @Column({ unique: true })
  @IsNotEmpty({ message: 'Naturalidade é obrigatório' })
  naturalidade: string;

  @Column({ nullable: false })
  @IsNotEmpty({ message: 'Prontuario SUAS é obrigatório' })
  prontuario_suas: string;

  @Column({ type: 'date' })
  @IsNotEmpty({ message: 'Data de nascimento é obrigatória' })
  data_nascimento: string;

  @Column({
    type: 'enum',
    enum: Sexo,
    enumName: 'sexo_enum',
  })
  @IsEnum(Sexo, { message: 'Sexo inválido' })
  @IsNotEmpty({ message: 'Sexo é obrigatório' })
  sexo: Sexo;

  @Column({
    type: 'enum',
    enum: EstadoCivil,
    enumName: 'estado_civil_enum',
  })
  @IsEnum(EstadoCivil, { message: 'Estado civil inválido' })
  @IsNotEmpty({ message: 'Estado Civil é obrigatório' })
  estado_civil: EstadoCivil;

  @Column({ type: 'uuid', nullable: false })
  unidade_id: string;

  @ManyToOne(() => Unidade, { nullable: false })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;

  /*
   * Relacionamentos
   */
  @OneToMany(
    () => ComposicaoFamiliar,
    (composicaoFamiliar) => composicaoFamiliar.cidadao,
  )
  composicao_familiar: ComposicaoFamiliar[];

  @OneToMany(() => Solicitacao, (solicitacao) => solicitacao.beneficiario)
  solicitacoes: Solicitacao[];

  @OneToMany(() => Documento, (documento) => documento.cidadao)
  documentos: Documento[];

  @OneToOne(() => DadosSociais, (dadosSociais) => dadosSociais.cidadao)
  dados_sociais: DadosSociais;

  @OneToOne(() => InfoBancaria, (infoBancaria) => infoBancaria.cidadao)
  info_bancaria: InfoBancaria;

  /**
   * Verifica se o cidadão foi criado recentemente (últimas 24 horas)
   * @returns true se foi criado nas últimas 24 horas
   */
  isCriadoRecentemente(): boolean {
    const agora = new Date();
    const umDiaAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
    return this.created_at > umDiaAtras;
  }

  /**
   * Calcula a idade do cidadão em anos
   * @returns idade em anos
   */
  getIdade(): number {
    const hoje = new Date();
    const nascimento = new Date(this.data_nascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesNascimento = nascimento.getMonth();

    if (
      mesAtual < mesNascimento ||
      (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())
    ) {
      idade--;
    }

    return idade;
  }

  /**
   * Verifica se o cidadão é maior de idade
   * @returns true se é maior de idade
   */
  isMaiorIdade(): boolean {
    return this.getIdade() >= 18;
  }

  /**
   * Verifica se o cidadão é idoso (65+ anos)
   * @returns true se é idoso
   */
  isIdoso(): boolean {
    return this.getIdade() >= 65;
  }

  /**
   * Verifica se o cidadão é criança (0-12 anos)
   * @returns true se é criança
   */
  isCrianca(): boolean {
    return this.getIdade() <= 12;
  }

  /**
   * Verifica se o cidadão é adolescente (13-17 anos)
   * @returns true se é adolescente
   */
  isAdolescente(): boolean {
    const idade = this.getIdade();
    return idade >= 13 && idade <= 17;
  }

  /**
   * Verifica se tem nome social definido
   * @returns true se tem nome social
   */
  temNomeSocial(): boolean {
    return (
      this.nome_social !== null &&
      this.nome_social !== undefined &&
      this.nome_social.trim() !== ''
    );
  }

  /**
   * Obtém o nome preferencial (nome social se existir, senão nome civil)
   * @returns nome preferencial
   */
  getNomePreferencial(): string {
    return this.temNomeSocial() ? this.nome_social : this.nome;
  }



  /**
   * Verifica se o cidadão pertence a uma unidade específica
   * @param unidadeId ID da unidade
   * @returns true se pertence à unidade
   */
  pertenceAUnidade(unidadeId: string): boolean {
    return this.unidade_id === unidadeId;
  }

  /**
   * Verifica se o cidadão foi removido (soft delete)
   * @returns true se foi removido
   */
  foiRemovido(): boolean {
    return this.removed_at !== null && this.removed_at !== undefined;
  }

  /**
   * Verifica se o cidadão está ativo
   * @returns true se está ativo
   */
  isAtivo(): boolean {
    return !this.foiRemovido();
  }

  /**
   * Obtém um resumo das informações do cidadão
   * @returns objeto com resumo das informações
   */
  getSummary(): {
    id: string;
    nome: string;
    nomePreferencial: string;
    cpf: string;
    idade: number;
    sexo: string;
    unidadeId: string;
    ativo: boolean;
    criadoEm: Date;
  } {
    return {
      id: this.id,
      nome: this.nome,
      nomePreferencial: this.getNomePreferencial(),
      cpf: this.cpf,
      idade: this.getIdade(),
      sexo: this.sexo,
      unidadeId: this.unidade_id,
      ativo: this.isAtivo(),
      criadoEm: this.created_at,
    };
  }

  /**
   * Gera uma chave única para o cidadão
   * @returns chave única
   */
  getUniqueKey(): string {
    return `cidadao_${this.cpf}`;
  }

  /**
   * Verifica se o estado do cidadão é consistente
   * @returns true se está consistente
   */
  isConsistente(): boolean {
    return (
      this.id !== null &&
      this.nome !== null &&
      this.cpf !== null &&
      this.nis !== null &&
      this.data_nascimento !== null &&
      this.unidade_id !== null &&
      this.created_at !== null &&
      this.updated_at !== null &&
      this.created_at <= this.updated_at
    );
  }

  /**
   * Verifica se o cidadão nasceu em uma cidade específica
   * @param cidade nome da cidade
   * @returns true se nasceu na cidade
   */
  nasceuEm(cidade: string): boolean {
    return this.naturalidade.toLowerCase().includes(cidade.toLowerCase());
  }



  /**
   * Obtém a faixa etária do cidadão
   * @returns faixa etária
   */
  getFaixaEtaria(): string {
    const idade = this.getIdade();

    if (idade <= 12) {return 'Criança';}
    if (idade <= 17) {return 'Adolescente';}
    if (idade <= 29) {return 'Jovem';}
    if (idade <= 59) {return 'Adulto';}
    return 'Idoso';
  }

  /**
   * Obtém o número de familiares cadastrados
   * @returns número de familiares
   */
  getNumeroFamiliares(): number {
    return this.composicao_familiar ? this.composicao_familiar.length : 0;
  }

  /**
   * Verifica se tem composição familiar cadastrada
   * @returns true se tem familiares
   */
  temComposicaoFamiliar(): boolean {
    return this.getNumeroFamiliares() > 0;
  }

  /**
   * Formata o CPF para exibição
   * @returns CPF formatado
   */
  getCpfFormatado(): string {
    const cpf = this.cpf.replace(/\D/g, '');
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }



  /**
   * Formata a data de nascimento
   * @returns data formatada
   */
  getDataNascimentoFormatada(): string {
    return new Date(this.data_nascimento).toLocaleDateString('pt-BR');
  }

  /**
   * Formata a data de criação
   * @returns data formatada
   */
  getCriacaoFormatada(): string {
    return this.created_at.toLocaleString('pt-BR');
  }

  /**
   * Formata a data de atualização
   * @returns data formatada
   */
  getAtualizacaoFormatada(): string {
    return this.updated_at.toLocaleString('pt-BR');
  }

  /**
   * Remove informações sensíveis para logs
   * @returns versão segura para logs
   */
  toSafeLog(): object {
    return {
      id: this.id,
      nome: this.nome,
      idade: this.getIdade(),
      sexo: this.sexo,
      unidadeId: this.unidade_id,
      ativo: this.isAtivo(),
      criadoEm: this.created_at,
    };
  }

  /**
   * Verifica se o cidadão pode ser removido
   * @returns true se pode ser removido
   */
  podeSerRemovido(): boolean {
    // Lógica básica - pode ser expandida conforme regras de negócio
    return this.isAtivo();
  }

  /**
   * Clona o cidadão (sem ID e datas)
   * @returns nova instância do cidadão
   */
  clone(): Cidadao {
    const novoCidadao = new Cidadao();
    novoCidadao.nome = this.nome;
    novoCidadao.nome_social = this.nome_social;
    novoCidadao.cpf = this.cpf;
    novoCidadao.rg = this.rg;
    novoCidadao.nis = this.nis;
    novoCidadao.nome_mae = this.nome_mae;
    novoCidadao.naturalidade = this.naturalidade;
    novoCidadao.prontuario_suas = this.prontuario_suas;
    novoCidadao.data_nascimento = this.data_nascimento;
    novoCidadao.sexo = this.sexo;
    novoCidadao.unidade_id = this.unidade_id;
    return novoCidadao;
  }

  /**
   * Verifica se é um caso prioritário (idoso, criança, etc.)
   * @returns true se é prioritário
   */
  isPrioritario(): boolean {
    return this.isIdoso() || this.isCrianca() || this.isAdolescente();
  }

  /**
   * Obtém sugestões de verificação de dados
   * @returns array de sugestões
   */
  getSugestoesVerificacao(): string[] {
    const sugestoes: string[] = [];



    if (!this.temComposicaoFamiliar()) {
      sugestoes.push('Cadastre a composição familiar para análise completa');
    }

    const idade = this.getIdade();
    if (idade < 0 || idade > 120) {
      sugestoes.push(
        'Verifique a data de nascimento - idade calculada parece incorreta',
      );
    }

    return sugestoes;
  }
}

export { Sexo };