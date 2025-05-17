import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricasService } from '../services/metricas.service';

/**
 * Middleware responsável por coletar métricas de requisições HTTP
 * para monitoramento com Prometheus e Grafana.
 */
@Injectable()
export class MetricasMiddleware implements NestMiddleware {
  private readonly logger = new Logger(MetricasMiddleware.name);

  constructor(private readonly metricasService: MetricasService) {}

  /**
   * Processa a requisição, coletando métricas de tempo de resposta e tamanho
   * @param req Objeto de requisição
   * @param res Objeto de resposta
   * @param next Função para continuar o processamento
   */
  use(req: Request, res: Response, next: NextFunction): void {
    // Registra o tempo de início da requisição
    const inicio = Date.now();

    // Calcula o tamanho aproximado da requisição
    const tamanhoRequisicao = this.calcularTamanhoRequisicao(req);

    // Intercepta o método original de envio da resposta
    const envioOriginal = res.send;
    let tamanhoResposta = 0;

    // Sobrescreve o método send para capturar o tamanho da resposta
    res.send = function (body?: any): Response {
      tamanhoResposta = body
        ? Buffer.byteLength(
            typeof body === 'string' ? body : JSON.stringify(body),
          )
        : 0;

      // Chama o método original
      return envioOriginal.call(this, body);
    };

    // Quando a resposta for finalizada, registra as métricas
    res.on('finish', () => {
      const duracao = (Date.now() - inicio) / 1000; // Converte para segundos
      const metodo = req.method;
      const caminho = req.originalUrl || req.url;
      const status = res.statusCode;

      // Registra a métrica da requisição
      this.metricasService.registrarRequisicaoHttp(
        metodo,
        caminho,
        status,
        duracao,
        tamanhoRequisicao,
        tamanhoResposta,
      );

      // Log para debug em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(
          `${metodo} ${caminho} ${status} - ${duracao.toFixed(3)}s - Req: ${tamanhoRequisicao}B, Res: ${tamanhoResposta}B`,
        );
      }
    });

    next();
  }

  /**
   * Calcula o tamanho aproximado da requisição em bytes
   * @param req Objeto de requisição
   * @returns Tamanho da requisição em bytes
   */
  private calcularTamanhoRequisicao(req: Request): number {
    let tamanho = 0;

    // Tamanho da URL
    tamanho += Buffer.byteLength(req.originalUrl || req.url);

    // Tamanho dos headers
    if (req.headers) {
      Object.keys(req.headers).forEach((header) => {
        const valor = req.headers[header];
        if (valor) {
          tamanho += Buffer.byteLength(header);
          if (typeof valor === 'string') {
            tamanho += Buffer.byteLength(valor);
          } else if (Array.isArray(valor)) {
            valor.forEach((v) => {
              tamanho += Buffer.byteLength(v);
            });
          }
        }
      });
    }

    // Tamanho do corpo
    if (req.body) {
      try {
        tamanho += Buffer.byteLength(JSON.stringify(req.body));
      } catch (e) {
        // Ignora erros ao calcular o tamanho do corpo
      }
    }

    return tamanho;
  }
}
