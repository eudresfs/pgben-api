import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import {
  IsNotEmpty,
  IsNumber,
  Min,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { TipoBeneficio } from './tipo-beneficio.entity';

/**
 * Entidade para versionamento de schema de benefícios
 *
 * Permite controlar a evolução do schema de campos dinâmicos sem quebrar
 * dados existentes, mantendo um histórico de versões.
 */
@Entity('versao_schema_beneficio')
@Index(['tipo_beneficio_id', 'versao'], { unique: true })
export class VersaoSchemaBeneficio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Tipo de benefício é obrigatório' })
  tipo_beneficio_id: string;

  @ManyToOne(() => TipoBeneficio)
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipo_beneficio: TipoBeneficio;

  @Column('varchar')
  @IsNotEmpty({ message: 'Versão é obrigatória' })
  versao: string;

  @Column('jsonb')
  @IsNotEmpty({ message: 'Schema é obrigatório' })
  schema: any;

  @Column('text', { nullable: true })
  @IsOptional()
  descricao_mudancas: string;

  @Column({ default: true })
  @IsBoolean({ message: 'Ativo deve ser um booleano' })
  ativo: boolean;

  @Column('timestamp')
  @IsNotEmpty({ message: 'Data de início de vigência é obrigatória' })
  data_inicio_vigencia: Date;

  @Column('timestamp', { nullable: true })
  @IsOptional()
  data_fim_vigencia: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Getters e Setters
  get createdAt(): Date {
    return this.created_at;
  }

  get updatedAt(): Date {
    return this.updated_at;
  }

  // Métodos Utilitários

  /**
   * Verifica se a versão foi criada recentemente (últimas 24 horas)
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
   * Verifica se a versão está ativa
   */
  isAtiva(): boolean {
    return this.ativo;
  }

  /**
   * Verifica se tem descrição de mudanças
   */
  temDescricaoMudancas(): boolean {
    return (
      !!this.descricao_mudancas && this.descricao_mudancas.trim().length > 0
    );
  }

  /**
   * Obtém a descrição das mudanças ou uma mensagem padrão
   */
  getDescricaoMudancas(): string {
    return this.descricao_mudancas || 'Sem descrição de mudanças disponível';
  }

  /**
   * Verifica se o schema tem campos obrigatórios
   */
  temCamposObrigatorios(): boolean {
    if (!this.schema || !Array.isArray(this.schema.campos)) {
      return false;
    }
    return this.schema.campos.some((campo: any) => campo.obrigatorio === true);
  }

  /**
   * Obtém o número de campos no schema
   */
  getNumeroCampos(): number {
    if (!this.schema || !Array.isArray(this.schema.campos)) {
      return 0;
    }
    return this.schema.campos.length;
  }

  /**
   * Obtém os tipos de campos únicos no schema
   */
  getTiposCampos(): string[] {
    if (!this.schema || !Array.isArray(this.schema.campos)) {
      return [];
    }
    const tipos =
      this.schema.campos
        ?.map((campo: any) => campo.tipo)
        .filter((tipo: any): tipo is string => typeof tipo === 'string') || [];
    return Array.from(new Set(tipos)) as string[];
  }

  /**
   * Verifica se o schema é compatível com uma versão anterior
   */
  isCompativelCom(versaoAnterior: VersaoSchemaBeneficio): boolean {
    if (!versaoAnterior || !versaoAnterior.schema) {
      return false;
    }

    // Verifica se todos os campos obrigatórios da versão anterior ainda existem
    const camposAnteriores = versaoAnterior.schema.campos || [];
    const camposAtuais = this.schema.campos || [];

    return camposAnteriores
      .filter((campo: any) => campo.obrigatorio)
      .every((campoObrigatorio: any) =>
        camposAtuais.some(
          (campoAtual: any) =>
            campoAtual.nome === campoObrigatorio.nome &&
            campoAtual.tipo === campoObrigatorio.tipo,
        ),
      );
  }

  /**
   * Obtém um resumo da versão
   */
  getSummary(): string {
    const numeroCampos = this.getNumeroCampos();
    const status = this.isAtiva() ? 'Ativa' : 'Inativa';
    return `Versão ${this.versao} - ${numeroCampos} campos - ${status}`;
  }

  /**
   * Gera uma chave única para a versão
   */
  getUniqueKey(): string {
    return `${this.tipo_beneficio_id}-v${this.versao}`;
  }

  /**
   * Verifica se a versão pode ser removida
   */
  podeSerRemovida(): boolean {
    return !this.isAtiva();
  }

  /**
   * Obtém a data de criação formatada
   */
  getCriacaoFormatada(): string {
    return this.created_at.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Obtém a data de atualização formatada
   */
  getAtualizacaoFormatada(): string {
    return this.updated_at.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Remove informações sensíveis para logs
   */
  toSafeLog(): Partial<VersaoSchemaBeneficio> {
    return {
      id: this.id,
      tipo_beneficio_id: this.tipo_beneficio_id,
      versao: this.versao,
      ativo: this.ativo,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  /**
   * Obtém sugestões de melhoria para a versão
   */
  getSugestoesMelhoria(): string[] {
    const sugestoes: string[] = [];

    if (!this.temDescricaoMudancas()) {
      sugestoes.push(
        'Adicionar descrição das mudanças para melhor rastreabilidade',
      );
    }

    if (this.getNumeroCampos() === 0) {
      sugestoes.push('Schema não possui campos definidos');
    }

    if (!this.temCamposObrigatorios()) {
      sugestoes.push('Considerar adicionar campos obrigatórios para validação');
    }

    const tiposCampos = this.getTiposCampos();
    if (tiposCampos.length === 1 && tiposCampos[0] === 'string') {
      sugestoes.push(
        'Considerar diversificar tipos de campos para melhor validação',
      );
    }

    return sugestoes;
  }

  /**
   * Verifica se a versão precisa de atualização
   */
  precisaAtualizacao(): boolean {
    const idadeEmDias = this.getIdadeRegistroEmDias();
    return idadeEmDias > 365 && this.isAtiva(); // Versões ativas com mais de 1 ano
  }

  /**
   * Simula a migração de dados de uma versão anterior
   */
  simularMigracao(
    versaoOrigem: VersaoSchemaBeneficio,
    dadosExemplo: any,
  ): {
    sucesso: boolean;
    dadosMigrados?: any;
    erros?: string[];
    avisos?: string[];
  } {
    const erros: string[] = [];
    const avisos: string[] = [];

    if (!this.isCompativelCom(versaoOrigem)) {
      erros.push('Versões não são compatíveis para migração automática');
      return { sucesso: false, erros };
    }

    try {
      const dadosMigrados = { ...dadosExemplo };
      const camposNovos = this.schema.campos || [];
      const camposAntigos = versaoOrigem.schema.campos || [];

      // Verifica campos removidos
      camposAntigos.forEach((campoAntigo: any) => {
        const campoExiste = camposNovos.some(
          (campo: any) => campo.nome === campoAntigo.nome,
        );
        if (!campoExiste) {
          avisos.push(
            `Campo '${campoAntigo.nome}' foi removido na nova versão`,
          );
          delete dadosMigrados[campoAntigo.nome];
        }
      });

      // Verifica campos novos obrigatórios
      camposNovos.forEach((campoNovo: any) => {
        const campoExistia = camposAntigos.some(
          (campo: any) => campo.nome === campoNovo.nome,
        );
        if (!campoExistia && campoNovo.obrigatorio) {
          avisos.push(
            `Campo obrigatório '${campoNovo.nome}' foi adicionado - valor padrão necessário`,
          );
        }
      });

      return {
        sucesso: true,
        dadosMigrados,
        avisos: avisos.length > 0 ? avisos : undefined,
      };
    } catch (error) {
      erros.push(`Erro durante simulação de migração: ${error.message}`);
      return { sucesso: false, erros };
    }
  }
}
