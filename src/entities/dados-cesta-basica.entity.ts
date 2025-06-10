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
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Solicitacao } from './solicitacao.entity';
import { PeriodicidadeEnum, OrigemAtendimentoEnum } from '../enums';

/**
 * Entidade para armazenar dados específicos do cidadão para Cesta Básica
 *
 * Armazena informações específicas necessárias para a solicitação do benefício
 * de Cesta Básica, como quantidade, período de concessão, origem do atendimento, etc.
 */
@Entity('dados_cesta_basica')
@Index(['solicitacao_id'], { unique: true })
export class DadosCestaBasica {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'ID da solicitação é obrigatório' })
  solicitacao_id: string;

  @ManyToOne(() => Solicitacao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;

  @Column({ type: 'integer' })
  @IsNotEmpty({ message: 'Quantidade de cestas é obrigatória' })
  @IsNumber({}, { message: 'Quantidade de cestas deve ser um número' })
  @Min(1, { message: 'Quantidade mínima é 1 cesta' })
  @Max(12, { message: 'Quantidade máxima é 12 cestas' })
  quantidade_cestas_solicitadas: number;

  @Column({
    type: 'enum',
    enum: PeriodicidadeEnum,
    enumName: 'periodo_concessao_cesta',
  })
  @IsNotEmpty({ message: 'Período de concessão é obrigatório' })
  @IsEnum(PeriodicidadeEnum, { message: 'Período de concessão inválido' })
  periodo_concessao: PeriodicidadeEnum;

  @Column({
    type: 'enum',
    enum: OrigemAtendimentoEnum,
    enumName: 'origem_atendimento',
  })
  @IsNotEmpty({ message: 'Origem do atendimento é obrigatória' })
  @IsEnum(OrigemAtendimentoEnum, { message: 'Origem do atendimento inválida' })
  origem_atendimento: OrigemAtendimentoEnum;

  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Número de pessoas na família deve ser um número' })
  @Min(1, { message: 'Número mínimo de pessoas na família é 1' })
  numero_pessoas_familia?: number;

  @Column('text', { nullable: true })
  @IsOptional()
  justificativa_quantidade?: string;

  @Column('text', { nullable: true })
  @IsOptional()
  observacoes?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;

  // Getters
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
   * Calcula quantidade recomendada baseada no número de pessoas na família
   */
  calcularQuantidadeRecomendada(): number {
    if (!this.numero_pessoas_familia) {return 1;}

    // Regra: 1 cesta para até 3 pessoas, +1 cesta a cada 3 pessoas adicionais
    return Math.ceil(this.numero_pessoas_familia / 3);
  }

  /**
   * Verifica se a quantidade solicitada está dentro do recomendado
   */
  isQuantidadeDentroRecomendacao(): boolean {
    const recomendada = this.calcularQuantidadeRecomendada();
    return this.quantidade_cestas_solicitadas <= recomendada + 1; // Tolerância de +1
  }

  /**
   * Verifica se é atendimento prioritário
   */
  isAtendimentoPrioritario(): boolean {
    const origemPrioritaria = [
      OrigemAtendimentoEnum.CREAS,
      OrigemAtendimentoEnum.BUSCA_ATIVA,
    ];

    return origemPrioritaria.includes(this.origem_atendimento);
  }

  /**
   * Calcula duração total do benefício em meses
   */
  calcularDuracaoTotalMeses(): number {
    let multiplicador = 1;

    switch (this.periodo_concessao) {
      case PeriodicidadeEnum.MENSAL:
        multiplicador = 1;
        break;
      case PeriodicidadeEnum.BIMESTRAL:
        multiplicador = 2;
        break;
      case PeriodicidadeEnum.TRIMESTRAL:
        multiplicador = 3;
        break;
      case PeriodicidadeEnum.SEMESTRAL:
        multiplicador = 6;
        break;
      case PeriodicidadeEnum.UNICO:
        multiplicador = 0; // Entrega única
        break;
    }

    return multiplicador;
  }

  /**
   * Calcula total de cestas que serão entregues no período
   */
  calcularTotalCestasNoPeriodo(): number {
    const duracaoMeses = this.calcularDuracaoTotalMeses();

    if (this.periodo_concessao === PeriodicidadeEnum.UNICO) {
      return this.quantidade_cestas_solicitadas;
    }

    // Para períodos recorrentes, considera entrega mensal
    return this.quantidade_cestas_solicitadas * duracaoMeses;
  }

  /**
   * Verifica se precisa de justificativa para quantidade
   */
  precisaJustificativaQuantidade(): boolean {
    const recomendada = this.calcularQuantidadeRecomendada();
    return this.quantidade_cestas_solicitadas > recomendada + 1;
  }

  /**
   * Calcula pontuação de prioridade
   */
  calcularPontuacaoPrioridade(): number {
    let pontuacao = 0;

    // Pontuação por origem do atendimento
    switch (this.origem_atendimento) {
      case OrigemAtendimentoEnum.CREAS:
        pontuacao += 100;
        break;
      case OrigemAtendimentoEnum.BUSCA_ATIVA:
        pontuacao += 90;
        break;
      case OrigemAtendimentoEnum.CRAS:
        pontuacao += 80;
        break;
      case OrigemAtendimentoEnum.ENCAMINHAMENTO_EXTERNO:
        pontuacao += 70;
        break;
      case OrigemAtendimentoEnum.UNIDADE_BASICA:
        pontuacao += 60;
        break;
      case OrigemAtendimentoEnum.DEMANDA_ESPONTANEA:
        pontuacao += 50;
        break;
    }

    // Pontuação por tamanho da família
    if (this.numero_pessoas_familia) {
      if (this.numero_pessoas_familia >= 6) {pontuacao += 30;}
      else if (this.numero_pessoas_familia >= 4) {pontuacao += 20;}
      else if (this.numero_pessoas_familia >= 2) {pontuacao += 10;}
    }

    return pontuacao;
  }

  /**
   * Valida se os dados estão completos para submissão
   */
  validarDadosCompletos(): { valido: boolean; erros: string[] } {
    const erros: string[] = [];

    if (
      !this.quantidade_cestas_solicitadas ||
      this.quantidade_cestas_solicitadas < 1
    ) {
      erros.push('Quantidade de cestas deve ser maior que zero');
    }

    if (!this.periodo_concessao) {
      erros.push('Período de concessão é obrigatório');
    }

    if (!this.origem_atendimento) {
      erros.push('Origem do atendimento é obrigatória');
    }

    if (
      this.precisaJustificativaQuantidade() &&
      (!this.justificativa_quantidade ||
        this.justificativa_quantidade.trim().length === 0)
    ) {
      erros.push(
        'Justificativa é obrigatória para quantidade acima do recomendado',
      );
    }

    return {
      valido: erros.length === 0,
      erros,
    };
  }
}
