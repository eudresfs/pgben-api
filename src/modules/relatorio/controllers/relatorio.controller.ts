import { 
  Controller, 
  Get, 
  Query, 
  UseGuards, 
  Req, 
  Res,
  BadRequestException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RelatorioService } from '../services/relatorio.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../auth/enums/role.enum';
import { Request, Response } from 'express';

/**
 * Controlador de Relatórios
 * 
 * Responsável por gerenciar as rotas relacionadas aos relatórios
 * gerenciais e operacionais do sistema
 */
@ApiTags('Relatórios')
@Controller('relatorio')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RelatorioController {
  constructor(private readonly relatorioService: RelatorioService) {}

  /**
   * Gera relatório de benefícios concedidos por período
   */
  @Get('beneficios-concedidos')
  @Roles(Role.ADMIN, Role.GESTOR_SEMTAS, Role.TECNICO_SEMTAS)
  @ApiOperation({ summary: 'Gera relatório de benefícios concedidos' })
  @ApiResponse({ status: 200, description: 'Relatório gerado com sucesso' })
  @ApiQuery({ name: 'data_inicio', required: true })
  @ApiQuery({ name: 'data_fim', required: true })
  @ApiQuery({ name: 'unidade_id', required: false })
  @ApiQuery({ name: 'tipo_beneficio_id', required: false })
  @ApiQuery({ name: 'formato', enum: ['pdf', 'excel', 'csv'], default: 'pdf' })
  async beneficiosConcedidos(
    @Req() req: Request,
    @Res() res: Response,
    @Query('data_inicio') dataInicio: string,
    @Query('data_fim') dataFim: string,
    @Query('unidade_id') unidadeId?: string,
    @Query('tipo_beneficio_id') tipoBeneficioId?: string,
    @Query('formato') formato: 'pdf' | 'excel' | 'csv' = 'pdf'
  ) {
    if (!dataInicio || !dataFim) {
      throw new BadRequestException('Data inicial e final são obrigatórias');
    }
    
    const relatorio = await this.relatorioService.gerarRelatorioBeneficiosConcedidos({
      dataInicio,
      dataFim,
      unidadeId,
      tipoBeneficioId,
      formato,
      user: req.user
    });
    
    // Configurar cabeçalhos da resposta de acordo com o formato
    if (formato === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=beneficios-concedidos.pdf');
    } else if (formato === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=beneficios-concedidos.xlsx');
    } else if (formato === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=beneficios-concedidos.csv');
    }
    
    return res.send(relatorio);
  }

  /**
   * Gera relatório de solicitações por status
   */
  @Get('solicitacoes-por-status')
  @Roles(Role.ADMIN, Role.GESTOR_SEMTAS, Role.TECNICO_SEMTAS, Role.COORDENADOR)
  @ApiOperation({ summary: 'Relatório de solicitações por status' })
  @ApiResponse({ status: 200, description: 'Relatório gerado com sucesso' })
  @ApiQuery({ name: 'data_inicio', required: true, type: String, description: 'Data inicial (formato: YYYY-MM-DD)' })
  @ApiQuery({ name: 'data_fim', required: true, type: String, description: 'Data final (formato: YYYY-MM-DD)' })
  @ApiQuery({ name: 'unidade_id', required: false, type: String, description: 'Filtro por unidade' })
  @ApiQuery({ name: 'formato', required: false, enum: ['pdf', 'excel', 'csv'], description: 'Formato de saída' })
  async solicitacoesPorStatus(
    @Req() req: Request,
    @Res() res: Response,
    @Query('data_inicio') dataInicio: string,
    @Query('data_fim') dataFim: string,
    @Query('unidade_id') unidadeId?: string,
    @Query('formato') formato: 'pdf' | 'excel' | 'csv' = 'pdf'
  ) {
    if (!dataInicio || !dataFim) {
      throw new BadRequestException('Data inicial e final são obrigatórias');
    }
    
    const relatorio = await this.relatorioService.gerarRelatorioSolicitacoesPorStatus({
      dataInicio,
      dataFim,
      unidadeId,
      formato,
      user: req.user
    });
    
    // Configurar cabeçalhos da resposta de acordo com o formato
    if (formato === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=solicitacoes-por-status.pdf');
    } else if (formato === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=solicitacoes-por-status.xlsx');
    } else if (formato === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=solicitacoes-por-status.csv');
    }
    
    return res.send(relatorio);
  }

  /**
   * Gera relatório de atendimentos por unidade
   */
  @Get('atendimentos-por-unidade')
  @Roles(Role.ADMIN, Role.GESTOR_SEMTAS)
  @ApiOperation({ summary: 'Relatório de atendimentos por unidade' })
  @ApiResponse({ status: 200, description: 'Relatório gerado com sucesso' })
  @ApiQuery({ name: 'data_inicio', required: true, type: String, description: 'Data inicial (formato: YYYY-MM-DD)' })
  @ApiQuery({ name: 'data_fim', required: true, type: String, description: 'Data final (formato: YYYY-MM-DD)' })
  @ApiQuery({ name: 'formato', required: false, enum: ['pdf', 'excel', 'csv'], description: 'Formato de saída' })
  async atendimentosPorUnidade(
    @Query('data_inicio') dataInicio: string,
    @Query('data_fim') dataFim: string,
    @Query('formato') formato: 'pdf' | 'excel' | 'csv' = 'pdf',
    @Req() req: Request,
    @Res() res: Response
  ) {
    if (!dataInicio || !dataFim) {
      throw new BadRequestException('Data inicial e final são obrigatórias');
    }
    
    const relatorio = await this.relatorioService.gerarRelatorioAtendimentosPorUnidade({
      dataInicio,
      dataFim,
      formato,
      user: req.user
    });
    
    // Configurar cabeçalhos da resposta de acordo com o formato
    if (formato === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=atendimentos-por-unidade.pdf');
    } else if (formato === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=atendimentos-por-unidade.xlsx');
    } else if (formato === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=atendimentos-por-unidade.csv');
    }
    
    return res.send(relatorio);
  }
}
