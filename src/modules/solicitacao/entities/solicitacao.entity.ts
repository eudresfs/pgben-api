import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  BeforeInsert,
  AfterUpdate,
  VersionColumn,
} from 'typeorm';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { Cidadao } from '../../cidadao/entities/cidadao.entity';
import { TipoBeneficio } from '../../beneficio/entities/tipo-beneficio.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { Unidade } from '../../unidade/entities/unidade.entity';
import { Documento } from '../../documento/entities/documento.entity';
import { HistoricoSolicitacao } from './historico-solicitacao.entity';
import { ProcessoJudicial } from '../../judicial/entities/processo-judicial.entity';
import { DeterminacaoJudicial } from '../../judicial/entities/determinacao-judicial.entity';
import { StatusSolicitacao } from '../enums/status-solicitacao.enum';

@Entity('solicitacao')
@Index(['protocolo'], { unique: true })
@Index(['status', 'unidade_id'])
@Index(['status', 'tipo_beneficio_id'])
@Index(['data_abertura', 'status'])
@Index(['status'], { where: "status IN ('pendente', 'em_analise')" })
@Index(['processo_judicial_id'], { where: 'processo_judicial_id IS NOT NULL' })
@Index(['determinacao_judicial_id'], { where: 'determinacao_judicial_id IS NOT NULL' })
export class Solicitacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @IsNotEmpty({ message: 'Protocolo é obrigatório' })
  protocolo: string;

  @BeforeInsert()
  generateProtocol() {
    const date = new Date();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    this.protocolo = `SOL${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${random}`;
  }

  @Column({ select: false, insert: false, update: false })
  private statusAnterior: StatusSolicitacao;

  @Column({ select: false, insert: false, update: false })
  private usuarioAlteracao: string;

  @Column({ select: false, insert: false, update: false })
  private observacaoAlteracao: string;

  @Column({ select: false, insert: false, update: false })
  private ipUsuario: string;

  /**
   * Prepara a alteração de status para posterior registro no histórico
   * @param novoStatus Novo status da solicitação
   * @param usuario ID do usuário que realizou a alteração
   * @param observacao Observação sobre a alteração
   * @param ip IP do usuário que realizou a alteração
   */
  prepararAlteracaoStatus(
    novoStatus: StatusSolicitacao,
    usuario: string,
    observacao: string,
    ip: string,
  ) {
    this.statusAnterior = this.status;
    this.status = novoStatus;
    this.usuarioAlteracao = usuario;
    this.observacaoAlteracao = observacao;
    this.ipUsuario = ip;
  }

  @AfterUpdate()
  async logStatusChange() {
    // Verificar se houve mudança de status e se temos as informações necessárias
    if (
      this.statusAnterior &&
      this.statusAnterior !== this.status &&
      this.usuarioAlteracao
    ) {
      // Importar o getRepository do typeorm
      const { getRepository } = require('typeorm');

      // Obter o repositório de HistoricoSolicitacao
      const historicoRepository = getRepository(HistoricoSolicitacao);

      // Criar e salvar um registro de histórico
      await historicoRepository.save({
        solicitacao_id: this.id,
        status_anterior: this.statusAnterior,
        status_atual: this.status,
        usuario_id: this.usuarioAlteracao,
        observacao: this.observacaoAlteracao,
        dados_alterados: {
          status: {
            de: this.statusAnterior,
            para: this.status,
          },
        },
        ip_usuario: this.ipUsuario,
      });
    }
  }

  @Column()
  @IsNotEmpty({ message: 'Beneficiário é obrigatório' })
  beneficiario_id: string;

  @ManyToOne(() => Cidadao, { eager: false })
  @JoinColumn({ name: 'beneficiario_id' })
  beneficiario: Cidadao;

  @Column()
  @IsNotEmpty({ message: 'Tipo de benefício é obrigatório' })
  tipo_beneficio_id: string;

  @ManyToOne(() => TipoBeneficio)
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipo_beneficio: TipoBeneficio;

  @Column()
  @IsNotEmpty({ message: 'Unidade é obrigatória' })
  unidade_id: string;

  @ManyToOne(() => Unidade)
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @Column()
  @IsNotEmpty({ message: 'Técnico responsável é obrigatório' })
  tecnico_id: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'tecnico_id' })
  tecnico: Usuario;

  @Column({ type: 'timestamp' })
  @IsNotEmpty({ message: 'Data de abertura é obrigatória' })
  data_abertura: Date;

  @Column({
    type: 'enum',
    enum: StatusSolicitacao,
    enumName: 'status_solicitacao',
    default: StatusSolicitacao.RASCUNHO,
  })
  status: StatusSolicitacao;

  @Column('text', { nullable: true })
  @IsOptional()
  parecer_semtas: string;

  @Column({ nullable: true })
  aprovador_id: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'aprovador_id' })
  aprovador: Usuario;

  @Column({ type: 'timestamp', nullable: true })
  data_aprovacao: Date;

  @Column({ type: 'timestamp', nullable: true })
  data_liberacao: Date;

  @Column({ nullable: true })
  liberador_id: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'liberador_id' })
  liberador: Usuario;

  @Column('text', { nullable: true })
  @IsOptional()
  observacoes: string;

  @Column('jsonb', { nullable: true })
  dados_complementares: Record<string, any>;

  @OneToMany(() => Documento, (documento) => documento.solicitacao, {
    cascade: ['insert', 'update'],
    onDelete: 'RESTRICT',
  })
  documentos: Documento[];

  /**
   * Controle de versão para detectar e prevenir atualizações concorrentes
   * Este campo é incrementado automaticamente a cada atualização
   */
  @VersionColumn()
  version: number;

  /**
   * Relação com processo judicial
   * Esta relação é gerenciada pelo módulo de solicitação, não pelo módulo judicial
   */
  @Column({ nullable: true })
  processo_judicial_id: string;

  @ManyToOne(() => ProcessoJudicial, { nullable: true })
  @JoinColumn({ name: 'processo_judicial_id' })
  processo_judicial: ProcessoJudicial;

  /**
   * Relação com determinação judicial
   * Esta relação é gerenciada pelo módulo de solicitação, não pelo módulo judicial
   */
  @Column({ nullable: true })
  determinacao_judicial_id: string;

  @ManyToOne(() => DeterminacaoJudicial, { nullable: true })
  @JoinColumn({ name: 'determinacao_judicial_id' })
  determinacao_judicial: DeterminacaoJudicial;
  
  /**
   * Flag que indica se a solicitação tem determinação judicial
   */
  @Column({ name: 'determinacao_judicial_flag', type: 'boolean', default: false })
  determinacao_judicial_flag: boolean;

  /**
   * Relação com solicitação original (auto-relacionamento)
   * Usado para renovações, revisões ou outras solicitações derivadas
   */
  @Column({ nullable: true })
  solicitacao_original_id: string;

  @ManyToOne(() => Solicitacao, { nullable: true })
  @JoinColumn({ name: 'solicitacao_original_id' })
  solicitacao_original: Solicitacao;
  
  /**
   * Campos para suporte a renovação automática
   */
  @Column({ name: 'renovacao_automatica', type: 'boolean', default: false })
  renovacao_automatica: boolean;

  @Column({ name: 'contador_renovacoes', type: 'integer', default: 0 })
  contador_renovacoes: number;

  @Column({ name: 'data_proxima_renovacao', type: 'timestamp', nullable: true })
  data_proxima_renovacao: Date;
  
  /**
   * Dados dinâmicos específicos para cada tipo de benefício
   */
  @Column({ name: 'dados_dinamicos', type: 'jsonb', nullable: true })
  dados_dinamicos: Record<string, any>;
  
  /**
   * Data limite para conclusão da análise da solicitação
   * Utilizado para controle de SLA do processo de análise
   */
  @Column({ name: 'prazo_analise', type: 'timestamp', nullable: true })
  prazo_analise: Date | null;
  
  /**
   * Data limite para envio de documentos pelo cidadão
   * Utilizado quando a solicitação está no estado AGUARDANDO_DOCUMENTOS
   */
  @Column({ name: 'prazo_documentos', type: 'timestamp', nullable: true })
  prazo_documentos: Date | null;
  
  /**
   * Data limite para conclusão do processamento da solicitação
   * Utilizado quando a solicitação está no estado EM_PROCESSAMENTO
   */
  @Column({ name: 'prazo_processamento', type: 'timestamp', nullable: true })
  prazo_processamento: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}

export { StatusSolicitacao };
