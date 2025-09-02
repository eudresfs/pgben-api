import { SelectQueryBuilder } from 'typeorm';
import { MetricasFiltrosAvancadosDto, PeriodoPredefinido, PeriodoCalculador } from '../dto/metricas-filtros-avancados.dto';
import { StatusSolicitacao } from '../../../enums/status-solicitacao.enum';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { Solicitacao, Concessao, Pagamento, Usuario, Cidadao } from '../../../entities';

/**
 * Helper para aplicar filtros avançados nas queries do TypeORM
 * 
 * Centraliza a lógica de aplicação de filtros para garantir consistência
 * entre diferentes métodos de consulta do serviço de métricas
 */
export class FiltrosQueryHelper {
  /**
   * Verifica se já existe um join com a tabela 'solicitacao'
   * Versão simplificada e otimizada para produção
   */
  private static hasJoinWithSolicitacao(query: SelectQueryBuilder<any>): boolean {
    const existingJoins = query.expressionMap.joinAttributes;
    
    return existingJoins.some(join => {
      // Verificações essenciais para detectar joins com solicitacao
      return (
        join.alias?.name === 'solicitacao' ||
        join.alias?.name === 'solicitacao_scope' ||
        join.relationPropertyPath?.includes('.solicitacao') ||
        (typeof join.entityOrProperty === 'string' && join.entityOrProperty.includes('solicitacao')) ||
        join.relation?.propertyName === 'solicitacao'
      );
    });
  }

  /**
   * Encontra o alias de um join existente para uma tabela específica
   * Útil para coordenação entre ScopedRepository e FiltrosQueryHelper
   */
  private static findExistingJoinAlias(
    query: SelectQueryBuilder<any>,
    tableName: string
  ): string | null {
    const existingJoins = query.expressionMap.joinAttributes;
    
    const join = existingJoins.find(join => {
      return (
        join.alias?.name === tableName ||
        join.alias?.name === `${tableName}_scope` ||
        join.relationPropertyPath?.includes(`.${tableName}`) ||
        (typeof join.entityOrProperty === 'string' && join.entityOrProperty.includes(tableName)) ||
        join.relation?.propertyName === tableName
      );
    });
    
    return join?.alias?.name || null;
  }

  /**
   * Aplica filtros de período nas queries
   */
  static aplicarFiltroPeriodo<T>(
    query: SelectQueryBuilder<T>,
    filtros: MetricasFiltrosAvancadosDto,
    campoData: string = 'created_at'
  ): SelectQueryBuilder<T> {
    let dataInicio: Date;
    let dataFim: Date;

    // Se período personalizado foi especificado
    if (filtros.periodo === PeriodoPredefinido.PERSONALIZADO) {
      if (filtros.data_inicio && filtros.data_fim) {
        const validacao = PeriodoCalculador.validarPeriodoPersonalizado(
          filtros.data_inicio,
          filtros.data_fim
        );
        
        if (!validacao.valido) {
          throw new Error(`Período inválido: ${validacao.erro}`);
        }
        
        dataInicio = new Date(filtros.data_inicio);
        dataFim = new Date(filtros.data_fim);
      } else {
        throw new Error('Datas de início e fim são obrigatórias para período personalizado');
      }
    }
    // Se período predefinido foi especificado
    else if (filtros.periodo) {
      const periodoCalculado = PeriodoCalculador.calcularPeriodo(filtros.periodo);
      dataInicio = periodoCalculado.dataInicio;
      dataFim = periodoCalculado.dataFim;
    }
    // Fallback para filtros de data legados
    else if (filtros.dataInicio && filtros.dataFim) {
      dataInicio = new Date(filtros.dataInicio);
      dataFim = new Date(filtros.dataFim);
    }
    // Fallback para filtros de data individuais
    else if (filtros.dataInicio) {
      dataInicio = new Date(filtros.dataInicio);
      dataFim = new Date(); // Até agora
    }
    // Padrão: últimos 30 dias se nenhum período especificado
    else {
      const periodoCalculado = PeriodoCalculador.calcularPeriodo(PeriodoPredefinido.ULTIMOS_30_DIAS);
      dataInicio = periodoCalculado.dataInicio;
      dataFim = periodoCalculado.dataFim;
    }

    return query
      .andWhere(`${campoData} >= :dataInicio`, { dataInicio })
      .andWhere(`${campoData} <= :dataFim`, { dataFim });
  }

