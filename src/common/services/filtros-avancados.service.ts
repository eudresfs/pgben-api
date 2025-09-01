import { Injectable, BadRequestException } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { PeriodoPredefinido, isPeriodoPersonalizado } from '../../enums/periodo-predefinido.enum';
import { Prioridade } from '../../enums/prioridade.enum';
import { 
  IFiltrosAvancados, 
  IPeriodoCalculado, 
  IValidacaoPeriodo,
  IResultadoFiltros
} from '../interfaces/filtros-avancados.interface';
import { FiltrosAvancadosCacheService, CacheStats, CacheInfo } from '../cache/filtros-avancados-cache.service';

/**
 * Serviço centralizado para aplicação de filtros avançados
 * 
 * Implementa o padrão DRY fornecendo métodos reutilizáveis para:
 * - Aplicação de filtros em queries TypeORM
 * - Cálculo de períodos predefinidos
 * - Validação de filtros
 * - Construção de queries complexas
 * 
 * Segue os princípios SOLID e garante consistência entre todos os endpoints
 */
@Injectable()
export class FiltrosAvancadosService {

  constructor(
    private readonly cacheService: FiltrosAvancadosCacheService,
  ) {}
  
  /**
   * Aplica filtros avançados a uma query TypeORM com paginação e cache inteligente
   * 
   * @param query - Query builder do TypeORM
   * @param filtros - Filtros a serem aplicados
   * @param alias - Alias da entidade principal na query
   * @param configuracao - Configuração específica dos filtros
   * @returns Query builder com filtros aplicados
   */
  aplicarFiltros<T>(
    query: SelectQueryBuilder<T>,
    filtros: IFiltrosAvancados,
    alias: string = 'entity',
    configuracao?: {
      campoData?: string;
      campoUnidade?: string;
      campoBairro?: string;
      campoUsuario?: string;
      campoStatus?: string;
      campoBeneficio?: string;
      campoRole?: string;
      campoPrioridade?: string;
      joins?: Array<{ relation: string; alias: string; condition?: string }>;
    }
  ): SelectQueryBuilder<T> {
    
    // Aplicar joins se especificados
    if (configuracao?.joins) {
      configuracao.joins.forEach(join => {
        if (join.condition) {
          query.leftJoin(join.relation, join.alias, join.condition);
        } else {
          query.leftJoin(join.relation, join.alias);
        }
      });
    }
    
    // Aplicar filtros de array
    this.aplicarFiltrosArray(query, filtros, alias, configuracao);
    
    // Aplicar filtros de período
    this.aplicarFiltrosPeriodo(query, filtros, alias, configuracao?.campoData);
    
    // Aplicar filtro de prioridade
    if (filtros.prioridade && configuracao?.campoPrioridade) {
      query.andWhere(`${alias}.${configuracao.campoPrioridade} = :prioridade`, {
        prioridade: filtros.prioridade
      });
    }
    
    // Aplicar filtro de arquivados
    if (!filtros.incluir_arquivados) {
      // Assumindo que existe um campo 'ativo' ou 'deletedAt'
      query.andWhere(`${alias}.ativo = :ativo`, { ativo: true });
    }
    
    // Aplicar paginação
    if (filtros.limit) {
      query.take(filtros.limit);
    }
    
    if (filtros.offset) {
      query.skip(filtros.offset);
    }
    
    return query;
  }
  
