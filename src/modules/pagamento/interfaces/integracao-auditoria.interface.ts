import { IContextoUsuario, IResultadoOperacao } from './integracao-solicitacao.interface';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';

/**
 * Interface para operações de auditoria
 * Abstrai as dependências do serviço de pagamento com o módulo de auditoria
 */
export interface IIntegracaoAuditoriaService {
  /**
   * Registra evento de auditoria
   * @param evento Dados do evento de auditoria
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da operação
   */
  registrarEvento(
    evento: IEventoAuditoria,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<void>>;

  /**
   * Busca histórico de auditoria por entidade
   * @param entidadeId ID da entidade
   * @param tipoEntidade Tipo da entidade
   * @param contextoUsuario Contexto do usuário logado
   * @returns Histórico de auditoria
   */
  buscarHistoricoEntidade(
    entidadeId: string,
    tipoEntidade: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IRegistroAuditoria[]>>;

  /**
   * Busca logs de auditoria com filtros
   * @param filtros Filtros de busca
   * @param contextoUsuario Contexto do usuário logado
   * @returns Logs de auditoria paginados
   */
  buscarLogs(
    filtros: IFiltrosAuditoria,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IPaginatedAuditoria>>;

  /**
   * Gera relatório de auditoria
   * @param parametros Parâmetros do relatório
   * @param contextoUsuario Contexto do usuário logado
   * @returns Relatório gerado
   */
  gerarRelatorioAuditoria(
    parametros: IParametrosRelatorio,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IRelatorioAuditoria>>;

  /**
   * Verifica integridade dos logs
   * @param periodo Período para verificação
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da verificação
   */
  verificarIntegridade(
    periodo: IPeriodoVerificacao,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IVerificacaoIntegridade>>;

  /**
   * Arquiva logs antigos
   * @param criterios Critérios de arquivamento
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado do arquivamento
   */
  arquivarLogs(
    criterios: ICriteriosArquivamento,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IResultadoArquivamento>>;
}

/**
 * Interface para evento de auditoria
 */
export interface IEventoAuditoria {
  operacao: TipoOperacao;
  entidade: string;
  entidadeId: string;
  dadosAnteriores?: Record<string, any>;
  dadosNovos?: Record<string, any>;
  observacoes?: string;
  ip?: string;
  userAgent?: string;
  origem: 'WEB' | 'API' | 'SISTEMA' | 'INTEGRACAO';
  criticidade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  categoria: string;
  subcategoria?: string;
  metadados?: Record<string, any>;
}

/**
 * Interface para registro de auditoria
 */
export interface IRegistroAuditoria {
  id: string;
  timestamp: Date;
  usuarioId: string;
  usuarioNome: string;
  operacao: TipoOperacao;
  entidade: string;
  entidadeId: string;
  dadosAnteriores?: Record<string, any>;
  dadosNovos?: Record<string, any>;
  observacoes?: string;
  ip?: string;
  userAgent?: string;
  origem: string;
  criticidade: string;
  categoria: string;
  subcategoria?: string;
  hash: string;
  assinatura?: string;
  metadados?: Record<string, any>;
}

/**
 * Interface para filtros de auditoria
 */
export interface IFiltrosAuditoria {
  dataInicio?: Date;
  dataFim?: Date;
  usuarioId?: string;
  operacao?: TipoOperacao[];
  entidade?: string[];
  entidadeId?: string;
  criticidade?: string[];
  categoria?: string[];
  origem?: string[];
  ip?: string;
  buscarTexto?: string;
  page?: number;
  limit?: number;
  ordenacao?: {
    campo: string;
    direcao: 'ASC' | 'DESC';
  };
}

/**
 * Interface para auditoria paginada
 */
export interface IPaginatedAuditoria {
  registros: IRegistroAuditoria[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Interface para parâmetros de relatório
 */
export interface IParametrosRelatorio {
  tipo: 'RESUMO' | 'DETALHADO' | 'COMPLIANCE' | 'SEGURANCA';
  periodo: {
    inicio: Date;
    fim: Date;
  };
  filtros?: IFiltrosAuditoria;
  formato: 'PDF' | 'EXCEL' | 'CSV' | 'JSON';
  incluirGraficos: boolean;
  incluirEstatisticas: boolean;
  agrupamento?: string[];
  metricas?: string[];
}

/**
 * Interface para relatório de auditoria
 */
export interface IRelatorioAuditoria {
  id: string;
  tipo: string;
  periodo: {
    inicio: Date;
    fim: Date;
  };
  dataGeracao: Date;
  geradoPor: string;
  arquivo: {
    nome: string;
    tamanho: number;
    url: string;
    hash: string;
  };
  estatisticas: {
    totalRegistros: number;
    operacoesPorTipo: Record<string, number>;
    usuariosMaisAtivos: IUsuarioAtivo[];
    entidadesMaisAcessadas: IEntidadeAcessada[];
    criticidadeDistribuicao: Record<string, number>;
  };
  resumo: string;
  observacoes?: string[];
}

/**
 * Interface para usuário ativo
 */
export interface IUsuarioAtivo {
  usuarioId: string;
  usuarioNome: string;
  totalOperacoes: number;
  ultimaAtividade: Date;
}

/**
 * Interface para entidade acessada
 */
export interface IEntidadeAcessada {
  entidade: string;
  totalAcessos: number;
  ultimoAcesso: Date;
  operacoesPorTipo: Record<string, number>;
}

/**
 * Interface para período de verificação
 */
export interface IPeriodoVerificacao {
  inicio: Date;
  fim: Date;
  incluirArquivados: boolean;
}

/**
 * Interface para verificação de integridade
 */
export interface IVerificacaoIntegridade {
  valida: boolean;
  totalRegistros: number;
  registrosVerificados: number;
  registrosComProblema: number;
  problemas: IProblemaIntegridade[];
  hashGlobal: string;
  dataVerificacao: Date;
  tempoProcessamento: number;
}

/**
 * Interface para problema de integridade
 */
export interface IProblemaIntegridade {
  registroId: string;
  tipo: 'HASH_INVALIDO' | 'ASSINATURA_INVALIDA' | 'DADOS_CORROMPIDOS' | 'REGISTRO_FALTANTE';
  descricao: string;
  gravidade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  dataDeteccao: Date;
  podeCorrigir: boolean;
}

/**
 * Interface para critérios de arquivamento
 */
export interface ICriteriosArquivamento {
  dataLimite: Date;
  manterCriticos: boolean;
  categorias?: string[];
  excluirUsuarios?: string[];
  compactar: boolean;
  criptografar: boolean;
  destino: 'ARQUIVO_LOCAL' | 'CLOUD_STORAGE' | 'BACKUP_EXTERNO';
}

/**
 * Interface para resultado de arquivamento
 */
export interface IResultadoArquivamento {
  totalRegistros: number;
  registrosArquivados: number;
  registrosMantidos: number;
  tamanhoArquivo: number;
  localArquivo: string;
  hashArquivo: string;
  dataArquivamento: Date;
  tempoProcessamento: number;
  observacoes?: string[];
}