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
  IsEnum,
  ValidateIf,
  IsString,
} from 'class-validator';
import { Solicitacao } from './solicitacao.entity';
import { TipoContextoNatalidade } from '../enums/tipo-contexto-natalidade.enum';

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

  @Column({
    type: 'enum',
    enum: TipoContextoNatalidade,
    default: TipoContextoNatalidade.PRE_NATAL,
  })
  @IsEnum(TipoContextoNatalidade, {
    message: 'Tipo de contexto deve ser PRE_NATAL ou POS_NATAL',
  })
  tipo_contexto: TipoContextoNatalidade;

  // Campos para contexto PRE_NATAL
  @Column({ default: false })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsBoolean({ message: 'Realiza pré-natal deve ser um booleano' })
  realiza_pre_natal: boolean;

  @Column({ default: false })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsBoolean({ message: 'Atendida pelo PSF/UBS deve ser um booleano' })
  atendida_psf_ubs: boolean;

  @Column({ default: false })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsBoolean({ message: 'Gravidez de risco deve ser um booleano' })
  gravidez_risco: boolean;

  @Column({ type: 'date', nullable: true })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Data provável do parto deve ser uma data válida' },
  )
  data_provavel_parto?: Date;

  @Column({ default: false })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsBoolean({ message: 'Gêmeos/Trigêmeos deve ser um booleano' })
  gemeos_trigemeos: boolean;

  // Campos para contexto POS_NATAL
  @Column({ type: 'date', nullable: true })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.POS_NATAL)
  @IsNotEmpty({
    message: 'Data de nascimento é obrigatória no contexto pós-natal',
  })
  @IsDateString({}, { message: 'Data de nascimento deve ser uma data válida' })
  data_nascimento?: Date;

  @Column({ nullable: true })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.POS_NATAL)
  @IsNotEmpty({
    message: 'Nome do recém-nascido é obrigatório no contexto pós-natal',
  })
  @IsString({ message: 'Nome do recém-nascido deve ser uma string válida' })
  nome_recem_nascido?: string;

  @Column({ nullable: true })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.POS_NATAL)
  @IsNotEmpty({
    message:
      'Número da certidão de nascimento é obrigatório no contexto pós-natal',
  })
  @IsString({ message: 'Número da certidão deve ser uma string válida' })
  numero_certidao_nascimento?: string;

  @Column({ nullable: true })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.POS_NATAL)
  @IsOptional()
  @IsString({ message: 'Cartório de registro deve ser uma string válida' })
  cartorio_registro?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.POS_NATAL)
  @IsOptional()
  @IsNumber({}, { message: 'Peso ao nascimento deve ser um número válido' })
  @Min(0.5, { message: 'Peso ao nascimento deve ser pelo menos 0.5kg' })
  peso_nascimento?: number;

  @Column({ default: false })
  @IsBoolean({ message: 'Já tem filhos deve ser um booleano' })
  ja_tem_filhos: boolean;

  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Quantidade de filhos deve ser um número' })
  @Min(0, { message: 'Quantidade de filhos não pode ser negativa' })
  quantidade_filhos?: number;

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
   * Calcula se está no prazo para solicitação baseado no contexto
   */
  estaNoPrazoSolicitacao(prazoMaximoDias: number = 30): boolean {
    const hoje = new Date();

    if (this.tipo_contexto === TipoContextoNatalidade.PRE_NATAL) {
      if (!this.data_provavel_parto) {
        return false;
      }
      const dataLimite = new Date(this.data_provavel_parto);
      dataLimite.setDate(dataLimite.getDate() + prazoMaximoDias);
      return hoje <= dataLimite;
    }

    if (this.tipo_contexto === TipoContextoNatalidade.POS_NATAL) {
      if (!this.data_nascimento) {
        return false;
      }
      const dataLimite = new Date(this.data_nascimento);
      dataLimite.setDate(dataLimite.getDate() + 30); // Máximo 30 dias após nascimento
      return hoje <= dataLimite;
    }

    return false;
  }

  /**
   * Verifica se é contexto pré-natal
   */
  isContextoPreNatal(): boolean {
    return this.tipo_contexto === TipoContextoNatalidade.PRE_NATAL;
  }

  /**
   * Verifica se é contexto pós-natal
   */
  isContextoPosNatal(): boolean {
    return this.tipo_contexto === TipoContextoNatalidade.POS_NATAL;
  }

  /**
   * Verifica se está dentro do prazo de 30 dias para contexto pós-natal
   */
  estaDentroPrazoRecemNascido(): boolean {
    if (
      this.tipo_contexto !== TipoContextoNatalidade.POS_NATAL ||
      !this.data_nascimento
    ) {
      return false;
    }

    const hoje = new Date();
    const dataNascimento = new Date(this.data_nascimento);
    const diasDiferenca = Math.floor(
      (hoje.getTime() - dataNascimento.getTime()) / (1000 * 60 * 60 * 24),
    );

    return diasDiferenca >= 0 && diasDiferenca <= 30;
  }

  /**
   * Valida se os dados estão completos para submissão
   */
  validarDadosCompletos(): { valido: boolean; erros: string[] } {
    const erros: string[] = [];

    // Validações comuns
    if (
      this.ja_tem_filhos &&
      (this.quantidade_filhos === null || this.quantidade_filhos === undefined)
    ) {
      erros.push('Quantidade de filhos é obrigatória quando já tem filhos');
    }

    // Validações específicas por contexto
    if (this.tipo_contexto === TipoContextoNatalidade.PRE_NATAL) {
      if (!this.data_provavel_parto) {
        erros.push(
          'Data provável do parto é obrigatória no contexto pré-natal',
        );
      }

      if (this.realiza_pre_natal && !this.atendida_psf_ubs) {
        erros.push(
          'Quando realiza pré-natal, deve informar se é atendida pelo PSF/UBS',
        );
      }
    }

    if (this.tipo_contexto === TipoContextoNatalidade.POS_NATAL) {
      if (!this.data_nascimento) {
        erros.push('Data de nascimento é obrigatória no contexto pós-natal');
      }

      if (!this.nome_recem_nascido?.trim()) {
        erros.push('Nome do recém-nascido é obrigatório no contexto pós-natal');
      }

      if (!this.numero_certidao_nascimento?.trim()) {
        erros.push(
          'Número da certidão de nascimento é obrigatório no contexto pós-natal',
        );
      }

      // Verificar se está dentro do prazo de 30 dias
      if (!this.estaDentroPrazoRecemNascido()) {
        erros.push(
          'Solicitação deve ser feita em até 30 dias após o nascimento',
        );
      }
    }

    return {
      valido: erros.length === 0,
      erros,
    };
  }
}