  /**
   * Aplica escopo de unidade baseado no usuário logado
   * Este método é usado pelos ScopedRepositories para garantir isolamento de dados
   */
  static aplicarEscopoUnidade<T>(
    query: SelectQueryBuilder<T>,
    usuario: Usuario,
    alias: string = 'entity'
  ): SelectQueryBuilder<T> {
    // Se o usuário não tem unidade definida, não aplica filtro (admin global)
    if (!usuario.unidade_id) {
      return query;
    }

    // Para pagamentos, a unidade deve ser acessada através da solicitação
    if (alias === 'pagamento') {
      // Verifica se já existe join com solicitacao
      const existingJoins = query.expressionMap.joinAttributes;
      if (!existingJoins.some(join => join.alias?.name === 'solicitacao')) {
        query.leftJoin(`${alias}.solicitacao`, 'solicitacao');
      }
      
      return query.andWhere('solicitacao.unidade_id = :unidadeEscopo', {
        unidadeEscopo: usuario.unidade_id
      });
    } else {
      // Para outras entidades, usa o campo unidade_id diretamente
      return query.andWhere(`${alias}.unidade_id = :unidadeEscopo`, {
        unidadeEscopo: usuario.unidade_id
      });
    }
  }

  /**
   * Aplica filtros de unidade nas queries (método original para filtros manuais)
   */
  static aplicarFiltroUnidade<T>(
    query: SelectQueryBuilder<T>,
    filtros: MetricasFiltrosAvancadosDto,
    alias: string = 'entity'
  ): SelectQueryBuilder<T> {
    // Para pagamentos, a unidade deve ser acessada através da solicitação
    if (alias === 'pagamento') {
      // Verifica se já existe join com solicitacao
      const existingJoins = query.expressionMap.joinAttributes;
      if (!existingJoins.some(join => join.alias?.name === 'solicitacao')) {
        query.leftJoin(`${alias}.solicitacao`, 'solicitacao');
      }
      
      // Prioriza filtros múltiplos
      if (filtros.unidades && filtros.unidades.length > 0) {
        return query.andWhere('solicitacao.unidade_id IN (:...unidades)', {
          unidades: filtros.unidades
        });
      }
      // Fallback para filtro único
      else if (filtros.unidade) {
        return query.andWhere('solicitacao.unidade_id = :unidade', {
          unidade: filtros.unidade
        });
      }
    } else {
      // Para outras entidades, usa o campo unidade_id diretamente
      // Prioriza filtros múltiplos
      if (filtros.unidades && filtros.unidades.length > 0) {
        return query.andWhere(`${alias}.unidade_id IN (:...unidades)`, {
          unidades: filtros.unidades
        });
      }
      // Fallback para filtro único
      else if (filtros.unidade) {
        return query.andWhere(`${alias}.unidade_id = :unidade`, {
          unidade: filtros.unidade
        });
      }
    }
    
    return query;
  }

  /**
   * Aplica filtros de benefício nas queries
   */
  static aplicarFiltroBeneficio<T>(
    query: SelectQueryBuilder<T>,
    filtros: MetricasFiltrosAvancadosDto,
    alias: string = 'entity'
  ): SelectQueryBuilder<T> {
    // Prioriza filtros múltiplos
    if (filtros.beneficios && filtros.beneficios.length > 0) {
      return query.andWhere(`${alias}.tipo_beneficio_id IN (:...beneficios)`, {
        beneficios: filtros.beneficios
      });
    }
    // Fallback para filtro único
    else if (filtros.beneficio) {
      return query.andWhere(`${alias}.tipo_beneficio_id = :beneficio`, {
        beneficio: filtros.beneficio
      });
    }
    
    return query;
  }

