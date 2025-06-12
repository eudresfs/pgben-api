import { Injectable, Logger } from '@nestjs/common';
import { NotificationTemplate } from '../../../entities';

/**
 * Serviço responsável por renderizar templates de notificação
 * substituindo variáveis pelos valores de contexto
 */
@Injectable()
export class TemplateRendererService {
  private readonly logger = new Logger(TemplateRendererService.name);

  /**
   * Renderiza um template substituindo variáveis pelos valores do contexto
   *
   * @param template Template a ser renderizado
   * @param contexto Dados de contexto para substituição
   * @returns Conteúdo renderizado
   */
  renderizar(template: string, contexto: Record<string, any>): string {
    try {
      this.logger.debug(
        `Renderizando template com ${Object.keys(contexto).length} variáveis de contexto`,
      );

      // Implementação simples de substituição de variáveis
      // Formato: {{variavel}}
      return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const value = this.getNestedProperty(contexto, key.trim());

        if (value === undefined) {
          this.logger.warn(
            `Variável "${key}" não encontrada no contexto da notificação`,
          );
          return match; // Mantém o placeholder se a variável não for encontrada
        }

        return String(value);
      });
    } catch (error) {
      this.logger.error(
        `Erro ao renderizar template: ${error.message}`,
        error.stack,
      );
      throw new Error(`Falha ao renderizar template: ${error.message}`);
    }
  }

  /**
   * Renderiza um template completo de notificação
   *
   * @param template Objeto de template
   * @param contexto Dados de contexto para substituição
   * @returns Objeto com assunto e conteúdo renderizados
   */
  renderizarNotificacao(
    template: NotificationTemplate,
    contexto: Record<string, any>,
  ): { assunto: string; conteudo: string } {
    return {
      assunto: this.renderizar(template.assunto, contexto),
      conteudo: this.renderizar(template.corpo_html, contexto), 
    };
  }

  /**
   * Recupera propriedade aninhada de um objeto usando notação de ponto
   * Ex: "usuario.endereco.cidade" buscará contexto.usuario.endereco.cidade
   */
  private getNestedProperty(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((prev, curr) => {
      return prev && prev[curr] !== undefined ? prev[curr] : undefined;
    }, obj);
  }
}
