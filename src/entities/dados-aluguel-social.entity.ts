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
  IsBoolean,
  IsEnum,
  IsOptional,
  IsArray,
} from 'class-validator';
import { Solicitacao } from './solicitacao.entity';
import { PublicoPrioritarioAluguel, EspecificacaoAluguel } from '../enums';

/**
 * Entidade para armazenar dados específicos do cidadão para Aluguel Social
 *
 * Armazena informações específicas necessárias para a solicitação do benefício
 * de Aluguel Social, como público prioritário, situação da moradia, etc.
 */
@Entity('dados_aluguel_social')
@Index(['solicitacao_id'], { unique: true })
export class DadosAluguelSocial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'ID da solicitação é obrigatório' })
  solicitacao_id: string;

  @ManyToOne(() => Solicitacao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;

  @Column({
    type: 'enum',
    enum: PublicoPrioritarioAluguel,
    enumName: 'publico_prioritario_aluguel',
  })
  @IsNotEmpty({ message: 'Público prioritário é obrigatório' })
  @IsEnum(PublicoPrioritarioAluguel, {
    message: 'Público prioritário inválido',
  })
  publico_prioritario: PublicoPrioritarioAluguel;

  @Column('simple-array', { nullable: true })
  @IsOptional()
  @IsArray({ message: 'Especificações devem ser um array' })
  especificacoes?: EspecificacaoAluguel[];

  @Column('text')
  @IsNotEmpty({ message: 'Situação da moradia atual é obrigatória' })
  situacao_moradia_atual: string;

  @Column({ default: false })
  @IsBoolean({ message: 'Possui imóvel interditado deve ser um booleano' })
  possui_imovel_interditado: boolean;

  @Column({ default: false })
  @IsBoolean({
    message: 'Caso judicializado Lei Maria da Penha deve ser um booleano',
  })
  caso_judicializado_maria_penha: boolean;

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
   * Verifica se é caso de alta prioridade
   */
  isAltaPrioridade(): boolean {
    const casosAltaPrioridade = [
      PublicoPrioritarioAluguel.MULHERES_VITIMAS_VIOLENCIA,
      PublicoPrioritarioAluguel.ATINGIDOS_CALAMIDADE,
      PublicoPrioritarioAluguel.SITUACAO_RISCO,
    ];

    return (
      casosAltaPrioridade.includes(this.publico_prioritario) ||
      this.caso_judicializado_maria_penha
    );
  }

  /**
   * Verifica se tem especificações de vulnerabilidade
   */
  temVulnerabilidadeEspecifica(): boolean {
    if (!this.especificacoes || this.especificacoes.length === 0) return false;

    const vulnerabilidades = [
      EspecificacaoAluguel.EXPLORACAO_SEXUAL,
      EspecificacaoAluguel.VITIMA_VIOLENCIA,
      EspecificacaoAluguel.SITUACAO_RUA,
      EspecificacaoAluguel.DROGADICAO,
    ];

    return this.especificacoes.some((esp) => vulnerabilidades.includes(esp));
  }

  /**
   * Calcula pontuação de prioridade para fila de atendimento
   */
  calcularPontuacaoPrioridade(): number {
    let pontuacao = 0;

    // Pontuação base por público prioritário
    switch (this.publico_prioritario) {
      case PublicoPrioritarioAluguel.ATINGIDOS_CALAMIDADE:
        pontuacao += 100;
        break;
      case PublicoPrioritarioAluguel.MULHERES_VITIMAS_VIOLENCIA:
        pontuacao += 90;
        break;
      case PublicoPrioritarioAluguel.SITUACAO_RISCO:
        pontuacao += 80;
        break;
      case PublicoPrioritarioAluguel.CRIANCAS_ADOLESCENTES:
        pontuacao += 70;
        break;
      case PublicoPrioritarioAluguel.GESTANTES_NUTRIZES:
        pontuacao += 60;
        break;
      case PublicoPrioritarioAluguel.IDOSOS:
        pontuacao += 50;
        break;
      case PublicoPrioritarioAluguel.PCD:
        pontuacao += 40;
        break;
    }

    // Pontuação adicional por especificações
    if (this.especificacoes) {
      if (this.especificacoes.includes(EspecificacaoAluguel.EXPLORACAO_SEXUAL))
        pontuacao += 50;
      if (this.especificacoes.includes(EspecificacaoAluguel.VITIMA_VIOLENCIA))
        pontuacao += 40;
      if (this.especificacoes.includes(EspecificacaoAluguel.SITUACAO_RUA))
        pontuacao += 30;
      if (this.especificacoes.includes(EspecificacaoAluguel.DROGADICAO))
        pontuacao += 20;
    }

    // Pontuação por situações especiais
    if (this.caso_judicializado_maria_penha) pontuacao += 50;
    if (this.possui_imovel_interditado) pontuacao += 30;

    return pontuacao;
  }

  /**
   * Valida se os dados estão completos para submissão
   */
  validarDadosCompletos(): { valido: boolean; erros: string[] } {
    const erros: string[] = [];

    if (!this.publico_prioritario) {
      erros.push('Público prioritário é obrigatório');
    }

    if (
      !this.situacao_moradia_atual ||
      this.situacao_moradia_atual.trim().length === 0
    ) {
      erros.push('Situação da moradia atual é obrigatória');
    }

    if (this.especificacoes && this.especificacoes.length > 2) {
      erros.push('Máximo de 2 especificações permitidas');
    }

    return {
      valido: erros.length === 0,
      erros,
    };
  }
}
