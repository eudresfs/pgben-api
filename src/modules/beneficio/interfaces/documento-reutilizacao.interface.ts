import { Documento } from '../../../entities';

/**
 * Interface para o serviço de reutilização de documentos em renovações
 * Define os métodos para copiar e reutilizar documentos da solicitação original
 */
export interface IDocumentoReutilizacaoService {
  /**
   * Reutiliza todos os documentos de uma solicitação original para uma nova solicitação
   * Cria referências aos documentos existentes sem duplicar arquivos físicos
   * @param solicitacaoOriginalId - ID da solicitação original (concessão)
   * @param novaSolicitacaoId - ID da nova solicitação (renovação)
   * @returns Promise<void>
   */
  reutilizarDocumentos(solicitacaoOriginalId: string, novaSolicitacaoId: string): Promise<void>;

  /**
   * Busca documentos de uma solicitação específica
   */
  buscarDocumentosSolicitacao(solicitacaoId: string): Promise<Documento[]>;

  /**
   * Cria uma nova referência de documento para uma solicitação
   */
  criarReferenciaDocumento(
    documento: Documento,
    solicitacaoId: string
  ): Promise<Documento>;

  /**
   * Verifica se um documento pode ser reutilizado
   * Valida se o arquivo ainda existe e está acessível
   * @param documentoId - ID do documento
   * @returns Promise<boolean> - true se pode ser reutilizado
   */
  verificarDocumentoPodeSerReutilizado(documentoId: string): Promise<boolean>;
}