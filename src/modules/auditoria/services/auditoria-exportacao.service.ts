import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike } from 'typeorm';
import { LogAuditoria } from '../../../entities/log-auditoria.entity';
import { QueryLogAuditoriaDto } from '../dto/query-log-auditoria.dto';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import sanitizeFilename from 'sanitize-filename';

/**
 * Formatos de exportação suportados para os logs de auditoria - Versão MVP
 *
 * @enum {string}
 * @property {string} JSON - Formato JSON (JavaScript Object Notation)
 * @property {string} CSV - Formato CSV (Comma-Separated Values)
 * @note Formatos Excel e PDF foram adiados para versões futuras do sistema
 */
export enum FormatoExportacao {
  /** Formato JSON (JavaScript Object Notation) */
  JSON = 'json',
  /** Formato CSV (Comma-Separated Values) */
  CSV = 'csv',
}

/**
 * Opções de exportação para os logs de auditoria - Versão MVP
 *
 * Configurações simplificadas para exportação de logs no MVP
 */
export interface OpcoesExportacao {
  /**
   * Formato de exportação (apenas JSON ou CSV no MVP)
   */
  formato: FormatoExportacao;

  /**
   * Caminho para salvar o arquivo (opcional)
   * Se não for fornecido, será usado o diretório padrão
   */
  caminho?: string;

  /**
   * Nome do arquivo (opcional)
   * Se não for fornecido, será gerado automaticamente
   */
  nomeArquivo?: string;

  /**
   * Indica se o arquivo deve ser comprimido
   */
  comprimido?: boolean;

  /**
   * Campos a serem incluídos na exportação
   * Se não for fornecido, todos os campos serão incluídos
   */
  campos?: string[];
}

/**
 * Resultado da operação de exportação - Versão MVP
 */
export interface ResultadoExportacao {
  /** Caminho completo do arquivo gerado */
  caminhoArquivo: string;

  /** Quantidade de registros exportados */
  registrosExportados: number;

  /** Tamanho do arquivo em bytes */
  tamanhoArquivo: number;

  /** Data e hora da exportação */
  dataHora: Date;

  /** Formato da exportação */
  formato: FormatoExportacao;
}

/**
 * Serviço responsável por exportar logs de auditoria - Versão MVP
 *
 * Implementação simplificada para MVP com suporte apenas a formatos essenciais (JSON, CSV).
 * Formatos avançados (Excel, PDF) e funcionalidades complexas foram adiados para versões futuras.
 */
@Injectable()
export class AuditoriaExportacaoService {
  /** Logger para registro de eventos do serviço */
  private readonly logger = new Logger(AuditoriaExportacaoService.name);

  /** Diretório base para armazenar os arquivos exportados */
  private readonly diretorioExportacao: string;

  /** Tamanho máximo de registros para exportação em lote */
  private readonly MAX_REGISTROS_POR_LOTE: number;

  /** Tamanho máximo de arquivo permitido em bytes */
  private readonly TAMANHO_MAXIMO_ARQUIVO: number;

  /** Timeout para operações de exportação */
  private readonly TIMEOUT_EXPORTACAO = 5 * 60 * 1000; // 5 minutos

  constructor(
    @InjectRepository(LogAuditoria)
    private readonly logAuditoriaRepository: Repository<LogAuditoria>,
    private readonly configService: ConfigService,
  ) {
    // Configurar limites
    this.MAX_REGISTROS_POR_LOTE = Math.min(
      Math.max(
        1,
        Number(
          this.configService.get<number>('AUDITORIA_MAX_EXPORT_RECORDS') ||
            10000,
        ),
      ),
      50000, // Limite absoluto de 50.000 registros
    );

    // Configurar tamanho máximo do arquivo (em MB, padrão 100MB)
    this.TAMANHO_MAXIMO_ARQUIVO =
      Math.min(
        Math.max(
          1,
          Number(
            this.configService.get<number>('AUDITORIA_MAX_FILE_SIZE_MB') || 100,
          ),
        ),
        500, // Limite absoluto de 500MB
      ) *
      1024 *
      1024; // Converter para bytes

    // Configurar diretório de exportação
    const exportDir = this.configService.get<string>('AUDITORIA_EXPORT_DIR');
    this.diretorioExportacao =
      exportDir || path.join(process.cwd(), 'exports', 'auditoria');

    // Garantir que o diretório existe
    if (!fs.existsSync(this.diretorioExportacao)) {
      fs.mkdirSync(this.diretorioExportacao, { recursive: true });
      this.logger.log(
        `Diretório de exportação criado: ${this.diretorioExportacao}`,
      );
    }
  }