  /**
   * Aplica filtros de benefício específico para pagamentos (via join com solicitacao)
   */
  static aplicarFiltroBeneficioPagamento(
    query: SelectQueryBuilder<Pagamento>,
    filtros: MetricasFiltrosAvancadosDto
  ): SelectQueryBuilder<Pagamento> {
    // Usa alias existente ou cria novo para solicitacao
    let solicitacaoAlias = this.findExistingJoinAlias(query, 'solicitacao');
    if (!solicitacaoAlias) {
      console.warn('Join com solicitacao não encontrado para aplicar filtro de benefício em pagamentos');
      return query;
    }

    // Verifica se já existe o join com tipo_beneficio
    let tipoBeneficioAlias = this.findExistingJoinAlias(query, 'tipo_beneficio');
    if (!tipoBeneficioAlias) {
      tipoBeneficioAlias = 'tipo_beneficio';
      query.innerJoin(`${solicitacaoAlias}.tipo_beneficio`, tipoBeneficioAlias);
    }

    // Prioriza filtros múltiplos
    if (filtros.beneficios && filtros.beneficios.length > 0) {
      return query.andWhere(`${tipoBeneficioAlias}.id IN (:...beneficios)`, {
        beneficios: filtros.beneficios
      });
    }
    // Fallback para filtro único
    else if (filtros.beneficio) {
      return query.andWhere(`${tipoBeneficioAlias}.id = :beneficio`, {
        beneficio: filtros.beneficio
      });
    }
    
    return query;
  }

  /**
   * Mapeia status de solicitação para status de pagamento correspondentes
   */
  private static mapearStatusSolicitacaoParaPagamento(statusSolicitacao: string[]): string[] {
    const mapeamento: Record<string, string[]> = {
      [StatusSolicitacao.APROVADA]: [StatusPagamentoEnum.LIBERADO, StatusPagamentoEnum.PAGO],
      [StatusSolicitacao.PENDENTE]: [StatusPagamentoEnum.PENDENTE],
      [StatusSolicitacao.EM_PROCESSAMENTO]: [StatusPagamentoEnum.AGENDADO, StatusPagamentoEnum.LIBERADO],
      [StatusSolicitacao.CONCLUIDA]: [StatusPagamentoEnum.PAGO, StatusPagamentoEnum.CONFIRMADO, StatusPagamentoEnum.RECEBIDO],
      [StatusSolicitacao.LIBERADA]: [StatusPagamentoEnum.LIBERADO],
      [StatusSolicitacao.CANCELADA]: [StatusPagamentoEnum.CANCELADO],
      [StatusSolicitacao.ARQUIVADA]: [StatusPagamentoEnum.CANCELADO]
    };

    const statusPagamento = new Set<string>();
    
    statusSolicitacao.forEach(status => {
      const statusMapeados = mapeamento[status];
      if (statusMapeados) {
        statusMapeados.forEach(s => statusPagamento.add(s));
      }
    });

    return Array.from(statusPagamento);
  }

  /**
   * Aplica filtros de status nas queries
   */
  static aplicarFiltroStatus<T>(
    query: SelectQueryBuilder<T>,
    filtros: MetricasFiltrosAvancadosDto,
    alias: string = 'entity'
  ): SelectQueryBuilder<T> {
    if (!filtros.status) {
      return query;
    }

    const statusArray = Array.isArray(filtros.status) ? filtros.status : [filtros.status];
    
    if (statusArray.length === 0) {
      return query;
    }

    // Para pagamentos, mapear status de solicitação para status de pagamento
    if (alias === 'pagamento') {
      const statusPagamento = this.mapearStatusSolicitacaoParaPagamento(statusArray);
      
      if (statusPagamento.length > 0) {
        return query.andWhere(`${alias}.status IN (:...statusPagamento)`, {
          statusPagamento
        });
      }
      
      return query;
    }
    
    // Para outras entidades, usar status diretamente
    return query.andWhere(`${alias}.status IN (:...status)`, {
      status: statusArray
    });
  }

