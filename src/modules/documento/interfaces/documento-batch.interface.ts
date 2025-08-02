import { StatusDownloadLoteEnum, DocumentoBatchJob } from '../../../entities/documento-batch-job.entity';

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
  compressao_nivel?: number;
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
  erros: string[];
  data_inicio?: Date;
  updated_at?: Date;
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
  data_conclusao?: Date;
  arquivo_zip?: {
    url_download?: string;
    nome?: string;
    tamanho?: number;
    data_expiracao?: Date;
  };
}


/**
 * Interface para serviço de download em lote
 */
export interface IDocumentoBatchService {
  iniciarJob(
    filtros: IDocumentoBatchFiltros,
    usuario_id: string,
    metadados?: IDocumentoBatchMetadados,
  ): Promise<{
    jobId: string;
    estimatedSize: number;
    documentCount: number;
  }>;
  obterProgresso(job_id: string): Promise<IDocumentoBatchProgresso>;
  
  /**
   * Obtém a entidade completa do job
   */
  obterJobCompleto(job_id: string): Promise<DocumentoBatchJob>;
  
  obterResultado(job_id: string): Promise<IDocumentoBatchResultado>;
  cancelarJob(job_id: string): Promise<boolean>;
  listarJobs(
    usuario_id: string,
    status?: StatusDownloadLoteEnum[],
  ): Promise<IDocumentoBatchResultado[]>;
  limparJobsExpirados(): Promise<number>;
}
