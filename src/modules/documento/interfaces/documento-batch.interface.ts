import { StatusDownloadLoteEnum } from '@/entities/documento-batch-job.entity';

/**
 * Interface para filtros de busca de documentos
 */
export interface IDocumentoBatchFiltros {
  unidade_id?: string;
  data_inicio?: Date;
  data_fim?: Date;
  tipo_documento?: string[];
  tags?: string[];
  status?: string[];
  usuario_criador?: string;
  tamanho_min?: number;
  tamanho_max?: number;
  extensoes?: string[];
  busca_texto?: string;
  incluir_anexos?: boolean;
  incluir_versoes?: boolean;
}

/**
 * Interface para metadados do job de download
 */
export interface IDocumentoBatchMetadados {
  nome_personalizado?: string;
  incluir_estrutura_pastas?: boolean;
  formato_nome_arquivo?: 'original' | 'sequencial' | 'timestamp';
  incluir_metadados_arquivo?: boolean;
  compressao_nivel?: number;
  senha_zip?: string;
  notificar_conclusao?: boolean;
  email_notificacao?: string;
  observacoes?: string;
}

/**
 * Interface para estatísticas do job
 */
export interface IDocumentoBatchEstatisticas {
  total_documentos: number;
  documentos_processados: number;
  documentos_com_erro: number;
  tamanho_total: number;
  tamanho_processado: number;
  tempo_estimado_restante?: number;
  tempo_processamento?: number;
  velocidade_processamento?: number;
  arquivos_por_tipo: Record<string, number>;
  erros_por_tipo: Record<string, number>;
}

/**
 * Interface para progresso do job
 */
export interface IDocumentoBatchProgresso {
  job_id: string;
  status: StatusDownloadLoteEnum;
  progresso: number;
  total_documentos: number;
  documentos_processados: number;
  arquivo_atual?: string;
  tempo_decorrido: number;
  tempo_estimado_restante?: number;
  tamanho_estimado?: number;
  velocidade_media?: number;
  erros: string[];
  avisos: string[];
  data_inicio?: Date;
  updated_at?: Date;
  mensagem_status?: string;
}

/**
 * Interface para configuração do processamento
 */
export interface IDocumentoBatchConfig {
  max_arquivos_por_lote: number;
  max_tamanho_lote: number;
  timeout_processamento: number;
  diretorio_temporario: string;
  tempo_expiracao_horas: number;
  max_jobs_simultaneos: number;
  intervalo_limpeza_minutos: number;
  nivel_compressao_padrao: number;
  formatos_suportados: string[];
}

/**
 * Interface para resultado do processamento
 */
export interface IDocumentoBatchResultado {
  job_id: string;
  status: StatusDownloadLoteEnum;
  total_documentos: number;
  documentos_processados: number;
  documentos_com_erro: number;
  tempo_processamento: number;
  caminho_arquivo?: string;
  nome_arquivo?: string;
  tamanho_arquivo?: number;
  url_download?: string;
  data_expiracao?: Date;
  erros: string[];
  avisos: string[];
  estatisticas: IDocumentoBatchEstatisticas;
  data_conclusao?: Date;
  metadados?: any;
  arquivo_zip?: {
    url_download?: string;
    nome?: string;
    tamanho?: number;
    data_expiracao?: Date;
  };
  estrutura?: any[];
}

/**
 * Interface para item do lote
 */
export interface IDocumentoBatchItem {
  documento_id: string;
  nome_arquivo: string;
  caminho_relativo: string;
  tamanho: number;
  tipo_mime: string;
  checksum?: string;
  metadados?: Record<string, any>;
  erro?: string;
  processado: boolean;
}

/**
 * Interface para estrutura do ZIP
 */
export interface IDocumentoBatchEstrutura {
  nome_pasta: string;
  itens: IDocumentoBatchItem[];
  subpastas: IDocumentoBatchEstrutura[];
  total_arquivos: number;
  tamanho_total: number;
}

/**
 * Interface para validação de filtros
 */
export interface IDocumentoBatchValidacao {
  valido: boolean;
  erros: string[];
  avisos: string[];
  estimativa_documentos?: number;
  estimativa_tamanho?: number;
  tempo_estimado_processamento?: number;
}

/**
 * Interface para eventos do job
 */
export interface IDocumentoBatchEvento {
  job_id: string;
  tipo: 'iniciado' | 'progresso' | 'concluido' | 'erro' | 'cancelado';
  timestamp: Date;
  dados?: any;
  mensagem?: string;
}

/**
 * Interface para serviço de download em lote
 */
export interface IDocumentoBatchService {
  iniciarJob(
    filtros: IDocumentoBatchFiltros,
    usuario_id: string,
    metadados?: IDocumentoBatchMetadados,
  ): Promise<string>;
  obterProgresso(job_id: string): Promise<IDocumentoBatchProgresso>;
  obterResultado(job_id: string): Promise<IDocumentoBatchResultado>;
  cancelarJob(job_id: string): Promise<boolean>;
  validarFiltros(
    filtros: IDocumentoBatchFiltros,
  ): Promise<IDocumentoBatchValidacao>;
  listarJobs(
    usuario_id: string,
    status?: StatusDownloadLoteEnum[],
  ): Promise<IDocumentoBatchResultado[]>;
  limparJobsExpirados(): Promise<number>;
  obterEstatisticas(): Promise<Record<string, any>>;
}

/**
 * Interface para scheduler de limpeza
 */
export interface IDocumentoBatchScheduler {
  iniciarLimpezaAutomatica(): void;
  pararLimpezaAutomatica(): void;
  executarLimpezaManual(): Promise<{
    jobs_removidos: number;
    arquivos_removidos: number;
    espaco_liberado: number;
  }>;
  obterEstatisticasDiretorio(): Promise<{
    total_arquivos: number;
    tamanho_total: number;
    arquivos_expirados: number;
  }>;
}
