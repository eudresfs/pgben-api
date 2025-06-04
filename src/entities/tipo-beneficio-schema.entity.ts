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
import { IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { TipoBeneficio } from './tipo-beneficio.entity';
import { Status } from '@/enums';

/**
 * Interface para definir a estrutura de um campo da entidade
 */
export interface CampoEstrutura {
  nome: string;
  tipo: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array';
  obrigatorio: boolean;
  label: string;
  descricao?: string;
  validacoes?: {
    min?: number;
    max?: number;
    pattern?: string;
    opcoes?: string[];
  };
  opcoes?: string[];
  dependeDe?: {
    campo: string;
    valor: any;
    condicao: 'igual' | 'diferente' | 'maior' | 'menor' | 'contem';
  };
}

/**
 * Interface para metadados da estrutura
 */
export interface MetadadosEstrutura {
  versao: string;
  descricao: string;
  categoria: string;
  tags?: string[];
  configuracoes?: Record<string, any>;
}

/**
 * Entidade para mapear tipos de benefícios com suas estruturas de dados específicas
 *
 * Esta entidade relaciona cada tipo de benefício com a estrutura tipada
 * da entidade de dados correspondente, eliminando a necessidade de
 * formulários dinâmicos separados.
 */
@Entity('tipo_beneficio_schema')
@Index(['tipo_beneficio_id'], { unique: true })
export class TipoBeneficioSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'ID do tipo de benefício é obrigatório' })
  tipo_beneficio_id: string;

  @ManyToOne(() => TipoBeneficio, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipo_beneficio: TipoBeneficio;

  @Column('varchar', { length: 100 })
  @IsNotEmpty({ message: 'Nome da entidade de dados é obrigatório' })
  entidade_dados: string; // 'DadosNatalidade', 'DadosAluguelSocial', etc.

  @Column('jsonb')
  @IsNotEmpty({ message: 'Estrutura do schema é obrigatória' })
  schema_estrutura: {
    campos: CampoEstrutura[];
    metadados: MetadadosEstrutura;
  };

  @Column('varchar', { length: 20, default: '1.0.0' })
  versao: string;

  @Column({
    type: 'enum',
    enum: Status,
    enumName: 'status_enum',
    default: Status.ATIVO,
  })
  status: Status;

  @Column('text', { nullable: true })
  @IsOptional()
  observacoes?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at?: Date;

  /**
   * Verifica se o schema foi criado recentemente (últimas 24 horas)
   */
  isRecente(): boolean {
    const umDiaAtras = new Date();
    umDiaAtras.setDate(umDiaAtras.getDate() - 1);
    return this.created_at > umDiaAtras;
  }

  /**
   * Obtém os campos obrigatórios do schema
   */
  getCamposObrigatorios(): CampoEstrutura[] {
    return this.schema_estrutura.campos.filter((campo) => campo.obrigatorio);
  }

  /**
   * Obtém os campos opcionais do schema
   */
  getCamposOpcionais(): CampoEstrutura[] {
    return this.schema_estrutura.campos.filter((campo) => !campo.obrigatorio);
  }

  /**
   * Busca um campo específico por nome
   */
  getCampoPorNome(nome: string): CampoEstrutura | undefined {
    return this.schema_estrutura.campos.find((campo) => campo.nome === nome);
  }

  /**
   * Valida se a estrutura do schema está correta
   */
  validarEstrutura(): { valido: boolean; erros: string[] } {
    const erros: string[] = [];

    if (
      !this.schema_estrutura.campos ||
      this.schema_estrutura.campos.length === 0
    ) {
      erros.push('Schema deve conter pelo menos um campo');
    }

    // Validar campos únicos
    const nomesCampos = this.schema_estrutura.campos.map((c) => c.nome);
    const nomesUnicos = new Set(nomesCampos);
    if (nomesCampos.length !== nomesUnicos.size) {
      erros.push('Nomes de campos devem ser únicos');
    }

    // Validar dependências
    this.schema_estrutura.campos.forEach((campo) => {
      if (campo.dependeDe) {
        const campoReferenciado = this.getCampoPorNome(campo.dependeDe.campo);
        if (!campoReferenciado) {
          erros.push(
            `Campo '${campo.nome}' depende de campo inexistente '${campo.dependeDe.campo}'`,
          );
        }
      }
    });

    return {
      valido: erros.length === 0,
      erros,
    };
  }
}
