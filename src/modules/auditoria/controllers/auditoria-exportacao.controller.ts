import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBody,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import {
  AuditoriaExportacaoService,
  FormatoExportacao,
  OpcoesExportacao,
} from '../services/auditoria-exportacao.service';
import { QueryLogAuditoriaDto } from '../dto/query-log-auditoria.dto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * DTO para solicitação de exportação
 */
class SolicitarExportacaoDto {
  /**
   * Formato de exportação
   */
  formato: FormatoExportacao;

  /**
   * Indica se o arquivo deve ser comprimido
   */
  comprimido?: boolean;

  /**
   * Campos a serem incluídos na exportação
   */
  campos?: string[];
}

/**
 * Controlador para exportação de logs de auditoria
 */
@ApiTags('Auditoria - Exportação')
@Controller('v1/auditoria/exportacao')
export class AuditoriaExportacaoController {
  private readonly logger = new Logger(AuditoriaExportacaoController.name);

  constructor(
    private readonly auditoriaExportacaoService: AuditoriaExportacaoService,
  ) {}

  /**
   * Exporta logs de auditoria para o formato especificado
   */
  @Post()
  @ApiOperation({
    summary: 'Exporta logs de auditoria para o formato especificado',
  })
  @ApiBody({ type: SolicitarExportacaoDto })
  @ApiResponse({ status: 201, description: 'Exportação iniciada com sucesso' })
  async exportarLogs(
    @Query() filtros: QueryLogAuditoriaDto,
    @Body() opcoes: SolicitarExportacaoDto,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`Solicitação de exportação recebida: ${opcoes.formato}`);

      // Validar formato
      if (!Object.values(FormatoExportacao).includes(opcoes.formato)) {
        throw new HttpException(
          `Formato de exportação inválido. Formatos disponíveis: ${Object.values(FormatoExportacao).join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Configurar opções de exportação
      const opcoesExportacao: OpcoesExportacao = {
        formato: opcoes.formato,
        comprimido: opcoes.comprimido || false,
        campos: opcoes.campos,
      };

      // Iniciar exportação assíncrona
      this.auditoriaExportacaoService
        .exportarLogs(filtros, opcoesExportacao)
        .then((resultado) => {
          this.logger.log(`Exportação concluída: ${resultado.caminhoArquivo}`);
        })
        .catch((error) => {
          this.logger.error(
            `Erro na exportação: ${error.message}`,
            error.stack,
          );
        });

      // Retornar resposta imediata
      return res.status(HttpStatus.ACCEPTED).json({
        mensagem: 'Exportação iniciada com sucesso',
        formato: opcoes.formato,
        filtros,
      });
    } catch (error) {
      this.logger.error(
        `Erro ao iniciar exportação: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Baixa um arquivo de exportação pelo nome
   */
  @Get('download/:nomeArquivo')
  @ApiOperation({ summary: 'Baixa um arquivo de exportação pelo nome' })
  @ApiParam({
    name: 'nomeArquivo',
    description: 'Nome do arquivo de exportação',
  })
  @ApiResponse({ status: 200, description: 'Arquivo encontrado e enviado' })
  @ApiResponse({ status: 404, description: 'Arquivo não encontrado' })
  async downloadArquivo(
    @Query('nomeArquivo') nomeArquivo: string,
    @Res() res: Response,
  ) {
    try {
      const diretorioExportacao =
        process.env.AUDITORIA_EXPORT_DIR ||
        path.join(process.cwd(), 'exports', 'auditoria');

      const caminhoArquivo = path.join(diretorioExportacao, nomeArquivo);

      // Verificar se o arquivo existe
      if (!fs.existsSync(caminhoArquivo)) {
        throw new HttpException('Arquivo não encontrado', HttpStatus.NOT_FOUND);
      }

      // Determinar o tipo de conteúdo
      let contentType = 'application/octet-stream';

      if (nomeArquivo.endsWith('.json')) {
        contentType = 'application/json';
      } else if (nomeArquivo.endsWith('.csv')) {
        contentType = 'text/csv';
      } else if (nomeArquivo.endsWith('.xlsx')) {
        contentType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (nomeArquivo.endsWith('.pdf')) {
        contentType = 'application/pdf';
      } else if (nomeArquivo.endsWith('.gz')) {
        contentType = 'application/gzip';
      }

      // Configurar cabeçalhos
      res.setHeader('Content-Type', contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${nomeArquivo}"`,
      );

      // Enviar arquivo
      const fileStream = fs.createReadStream(caminhoArquivo);
      fileStream.pipe(res);
    } catch (error) {
      this.logger.error(
        `Erro ao baixar arquivo: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Lista os arquivos de exportação disponíveis
   */
  @Get('arquivos')
  @ApiOperation({ summary: 'Lista os arquivos de exportação disponíveis' })
  @ApiResponse({
    status: 200,
    description: 'Lista de arquivos retornada com sucesso',
  })
  async listarArquivos() {
    try {
      const diretorioExportacao =
        process.env.AUDITORIA_EXPORT_DIR ||
        path.join(process.cwd(), 'exports', 'auditoria');

      // Verificar se o diretório existe
      if (!fs.existsSync(diretorioExportacao)) {
        return { arquivos: [] };
      }

      // Listar arquivos
      const arquivos = fs
        .readdirSync(diretorioExportacao)
        .filter((arquivo) => {
          // Filtrar apenas arquivos de exportação
          return arquivo.startsWith('auditoria_export_');
        })
        .map((arquivo) => {
          const caminhoCompleto = path.join(diretorioExportacao, arquivo);
          const stats = fs.statSync(caminhoCompleto);

          return {
            nome: arquivo,
            tamanho: stats.size,
            dataModificacao: stats.mtime,
            formato: this.determinarFormato(arquivo),
          };
        })
        .sort(
          (a, b) => b.dataModificacao.getTime() - a.dataModificacao.getTime(),
        );

      return { arquivos };
    } catch (error) {
      this.logger.error(
        `Erro ao listar arquivos: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Determina o formato de um arquivo com base no nome
   *
   * @param nomeArquivo Nome do arquivo
   * @returns Formato do arquivo
   */
  private determinarFormato(nomeArquivo: string): string {
    if (nomeArquivo.endsWith('.json.gz')) {
      return 'JSON (comprimido)';
    } else if (nomeArquivo.endsWith('.json')) {
      return 'JSON';
    } else if (nomeArquivo.endsWith('.csv.gz')) {
      return 'CSV (comprimido)';
    } else if (nomeArquivo.endsWith('.csv')) {
      return 'CSV';
    } else if (nomeArquivo.endsWith('.xlsx')) {
      return 'Excel';
    } else if (nomeArquivo.endsWith('.pdf')) {
      return 'PDF';
    } else {
      return 'Desconhecido';
    }
  }
}
