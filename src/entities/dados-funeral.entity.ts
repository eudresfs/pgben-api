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
  IsDateString,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Solicitacao } from './solicitacao.entity';
import { TipoUrnaEnum, ParentescoEnum } from '../enums';


/**
 * Entidade para armazenar dados específicos do cidadão para Auxílio Funeral
 *
 * Armazena informações específicas necessárias para a solicitação do benefício
 * de Auxílio Funeral, como dados do falecido, tipo de urna, etc.
 */
@Entity('dados_funeral')
@Index(['solicitacao_id'], { unique: true })
export class DadosFuneral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'ID da solicitação é obrigatório' })
  solicitacao_id: string;

  @ManyToOne(() => Solicitacao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;

  @Column()
  @IsNotEmpty({ message: 'Nome completo do falecido é obrigatório' })
  nome_completo_falecido: string;

  @Column({ type: 'date' })
  @IsNotEmpty({ message: 'Data do óbito é obrigatória' })
  @IsDateString({}, { message: 'Data do óbito deve ser uma data válida' })
  data_obito: Date;

  @Column()
  @IsNotEmpty({ message: 'Local do óbito é obrigatório' })
  local_obito: string;

  @Column({ type: 'date' })
  @IsNotEmpty({ message: 'Data da autorização é obrigatória' })
  @IsDateString({}, { message: 'Data da autorização deve ser uma data válida' })
  data_autorizacao: Date;

  @Column({
    type: 'enum',
    enum: ParentescoEnum,
    enumName: 'grau_parentesco',
  })
  @IsNotEmpty({ message: 'Grau de parentesco é obrigatório' })
  @IsEnum(ParentescoEnum, { message: 'Grau de parentesco inválido' })
  grau_parentesco_requerente: ParentescoEnum;

  @Column({
    type: 'enum',
    enum: TipoUrnaEnum,
    enumName: 'tipo_urna',
  })
  @IsNotEmpty({ message: 'Tipo de urna é obrigatório' })
  @IsEnum(TipoUrnaEnum, { message: 'Tipo de urna inválido' })
  tipo_urna_necessaria: TipoUrnaEnum;

  @Column('text', { nullable: true })
  @IsOptional()
  observacoes_especiais?: string;

  @Column({ nullable: true })
  @IsOptional()
  numero_certidao_obito?: string;

  @Column({ nullable: true })
  @IsOptional()
  cartorio_emissor?: string;

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
   * Verifica se é parente de primeiro grau
   */
  isParentePrimeiroGrau(): boolean {
    const primeiroGrau = [
      ParentescoEnum.CONJUGE,
      ParentescoEnum.FILHO,
      ParentescoEnum.PAI,
      ParentescoEnum.MAE,
    ];
    
    return primeiroGrau.includes(this.grau_parentesco_requerente);
  }

  /**
   * Verifica se é parente de segundo grau
   */
  isParenteSegundoGrau(): boolean {
    const segundoGrau = [
      ParentescoEnum.IRMAO,
      ParentescoEnum.AVO,
      ParentescoEnum.NETO
    ];
    
    return segundoGrau.includes(this.grau_parentesco_requerente);
  }

  /**
   * Calcula dias entre óbito e solicitação
   */
  calcularDiasAposObito(): number {
    const hoje = new Date();
    const dataObito = new Date(this.data_obito);
    const diffTime = Math.abs(hoje.getTime() - dataObito.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Verifica se está no prazo para solicitação
   */
  estaNoPrazoSolicitacao(prazoMaximoDias: number): boolean {
    return this.calcularDiasAposObito() <= prazoMaximoDias;
  }

  /**
   * Verifica se é caso de urgência (óbito recente)
   */
  isCasoUrgencia(): boolean {
    return this.calcularDiasAposObito() <= 3;
  }

  /**
   * Determina prioridade baseada no grau de parentesco
   */
  calcularPrioridadeParentesco(): number {
    if (this.isParentePrimeiroGrau()) return 100;
    if (this.isParenteSegundoGrau()) return 80;
    return 60;
  }

  /**
   * Verifica se precisa de urna especial
   */
  precisaUrnaEspecial(): boolean {
    return [
      TipoUrnaEnum.INFANTIL,
      TipoUrnaEnum.ESPECIAL,
      TipoUrnaEnum.OBESO,
    ].includes(this.tipo_urna_necessaria);
  }

  /**
   * Valida se os dados estão completos para submissão
   */
  validarDadosCompletos(): { valido: boolean; erros: string[] } {
    const erros: string[] = [];

    if (!this.nome_completo_falecido || this.nome_completo_falecido.trim().length === 0) {
      erros.push('Nome completo do falecido é obrigatório');
    }

    if (!this.data_obito) {
      erros.push('Data do óbito é obrigatória');
    }

    if (!this.local_obito || this.local_obito.trim().length === 0) {
      erros.push('Local do óbito é obrigatório');
    }

    if (!this.data_autorizacao) {
      erros.push('Data da autorização é obrigatória');
    }

    if (!this.grau_parentesco_requerente) {
      erros.push('Grau de parentesco do requerente é obrigatório');
    }

    if (!this.tipo_urna_necessaria) {
      erros.push('Tipo de urna necessária é obrigatório');
    }

    // Validação de datas
    if (this.data_obito && this.data_autorizacao) {
      const dataObito = new Date(this.data_obito);
      const dataAutorizacao = new Date(this.data_autorizacao);
      
      if (dataObito > dataAutorizacao) {
        erros.push('Data da autorização não pode ser anterior à data do óbito');
      }
    }

    return {
      valido: erros.length === 0,
      erros
    };
  }
}