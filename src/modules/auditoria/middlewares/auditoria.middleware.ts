import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditoriaService } from '../services/auditoria.service';
import { AuditoriaQueueService } from '../services/auditoria-queue.service';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { CreateLogAuditoriaDto } from '../dto/create-log-auditoria.dto';

/**
 * Middleware de Auditoria - VERSÃO CORRIGIDA
 *
 * Responsável por interceptar as requisições HTTP e registrar logs de auditoria
 * automaticamente, garantindo a rastreabilidade das operações realizadas no sistema.
 */
@Injectable()
export class AuditoriaMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditoriaMiddleware.name);

  // Lista de endpoints que não devem ser auditados
  private readonly excludedEndpoints = [
    '/api/health',
    '/api/metrics',
    '/api-docs',
    '/api/v1/auth/login',
    '/api/v1/auditoria/monitoramento', // Evitar recursão
  ];

  // Lista de campos sensíveis
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
   * Método principal do middleware - VERSÃO CORRIGIDA
   */
  use(req: Request, res: Response, next: NextFunction) {
    // ← CORREÇÃO: Remover async/await da assinatura principal
    
    // Verifica se deve auditar ANTES de fazer qualquer coisa
    if (!this.shouldAudit(req)) {
      return next(); // ← CORREÇÃO: Return direto sem processamento
    }

    try {
      // Captura dados da requisição
      const { method, originalUrl, body, user } = req;
      const ip = req.ip || req.connection.remoteAddress || 'desconhecido'; // ← CORREÇÃO: Garante string
      const userAgent = req.headers['user-agent'] as string;
      const tipoOperacao = this.mapHttpMethodToOperationType(method);
      const { entidade, entidadeId } = this.extractEntityInfo(originalUrl);
      const dadosSensiveis = this.detectarDadosSensiveis(body);

      // ← CORREÇÃO: Usar uma abordagem não-intrusiva para capturar resposta
      let responseBody: any = undefined;

      // Intercepta res.json de forma mais segura
      const originalJson = res.json;
      res.json = function(body) {
        responseBody = body;
        return originalJson.call(this, body);
      };

      // ← CORREÇÃO: Configurar o listener ANTES de chamar next()
      res.on('finish', () => {
        // ← CORREÇÃO: Usar setImmediate para não bloquear o ciclo de evento
        setImmediate(() => {
          this.processarAuditoriaAsync(
            method,
            originalUrl,
            body,
            responseBody,
            user,
            ip,
            userAgent,
            tipoOperacao,
            entidade,
            entidadeId,
            dadosSensiveis,
            res.statusCode
          ).catch(error => {
            // ← CORREÇÃO: Capturar erros sem travar a aplicação
            this.logger.error(
              `Erro ao processar auditoria: ${error.message}`,
              error.stack,
            );
          });
        });
      });

      // ← CORREÇÃO: Chamar next() após configurar tudo
      next();

    } catch (error) {
      // ← CORREÇÃO: Em caso de erro, apenas logar e continuar
      this.logger.error(
        `Erro no middleware de auditoria: ${error.message}`,
        error.stack,
      );
      next(); // Continuar mesmo com erro
    }
  }

  /**
   * Processa a auditoria de forma assíncrona e isolada
   */
  private async processarAuditoriaAsync(
    method: string,
    originalUrl: string,
    body: any,
    responseBody: any,
    user: any,
    ip: string,
    userAgent: string,
    tipoOperacao: TipoOperacao,
    entidade: string,
    entidadeId: string | undefined,
    dadosSensiveis: string[],
    statusCode: number
  ): Promise<void> {
    try {
      // Só registra operações bem-sucedidas
      if (statusCode < 200 || statusCode >= 300) {
        return;
      }

      // ← CORREÇÃO: Criar DTO de forma simples, sem plainToInstance
      const logAuditoriaDto: CreateLogAuditoriaDto = {
        tipo_operacao: tipoOperacao,
        entidade_afetada: entidade,
        entidade_id: entidadeId || '',
        dados_anteriores: (method === 'PUT' || method === 'PATCH') ? body : undefined,
        dados_novos: (method === 'POST' || method === 'PUT' || method === 'PATCH') ? responseBody : undefined,
        usuario_id: user?.id,
        ip_origem: ip, // ← Agora sempre será string
        user_agent: userAgent,
        endpoint: originalUrl,
        metodo_http: method,
        descricao: `${method} em ${entidade}${entidadeId ? ` (ID: ${entidadeId})` : ''}`,
        dados_sensiveis_acessados: dadosSensiveis.length > 0 ? dadosSensiveis : undefined,
        validar: function (validationGroup?: string): void {
          throw new Error('Function not implemented.');
        }
      };

      // ← CORREÇÃO: Usar Promise.allSettled para não travar se uma falhar
      const promises = [
        this.auditoriaQueueService.enfileirarLogAuditoria(logAuditoriaDto)
      ];

      // Se houver dados sensíveis, adiciona à fila
      if (dadosSensiveis.length > 0 && user?.id) {
        promises.push(
          this.auditoriaQueueService.enfileirarAcessoDadosSensiveis(
            user.id,
            entidade,
            entidadeId || '',
            dadosSensiveis,
            ip, // ← Agora sempre será string
            userAgent,
            originalUrl,
            method,
          )
        );
      }

      // Executa todas as operações em paralelo
      const results = await Promise.allSettled(promises);
      
      // Loga erros das operações que falharam
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          this.logger.error(
            `Erro na operação de auditoria ${index}: ${result.reason.message}`,
            result.reason.stack,
          );
        }
      });

    } catch (error) {
      this.logger.error(
        `Erro crítico no processamento de auditoria: ${error.message}`,
        error.stack,
      );
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
  private extractEntityInfo(url: string): {
    entidade: string;
    entidadeId: string | undefined;
  } {
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
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          potentialId,
        ) ||
        /^\d+$/.test(potentialId)
      ) {
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