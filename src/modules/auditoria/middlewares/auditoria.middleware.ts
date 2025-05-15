import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditoriaService } from '../services/auditoria.service';
import { AuditoriaQueueService } from '../services/auditoria-queue.service';
import { TipoOperacao } from '../enums/tipo-operacao.enum';
import { CreateLogAuditoriaDto } from '../dto/create-log-auditoria.dto';
import { BaseDto } from '../../../shared/dtos/base.dto';

/**
 * Middleware de Auditoria
 * 
 * Responsável por interceptar as requisições HTTP e registrar logs de auditoria
 * automaticamente, garantindo a rastreabilidade das operações realizadas no sistema.
 */
@Injectable()
export class AuditoriaMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditoriaMiddleware.name);
  
  // Lista de endpoints que não devem ser auditados (para evitar poluição de logs)
  private readonly excludedEndpoints = [
    '/api/v1/health',
    '/api/v1/metrics',
    '/api-docs',
    '/api/v1/auth/login',
  ];
  
  // Lista de campos sensíveis que devem ser monitorados (para compliance com LGPD)
  private readonly camposSensiveis = [
    'cpf',
    'rg',
    'data_nascimento',
    'renda_familiar',
    'telefone',
    'endereco',
    'email',
    'senha',
    'numero_nis',
    'composicao_familiar',
    'vulnerabilidades',
    'documentos',
  ];

  constructor(
    private readonly auditoriaService: AuditoriaService,
    private readonly auditoriaQueueService: AuditoriaQueueService,
  ) {}

  /**
   * Método principal do middleware que intercepta as requisições
   */
  async use(req: Request, res: Response, next: NextFunction) {
    // Verifica se o endpoint deve ser auditado
    if (this.shouldAudit(req)) {
      // Captura dados da requisição antes de processá-la
      const { method, originalUrl, body, user, ip } = req;
      const userAgent = req.headers['user-agent'] as string;
      
      // Determina o tipo de operação com base no método HTTP
      const tipoOperacao = this.mapHttpMethodToOperationType(method);
      
      // Extrai informações da entidade com base na URL
      const { entidade, entidadeId } = this.extractEntityInfo(originalUrl);
      
      // Verifica se há dados sensíveis no corpo da requisição
      const dadosSensiveis = this.detectarDadosSensiveis(body);
      
      // Captura a resposta original para auditar após o processamento
      const originalSend = res.send;
      
      res.send = function(body) {
        res.locals.responseBody = body;
        return originalSend.call(this, body);
      };
      
      // Continua o processamento da requisição
      next();
      
      // Após o processamento, registra o log de auditoria
      res.on('finish', async () => {
        try {
          // Obtém o código de status da resposta
          const statusCode = res.statusCode;
          
          // Só registra operações bem-sucedidas (códigos 2xx)
          if (statusCode >= 200 && statusCode < 300) {
            // Extrai dados da resposta
            let responseData: Record<string, any> | undefined = undefined;
            if (res.locals.responseBody) {
              try {
                if (typeof res.locals.responseBody === 'string') {
                  responseData = JSON.parse(res.locals.responseBody);
                } else {
                  responseData = res.locals.responseBody;
                }
              } catch (e) {
                this.logger.warn(`Erro ao parsear corpo da resposta: ${e.message}`);
              }
            }
            
            // Cria uma instância do DTO de log de auditoria
            const logAuditoriaDto = CreateLogAuditoriaDto.plainToInstance({
              tipo_operacao: tipoOperacao,
              entidade_afetada: entidade,
              entidade_id: entidadeId || '',
              dados_anteriores: method === 'PUT' || method === 'PATCH' ? body : undefined,
              dados_novos: method === 'POST' || method === 'PUT' || method === 'PATCH' ? responseData : undefined,
              usuario_id: user?.id,
              ip_origem: ip,
              user_agent: userAgent,
              endpoint: originalUrl,
              metodo_http: method,
              descricao: `${method} em ${entidade}${entidadeId ? ` (ID: ${entidadeId})` : ''}`,
              dados_sensiveis_acessados: dadosSensiveis && dadosSensiveis.length > 0 ? dadosSensiveis : undefined,
            }, CreateLogAuditoriaDto);
            
            // Enfileira o log de auditoria para processamento assíncrono
            await this.auditoriaQueueService.enfileirarLogAuditoria(logAuditoriaDto);
            
            // Se houver acesso a dados sensíveis, enfileira para processamento assíncrono
            if (dadosSensiveis.length > 0 && user?.id) {
              await this.auditoriaQueueService.enfileirarAcessoDadosSensiveis(
                user.id,
                entidade,
                entidadeId || '',
                dadosSensiveis,
                ip || 'desconhecido',
                userAgent,
                originalUrl,
                method,
              );
            }
          }
        } catch (error) {
          // Em caso de erro, apenas loga e não interrompe o fluxo da aplicação
          this.logger.error(`Erro ao registrar log de auditoria: ${error.message}`, error.stack);
        }
      });
    } else {
      // Se não for para auditar, apenas continua o fluxo
      next();
    }
  }

  /**
   * Verifica se o endpoint deve ser auditado
   */
  private shouldAudit(req: Request): boolean {
    const { originalUrl } = req;
    
    // Não audita endpoints excluídos
    for (const excluded of this.excludedEndpoints) {
      if (originalUrl.startsWith(excluded)) {
        return false;
      }
    }
    
    // Não audita requisições OPTIONS (CORS)
    if (req.method === 'OPTIONS') {
      return false;
    }
    
    return true;
  }

  /**
   * Mapeia o método HTTP para o tipo de operação de auditoria
   */
  private mapHttpMethodToOperationType(method: string): TipoOperacao {
    switch (method.toUpperCase()) {
      case 'POST':
        return TipoOperacao.CREATE;
      case 'GET':
        return TipoOperacao.READ;
      case 'PUT':
      case 'PATCH':
        return TipoOperacao.UPDATE;
      case 'DELETE':
        return TipoOperacao.DELETE;
      default:
        return TipoOperacao.READ;
    }
  }

  /**
   * Extrai informações da entidade com base na URL
   */
  private extractEntityInfo(url: string): { entidade: string; entidadeId: string | undefined } {
    // Remove o prefixo da API
    const path = url.replace(/^\/api\/v\d+\//, '');
    
    // Divide o caminho em segmentos
    const segments = path.split('/').filter(Boolean);
    
    if (segments.length === 0) {
      return { entidade: 'Desconhecido', entidadeId: undefined };
    }
    
    // O primeiro segmento geralmente é o nome da entidade
    const entidade = this.normalizeEntityName(segments[0]);
    
    // Se houver um segundo segmento e for um UUID, é o ID da entidade
    let entidadeId: string | undefined = undefined;
    if (segments.length > 1) {
      const potentialId = segments[1];
      // Verifica se parece um UUID ou ID numérico
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(potentialId) || 
          /^\d+$/.test(potentialId)) {
        entidadeId = potentialId;
      }
    }
    
    return { entidade, entidadeId };
  }

  /**
   * Normaliza o nome da entidade para um formato padronizado
   */
  private normalizeEntityName(name: string): string {
    // Remove plural e converte para formato PascalCase
    const singular = name.endsWith('s') ? name.slice(0, -1) : name;
    return singular.charAt(0).toUpperCase() + singular.slice(1);
  }

  /**
   * Detecta campos sensíveis no corpo da requisição
   */
  private detectarDadosSensiveis(body: any): string[] {
    if (!body || typeof body !== 'object') {
      return [];
    }
    
    const camposEncontrados = new Set<string>();
    
    // Função recursiva para procurar campos sensíveis
    const procurarCamposSensiveis = (obj: any, caminho = '') => {
      if (!obj || typeof obj !== 'object') {
        return;
      }
      
      for (const [chave, valor] of Object.entries(obj)) {
        const caminhoCompleto = caminho ? `${caminho}.${chave}` : chave;
        
        // Verifica se o campo atual é sensível
        if (this.camposSensiveis.includes(chave) && valor) {
          camposEncontrados.add(chave);
        }
        
        // Se for um objeto ou array, continua a busca recursivamente
        if (valor && typeof valor === 'object') {
          procurarCamposSensiveis(valor, caminhoCompleto);
        }
      }
    };
    
    procurarCamposSensiveis(body);
    
    return Array.from(camposEncontrados);
  }
}
