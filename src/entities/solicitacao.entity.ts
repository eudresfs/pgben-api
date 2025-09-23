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
  OneToOne,
  Index,
  BeforeInsert,
  AfterUpdate,
  VersionColumn,
} from 'typeorm';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { 
  StatusSolicitacao,
  TipoSolicitacaoEnum 
} from '@/enums';
import { 
  DadosCestaBasica, 
  DadosNatalidade, 
  DadosAtaude, 
  DadosAluguelSocial,
  Cidadao,
  TipoBeneficio,
  Usuario,
  Unidade,
  Documento,
  HistoricoSolicitacao,
  Pendencia,
  ProcessoJudicial,
  DeterminacaoJudicial,
  InfoBancaria,
  Pagamento,
  Concessao
} from '.';
import { SubStatusSolicitacao } from '@/enums/sub-status-solicitacao.enum';

@Entity('solicitacao')
@Index(['protocolo'], { unique: true })
@Index(['status', 'unidade_id'])
@Index(['status', 'tipo_beneficio_id'])
@Index(['data_abertura', 'status'])
@Index(['status'], { where: "status IN ('pendente', 'em_analise')" })
@Index(['processo_judicial_id'], { where: 'processo_judicial_id IS NOT NULL' })
@Index(['determinacao_judicial_id'], {
  where: 'determinacao_judicial_id IS NOT NULL',
})
export class Solicitacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @IsNotEmpty({ message: 'Protocolo é obrigatório' })
  protocolo: string;

  @Column({ 
    type: 'enum',
    enum: StatusSolicitacao,
    enumName: 'status_solicitacao',
    nullable: true,
    select: false,
    insert: false,
    update: false
  })
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

  @Column()
  @IsNotEmpty({ message: 'Beneficiário é obrigatório' })
  beneficiario_id: string;

  @ManyToOne(() => Cidadao, { eager: false })
  @JoinColumn({ name: 'beneficiario_id' })
  beneficiario: Cidadao;

  @Column({ nullable: true })
  @IsOptional()
  solicitante_id?: string;

  @ManyToOne(() => Cidadao, { eager: false })
  @JoinColumn({ name: 'solicitante_id' })
  solicitante?: Cidadao;

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

  /**
   * Sub-status detalha o ponto exato dentro do fluxo do estado principal
   * (ex.: aguardando_documentos, aguardando_solucao, etc.)
   */
  @Column({
    name: 'sub_status',
    type: 'enum',
    enum: SubStatusSolicitacao,
    enumName: 'sub_status_solicitacao',
    nullable: true,
  })
  sub_status: SubStatusSolicitacao;

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

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: 'Valor de referência do benefício' })
  valor: number;

  @OneToMany(() => Documento, (documento) => documento.solicitacao, {
    cascade: ['insert', 'update'],
    onDelete: 'RESTRICT',
  })
  documentos: Documento[];

  /**
   * Relação com histórico de status da solicitação
   */
  @OneToMany(() => HistoricoSolicitacao, (historico) => historico.solicitacao, {
    cascade: ['insert'],
    onDelete: 'CASCADE',
  })
  historico: HistoricoSolicitacao[];

  /**
   * Relação com histórico de status da solicitação
   */
  @OneToMany(() => Pendencia, (pendencia) => pendencia.solicitacao, {
    cascade: ['insert'],
    onDelete: 'CASCADE',
  })
  pendencias: Pendencia[];

  /**
   * Relação com pagamentos da solicitação
   */
  @OneToMany(() => Pagamento, (pagamento) => pagamento.solicitacao, {
    cascade: ['insert'],
    onDelete: 'CASCADE',
  })
  pagamentos: Pagamento[];

  /**
   * Relação com histórico de status da solicitação
   */
  @OneToMany(() => InfoBancaria, (infoBancaria) => infoBancaria.cidadao, {
    cascade: ['insert'],
    onDelete: 'CASCADE',
  })
  info_bancaria: InfoBancaria[];

  /**
   * Relação com concessão da solicitação
   */
  @OneToOne(() => Concessao, (concessao) => concessao.solicitacao)
  concessao: Concessao;

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
  @Column({
    name: 'determinacao_judicial_flag',
    type: 'boolean',
    default: false,
  })
  determinacao_judicial_flag: boolean;

  /**
   * Quantidade de parcelas solicitadas para o benefício
   */
  @Column({ name: 'quantidade_parcelas', type: 'integer', default: 1 })
  quantidade_parcelas: number;

  /**
   * Prioridade da solicitação (menor valor = maior prioridade)
   */
  @Column({ type: 'integer', default: 3 })
  prioridade: number;

  /**
   * Tipo da solicitação (original ou renovação)
   * Define se é uma solicitação inicial ou uma renovação de benefício
   */
  @Column({
    type: 'enum',
    enum: TipoSolicitacaoEnum,
    enumName: 'tipo_solicitacao_enum',
    default: TipoSolicitacaoEnum.ORIGINAL,
  })
  tipo: TipoSolicitacaoEnum;

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
   * Relação com solicitação que está sendo renovada
   * Usado especificamente para renovações de benefício
   */
  @Column({ nullable: true })
  solicitacao_renovada_id: string;

  @ManyToOne(() => Solicitacao, { nullable: true })
  @JoinColumn({ name: 'solicitacao_renovada_id' })
  solicitacao_renovada: Solicitacao;

  /**
   * Relação inversa - solicitações que renovam esta solicitação
   */
  @OneToMany(() => Solicitacao, (solicitacao) => solicitacao.solicitacao_renovada)
  renovacoes: Solicitacao[];

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

  /**
   * Dados específicos para solicitações de Aluguel Social
   */
  @OneToOne(() => DadosAluguelSocial, (dados) => dados.solicitacao, { nullable: true })
  dados_aluguel_social?: DadosAluguelSocial;

  /**
   * Relação com dados específicos do auxílio ataúde
   */
  @OneToOne(() => DadosAtaude, (dados) => dados.solicitacao, { nullable: true })
  dados_ataude?: DadosAtaude;

    /**
   * Relação com dados específicos do auxílio ataúde
   */
  @OneToOne(() => DadosNatalidade, (dados) => dados.solicitacao, { nullable: true })
  dados_natalidade?: DadosNatalidade;

    /**
   * Relação com dados específicos do auxílio ataúde
   */
  @OneToOne(() => DadosCestaBasica, (dados) => dados.solicitacao, { nullable: true })
  dados_cesta_basica?: DadosCestaBasica;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}

export { StatusSolicitacao };
