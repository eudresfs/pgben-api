import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  Res,
  BadRequestException,
  Post,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiProduces,
} from '@nestjs/swagger';
import { RelatoriosService } from '../services/relatorios.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../entities/user-permission.entity';
import { Request, Response } from 'express';
import {
  RelatorioBeneficiosDto,
  RelatorioSolicitacoesDto,
  RelatorioAtendimentosDto,
} from '../dto';

/**
 * Controlador de Relatórios
 *
 * Responsável por gerenciar as rotas relacionadas aos relatórios
 * gerenciais e operacionais do sistema
 */
@ApiTags('Relatórios')
@Controller('relatorios')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class RelatoriosController {
  [x: string]: any;
  constructor(private readonly relatoriosService: RelatoriosService) {}

  /**
   * Gera relatório de benefícios concedidos por período
   *
   * @param req Request Express
   * @param res Response Express
   * @param dto Parâmetros do relatório
   * @returns Stream do relatório no formato solicitado
   */
  @Get('beneficios-concedidos')
  @RequiresPermission({
    permissionName: 'relatorio.beneficios.concedidos',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'query.unidade_id',
  })
  @ApiOperation({
    summary: 'Gera relatório de benefícios concedidos',
    description:
      'Gera um relatório detalhado de benefícios concedidos no período especificado, com opções de filtro por unidade e tipo de benefício. O relatório pode ser gerado em formato PDF, Excel ou CSV.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Relatório gerado com sucesso (PDF, Excel ou CSV, dependendo do formato solicitado)',
    content: {
      'application/pdf': {
        schema: { type: 'string', format: 'binary' },
      },
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: { type: 'string', format: 'binary' },
      },
      'text/csv': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Parâmetros inválidos - Data inicial e final são obrigatórias',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado - Token JWT ausente ou inválido',
  })
  @ApiResponse({
    status: 403,
    description:
      'Permissão negada - Usuário não possui permissão para acessar este relatório',
  })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async beneficiosConcedidos(
    @Req() req: Request,
    @Res() res: Response,
    @Query() dto: RelatorioBeneficiosDto,
  ) {
    if (!dto.data_inicio || !dto.data_fim) {
      throw new BadRequestException('Data inicial e final são obrigatórias');
    }

    const relatorio =
      await this.relatoriosService.gerarRelatorioBeneficiosConcedidos({
        dataInicio: dto.data_inicio,
        dataFim: dto.data_fim,
        unidadeId: dto.unidade_id,
        tipoBeneficioId: dto.tipo_beneficio_id,
        formato: dto.formato,
        user: req.user,
      });

    // Configurar cabeçalhos da resposta de acordo com o formato
    if (dto.formato === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=beneficios-concedidos.pdf',
      );
    } else if (dto.formato === 'excel') {
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=beneficios-concedidos.xlsx',
      );
    } else if (dto.formato === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=beneficios-concedidos.csv',
      );
    }

    return res.send(relatorio);
  }

  /**
   * Gera relatório de solicitações por status
   *
   * @param req Request Express
   * @param res Response Express
   * @param dto Parâmetros do relatório
   * @returns Stream do relatório no formato solicitado
   */
  @Get('solicitacoes-por-status')
  @RequiresPermission({
    permissionName: 'relatorio.solicitacoes.status',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'query.unidade_id',
  })
  @ApiOperation({
    summary: 'Gera relatório de solicitações por status',
    description:
      'Gera um relatório detalhado de solicitações agrupadas por status no período especificado, com opção de filtro por unidade. O relatório pode ser gerado em formato PDF, Excel ou CSV.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Relatório gerado com sucesso (PDF, Excel ou CSV, dependendo do formato solicitado)',
    content: {
      'application/pdf': {
        schema: { type: 'string', format: 'binary' },
      },
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: { type: 'string', format: 'binary' },
      },
      'text/csv': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Parâmetros inválidos - Data inicial e final são obrigatórias',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado - Token JWT ausente ou inválido',
  })
  @ApiResponse({
    status: 403,
    description:
      'Permissão negada - Usuário não possui permissão para acessar este relatório',
  })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async solicitacoesPorStatus(
    @Req() req: Request,
    @Res() res: Response,
    @Query() dto: RelatorioSolicitacoesDto,
  ) {
    if (!dto.data_inicio || !dto.data_fim) {
      throw new BadRequestException('Data inicial e final são obrigatórias');
    }

    const relatorio =
      await this.relatoriosService.gerarRelatorioSolicitacoesPorStatus({
        dataInicio: dto.data_inicio,
        dataFim: dto.data_fim,
        unidadeId: dto.unidade_id,
        formato: dto.formato,
        user: req.user,
      });

    // Configurar cabeçalhos da resposta de acordo com o formato
    if (dto.formato === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=solicitacoes-por-status.pdf',
      );
    } else if (dto.formato === 'excel') {
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=solicitacoes-por-status.xlsx',
      );
    } else if (dto.formato === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=solicitacoes-por-status.csv',
      );
    }

    return res.send(relatorio);
  }

  /**
   * Gera relatório de atendimentos por unidade
   *
   * @param req Request Express
   * @param res Response Express
   * @param dto Parâmetros do relatório
   * @returns Stream do relatório no formato solicitado
   */
  @Get('atendimentos-por-unidade')
  @RequiresPermission({
    permissionName: 'relatorio.atendimentos.unidade',
    scopeType: ScopeType.GLOBAL,
  })
  @ApiOperation({
    summary: 'Gera relatório de atendimentos por unidade',
    description:
      'Gera um relatório consolidado de atendimentos realizados por cada unidade no período especificado, incluindo contagem de solicitações por status. O relatório pode ser gerado em formato PDF, Excel ou CSV.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Relatório gerado com sucesso (PDF, Excel ou CSV, dependendo do formato solicitado)',
    content: {
      'application/pdf': {
        schema: { type: 'string', format: 'binary' },
      },
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: { type: 'string', format: 'binary' },
      },
      'text/csv': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Parâmetros inválidos - Data inicial e final são obrigatórias',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado - Token JWT ausente ou inválido',
  })
  @ApiResponse({
    status: 403,
    description:
      'Permissão negada - Usuário não possui permissão para acessar este relatório',
  })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async atendimentosPorUnidade(
    @Req() req: Request,
    @Res() res: Response,
    @Query() dto: RelatorioAtendimentosDto,
  ) {
    if (!dto.data_inicio || !dto.data_fim) {
      throw new BadRequestException('Data inicial e final são obrigatórias');
    }

    const relatorio =
      await this.relatoriosService.gerarRelatorioAtendimentosPorUnidade({
        dataInicio: dto.data_inicio,
        dataFim: dto.data_fim,
        formato: dto.formato,
        user: req.user,
      });

    // Configurar cabeçalhos da resposta de acordo com o formato
    if (dto.formato === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=atendimentos-por-unidade.pdf',
      );
    } else if (dto.formato === 'excel') {
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=atendimentos-por-unidade.xlsx',
      );
    } else if (dto.formato === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=atendimentos-por-unidade.csv',
      );
    }

    return res.send(relatorio);
  }
}
