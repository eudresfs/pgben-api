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
  IsDateString,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { Solicitacao } from './solicitacao.entity';

/**
 * Entidade para armazenar dados específicos do cidadão para Auxílio Natalidade
 *
 * Armazena informações específicas necessárias para a solicitação do benefício
 * de Auxílio Natalidade, como dados da gestação, pré-natal, etc.
 */
@Entity('dados_natalidade')
@Index(['solicitacao_id'], { unique: true })
export class DadosNatalidade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'ID da solicitação é obrigatório' })
  solicitacao_id: string;

  @ManyToOne(() => Solicitacao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;

  @Column({ default: false })
  @IsBoolean({ message: 'Realiza pré-natal deve ser um booleano' })
  realiza_pre_natal: boolean;

  @Column({ default: false })
  @IsBoolean({ message: 'Atendida pelo PSF/UBS deve ser um booleano' })
  atendida_psf_ubs: boolean;

  @Column({ default: false })
  @IsBoolean({ message: 'Gravidez de risco deve ser um booleano' })
  gravidez_risco: boolean;

  @Column({ type: 'date', nullable: true })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Data provável do parto deve ser uma data válida' },
  )
  data_provavel_parto?: Date;

  @Column({ default: false })
  @IsBoolean({ message: 'Gêmeos/Trigêmeos deve ser um booleano' })
  gemeos_trigemeos: boolean;

  @Column({ default: false })
  @IsBoolean({ message: 'Já tem filhos deve ser um booleano' })
  ja_tem_filhos: boolean;

  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Quantidade de filhos deve ser um número' })
  @Min(0, { message: 'Quantidade de filhos não pode ser negativa' })
  quantidade_filhos?: number;

  @Column({ nullable: true })
  @IsOptional()
  telefone_cadastrado_cpf?: string;

  @Column({ nullable: true })
  @IsOptional()
  chave_pix?: string;

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
   * Verifica se todos os critérios para pecúnia estão preenchidos
   */
  temCriteriosPecunia(): boolean {
    return !!(this.telefone_cadastrado_cpf && this.chave_pix);
  }

  /**
   * Verifica se é uma gravidez múltipla
   */
  isGravidezMultipla(): boolean {
    return this.gemeos_trigemeos;
  }

  /**
   * Verifica se é primípara (primeiro filho)
   */
  isPrimipara(): boolean {
    return !this.ja_tem_filhos || this.quantidade_filhos === 0;
  }

  /**
   * Calcula se está no prazo para solicitação baseado na data provável do parto
   */
  estaNoPrazoSolicitacao(prazoMaximoDias: number): boolean {
    if (!this.data_provavel_parto) return false;

    const hoje = new Date();
    const dataLimite = new Date(this.data_provavel_parto);
    dataLimite.setDate(dataLimite.getDate() + prazoMaximoDias);

    return hoje <= dataLimite;
  }

  /**
   * Valida se os dados estão completos para submissão
   */
  validarDadosCompletos(): { valido: boolean; erros: string[] } {
    const erros: string[] = [];

    if (
      this.ja_tem_filhos &&
      (this.quantidade_filhos === null || this.quantidade_filhos === undefined)
    ) {
      erros.push('Quantidade de filhos é obrigatória quando já tem filhos');
    }

    if (this.realiza_pre_natal && !this.atendida_psf_ubs) {
      erros.push(
        'Quando realiza pré-natal, deve informar se é atendida pelo PSF/UBS',
      );
    }

    return {
      valido: erros.length === 0,
      erros,
    };
  }
}