  /**
   * Exporta logs de auditoria com base nos filtros fornecidos - Versão MVP
   *
   * @param filtros - Critérios de filtragem para os logs
   * @param opcoes - Configurações para a exportação (apenas JSON e CSV no MVP)
   * @returns Informações sobre o arquivo gerado
   * @throws {Error} Quando ocorre um erro durante a exportação
   */
  async exportarLogs(
    filtros: QueryLogAuditoriaDto,
    opcoes: OpcoesExportacao,
  ): Promise<ResultadoExportacao> {
    const exportId = Math.random().toString(36).substring(2, 10);
    this.logger.log(
      `[${exportId}] Iniciando exportação de logs no formato ${opcoes.formato}`,
    );

    // Verificar se o formato solicitado é suportado no MVP
    if (
      opcoes.formato !== FormatoExportacao.JSON &&
      opcoes.formato !== FormatoExportacao.CSV
    ) {
      throw new Error(
        `Formato ${opcoes.formato} não suportado no MVP. Use apenas JSON ou CSV.`,
      );
    }

    // Validar opções de exportação
    this.validarOpcoesExportacao(opcoes);

    // Buscar logs para exportação
    const logs = await this.buscarLogsParaExportacao(filtros);

    if (logs.length === 0) {
      throw new Error('Nenhum log encontrado para os critérios fornecidos');
    }

    if (logs.length > this.MAX_REGISTROS_POR_LOTE) {
      this.logger.warn(
        `Limite de registros excedido: ${logs.length}. A exportação será limitada a ${this.MAX_REGISTROS_POR_LOTE} registros.`,
      );
    }

    // Processar campos conforme solicitação
    const registros = this.processarCampos(
      logs.slice(0, this.MAX_REGISTROS_POR_LOTE),
      opcoes.campos,
    );

    // Gerar nome do arquivo
    const nomeArquivo = opcoes.nomeArquivo
      ? sanitizeFilename(opcoes.nomeArquivo)
      : this.gerarNomeArquivo(opcoes);

    // Definir caminho do arquivo
    const dirBase = opcoes.caminho || this.diretorioExportacao;
    const caminho = path.resolve(dirBase, nomeArquivo);

    // Validar caminho do arquivo
    const caminhoArquivo = this.validarCaminhoArquivo(caminho);

    // Exportar no formato solicitado (apenas JSON ou CSV no MVP)
    let tamanhoArquivo = 0;
    const startTime = Date.now();

    try {
      switch (opcoes.formato) {
        case FormatoExportacao.JSON:
          tamanhoArquivo = await this.exportarJSON(
            registros,
            caminhoArquivo,
            opcoes.comprimido,
          );
          break;
        case FormatoExportacao.CSV:
          tamanhoArquivo = await this.exportarCSV(
            registros,
            caminhoArquivo,
            opcoes.comprimido,
          );
          break;
        default:
          throw new Error(
            `Formato de exportação não suportado: ${opcoes.formato}`,
          );
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Exportação concluída em ${duration}ms: ${registros.length} registros, ${tamanhoArquivo} bytes`,
      );

      return {
        caminhoArquivo,
        registrosExportados: registros.length,
        tamanhoArquivo,
        dataHora: new Date(),
        formato: opcoes.formato,
      };
    } catch (error) {
      // Tentar limpar arquivo em caso de erro
      try {
        if (fs.existsSync(caminhoArquivo)) {
          fs.unlinkSync(caminhoArquivo);
          this.logger.debug(`Arquivo temporário removido: ${caminhoArquivo}`);
        }
      } catch (cleanupError) {
        this.logger.error(
          `Erro ao limpar arquivo após falha: ${cleanupError instanceof Error ? cleanupError.message : 'Erro desconhecido'}`,
        );
      }

      throw error;
    }
  }

  /**
   * Busca logs de auditoria com base nos filtros fornecidos
   *
   * @param filtros - Critérios de filtragem para a consulta
   * @returns Lista de logs de auditoria que atendem aos critérios
   * @private
   */
  private async buscarLogsParaExportacao(
    filtros: QueryLogAuditoriaDto,
  ): Promise<LogAuditoria[]> {
    const whereClause: any = {};

    // Filtrar por tipo de operação
    if (filtros.tipo_operacao) {
      whereClause.tipo_operacao = filtros.tipo_operacao;
    }

    // Filtrar por entidade afetada
    if (filtros.entidade_afetada) {
      whereClause.entidade_afetada = ILike(`%${filtros.entidade_afetada}%`);
    }

    // Filtrar por ID da entidade
    if (filtros.entidade_id) {
      whereClause.entidade_id = filtros.entidade_id;
    }

    // Filtrar por ID do usuário
    if (filtros.usuario_id) {
      whereClause.usuario_id = filtros.usuario_id;
    }

    // Filtrar por período de data
    if (filtros.data_inicial) {
      const dataInicial = new Date(filtros.data_inicial);

      if (filtros.data_final) {
        const dataFinal = new Date(filtros.data_final);
        dataFinal.setHours(23, 59, 59, 999); // Ajustar para o fim do dia

        whereClause.created_at = Between(dataInicial, dataFinal);
      } else {
        // Se não tiver data final, usar apenas a data inicial
        const fimDoDia = new Date(dataInicial);
        fimDoDia.setHours(23, 59, 59, 999); // Ajustar para o fim do dia

        whereClause.created_at = Between(dataInicial, fimDoDia);
      }
    } else if (filtros.data_final) {
      // Se tiver apenas data final, buscar tudo até essa data
      const dataFinal = new Date(filtros.data_final);
      dataFinal.setHours(23, 59, 59, 999); // Ajustar para o fim do dia

      whereClause.created_at = Between(new Date(0), dataFinal);
    }

    // Filtrar por método HTTP
    if (filtros.metodo_http) {
      whereClause.metodo_http = filtros.metodo_http;
    }

    // Filtrar por endpoint
    if (filtros.endpoint) {
      whereClause.endpoint = ILike(`%${filtros.endpoint}%`);
    }

    // Executar consulta com parâmetros de paginação e ordenação
    return await this.logAuditoriaRepository.find({
      where: whereClause,
      order: {
        created_at: 'DESC',
      },
      take: this.MAX_REGISTROS_POR_LOTE,
    });
  }

  /**
   * Processa e filtra campos dos logs de auditoria
   *
   * @param logs - Lista de logs a processar
   * @param campos - Lista opcional de campos a incluir
   * @returns Array de objetos com os campos processados
   * @private
   */
  private processarCampos(
    logs: LogAuditoria[],
    campos?: string[],
  ): Record<string, unknown>[] {
    return logs.map((log) => {
      const resultado: Record<string, unknown> = {};

      // Determine quais campos incluir
      const camposParaIncluir = campos?.length ? campos : Object.keys(log);

      // Adicionar campos no resultado
      for (const campo of camposParaIncluir) {
        if (campo in log) {
          resultado[campo] = (log as any)[campo];
        }
      }

      return resultado;
    });
  }

  /**
   * Valida as opções de exportação
   *
   * @param opcoes - Opções de exportação a validar
   * @throws {Error} Se as opções forem inválidas
   * @private
   */
  private validarOpcoesExportacao(opcoes: OpcoesExportacao): void {
    // Verificar se o formato é suportado
    if (!Object.values(FormatoExportacao).includes(opcoes.formato)) {
      throw new Error(`Formato de exportação inválido: ${opcoes.formato}`);
    }

    // Verificar caminho personalizado
    if (opcoes.caminho && !fs.existsSync(opcoes.caminho)) {
      throw new Error(`Caminho de destino não encontrado: ${opcoes.caminho}`);
    }

    // Validar nome de arquivo
    if (opcoes.nomeArquivo) {
      const sanitizedName = sanitizeFilename(opcoes.nomeArquivo);
      if (sanitizedName !== opcoes.nomeArquivo) {
        this.logger.warn(
          `Nome de arquivo sanitizado: ${opcoes.nomeArquivo} -> ${sanitizedName}`,
        );
      }
    }
  }

  /**
   * Gera um nome de arquivo seguro para exportação
   *
   * @param opcoes - Opções de exportação
   * @returns Nome de arquivo gerado
   * @private
   */
  private gerarNomeArquivo(opcoes: OpcoesExportacao): string {
    // Se um nome for fornecido, sanitizar e usar
    if (opcoes.nomeArquivo) {
      const nomeBase = sanitizeFilename(opcoes.nomeArquivo);
      return `${nomeBase}.${opcoes.formato}${opcoes.comprimido ? '.gz' : ''}`;
    }

    // Gerar nome padrão com timestamp
    const dataAtual = new Date();
    const timestamp = dataAtual
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .split('Z')[0];

    return `auditoria_${timestamp}.${opcoes.formato}${opcoes.comprimido ? '.gz' : ''}`;
  }

  /**
   * Valida caminho do arquivo para garantir segurança
   *
   * @param caminhoArquivo - Caminho a validar
   * @returns Caminho validado
   * @throws {Error} Se o caminho for inválido ou inseguro
   * @private
   */
  private validarCaminhoArquivo(caminhoArquivo: string): string {
    // Verificar se o caminho é absoluto
    if (!path.isAbsolute(caminhoArquivo)) {
      throw new Error('Caminho do arquivo deve ser absoluto');
    }

    // Normalizar caminho para evitar path traversal
    const caminhoNormalizado = path.normalize(caminhoArquivo);

    // Verificar se está dentro de um diretório permitido (diretório de exportação ou personalizado)
    const isDentroDoPermitido = caminhoNormalizado.startsWith(
      this.diretorioExportacao,
    );

    if (!isDentroDoPermitido) {
      throw new Error('Caminho do arquivo inválido');
    }

    // Verificar se o diretório de destino existe
    const diretorio = path.dirname(caminhoNormalizado);
    if (!fs.existsSync(diretorio)) {
      fs.mkdirSync(diretorio, { recursive: true });
    }

    return caminhoNormalizado;
  }

  /**
   * Sanitiza dados para exportação
   *
   * @param dados - Array de dados a sanitizar
   * @returns Array sanitizado
   * @private
   */
  private sanitizarDadosParaExportacao(
    dados: unknown[],
  ): Record<string, unknown>[] {
    if (!Array.isArray(dados)) {
      this.logger.warn(
        'Dados fornecidos não são um array. Retornando array vazio.',
      );
      return [];
    }

    try {
      return dados.map((item) => {
        if (!item || typeof item !== 'object') {
          return {};
        }

        const resultado: Record<string, unknown> = {};

        // Lista de campos que devem preservar sua estrutura original
        const camposEstruturados = [
          'dados_anteriores',
          'dados_novos',
          'dados_sensiveis_acessados',
        ];

        // Processar cada campo
        Object.entries(item as Record<string, unknown>).forEach(
          ([chave, valor]) => {
            // Preservar estrutura para campos específicos que contêm objetos ou arrays
            if (
              camposEstruturados.includes(chave) &&
              valor !== null &&
              typeof valor === 'object'
            ) {
              resultado[chave] = valor;
              return;
            }

            // Processamento normal para outros tipos de dados
            if (typeof valor === 'string') {
              // Sanitizar strings para evitar injeção
              resultado[chave] = valor
                .replace(/[\x00-\x1F\x7F-\x9F\uFFFD]/g, '')
                .replace(/[\u200B-\u200D\uFEFF]/g, '');
            } else if (valor instanceof Date) {
              // Converter datas para formato ISO
              resultado[chave] = valor.toISOString();
            } else if (
              valor === null ||
              valor === undefined ||
              typeof valor === 'number' ||
              typeof valor === 'boolean'
            ) {
              // Manter tipos primitivos
              resultado[chave] = valor;
            } else if (typeof valor === 'object') {
              // Para objetos complexos que não estão na lista de exceções
              try {
                // Tentativa de preservar a estrutura do objeto
                if (Array.isArray(valor)) {
                  resultado[chave] = valor;
                } else {
                  resultado[chave] = valor;
                }
              } catch {
                resultado[chave] = '[Objeto complexo]';
              }
            } else {
              // Para outros tipos, converter para string
              resultado[chave] = String(valor);
            }
          },
        );

        return resultado;
      });
    } catch (error) {
      this.logger.error(
        `Erro ao sanitizar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      );
      return [];
    }
  }

