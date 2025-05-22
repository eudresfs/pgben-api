import { Controller, Get, Logger, Res, HttpStatus, Req } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { Response, Request } from 'express';
import { ApiTags } from '@nestjs/swagger';

/**
 * Controller de diagnóstico para testes de roteamento
 * Usado para isolar problemas de roteamento na aplicação
 */
@ApiTags('Diagnóstico')
@Controller('/debug')
export class DebugController {
  private readonly logger = new Logger(DebugController.name);

  /**
   * Rota de teste básica
   * @returns Mensagem simples para confirmar funcionamento
   */
  @Get()
  @Public()
  test(): { status: string; message: string; timestamp: string } {
    this.logger.debug('✅ Método test() do DebugController foi chamado');
    return {
      status: 'ok',
      message: 'Controller de diagnóstico está funcionando!',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Rota de teste sem prefixo
   * @returns Mensagem simples para confirmar funcionamento
   */
  @Get('no-prefix')
  @Public()
  testNoPrefix(): { status: string; message: string } {
    this.logger.debug('✅ Método testNoPrefix() do DebugController foi chamado');
    return {
      status: 'ok',
      message: 'Teste sem prefixo está funcionando!',
    };
  }

  /**
   * Rota para verificar o pipeline de requisição
   * @returns Informações sobre o pipeline
   */
  @Get('pipeline')
  @Public()
  testPipeline(): { status: string; info: any } {
    this.logger.debug('✅ Método testPipeline() do DebugController foi chamado');
    return {
      status: 'ok',
      info: {
        controller: 'DebugController',
        method: 'testPipeline',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
      },
    };
  }
  
  /**
   * Rota que usa express diretamente para responder
   */
  @Get('express')
  @Public()
  testExpress(@Res() res: Response) {
    this.logger.debug('✅ Método testExpress() do DebugController foi chamado');
    console.log('🔥 DEBUG: testExpress() chamado, respondendo diretamente');
    return res.status(HttpStatus.OK).json({
      status: 'ok',
      message: 'Resposta via Express diretamente',
      timestamp: new Date().toISOString(),
    });
  }
  
  /**
   * Rota que usa res.end() para responder
   */
  @Get('manual')
  @Public()
  testManual(@Res() res: Response) {
    this.logger.debug('✅ Método testManual() do DebugController foi chamado');
    console.log('🔥 DEBUG: testManual() chamado, respondendo com res.end()');
    // Resposta manual
    res.status(200);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      status: 'ok',
      message: 'Resposta manual usando res.end()',
      timestamp: new Date().toISOString(),
    }));
  }
  
  /**
   * Rota que mostra headers da requisição
   */
  @Get('headers')
  @Public()
  testHeaders(@Req() req: Request) {
    this.logger.debug('✅ Método testHeaders() do DebugController foi chamado');
    console.log('🔥 DEBUG: testHeaders() chamado, analisando headers');
    return {
      status: 'ok',
      headers: req.headers,
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
    };
  }
}
