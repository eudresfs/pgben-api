import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../entities/user-permission.entity';
import { BeneficioService } from '../../beneficio/services/beneficio.service';
import { UnidadeService } from '../../unidade/services/unidade.service';
import { UsuarioService } from '../../usuario/services/usuario.service';
import { CidadaoService } from '../../cidadao/services/cidadao.service';
import { StatusSolicitacao } from '../../../enums/status-solicitacao.enum';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';

/**
 * Controller para dados de referência do sistema
 * 
 * Fornece endpoints para obter dados de referência utilizados em diversos módulos
 * como tipos de benefício, status, unidades, etc.
 */
@ApiBearerAuth()
@Controller('filtros')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ReferenciaController {
  constructor(
    private readonly beneficioService: BeneficioService,
    private readonly unidadeService: UnidadeService,
    private readonly usuarioService: UsuarioService,
    private readonly cidadaoService: CidadaoService,
  ) {}

  /**
   * Retorna dados de referência do sistema
   * 
   * Inclui tipos de benefício, status de solicitação, unidades, status de pagamento,
   * bairros, usuários e roles.
   */
  @Get()
  @RequiresPermission({
    permissionName: 'sistema.filtros.listar',
    scopeType: ScopeType.GLOBAL
  })
  @ApiOperation({ summary: 'Obter dados de referência do sistema' })
  @ApiResponse({
    status: 200,
    description: 'Dados de referência retornados com sucesso',
  })
  async obterReferencias() {
    // Buscar tipos de benefício
    const tiposBeneficio = await this.beneficioService.findAll({
      limit: 1000,
    });
    
    // Mapear tipos de benefício para o formato desejado
    const tiposBeneficioFormatados = tiposBeneficio.items.map(tipo => ({
      id: tipo.id,
      nome: tipo.nome,
      codigo: tipo.codigo,
    }));

    // Buscar unidades
    const unidades = await this.unidadeService.findAll({
      limit: 1000,
    });

    // Mapear unidades para o formato desejado
    const unidadesFormatadas = unidades.items.map(unidade => ({
      id: unidade.id,
      nome: unidade.nome,
      sigla: unidade.sigla,
    }));

    // Buscar usuários
    const usuarios = await this.usuarioService.findAll({
      limit: 1000,
    });

    // Mapear usuários para o formato desejado
    const usuariosFormatados = usuarios.items.map(usuario => ({
      id: usuario.id,
      nome: usuario.nome,
    }));

    // Buscar roles
    const roles = await this.usuarioService.findAllRoles();

    // Mapear roles para o formato desejado
    const rolesFormatadas = roles ? roles.map(role => ({
      id: role.id,
      nome: role.nome,
    })) : [];

    // Extrair bairros únicos dos cidadãos
    const bairros = await this.cidadaoService.findAllBairros();

    // Mapear status de solicitação
    const statusSolicitacao = Object.entries(StatusSolicitacao).map(([key, value]) => ({
      nome: key,
      valor: value,
    }));

    // Mapear status de pagamento
    const statusPagamento = Object.entries(StatusPagamentoEnum).map(([key, value]) => ({
      nome: key,
      valor: value,
    }));

    return {
      tiposBeneficio: tiposBeneficioFormatados,
      statusSolicitacao,
      unidades: unidadesFormatadas,
      statusPagamento,
      bairros,
      usuarios: usuariosFormatados,
      roles: rolesFormatadas,
    };
  }
}