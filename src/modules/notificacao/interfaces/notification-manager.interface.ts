/**
 * Interface para o NotificationManagerService
 * 
 * Esta interface permite desacoplar as dependências e resolver
 * a dependência circular entre módulos de notificação e usuário
 */
export interface INotificationManagerService {
  /**
   * Cria um novo template de notificação
   * @param createTemplateDto DTO com dados do template
   * @returns Promise<NotificationTemplate>
   */
  criarTemplate(createTemplateDto: any): Promise<any>;

  /**
   * Lista templates de notificação com filtros
   * @param options Opções de filtro e paginação
   * @returns Promise com lista paginada
   */
  listarTemplates(options?: {
    page?: number;
    limit?: number;
    ativo?: boolean;
  }): Promise<any>;

  /**
   * Busca um template por ID
   * @param id ID do template
   * @returns Promise<NotificationTemplate>
   */
  buscarTemplatePorId(id: string): Promise<any>;

  /**
   * Ativa um template de notificação
   * @param id ID do template
   * @returns Promise<NotificationTemplate>
   */
  ativarTemplate(id: string): Promise<any>;

  /**
   * Desativa um template de notificação
   * @param id ID do template
   * @returns Promise<NotificationTemplate>
   */
  desativarTemplate(id: string): Promise<any>;

  /**
   * Cria uma nova notificação
   * @param createNotificationDto DTO com dados da notificação
   * @returns Promise<NotificacaoSistema>
   */
  criarNotificacao(createNotificationDto: any): Promise<any>;
}

/**
 * Token de injeção para o NotificationManagerService
 */
export const NOTIFICATION_MANAGER_SERVICE = Symbol('NOTIFICATION_MANAGER_SERVICE');