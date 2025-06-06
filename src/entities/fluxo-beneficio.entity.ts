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
import { IsNotEmpty, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';
import { TipoBeneficio } from './tipo-beneficio.entity';
import { Role } from '../enums/role.enum';

export enum TipoEtapa {
  ABERTURA = 'abertura',
  ANALISE_DOCUMENTOS = 'analise_documentos',
  ANALISE_TECNICA = 'analise_tecnica',
  APROVACAO = 'aprovacao',
  LIBERACAO = 'liberacao',
}

@Entity('fluxo_beneficio')
@Index(['tipo_beneficio_id', 'ordem'], { unique: true })
export class FluxoBeneficio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Tipo de benefício é obrigatório' })
  tipo_beneficio_id: string;

  @ManyToOne(() => TipoBeneficio, (tipoBeneficio) => tipoBeneficio.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipo_beneficio: TipoBeneficio;

  @Column()
  @IsNotEmpty({ message: 'Nome da etapa é obrigatório' })
  nome_etapa: string;

  @Column({
    type: 'enum',
    enum: TipoEtapa,
    enumName: 'tipo_etapa',
  })
  @IsNotEmpty({ message: 'Tipo de etapa é obrigatório' })
  @IsEnum(TipoEtapa, { message: 'Tipo de etapa inválido' })
  tipo_etapa: TipoEtapa;

  @Column()
  @IsNumber({}, { message: 'Ordem deve ser um número' })
  @Min(1, { message: 'Ordem deve ser maior que zero' })
  ordem: number;

  @Column({
    type: 'enum',
    enum: Role,
    enumName: 'perfil_responsavel',
  })
  @IsNotEmpty({ message: 'Perfil responsável é obrigatório' })
  @IsEnum(Role, { message: 'Perfil responsável inválido' })
  perfil_responsavel: Role;

  @Column({ nullable: true })
  @IsOptional()
  setor_id: string;

  @Column('text', { nullable: true })
  @IsOptional()
  descricao: string;

  @Column({ default: true })
  obrigatorio: boolean;

  @Column({ default: false })
  permite_retorno: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;

  // Getters e Setters
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
   * Verifica se o fluxo foi criado recentemente (últimas 24 horas)
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
   * Verifica se foi removido
   */
  foiRemovido(): boolean {
    return !!this.removed_at;
  }

  /**
   * Verifica se está ativo
   */
  isAtivo(): boolean {
    return !this.removed_at;
  }

  /**
   * Verifica se é obrigatório
   */
  isObrigatorio(): boolean {
    return this.obrigatorio;
  }

  /**
   * Verifica se permite retorno
   */
  permiteRetorno(): boolean {
    return this.permite_retorno;
  }

  /**
   * Verifica se tem setor definido
   */
  temSetor(): boolean {
    return (
      this.setor_id !== null &&
      this.setor_id !== undefined &&
      this.setor_id.trim() !== ''
    );
  }

  /**
   * Verifica se tem descrição
   */
  temDescricao(): boolean {
    return (
      this.descricao !== null &&
      this.descricao !== undefined &&
      this.descricao.trim() !== ''
    );
  }

  /**
   * Obtém a descrição do tipo de etapa
   */
  getDescricaoTipoEtapa(): string {
    const descricoes = {
      [TipoEtapa.ABERTURA]: 'Abertura da Solicitação',
      [TipoEtapa.ANALISE_DOCUMENTOS]: 'Análise de Documentos',
      [TipoEtapa.ANALISE_TECNICA]: 'Análise Técnica',
      [TipoEtapa.APROVACAO]: 'Aprovação',
      [TipoEtapa.LIBERACAO]: 'Liberação do Benefício',
    };
    return descricoes[this.tipo_etapa] || 'Tipo de etapa desconhecido';
  }

  /**
   * Obtém a descrição do perfil responsável
   */
  getDescricaoPerfilResponsavel(): string {
    const descricoes = {
      [Role.ADMIN]: 'Administrador',
      [Role.GESTOR]: 'Gestor',
      [Role.TECNICO]: 'Técnico',
      [Role.COORDENADOR]: 'Coordenador',
      [Role.ASSISTENTE_SOCIAL]: 'Assistente Social',
      [Role.AUDITOR]: 'Auditor',
    };
    return (
      descricoes[this.perfil_responsavel as keyof typeof descricoes] ||
      'Perfil desconhecido'
    );
  }

  /**
   * Verifica se é a primeira etapa do fluxo
   */
  isPrimeiraEtapa(): boolean {
    return this.ordem === 1;
  }

  /**
   * Verifica se é uma etapa de análise
   */
  isEtapaAnalise(): boolean {
    return (
      this.tipo_etapa === TipoEtapa.ANALISE_DOCUMENTOS ||
      this.tipo_etapa === TipoEtapa.ANALISE_TECNICA
    );
  }

  /**
   * Verifica se é uma etapa de decisão
   */
  isEtapaDecisao(): boolean {
    return this.tipo_etapa === TipoEtapa.APROVACAO;
  }

  /**
   * Verifica se é a etapa final
   */
  isEtapaFinal(): boolean {
    return this.tipo_etapa === TipoEtapa.LIBERACAO;
  }

  /**
   * Verifica se é uma etapa crítica (obrigatória e não permite retorno)
   */
  isEtapaCritica(): boolean {
    return this.isObrigatorio() && !this.permiteRetorno();
  }

  /**
   * Obtém o nível de criticidade da etapa
   */
  getNivelCriticidade(): 'BAIXA' | 'MEDIA' | 'ALTA' {
    let pontos = 0;

    if (this.isObrigatorio()) {pontos += 2;}
    if (!this.permiteRetorno()) {pontos += 2;}
    if (this.isEtapaDecisao() || this.isEtapaFinal()) {pontos += 1;}

    if (pontos <= 2) {return 'BAIXA';}
    if (pontos <= 4) {return 'MEDIA';}
    return 'ALTA';
  }

  /**
   * Verifica se pertence a um tipo de benefício
   */
  pertenceAoTipoBeneficio(tipoBeneficioId: string): boolean {
    return this.tipo_beneficio_id === tipoBeneficioId;
  }

  /**
   * Obtém um resumo da etapa
   */
  getSummary(): string {
    const obrigatorio = this.isObrigatorio() ? 'Obrigatória' : 'Opcional';
    const retorno = this.permiteRetorno()
      ? 'Permite retorno'
      : 'Não permite retorno';
    return `${this.ordem}. ${this.nome_etapa} (${obrigatorio}, ${retorno})`;
  }

  /**
   * Gera uma chave única para a etapa
   */
  getUniqueKey(): string {
    return `fluxo_${this.tipo_beneficio_id}_${this.ordem}`;
  }

  /**
   * Verifica se a etapa é consistente
   */
  isConsistente(): boolean {
    // Verifica se tem tipo de benefício
    if (!this.tipo_beneficio_id) {return false;}

    // Verifica se tem nome da etapa
    if (!this.nome_etapa || this.nome_etapa.trim() === '') {return false;}

    // Verifica se ordem é válida
    if (this.ordem < 1) {return false;}

    // Verifica se tipo de etapa é válido
    if (!Object.values(TipoEtapa).includes(this.tipo_etapa)) {return false;}

    // Verifica se perfil responsável é válido
    if (!Object.values(Role).includes(this.perfil_responsavel)) {return false;}

    return true;
  }

  /**
   * Verifica se pode ser removida
   */
  podeSerRemovida(): boolean {
    // Não pode remover se já foi removida
    if (this.foiRemovido()) {return false;}

    // Primeira etapa geralmente não pode ser removida
    if (this.isPrimeiraEtapa()) {return false;}

    // Etapas obrigatórias precisam de cuidado especial
    if (this.isObrigatorio()) {return false;}

    return true;
  }

  /**
   * Clona a etapa (sem ID)
   */
  clone(): Partial<FluxoBeneficio> {
    return {
      tipo_beneficio_id: this.tipo_beneficio_id,
      nome_etapa: this.nome_etapa,
      tipo_etapa: this.tipo_etapa,
      ordem: this.ordem,
      perfil_responsavel: this.perfil_responsavel,
      setor_id: this.setor_id,
      descricao: this.descricao,
      obrigatorio: this.obrigatorio,
      permite_retorno: this.permite_retorno,
    };
  }

  /**
   * Verifica se é uma etapa flexível
   */
  isFlexivel(): boolean {
    return !this.isObrigatorio() && this.permiteRetorno();
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
  toSafeLog(): Partial<FluxoBeneficio> {
    return {
      id: this.id,
      tipo_beneficio_id: this.tipo_beneficio_id,
      nome_etapa: this.nome_etapa,
      tipo_etapa: this.tipo_etapa,
      ordem: this.ordem,
      perfil_responsavel: this.perfil_responsavel,
      obrigatorio: this.obrigatorio,
      permite_retorno: this.permite_retorno,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  /**
   * Obtém sugestões de melhoria para a etapa
   */
  getSugestoesMelhoria(): string[] {
    const sugestoes: string[] = [];

    if (!this.temDescricao()) {
      sugestoes.push('Adicionar descrição detalhada da etapa');
    }

    if (!this.temSetor()) {
      sugestoes.push('Definir setor responsável pela etapa');
    }

    if (this.isEtapaCritica() && !this.temDescricao()) {
      sugestoes.push('Etapa crítica deve ter descrição detalhada');
    }

    if (this.isEtapaAnalise() && this.permiteRetorno()) {
      sugestoes.push('Considerar não permitir retorno em etapas de análise');
    }

    if (!this.isConsistente()) {
      sugestoes.push('Verificar e corrigir inconsistências nos dados');
    }

    return sugestoes;
  }

  /**
   * Verifica se precisa de atualização (dados muito antigos)
   */
  precisaAtualizacao(): boolean {
    // Fluxos com mais de 6 meses podem precisar de revisão
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
    return this.updated_at < seisMesesAtras;
  }

  /**
   * Obtém estatísticas da etapa
   */
  getEstatisticas(): {
    ordem: number;
    tipoEtapa: string;
    perfilResponsavel: string;
    obrigatorio: boolean;
    permiteRetorno: boolean;
    nivelCriticidade: string;
    temSetor: boolean;
    temDescricao: boolean;
  } {
    return {
      ordem: this.ordem,
      tipoEtapa: this.getDescricaoTipoEtapa(),
      perfilResponsavel: this.getDescricaoPerfilResponsavel(),
      obrigatorio: this.isObrigatorio(),
      permiteRetorno: this.permiteRetorno(),
      nivelCriticidade: this.getNivelCriticidade(),
      temSetor: this.temSetor(),
      temDescricao: this.temDescricao(),
    };
  }

  /**
   * Simula a execução da etapa
   */
  simularExecucao(dados: { perfilUsuario: Role; setorUsuario?: string }): {
    podeExecutar: boolean;
    motivos: string[];
    observacoes: string[];
  } {
    const motivos: string[] = [];
    const observacoes: string[] = [];

    // Verifica se o perfil do usuário pode executar a etapa
    if (dados.perfilUsuario !== this.perfil_responsavel) {
      motivos.push(
        `Perfil ${dados.perfilUsuario} não autorizado. Requer: ${this.perfil_responsavel}`,
      );
    }

    // Verifica se o setor do usuário corresponde (se definido)
    if (this.temSetor() && dados.setorUsuario !== this.setor_id) {
      motivos.push('Usuário não pertence ao setor responsável pela etapa');
    }

    // Observações sobre a etapa
    if (this.isObrigatorio()) {
      observacoes.push('Esta é uma etapa obrigatória');
    }

    if (!this.permiteRetorno()) {
      observacoes.push('Atenção: Esta etapa não permite retorno');
    }

    if (this.isEtapaFinal()) {
      observacoes.push('Esta é a etapa final do processo');
    }

    return {
      podeExecutar: motivos.length === 0,
      motivos,
      observacoes,
    };
  }
}
