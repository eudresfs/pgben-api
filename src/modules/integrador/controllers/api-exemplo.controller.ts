import { Controller, Get, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IntegradorAuthGuard } from '../guards/integrador-auth.guard';
import { Escopos } from '../decorators/escopos.decorator';
import { GetIntegrador } from '../decorators/get-integrador.decorator';
import { Integrador } from '../entities/integrador.entity';

/**
 * Controller de exemplo para demonstrar como proteger endpoints para acesso de integradores.
 * Este controller pode ser usado como referência para implementar outros endpoints protegidos.
 */
@ApiTags('api-exemplo')
@Controller('api/exemplo')
@UseGuards(IntegradorAuthGuard)
@ApiBearerAuth()
export class ApiExemploController {
  
  /**
   * Endpoint de exemplo que requer escopo de leitura básico.
   */
  @Get('dados-basicos')
  @Escopos('read:dados_basicos')
  @ApiOperation({ summary: 'Obtém dados básicos (exemplo)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Dados básicos retornados com sucesso',
    schema: {
      properties: {
        message: { type: 'string' },
        integrador: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        dados: { type: 'object' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Permissão insuficiente' })
  getDadosBasicos(@GetIntegrador() integrador: Integrador) {
    // Usando o decorator @GetIntegrador para obter facilmente os dados do integrador
    return {
      message: 'Dados básicos disponíveis',
      integrador: integrador.nome,
      timestamp: new Date().toISOString(),
      dados: {
        exemplo: 'Estes são dados básicos de exemplo',
        status: 'ativo',
        identificacao: '12345'
      }
    };
  }
  
  /**
   * Endpoint de exemplo que requer escopo de leitura avançado.
   */
  @Get('dados-avancados')
  @Escopos('read:dados_avancados')
  @ApiOperation({ summary: 'Obtém dados avançados (exemplo)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Dados avançados retornados com sucesso',
    schema: {
      properties: {
        message: { type: 'string' },
        integrador: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        dados: { type: 'object' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Permissão insuficiente' })
  getDadosAvancados(@GetIntegrador() integrador: Integrador) {
    return {
      message: 'Dados avançados disponíveis',
      integrador: integrador.nome,
      timestamp: new Date().toISOString(),
      dados: {
        exemplo: 'Estes são dados avançados de exemplo',
        detalhes: {
          tipo: 'detalhado',
          nivel: 'avançado',
          sensibilidade: 'média'
        },
        estatisticas: {
          total: 1250,
          processados: 1100,
          pendentes: 150
        }
      }
    };
  }

  /**
   * Endpoint de exemplo que demonstra como tratar erros.
   */
  @Get('erro-exemplo')
  @Escopos('read:dados_basicos')
  @ApiOperation({ summary: 'Demonstração de tratamento de erro (exemplo)' })
  @ApiResponse({ status: 400, description: 'Exemplo de erro' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Permissão insuficiente' })
  getErroExemplo() {
    // Este é um exemplo de como retornar um erro
    throw new HttpException(
      {
        status: HttpStatus.BAD_REQUEST,
        error: 'Exemplo de erro',
        message: 'Este é um exemplo de como os erros são formatados',
        timestamp: new Date().toISOString(),
        path: '/api/exemplo/erro-exemplo'
      },
      HttpStatus.BAD_REQUEST
    );
  }
}
