import { Controller, Get, Query, HttpStatus, Res, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cidadao } from '../cidadao/entities/cidadao.entity';
import { Public } from './public.decorator';

/**
 * Controlador para diagnóstico de performance
 * 
 * Este controlador não utiliza interceptors, validações ou cache
 * para permitir diagnóstico direto da performance do banco de dados
 * 
 * @author Cascade
 */
@ApiTags('Diagnóstico')
@Controller('diagnostico')
export class DiagnosticoController {
  private readonly logger = new Logger(DiagnosticoController.name);

  constructor(
    @InjectRepository(Cidadao)
    private readonly cidadaoRepository: Repository<Cidadao>,
  ) {}

  /**
   * Endpoint para diagnóstico de cidadão por CPF
   * 
   * Acessa diretamente o banco de dados sem overhead adicional
   * para diagnóstico de performance em busca de cidadãos
   * 
   * @param cpf CPF do cidadão (com ou sem formatação)
   * @param response Objeto de resposta Express
   */
  @Get('cidadao/cpf')
  @Public()
  @ApiOperation({
    summary: 'Diagnóstico - Busca direta de cidadão por CPF',
    description: 'Endpoint direto sem interceptors ou cache',
  })
  @ApiQuery({
    name: 'cpf',
    required: true,
    type: String,
    description: 'CPF do cidadão (com ou sem formatação)',
  })
  async diagnosticoBuscaPorCpf(
    @Query('cpf') cpf: string,
    @Res() response: any,
  ): Promise<void> {
    const timeLabel = `DIAG-CPF-${cpf?.substr(-4) || 'unknown'}-${Date.now()}`;
    console.time(timeLabel);
    
    try {
      // Limpeza básica do CPF sem validação pesada
      const cpfLimpo = cpf ? cpf.replace(/\D/g, '') : '';
      
      // Consulta direta e otimizada ao banco
      console.time(`${timeLabel}-QUERY`);
      const cidadao = await this.cidadaoRepository
        .createQueryBuilder('c')
        .select([
          'c.id', 'c.nome', 'c.cpf', 'c.nis', 'c.telefone', 
          'c.data_nascimento', 'c.endereco', 'c.created_at', 'c.updated_at'
        ])
        .where('c.cpf = :cpf', { cpf: cpfLimpo })
        .getOne();
      console.timeEnd(`${timeLabel}-QUERY`);
      
      // Medir tempo total
      console.timeEnd(timeLabel);
      const endTime = Date.now();
      const startTime = Number(timeLabel.split('-').pop());
      const elapsedMs = endTime - startTime;
      
      return response.status(HttpStatus.OK).json({
        diagnostico: true,
        encontrado: !!cidadao,
        dados: cidadao ? {
          id: cidadao.id,
          nome: cidadao.nome,
          cpf: cidadao.cpf,
          nis: cidadao.nis,
        } : null,
        performance: {
          timestamp: new Date().toISOString(),
          consulta: 'Direto no banco sem validação e sem cache',
          tempoMs: elapsedMs,
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
        timestamp: new Date().toISOString(),
      });
    }
  }
}