  /**
   * Aplica filtros de usuário nas queries
   */
  static aplicarFiltroUsuario<T>(
    query: SelectQueryBuilder<T>,
    filtros: MetricasFiltrosAvancadosDto,
    alias: string = 'entity'
  ): SelectQueryBuilder<T> {
    // Prioriza filtros múltiplos (usuarios) sobre filtro único (usuario)
    if (filtros.usuarios && filtros.usuarios.length > 0) {
      // Para pagamentos, o técnico está na solicitação
      if (alias === 'pagamento') {
        // Usa alias existente ou cria novo
        let solicitacaoAlias = this.findExistingJoinAlias(query, 'solicitacao');
        if (!solicitacaoAlias) {
          solicitacaoAlias = 'solicitacao';
          query.leftJoin('pagamento.solicitacao', solicitacaoAlias);
        }
        
        return query.andWhere(`${solicitacaoAlias}.tecnico_id IN (:...usuarios)`, {
          usuarios: filtros.usuarios
        });
      } else if (alias === 'concessao') {
        // Para concessões, o técnico está na solicitação
        let solicitacaoAlias = this.findExistingJoinAlias(query, 'solicitacao');
        if (!solicitacaoAlias) {
          solicitacaoAlias = 'solicitacao';
          query.leftJoin('concessao.solicitacao', solicitacaoAlias);
        }
        
        return query.andWhere(`${solicitacaoAlias}.tecnico_id IN (:...usuarios)`, {
          usuarios: filtros.usuarios
        });
      } else {
        // Para outras entidades, usa o campo tecnico_id diretamente
        return query.andWhere(`${alias}.tecnico_id IN (:...usuarios)`, {
          usuarios: filtros.usuarios
        });
      }
    }
    
    return query;
  }

  /**
   * Aplica filtros de bairro nas queries (via join com endereço)
   */
  static aplicarFiltroBairro<T>(
    query: SelectQueryBuilder<T>,
    filtros: MetricasFiltrosAvancadosDto,
    aliasEntity: string = 'entity',
    aliasCidadao: string = 'cidadao',
    aliasEndereco: string = 'endereco'
  ): SelectQueryBuilder<T> {
    if ((filtros.bairros && filtros.bairros.length > 0) || filtros.bairro) {
      // Adiciona joins necessários se ainda não existirem
      const existingJoins = query.expressionMap.joinAttributes;
      
      if (!existingJoins.some(join => join.alias?.name === aliasCidadao)) {
        // Para pagamentos e concessões, precisa acessar beneficiário através da solicitação
        if (aliasEntity === 'pagamento' || aliasEntity === 'concessao') {
          // Usa alias existente ou cria novo
          let solicitacaoAlias = this.findExistingJoinAlias(query, 'solicitacao');
          if (!solicitacaoAlias) {
            solicitacaoAlias = 'solicitacao';
            query.leftJoin(`${aliasEntity}.solicitacao`, solicitacaoAlias);
          }
          query.leftJoin(`${solicitacaoAlias}.beneficiario`, aliasCidadao);
        } else if (aliasEntity === 'solicitacao') {
          // Para solicitações, acessa beneficiário diretamente
          query.leftJoin(`${aliasEntity}.beneficiario`, aliasCidadao);
        } else {
          query.leftJoin(`${aliasEntity}.beneficiario`, aliasCidadao);
        }
      }
      
      if (!existingJoins.some(join => join.alias?.name === aliasEndereco)) {
        query.leftJoin(`${aliasCidadao}.enderecos`, aliasEndereco, 'endereco.data_fim_vigencia IS NULL');
      }

      // Aplica filtro de bairros múltiplos
      if (filtros.bairros && filtros.bairros.length > 0) {
        return query.andWhere(`LOWER(${aliasEndereco}.bairro) IN (:...bairros)`, {
          bairros: filtros.bairros.map(b => b.toLowerCase())
        });
      }
      // Fallback para filtro único
      else if (filtros.bairro) {
        return query.andWhere(`LOWER(${aliasEndereco}.bairro) = LOWER(:bairro)`, {
          bairro: filtros.bairro
        });
      }
    }
    
    return query;
  }