  /**
   * Exporta logs para formato JSON
   *
   * @param logs - Dados a exportar
   * @param caminhoArquivo - Caminho do arquivo de destino
   * @param comprimido - Se o arquivo deve ser compactado
   * @returns Tamanho do arquivo em bytes
   * @private
   */
  private async exportarJSON(
    logs: Record<string, unknown>[],
    caminhoArquivo: string,
    comprimido?: boolean,
  ): Promise<number> {
    // Sanitizar dados
    const dadosSanitizados = this.sanitizarDadosParaExportacao(logs);

    // Verificar se há dados para exportar
    if (dadosSanitizados.length === 0) {
      this.logger.warn('Nenhum dado válido para exportar para JSON');
      return 0;
    }

    try {
      // Converter para JSON formatado
      const jsonContent = JSON.stringify(dadosSanitizados, null, 2);

      if (comprimido) {
        // Exportar compactado
        await new Promise<void>((resolve, reject) => {
          const gzip = zlib.createGzip();
          const output = fs.createWriteStream(caminhoArquivo);

          output.on('finish', resolve);
          output.on('error', reject);

          gzip.pipe(output);
          gzip.write(jsonContent);
          gzip.end();
        });
      } else {
        // Exportar sem compressão
        await fs.promises.writeFile(caminhoArquivo, jsonContent, 'utf8');
      }

      // Obter tamanho do arquivo
      const stats = fs.statSync(caminhoArquivo);
      return stats.size;
    } catch (error) {
      this.logger.error(
        `Erro ao exportar para JSON: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      );
      throw new Error(
        `Falha ao exportar para JSON: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      );
    }
  }

