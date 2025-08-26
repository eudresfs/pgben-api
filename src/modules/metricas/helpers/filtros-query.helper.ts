import { SelectQueryBuilder } from 'typeorm';
import { MetricasFiltrosAvancadosDto, PeriodoPredefinido, PeriodoCalculador, StatusSolicitacao } from '../dto/metricas-filtros-avancados.dto';
import { Solicitacao, Concessao, Pagamento } from '../../../entities';

/**
 * Helper para aplicar filtros avançados nas queries do TypeORM
 * 
 * Centraliza a lógica de aplicação de filtros para garantir consistência
 * entre diferentes métodos de consulta do serviço de métricas
 */
export class FiltrosQueryHelper {
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
      if (filtros.dataInicioPersonalizada && filtros.dataFimPersonalizada) {
        const validacao = PeriodoCalculador.validarPeriodoPersonalizado(
          filtros.dataInicioPersonalizada,
          filtros.dataFimPersonalizada
        );
        
        if (!validacao.valido) {
          throw new Error(`Período inválido: ${validacao.erro}`);
        }
        
        dataInicio = new Date(filtros.dataInicioPersonalizada);
        dataFim = new Date(filtros.dataFimPersonalizada);
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
   * Aplica filtros de unidade nas queries
   */
  static aplicarFiltroUnidade<T>(
    query: SelectQueryBuilder<T>,
    filtros: MetricasFiltrosAvancadosDto,
    alias: string = 'entity'
  ): SelectQueryBuilder<T> {
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
    // Verifica se já existe o join com solicitacao
    const existingJoins = query.expressionMap.joinAttributes;
    const hasSolicitacaoJoin = existingJoins.some(join => 
      join.alias?.name === 'solicitacao' || 
      join.relationPropertyPath === 'pagamento.solicitacao'
    );
    
    // Se não existe o join, não aplica o filtro (assume que será feito externamente)
    if (!hasSolicitacaoJoin) {
      console.warn('Join com solicitacao não encontrado para aplicar filtro de benefício em pagamentos');
      return query;
    }

    // Verifica se já existe o join com tipo_beneficio
    const hasTipoBeneficioJoin = existingJoins.some(join => 
      join.alias?.name === 'tipo_beneficio' || 
      join.relationPropertyPath === 'solicitacao.tipo_beneficio'
    );
    
    // Se não existe o join com tipo_beneficio, adiciona
    if (!hasTipoBeneficioJoin) {
      query.innerJoin('solicitacao.tipo_beneficio', 'tipo_beneficio');
    }

    // Prioriza filtros múltiplos
    if (filtros.beneficios && filtros.beneficios.length > 0) {
      return query.andWhere('tipo_beneficio.id IN (:...beneficios)', {
        beneficios: filtros.beneficios
      });
    }
    // Fallback para filtro único
    else if (filtros.beneficio) {
      return query.andWhere('tipo_beneficio.id = :beneficio', {
        beneficio: filtros.beneficio
      });
    }
    
    return query;
  }

  /**
   * Aplica filtros de status nas queries
   */
  static aplicarFiltroStatus<T>(
    query: SelectQueryBuilder<T>,
    filtros: MetricasFiltrosAvancadosDto,
    alias: string = 'entity'
  ): SelectQueryBuilder<T> {
    // Prioriza filtros múltiplos
    if (filtros.statusList && filtros.statusList.length > 0) {
      return query.andWhere(`${alias}.status IN (:...statusList)`, {
        statusList: filtros.statusList
      });
    }
    // Fallback para filtro único
    else if (filtros.status) {
      return query.andWhere(`${alias}.status = :status`, {
        status: filtros.status
      });
    }
    
    return query;
  }

  /**
   * Aplica filtros de usuário nas queries
   */
  static aplicarFiltroUsuario<T>(
    query: SelectQueryBuilder<T>,
    filtros: MetricasFiltrosAvancadosDto,
    alias: string = 'entity'
  ): SelectQueryBuilder<T> {
    // Prioriza filtros múltiplos
    if (filtros.usuarios && filtros.usuarios.length > 0) {
      return query.andWhere(`${alias}.usuario_responsavel_id IN (:...usuarios)`, {
        usuarios: filtros.usuarios
      });
    }
    // Fallback para filtro único
    else if (filtros.usuario) {
      return query.andWhere(`${alias}.usuario_responsavel_id = :usuario`, {
        usuario: filtros.usuario
      });
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
        // Para pagamentos, precisa acessar beneficiário através da solicitação
        if (aliasEntity === 'pagamento') {
          // Verifica se já existe join com solicitacao
          if (!existingJoins.some(join => join.alias?.name === 'solicitacao')) {
            query.leftJoin(`${aliasEntity}.solicitacao`, 'solicitacao');
          }
          query.leftJoin('solicitacao.beneficiario', aliasCidadao);
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
   * Aplica filtro para incluir/excluir registros arquivados
   */
  static aplicarFiltroArquivados<T>(
    query: SelectQueryBuilder<T>,
    filtros: MetricasFiltrosAvancadosDto,
    alias: string = 'entity'
  ): SelectQueryBuilder<T> {
    if (!filtros.incluirArquivados) {
      // Exclui registros arquivados/inativos
      return query.andWhere(`(
        ${alias}.removed_at IS NULL
      )`);
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
    if (filtros.limite) {
      query.limit(filtros.limite);
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
      .pipe(q => this.aplicarFiltroBairro(q, filtros, 'solicitacao', 'beneficiario', 'endereco'))
      .pipe(q => this.aplicarFiltroArquivados(q, filtros, 'solicitacao'));
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
      .pipe(q => this.aplicarFiltroBairro(q, filtros, 'concessao', 'cidadao', 'endereco'))
      .pipe(q => this.aplicarFiltroArquivados(q, filtros, 'concessao'));
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
      .pipe(q => this.aplicarFiltroBairro(q, filtros, 'pagamento', 'beneficiario', 'endereco'))
      .pipe(q => this.aplicarFiltroArquivados(q, filtros, 'pagamento'));
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
    
    if (filtros.statusList?.length) {
      resumo.push(`Status: ${filtros.statusList.join(', ')}`);
    } else if (filtros.status) {
      resumo.push(`Status: ${filtros.status}`);
    }
    
    if (filtros.usuarios?.length) {
      resumo.push(`Usuários: ${filtros.usuarios.length}`);
    } else if (filtros.usuario) {
      resumo.push(`Usuário: ${filtros.usuario}`);
    }
    
    if (filtros.bairros?.length) {
      resumo.push(`Bairros: ${filtros.bairros.join(', ')}`);
    } else if (filtros.bairro) {
      resumo.push(`Bairro: ${filtros.bairro}`);
    }
    
    if (filtros.incluirArquivados) {
      resumo.push('Incluindo arquivados');
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