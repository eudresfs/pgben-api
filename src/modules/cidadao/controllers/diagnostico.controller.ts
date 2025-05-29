import {
  Controller,
  Get,
  Query,
  HttpStatus,
  Res,
  Logger,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Repository } from 'typeorm';
import { Cidadao } from '../entities/cidadao.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Public } from '../../../auth/decorators/public.decorator';

/**
 * Controlador para diagnóstico de performance
 * Este controlador contém endpoints simplificados para diagnóstico
 * que não usam interceptors, validações pesadas ou cache
 */
@ApiTags('Diagnóstico')
@Controller('diagnostico/cidadao')
export class DiagnosticoController {
  private readonly logger = new Logger(DiagnosticoController.name);

  constructor(
    @InjectRepository(Cidadao)
    private readonly cidadaoRepository: Repository<Cidadao>,
  ) {}

  /**
   * Endpoint para diagnóstico de performance - Busca direta no banco sem interceptors
   * Este endpoint é usado apenas para diagnóstico de problemas de performance
   */
  @Get('busca-rapida')
  @Public() // Pula autenticação e interceptors
  @ApiOperation({
    summary: 'Diagnóstico - Busca rápida de cidadão',
    description: 'Endpoint simplificado para diagnóstico de performance',
  })
  @ApiQuery({
    name: 'cpf',
    required: true,
    type: String,
    description: 'CPF do cidadão (com ou sem formatação)',
  })
  async diagnosticoBuscaRapida(
    @Query('cpf') cpf: string,
    @Res() response: any,
  ): Promise<void> {
    const timeLabel = `DIAG-${cpf?.substr(-4) || 'unknown'}-${Date.now()}`;
    console.time(timeLabel);
    
    try {
      // Consulta direta ao banco sem cache, interceptors ou validação pesada
      const cpfLimpo = cpf ? cpf.replace(/\D/g, '') : '';
      
      // Query simples e direta
      const cidadao = await this.cidadaoRepository
        .createQueryBuilder('c')
        .select([
          'c.id', 'c.nome', 'c.cpf', 'c.nis', 'c.telefone', 
          'c.data_nascimento', 'c.endereco', 'c.created_at', 'c.updated_at'
        ])
        .where('c.cpf = :cpf', { cpf: cpfLimpo })
        .getOne();
      
      // Medir tempo total
      console.timeEnd(timeLabel);
      const elapsedTime = process.hrtime();
      
      return response.status(HttpStatus.OK).json({
        diagnostico: true,
        encontrado: !!cidadao,
        dados: cidadao ? {
          id: cidadao.id,
          nome: cidadao.nome,
          cpf: cidadao.cpf,
        } : null,
        tempoProcessamento: new Date().toISOString(),
        metadados: {
          timestamp: Date.now(),
          query: 'Direto no banco sem validação e sem cache',
          tempoTotal: `${elapsedTime[0]}s ${Math.round(elapsedTime[1] / 1000000)}ms`,
        }
      });
    } catch (error) {
      // Log detalhado do erro
      this.logger.error(`Erro no diagnóstico: ${error.message}`, error.stack);
      console.timeEnd(timeLabel);
      
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        diagnostico: true,
        success: false,
        error: error.message,
        tempoProcessamento: new Date().toISOString(),
      });
    }
  }
}
