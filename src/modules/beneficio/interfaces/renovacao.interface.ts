import { IniciarRenovacaoDto, RenovacaoResponseDto } from '../dto/renovacao';

/**
 * Interface para o serviço principal de renovação de benefício
 * Define os métodos para gerenciar o processo completo de renovação
 */
export interface IRenovacaoService {
  /**
   * Inicia o processo de renovação de um benefício
   * @param iniciarRenovacaoDto Dados para iniciar a renovação
   * @param usuarioId ID do usuário que está iniciando a renovação
   * @returns Promise com a solicitação de renovação criada
   */
  iniciarRenovacao(
    iniciarRenovacaoDto: IniciarRenovacaoDto,
    usuarioId: string
  ): Promise<any>;

  /**
   * Valida elegibilidade para renovação
   * @param concessaoId ID da concessão
   * @param usuarioId ID do usuário
   * @returns Resultado da validação
   */
  validarElegibilidadeRenovacao(
    concessaoId: string,
    usuarioId: string,
  ): Promise<{ podeRenovar: boolean; motivos?: string[] }>;

  /**
   * Cria uma nova solicitação de renovação baseada na solicitação original
   * @param solicitacaoOriginal Solicitação original a ser renovada
   * @param observacao Observação sobre a renovação
   * @param usuarioId ID do usuário que está criando a renovação
   * @param queryRunner QueryRunner opcional para transação
   * @returns Promise com a nova solicitação criada
   */
  criarSolicitacaoRenovacao(
    solicitacaoOriginal: any,
    observacao: string,
    usuarioId: string,
    queryRunner?: any
  ): Promise<any>;

  /**
   * Busca a solicitação original (concessão) para usar como base da renovação
   * @param concessaoId - ID da concessão
   * @returns Promise com dados da solicitação original
   */
  buscarSolicitacaoOriginal(concessaoId: string): Promise<any>;
}