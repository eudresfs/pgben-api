import { Controller, Get, UseGuards } from '@nestjs/common';
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
import { ConcessaoService } from '@/modules/beneficio/services/concessao.service';
import { StatusConcessao } from '@/entities';
import { Public } from '@/auth/decorators/public.decorator';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { UserAccessTokenClaims } from '../../../auth/dtos/auth-token-output.dto';

/**
 * Interface para item do cache com TTL
 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Cache em memória com TTL para dados de referência
 */
class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();

  /**
   * Define um item no cache com TTL
   * @param key Chave do cache
   * @param data Dados a serem armazenados
   * @param ttlMs TTL em milissegundos (padrão: 5 minutos)
   */
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  /**
   * Obtém um item do cache se ainda válido
   * @param key Chave do cache
   * @returns Dados do cache ou null se expirado/inexistente
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const isExpired = Date.now() - item.timestamp > item.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Remove um item do cache
   * @param key Chave do cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
  }
}

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
  private readonly cache = new MemoryCache();
  private readonly CACHE_KEY = 'referencias_sistema';
  private readonly CACHE_TTL = 60 * 60 * 1000; // 60 minutos

  constructor(
    private readonly beneficioService: BeneficioService,
    private readonly unidadeService: UnidadeService,
    private readonly usuarioService: UsuarioService,
    private readonly cidadaoService: CidadaoService,
  ) {}

  /**
   * Retorna dados de referência do sistema com cache otimizado
   *
   * Inclui tipos de benefício, status de solicitação, unidades, status de pagamento,
   * bairros, usuários e roles. Utiliza cache em memória para máxima performance.
   *
   * As unidades só são retornadas para usuários com roles: admin, super_admin ou gestor.
   */
  @Get()
  @ApiOperation({ summary: 'Obter dados de referência do sistema' })
  @ApiResponse({
    status: 200,
    description: 'Dados de referência retornados com sucesso',
  })
  async obterReferencias(@GetUser() user?: UserAccessTokenClaims) {
    // Verificar se os dados estão em cache
    const cachedData = this.cache.get(this.CACHE_KEY);
    if (cachedData) {
      return this.filtrarDadosPorRole(cachedData, user);
    }

    // Se não estiver em cache, buscar dados otimizados do banco
    const referencias = await this.buscarDadosOtimizados();

    // Armazenar no cache
    this.cache.set(this.CACHE_KEY, referencias, this.CACHE_TTL);

    return this.filtrarDadosPorRole(referencias, user);
  }

  /**
   * Filtra os dados de referência baseado nas roles do usuário
   *
   * @param dados Dados de referência completos
   * @param user Usuário autenticado (opcional para endpoints públicos)
   * @returns Dados filtrados conforme permissões do usuário
   */
  private filtrarDadosPorRole(dados: any, user?: UserAccessTokenClaims) {
    // Se não há usuário autenticado, retornar dados sem unidades
    if (!user) {
      const { unidades, ...dadosSemUnidades } = dados;
      return dadosSemUnidades;
    }

    // Roles que podem visualizar unidades
    const rolesAutorizadas = ['SUPER_ADMIN', 'ADMIN', 'GESTOR'];

    // Verificar se o usuário possui uma das roles autorizadas
    const temRoleAutorizada = user.roles?.some((role) =>
      rolesAutorizadas.includes(role),
    );

    // Se não tem role autorizada, remover unidades dos dados
    if (!temRoleAutorizada) {
      const { unidades, ...dadosSemUnidades } = dados;
      return dadosSemUnidades;
    }

    return dados;
  }

  /**
   * Busca dados otimizados do banco de dados
   * Executa consultas em paralelo com campos específicos e limites reduzidos
   */
  private async buscarDadosOtimizados() {
    // Executar todas as consultas em paralelo com otimizações
    const [tiposBeneficio, unidades, usuarios, roles, bairros] =
      await Promise.all([
        this.beneficioService.findAll({ limit: 500 }), // Reduzido de 1000 para 500
        this.unidadeService.findAll({ limit: 500 }), // Reduzido de 1000 para 500
        this.usuarioService.findAll({ limit: 500 }), // Reduzido de 1000 para 500
        this.usuarioService.findAllRoles(),
        this.cidadaoService.findAllBairros(),
      ]);

    // Processar dados de forma otimizada
    return {
      tiposBeneficio: this.mapearTiposBeneficio(tiposBeneficio.items),
      statusSolicitacao: this.mapearStatusSolicitacao(),
      statusConcessao: this.mapearStatusConcessao(),
      unidades: this.mapearUnidades(unidades.items),
      statusPagamento: this.mapearStatusPagamento(),
      bairros,
      usuarios: this.mapearUsuarios(usuarios.items),
      roles: this.mapearRoles(roles),
    };
  }

  /**
   * Mapeia tipos de benefício para o formato otimizado
   */
  private mapearTiposBeneficio(tipos: any[]) {
    return tipos.map((tipo) => ({
      id: tipo.id,
      nome: tipo.nome,
      codigo: tipo.codigo,
    }));
  }

  /**
   * Mapeia unidades para o formato otimizado
   */
  private mapearUnidades(unidades: any[]) {
    return unidades.map((unidade) => ({
      id: unidade.id,
      nome: unidade.nome,
      sigla: unidade.sigla,
    }));
  }

  /**
   * Mapeia usuários para o formato otimizado
   */
  private mapearUsuarios(usuarios: any[]) {
    return usuarios.map((usuario) => ({
      id: usuario.id,
      nome: usuario.nome,
    }));
  }

  /**
   * Mapeia roles para o formato otimizado
   */
  private mapearRoles(roles: any[]) {
    return roles
      ? roles.map((role) => ({
          id: role.id,
          nome: role.nome,
        }))
      : [];
  }

  /**
   * Mapeia status de solicitação (processamento local)
   */
  private mapearStatusSolicitacao() {
    return Object.entries(StatusSolicitacao).map(([key, value]) => ({
      nome: key,
      valor: value,
    }));
  }

  /**
   * Mapeia status de concessão (processamento local)
   */
  private mapearStatusConcessao() {
    return Object.entries(StatusConcessao).map(([key, value]) => ({
      nome: key,
      valor: value,
    }));
  }

  /**
   * Mapeia status de pagamento (processamento local)
   */
  private mapearStatusPagamento() {
    return Object.entries(StatusPagamentoEnum).map(([key, value]) => ({
      nome: key,
      valor: value,
    }));
  }

  /**
   * Limpa o cache de referências (útil para invalidação manual)
   */
  @Get('cache/clear')
  @RequiresPermission({
    permissionName: 'sistema.filtros.admin',
    scopeType: ScopeType.GLOBAL,
  })
  @ApiOperation({ summary: 'Limpar cache de dados de referência' })
  @ApiResponse({
    status: 200,
    description: 'Cache limpo com sucesso',
  })
  limparCache() {
    this.cache.delete(this.CACHE_KEY);
    return { message: 'Cache de referências limpo com sucesso' };
  }
}