  /**
   * Aplica paginação nas queries
   */
  static aplicarPaginacao<T>(
    query: SelectQueryBuilder<T>,
    filtros: MetricasFiltrosAvancadosDto
  ): SelectQueryBuilder<T> {
    if (filtros.limit) {
      query.limit(filtros.limit);
    }
    
    if (filtros.offset) {
      query.offset(filtros.offset);
    }
    
    return query;
  }

  /**
   * Aplica todos os filtros de uma vez para solicitações
   */
  static aplicarFiltrosSolicitacao(
    query: SelectQueryBuilder<Solicitacao>,
    filtros: MetricasFiltrosAvancadosDto
  ): SelectQueryBuilder<Solicitacao> {
    return this.aplicarFiltroPeriodo(query, filtros, 'solicitacao.created_at')
      .pipe(q => this.aplicarFiltroUnidade(q, filtros, 'solicitacao'))
      .pipe(q => this.aplicarFiltroBeneficio(q, filtros, 'solicitacao'))
      .pipe(q => this.aplicarFiltroStatus(q, filtros, 'solicitacao'))
      .pipe(q => this.aplicarFiltroUsuario(q, filtros, 'solicitacao'))
      .pipe(q => this.aplicarFiltroBairro(q, filtros, 'solicitacao', 'beneficiario', 'endereco'));
  }

  /**
   * Aplica todos os filtros de uma vez para concessões
   */
  static aplicarFiltrosConcessao(
    query: SelectQueryBuilder<Concessao>,
    filtros: MetricasFiltrosAvancadosDto
  ): SelectQueryBuilder<Concessao> {
    return this.aplicarFiltroPeriodo(query, filtros, 'concessao.created_at')
      .pipe(q => this.aplicarFiltroUnidade(q, filtros, 'concessao'))
      .pipe(q => this.aplicarFiltroBeneficio(q, filtros, 'concessao'))
      .pipe(q => this.aplicarFiltroStatus(q, filtros, 'concessao'))
      .pipe(q => this.aplicarFiltroUsuario(q, filtros, 'concessao'))
      .pipe(q => this.aplicarFiltroBairro(q, filtros, 'concessao', 'beneficiario', 'endereco'));
  }

  /**
   * Aplica todos os filtros de uma vez para pagamentos
   */
  static aplicarFiltrosPagamento(
    query: SelectQueryBuilder<Pagamento>,
    filtros: MetricasFiltrosAvancadosDto
  ): SelectQueryBuilder<Pagamento> {
    return this.aplicarFiltroPeriodo(query, filtros, 'pagamento.created_at')
      .pipe(q => this.aplicarFiltroUnidade(q, filtros, 'pagamento'))
      .pipe(q => this.aplicarFiltroBeneficioPagamento(q, filtros))
      .pipe(q => this.aplicarFiltroStatus(q, filtros, 'pagamento'))
      .pipe(q => this.aplicarFiltroUsuario(q, filtros, 'pagamento'))
      .pipe(q => this.aplicarFiltroBairro(q, filtros, 'pagamento', 'beneficiario', 'endereco'));
  }

