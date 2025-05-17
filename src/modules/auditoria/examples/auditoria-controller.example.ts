import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/role.decorator';
import { Role } from '../../../shared/enums/role.enum';
import {
  AuditCreate,
  AuditRead,
  AuditUpdate,
  AuditDelete,
  AuditSensitiveAccess,
} from '../decorators/audit.decorator';

/**
 * Exemplo de uso dos decoradores de auditoria em um controlador
 *
 * Este arquivo serve como referência para implementação dos decoradores
 * de auditoria em outros controladores do sistema.
 */
@ApiTags('exemplo-auditoria')
@Controller('exemplo-auditoria')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ExemploAuditoriaController {
  /**
   * Exemplo de uso do decorador AuditCreate
   *
   * Registra automaticamente a operação de criação no sistema de auditoria.
   */
  @Post()
  @Roles(Role.ADMIN)
  @AuditCreate('ExemploEntidade', 'Criação de exemplo de entidade')
  @ApiOperation({ summary: 'Cria um novo exemplo' })
  @ApiResponse({ status: 201, description: 'Exemplo criado com sucesso' })
  async criar(@Body() createDto: any, @Request() req) {
    // Implementação do método...
    return { id: 'uuid-exemplo', ...createDto };
  }

  /**
   * Exemplo de uso do decorador AuditRead
   *
   * Registra automaticamente a operação de leitura no sistema de auditoria.
   */
  @Get()
  @Roles(Role.ADMIN)
  @AuditRead('ExemploEntidade', 'Listagem de exemplos')
  @ApiOperation({ summary: 'Lista todos os exemplos' })
  @ApiResponse({ status: 200, description: 'Lista de exemplos' })
  async listar(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Request() req,
  ) {
    // Implementação do método...
    return {
      items: [
        { id: 'uuid-exemplo-1', nome: 'Exemplo 1' },
        { id: 'uuid-exemplo-2', nome: 'Exemplo 2' },
      ],
      total: 2,
      page,
      limit,
    };
  }

  /**
   * Exemplo de uso do decorador AuditRead para um item específico
   *
   * Registra automaticamente a operação de leitura no sistema de auditoria.
   */
  @Get(':id')
  @Roles(Role.ADMIN)
  @AuditRead('ExemploEntidade', 'Consulta de exemplo específico')
  @ApiOperation({ summary: 'Busca um exemplo pelo ID' })
  @ApiResponse({ status: 200, description: 'Exemplo encontrado' })
  @ApiResponse({ status: 404, description: 'Exemplo não encontrado' })
  async buscarPorId(@Param('id') id: string, @Request() req) {
    // Implementação do método...
    return { id, nome: 'Exemplo', descricao: 'Descrição do exemplo' };
  }

  /**
   * Exemplo de uso do decorador AuditUpdate
   *
   * Registra automaticamente a operação de atualização no sistema de auditoria.
   */
  @Put(':id')
  @Roles(Role.ADMIN)
  @AuditUpdate('ExemploEntidade', 'Atualização de exemplo')
  @ApiOperation({ summary: 'Atualiza um exemplo' })
  @ApiResponse({ status: 200, description: 'Exemplo atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Exemplo não encontrado' })
  async atualizar(
    @Param('id') id: string,
    @Body() updateDto: any,
    @Request() req,
  ) {
    // Implementação do método...
    return { id, ...updateDto };
  }

  /**
   * Exemplo de uso do decorador AuditDelete
   *
   * Registra automaticamente a operação de exclusão no sistema de auditoria.
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @AuditDelete('ExemploEntidade', 'Exclusão de exemplo')
  @ApiOperation({ summary: 'Remove um exemplo' })
  @ApiResponse({ status: 200, description: 'Exemplo removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Exemplo não encontrado' })
  async remover(@Param('id') id: string, @Request() req) {
    // Implementação do método...
    return { message: `Exemplo ${id} removido com sucesso` };
  }

  /**
   * Exemplo de uso do decorador AuditSensitiveAccess
   *
   * Registra automaticamente o acesso a dados sensíveis no sistema de auditoria.
   * Importante para compliance com LGPD.
   */
  @Get(':id/dados-sensiveis')
  @Roles(Role.ADMIN)
  @AuditSensitiveAccess(
    'ExemploEntidade',
    'Acesso a dados sensíveis do exemplo',
  )
  @ApiOperation({ summary: 'Acessa dados sensíveis de um exemplo' })
  @ApiResponse({ status: 200, description: 'Dados sensíveis do exemplo' })
  @ApiResponse({ status: 404, description: 'Exemplo não encontrado' })
  async acessarDadosSensiveis(@Param('id') id: string, @Request() req) {
    // Implementação do método...
    return {
      id,
      nome: 'Exemplo',
      cpf: '123.456.789-00',
      rg: '12.345.678-9',
      data_nascimento: '1990-01-01',
      endereco: 'Rua Exemplo, 123',
      telefone: '(11) 98765-4321',
      renda_familiar: 5000.0,
    };
  }
}