  /**
   * Aplica filtros de array (IN clauses)
   */
  private aplicarFiltrosArray<T>(
    query: SelectQueryBuilder<T>,
    filtros: IFiltrosAvancados,
    alias: string,
    configuracao?: any
  ): void {
    
    // Filtro de unidades
    if (filtros.unidades?.length && configuracao?.campoUnidade) {
      query.andWhere(`${alias}.${configuracao.campoUnidade} IN (:...unidades)`, {
        unidades: filtros.unidades
      });
    }
    
    // Filtro de bairros
    if (filtros.bairros?.length && configuracao?.campoBairro) {
      query.andWhere(`${alias}.${configuracao.campoBairro} ILIKE ANY(:bairros)`, {
        bairros: filtros.bairros.map(b => `%${b}%`)
      });
    }
    
    // Filtro de usuários
    if (filtros.usuarios?.length && configuracao?.campoUsuario) {
      query.andWhere(`${alias}.${configuracao.campoUsuario} IN (:...usuarios)`, {
        usuarios: filtros.usuarios
      });
    }
    
    // Filtro de status
    if (filtros.status?.length && configuracao?.campoStatus) {
      query.andWhere(`${alias}.${configuracao.campoStatus} IN (:...status)`, {
        status: filtros.status
      });
    }
    
    // Filtro de benefícios
    if (filtros.beneficios?.length && configuracao?.campoBeneficio) {
      query.andWhere(`${alias}.${configuracao.campoBeneficio} IN (:...beneficios)`, {
        beneficios: filtros.beneficios
      });
    }
    
    // Filtro de roles
    if (filtros.roles?.length && configuracao?.campoRole) {
      query.andWhere(`${alias}.${configuracao.campoRole} IN (:...roles)`, {
        roles: filtros.roles
      });
    }
  }
  
  /**
   * Aplica filtros de período (datas)
   */
  private aplicarFiltrosPeriodo<T>(
    query: SelectQueryBuilder<T>,
    filtros: IFiltrosAvancados,
    alias: string,
    campoData: string = 'createdAt'
  ): void {
    
    let dataInicio: Date | undefined;
    let dataFim: Date | undefined;
    
    // Se tem período predefinido, calcular as datas
    if (filtros.periodo && filtros.periodo !== PeriodoPredefinido.PERSONALIZADO) {
      const periodoCalculado = this.calcularPeriodo(filtros.periodo);
      dataInicio = periodoCalculado.dataInicio;
      dataFim = periodoCalculado.dataFim;
    }
    // Se é período personalizado, usar as datas fornecidas
    else if (filtros.periodo === PeriodoPredefinido.PERSONALIZADO) {
      if (filtros.data_inicio) {
        dataInicio = new Date(filtros.data_inicio);
      }
      if (filtros.data_fim) {
        dataFim = new Date(filtros.data_fim);
      }
    }
    // Se não tem período mas tem datas diretas
    else {
      if (filtros.data_inicio) {
        dataInicio = new Date(filtros.data_inicio);
      }
      if (filtros.data_fim) {
        dataFim = new Date(filtros.data_fim);
      }
    }
    
    // Aplicar filtros de data
    if (dataInicio) {
      query.andWhere(`${alias}.${campoData} >= :dataInicio`, { dataInicio });
    }
    
    if (dataFim) {
      query.andWhere(`${alias}.${campoData} <= :dataFim`, { dataFim });
    }
  }
  
  /**
   * Calcula período baseado em enum predefinido
   */
  calcularPeriodo(
    periodo: PeriodoPredefinido,
    timezone: string = 'America/Sao_Paulo'
  ): IPeriodoCalculado {
    const resultado = this.calcularPeriodoPredefinido(periodo);
    return {
      dataInicio: resultado.dataInicio,
      dataFim: resultado.dataFim,
      descricao: this.obterDescricaoPeriodo(periodo),
      timezone
    };
  }