  /**
   * Escapa valor para CSV
   *
   * @param valor - Valor a escapar
   * @returns Valor escapado
   * @private
   */
  private escaparValorCSV(valor: unknown): string {
    if (valor === null || valor === undefined) {
      return '';
    }

    // Tratar objetos ou arrays para serialização correta
    if (typeof valor === 'object' && valor !== null) {
      // Para datas, usar formato ISO
      if (valor instanceof Date) {
        return this.escaparValorCSV(valor.toISOString());
      }

      // Para arrays e objetos, converter para JSON formatado
      try {
        const jsonStr = JSON.stringify(valor);
        return this.escaparValorCSV(jsonStr);
      } catch {
        return this.escaparValorCSV('[Objeto complexo]');
      }
    }

    const str = String(valor);

    // Escapar aspas duplicando-as e colocar entre aspas se contiver caracteres especiais
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  /**
   * Exporta logs para formato CSV
   *
   * @param logs - Dados a exportar
   * @param caminhoArquivo - Caminho do arquivo de destino
   * @param comprimido - Se o arquivo deve ser compactado
   * @returns Tamanho do arquivo em bytes
   * @private
   */
  private async exportarCSV(
    logs: Record<string, unknown>[],
    caminhoArquivo: string,
    comprimido?: boolean,
  ): Promise<number> {
    // Sanitizar dados
    const dadosSanitizados = this.sanitizarDadosParaExportacao(logs);

    // Verificar se há dados para exportar
    if (dadosSanitizados.length === 0) {
      this.logger.warn('Nenhum dado válido para exportar para CSV');
      return 0;
    }

    try {
      // Obter cabeçalhos (todas as chaves únicas presentes nos objetos)
      const headers = Array.from(
        new Set(dadosSanitizados.flatMap((obj) => Object.keys(obj))),
      );

      // Criar linha de cabeçalho
      const headerRow = headers.map(this.escaparValorCSV).join(',');

      // Criar linhas de dados
      const dataRows = dadosSanitizados.map((item) => {
        return headers
          .map((header) => {
            return this.escaparValorCSV(item[header]);
          })
          .join(',');
      });

      // Compor conteúdo CSV
      const csvContent = [headerRow, ...dataRows].join('\n');

      if (comprimido) {
        // Exportar compactado
        await new Promise<void>((resolve, reject) => {
          const gzip = zlib.createGzip();
          const output = fs.createWriteStream(caminhoArquivo);

          output.on('finish', resolve);
          output.on('error', reject);

          gzip.pipe(output);
          gzip.write(csvContent);
          gzip.end();
        });
      } else {
        // Exportar sem compressão
        await fs.promises.writeFile(caminhoArquivo, csvContent, 'utf8');
      }

      // Obter tamanho do arquivo
      const stats = fs.statSync(caminhoArquivo);
      return stats.size;
    } catch (error) {
      this.logger.error(
        `Erro ao exportar para CSV: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      );
      throw new Error(
        `Falha ao exportar para CSV: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      );
    }
  }
}