  /**
   * Aplica todos os filtros de uma vez para cidadãos
   */
  static aplicarFiltrosCidadao(
    query: SelectQueryBuilder<Cidadao>,
    filtros: MetricasFiltrosAvancadosDto
  ): SelectQueryBuilder<Cidadao> {
    return this.aplicarFiltroPeriodo(query, filtros, 'cidadao.created_at')
      .pipe(q => this.aplicarFiltroUnidade(q, filtros, 'cidadao'))
      .pipe(q => this.aplicarFiltroUsuario(q, filtros, 'cidadao'))
      .pipe(q => this.aplicarFiltroBairro(q, filtros, 'cidadao', 'cidadao', 'endereco'));
  }

  /**
   * Aplica escopo automático para solicitações baseado no usuário logado
   */
  static aplicarEscopoSolicitacao(
    query: SelectQueryBuilder<Solicitacao>,
    usuario: Usuario
  ): SelectQueryBuilder<Solicitacao> {
    return this.aplicarEscopoUnidade(query, usuario, 'solicitacao');
  }

  /**
   * Aplica escopo automático para concessões baseado no usuário logado
   */
  static aplicarEscopoConcessao(
    query: SelectQueryBuilder<Concessao>,
    usuario: Usuario
  ): SelectQueryBuilder<Concessao> {
    return this.aplicarEscopoUnidade(query, usuario, 'concessao');
  }

  /**
   * Aplica escopo automático para pagamentos baseado no usuário logado
   */
  static aplicarEscopoPagamento(
    query: SelectQueryBuilder<Pagamento>,
    usuario: Usuario
  ): SelectQueryBuilder<Pagamento> {
    return this.aplicarEscopoUnidade(query, usuario, 'pagamento');
  }

  /**
   * Aplica escopo automático para cidadãos baseado no usuário logado
   */
  static aplicarEscopoCidadao(
    query: SelectQueryBuilder<Cidadao>,
    usuario: Usuario
  ): SelectQueryBuilder<Cidadao> {
    return this.aplicarEscopoUnidade(query, usuario, 'cidadao');
  }

  /**
   * Gera um resumo dos filtros aplicados para logging/debug
   */
  static gerarResumoFiltros(filtros: MetricasFiltrosAvancadosDto): string {
    const resumo: string[] = [];
    
    if (filtros.periodo) {
      resumo.push(`Período: ${filtros.periodo}`);
    }
    
    if (filtros.unidades?.length) {
      resumo.push(`Unidades: ${filtros.unidades.length}`);
    } else if (filtros.unidade) {
      resumo.push(`Unidade: ${filtros.unidade}`);
    }
    
    if (filtros.beneficios?.length) {
      resumo.push(`Benefícios: ${filtros.beneficios.length}`);
    } else if (filtros.beneficio) {
      resumo.push(`Benefício: ${filtros.beneficio}`);
    }
    
    if (filtros.status?.length) {
      resumo.push(`Status: ${filtros.status.join(', ')}`);
    } else if (filtros.status) {
      resumo.push(`Status: ${filtros.status}`);
    }
    
    if (filtros.usuarios?.length) {
      resumo.push(`Usuários: ${filtros.usuarios.length}`);
    } else if (filtros.usuarios) {
      resumo.push(`Usuário: ${filtros.usuarios}`);
    }
    
    if (filtros.bairros?.length) {
      resumo.push(`Bairros: ${filtros.bairros.join(', ')}`);
    } else if (filtros.bairro) {
      resumo.push(`Bairro: ${filtros.bairro}`);
    }
    
    return resumo.length > 0 ? resumo.join(' | ') : 'Nenhum filtro aplicado';
  }
}

/**
 * Extensão do SelectQueryBuilder para suportar pipe pattern
 */
declare module 'typeorm' {
  interface SelectQueryBuilder<Entity> {
    pipe<T>(fn: (query: SelectQueryBuilder<Entity>) => T): T;
  }
}

// Implementação do método pipe
if (!SelectQueryBuilder.prototype.pipe) {
  SelectQueryBuilder.prototype.pipe = function<T>(fn: (query: any) => T): T {
    return fn(this);
  };
}