  /**
   * Calcula período predefinido (formato simplificado para compatibilidade)
   * Retorna apenas dataInicio e dataFim para manter compatibilidade com serviços existentes
   */
  calcularPeriodoPredefinido(periodo: PeriodoPredefinido): { dataInicio: Date; dataFim: Date } {
    
    const agora = new Date();
    let dataInicio: Date;
    let dataFim: Date;
    
    switch (periodo) {
      case PeriodoPredefinido.HOJE:
        dataInicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        dataFim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59, 999);
        break;
        
      case PeriodoPredefinido.ONTEM:
        const ontem = new Date(agora);
        ontem.setDate(ontem.getDate() - 1);
        dataInicio = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate());
        dataFim = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate(), 23, 59, 59, 999);
        break;
        
      case PeriodoPredefinido.ULTIMOS_7_DIAS:
        dataInicio = new Date(agora);
        dataInicio.setDate(dataInicio.getDate() - 6);
        dataInicio.setHours(0, 0, 0, 0);
        dataFim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59, 999);
        break;
        
      case PeriodoPredefinido.ULTIMOS_30_DIAS:
        dataInicio = new Date(agora);
        dataInicio.setDate(dataInicio.getDate() - 29);
        dataInicio.setHours(0, 0, 0, 0);
        dataFim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59, 999);
        break;
        
      case PeriodoPredefinido.ULTIMOS_90_DIAS:
        dataInicio = new Date(agora);
        dataInicio.setDate(dataInicio.getDate() - 89);
        dataInicio.setHours(0, 0, 0, 0);
        dataFim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59, 999);
        break;
        
      case PeriodoPredefinido.MES_ATUAL:
        dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
        dataFim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59, 999);
        break;
        
      case PeriodoPredefinido.MES_ANTERIOR:
        const mesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
        dataInicio = mesAnterior;
        dataFim = new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59, 999);
        break;
        
      case PeriodoPredefinido.ANO_ATUAL:
        dataInicio = new Date(agora.getFullYear(), 0, 1);
        dataFim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59, 999);
        break;
        
      case PeriodoPredefinido.ANO_ANTERIOR:
        dataInicio = new Date(agora.getFullYear() - 1, 0, 1);
        dataFim = new Date(agora.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        break;
        
      default:
        throw new BadRequestException(`Período não suportado: ${periodo}`);
    }
    
    return { dataInicio, dataFim };
  }

  /**
   * Obtém descrição do período predefinido
   */
  private obterDescricaoPeriodo(periodo: PeriodoPredefinido): string {
    switch (periodo) {
      case PeriodoPredefinido.HOJE:
        return 'Hoje';
      case PeriodoPredefinido.ONTEM:
        return 'Ontem';
      case PeriodoPredefinido.ULTIMOS_7_DIAS:
        return 'Últimos 7 dias';
      case PeriodoPredefinido.ULTIMOS_30_DIAS:
        return 'Últimos 30 dias';
      case PeriodoPredefinido.ULTIMOS_90_DIAS:
        return 'Últimos 90 dias';
      case PeriodoPredefinido.MES_ATUAL:
        return 'Mês atual';
      case PeriodoPredefinido.MES_ANTERIOR:
        return 'Mês anterior';
      case PeriodoPredefinido.ANO_ATUAL:
        return 'Ano atual';
      case PeriodoPredefinido.ANO_ANTERIOR:
        return 'Ano anterior';
      default:
        return 'Período personalizado';
    }
  }
  
  /**
   * Valida período personalizado
   */
  validarPeriodoPersonalizado(
    dataInicio?: string,
    dataFim?: string
  ): IValidacaoPeriodo {
    
    const resultado: IValidacaoPeriodo = {
      valido: true,
      detalhes: {}
    };
    
    // Validar data de início
    if (dataInicio) {
      const inicio = new Date(dataInicio);
      resultado.detalhes.dataInicioValida = !isNaN(inicio.getTime());
      if (!resultado.detalhes.dataInicioValida) {
        resultado.valido = false;
        resultado.erro = 'Data de início inválida';
        return resultado;
      }
    }
    
    // Validar data de fim
    if (dataFim) {
      const fim = new Date(dataFim);
      resultado.detalhes.dataFimValida = !isNaN(fim.getTime());
      if (!resultado.detalhes.dataFimValida) {
        resultado.valido = false;
        resultado.erro = 'Data de fim inválida';
        return resultado;
      }
    }
    
    // Validar intervalo
    if (dataInicio && dataFim) {
      const inicio = new Date(dataInicio);
      const fim = new Date(dataFim);
      resultado.detalhes.intervaloValido = inicio <= fim;
      
      if (!resultado.detalhes.intervaloValido) {
        resultado.valido = false;
        resultado.erro = 'Data de início deve ser anterior ou igual à data de fim';
        return resultado;
      }
      
      // Validar limite de 2 anos
      const diffMs = fim.getTime() - inicio.getTime();
      const diffDias = diffMs / (1000 * 60 * 60 * 24);
      resultado.detalhes.dentroLimites = diffDias <= 730; // 2 anos
      
      if (!resultado.detalhes.dentroLimites) {
        resultado.valido = false;
        resultado.erro = 'Período não pode exceder 2 anos';
        return resultado;
      }
    }
    
    return resultado;
  }
  
  /**
   * Constrói resultado padronizado com metadados
   */
  construirResultado<T>(
    dados: T[],
    total: number,
    filtros: IFiltrosAvancados,
    tempoExecucao?: number
  ): IResultadoFiltros<T> {
    
    const limit = filtros.limit || 1000;
    const offset = filtros.offset || 0;
    const pagina = Math.floor(offset / limit) + 1;
    const totalPaginas = Math.ceil(total / limit);
    
    return {
      items: dados,
      total,
      filtros_aplicados: filtros,
      meta: {
        limit,
        offset,
        page: pagina,
        pages: totalPaginas,
        hasNext: pagina < totalPaginas,
        hasPrev: pagina > 1
      },
      tempo_execucao: tempoExecucao
    };
  }
  
  /**
   * Aplica filtros de data específicos
   * 
   * @param query - Query builder do TypeORM
   * @param alias - Alias da entidade principal
   * @param filtros - Objeto com filtros de data
   * @param mapeamento - Mapeamento de campos de data
   */
  aplicarFiltrosData<T>(
    query: SelectQueryBuilder<T>,
    alias: string,
    filtros: any,
    mapeamento: Record<string, string>
  ): void {
    // Aplicar filtros de created_at
    if (filtros.created_at_inicio && mapeamento.created_at) {
      query.andWhere(`${alias}.${mapeamento.created_at} >= :created_at_inicio`, {
        created_at_inicio: filtros.created_at_inicio
      });
    }
    
    if (filtros.created_at_fim && mapeamento.created_at) {
      query.andWhere(`${alias}.${mapeamento.created_at} <= :created_at_fim`, {
        created_at_fim: filtros.created_at_fim
      });
    }
    
    // Aplicar filtros de updated_at
    if (filtros.updated_at_inicio && mapeamento.updated_at) {
      query.andWhere(`${alias}.${mapeamento.updated_at} >= :updated_at_inicio`, {
        updated_at_inicio: filtros.updated_at_inicio
      });
    }
    
    if (filtros.updated_at_fim && mapeamento.updated_at) {
      query.andWhere(`${alias}.${mapeamento.updated_at} <= :updated_at_fim`, {
        updated_at_fim: filtros.updated_at_fim
      });
    }
    
    // Aplicar outros filtros de data dinamicamente
    Object.keys(mapeamento).forEach(filtroKey => {
      const campoDb = mapeamento[filtroKey];
      const inicioKey = `${filtroKey}_inicio`;
      const fimKey = `${filtroKey}_fim`;
      
      if (filtros[inicioKey]) {
        query.andWhere(`${alias}.${campoDb} >= :${inicioKey}`, {
          [inicioKey]: filtros[inicioKey]
        });
      }
      
      if (filtros[fimKey]) {
        query.andWhere(`${alias}.${campoDb} <= :${fimKey}`, {
          [fimKey]: filtros[fimKey]
        });
      }
    });
  }
  
  /**
   * Aplica paginação e executa a query com cache otimizado
   * 
   * @param query - Query builder do TypeORM
   * @param filtros - Filtros com parâmetros de paginação
   * @param entity - Nome da entidade para cache
   * @returns Resultado paginado
   */
  async aplicarPaginacao<T>(
    query: SelectQueryBuilder<T>,
    filtros: { limit?: number; offset?: number },
    entity?: string
  ): Promise<{ items: T[]; total: number }> {
    // Aplicar paginação
    const limit = filtros.limit || 1000;
    const offset = filtros.offset || 0;
    
    // Contar total com cache se entidade fornecida
    let total: number;
    if (entity && this.shouldUseCache(filtros)) {
      total = await this.contarComCache(
        entity,
        { ...filtros, limit: undefined, offset: undefined }, // Remover paginação para cache de contagem
        () => query.getCount(),
      );
    } else {
      total = await query.getCount();
    }
    
    // Aplicar limit e offset
    query.take(limit).skip(offset);
    
    // Obter resultados com cache se entidade fornecida
    let items: T[];
    if (entity && this.shouldUseCache(filtros)) {
      items = await this.executarComCache(
        entity,
        filtros,
        () => query.getMany(),
      );
    } else {
      items = await query.getMany();
    }
    
    return { items, total };
  }

  /**
   * Executa consulta com cache inteligente
   * @param entity - Nome da entidade
   * @param filtros - Filtros aplicados
   * @param queryFn - Função que executa a query
   * @param options - Opções de cache
   * @returns Resultado da consulta
   */
  async executarComCache<T>(
    entity: string,
    filtros: any,
    queryFn: () => Promise<T>,
    options?: { ttl?: number; skipCache?: boolean },
  ): Promise<T> {
    // Verificar se deve usar cache
    if (options?.skipCache || !this.shouldUseCache(filtros)) {
      return queryFn();
    }

    return this.cacheService.cacheQueryResult(
      entity,
      filtros,
      queryFn,
      { ttl: options?.ttl },
    );
  }

  /**
   * Executa contagem com cache
   * @param entity - Nome da entidade
   * @param filtros - Filtros aplicados
   * @param countFn - Função que executa a contagem
   * @returns Número de registros
   */
  async contarComCache(
    entity: string,
    filtros: any,
    countFn: () => Promise<number>,
  ): Promise<number> {
    if (!this.shouldUseCache(filtros)) {
      return countFn();
    }

    return this.cacheService.cacheCount(entity, filtros, countFn);
  }

  /**
   * Invalida cache de uma entidade
   * @param entity - Nome da entidade
   * @param id - ID específico (opcional)
   */
  async invalidarCache(entity: string, id?: string | number): Promise<void> {
    await this.cacheService.invalidateEntity(entity, id);
  }
  
  /**
   * Normaliza filtros removendo valores vazios
   */
  normalizarFiltros(filtros: Partial<IFiltrosAvancados>): IFiltrosAvancados {
    const normalizado: IFiltrosAvancados = {};
    
    // Normalizar arrays
    if (filtros.unidades?.length) normalizado.unidades = filtros.unidades;
    if (filtros.bairros?.length) normalizado.bairros = filtros.bairros;
    if (filtros.usuarios?.length) normalizado.usuarios = filtros.usuarios;
    if (filtros.status?.length) normalizado.status = filtros.status;
    if (filtros.beneficios?.length) normalizado.beneficios = filtros.beneficios;
    if (filtros.roles?.length) normalizado.roles = filtros.roles;
    
    // Normalizar valores individuais
    if (filtros.periodo) normalizado.periodo = filtros.periodo;
    if (filtros.data_inicio) normalizado.data_inicio = filtros.data_inicio;
    if (filtros.data_fim) normalizado.data_fim = filtros.data_fim;
    if (filtros.prioridade) normalizado.prioridade = filtros.prioridade;
    
    // Normalizar paginação
    normalizado.limit = filtros.limit || 1000;
    normalizado.offset = filtros.offset || 0;
    normalizado.incluir_arquivados = filtros.incluir_arquivados || false;
    
    return normalizado;
  }

  /**
   * Determina se deve usar cache baseado nos filtros
   * @param filtros - Filtros aplicados
   * @returns true se deve usar cache
   */
  private shouldUseCache(filtros: any): boolean {
    // Não cachear se há filtros muito específicos ou dinâmicos
    if (filtros.busca && filtros.busca.length < 3) {
      return false; // Buscas muito curtas não são cacheadas
    }

    // Não cachear se há muitos filtros complexos
    const complexFilters = [
      filtros.data_inicio,
      filtros.data_fim,
      filtros.valor_minimo,
      filtros.valor_maximo,
    ].filter(Boolean);

    if (complexFilters.length > 2) {
      return false; // Muitos filtros complexos
    }

    // Não cachear páginas muito avançadas
    if (filtros.offset && filtros.offset > 1000) {
      return false;
    }

    return true;
  }

  /**
   * Obtém estatísticas do cache
   */
  getCacheStats() {
    return this.cacheService.getStats();
  }

  /**
   * Obtém informações detalhadas do cache
   */
  getCacheInfo() {
    return this.cacheService.getCacheInfo();
  }
}