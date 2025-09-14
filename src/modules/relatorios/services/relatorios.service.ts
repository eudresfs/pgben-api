import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  Solicitacao,
  StatusSolicitacao,
} from '../../../entities/solicitacao.entity';
import { StatusUnidade, Unidade } from '../../../entities/unidade.entity';
import { TipoBeneficio } from '../../../entities/tipo-beneficio.entity';
import { Pagamento } from '../../../entities/pagamento.entity';
import { Role } from '../../../enums/role.enum';
import { RelatorioStrategy } from '../interfaces/relatorio-strategy.interface';
import { PdfStrategy } from '../strategies/pdf.strategy';
import { ExcelStrategy } from '../strategies/excel.strategy';
import { CsvStrategy } from '../strategies/csv.strategy';
import { TempFilesService } from './temp-files.service';
import { PdfTemplatesService } from './pdf-templates.service';
import { PdfAdapterService } from './pdf-adapter.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * Serviço de Relatórios
 *
 * Responsável pela lógica de negócio relacionada à geração de relatórios
 * gerenciais e operacionais do sistema. Implementa o padrão Strategy para
 * permitir diferentes formatos de saída.
 */
@Injectable()
export class RelatoriosService {
  private readonly logger = new Logger(RelatoriosService.name);
  private readonly strategies: Map<string, RelatorioStrategy> = new Map();

  constructor(
    @InjectRepository(Solicitacao)
    private solicitacaoRepository: Repository<Solicitacao>,

    @InjectRepository(Unidade)
    private unidadeRepository: Repository<Unidade>,

    @InjectRepository(TipoBeneficio)
    private tipoBeneficioRepository: Repository<TipoBeneficio>,

    @InjectRepository(Pagamento)
    private pagamentoRepository: Repository<Pagamento>,

    private readonly tempFilesService: TempFilesService,
    private readonly pdfTemplatesService: PdfTemplatesService,
    private readonly pdfAdapterService: PdfAdapterService,

    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {
    // Inicializar as estratégias de geração de relatórios
    this.strategies.set('pdf', new PdfStrategy(tempFilesService));
    this.strategies.set('excel', new ExcelStrategy(tempFilesService));
    this.strategies.set('csv', new CsvStrategy(tempFilesService));

    this.logger.log(
      'Serviço de Relatórios inicializado com as estratégias: PDF, Excel, CSV',
    );
  }

  /**
   * Gera relatório de benefícios concedidos por período
   * @param options Opções para geração do relatório
   * @returns Buffer contendo o relatório no formato solicitado
   */
  async gerarRelatorioBeneficiosConcedidos(options: {
    dataInicio: string;
    dataFim: string;
    unidadeId?: string;
    tipoBeneficioId?: string;
    formato: 'pdf' | 'excel' | 'csv';
    user: any;
  }): Promise<Buffer> {
    const { dataInicio, dataFim, unidadeId, tipoBeneficioId, formato, user } =
      options;

    // Verificar permissões do usuário
    if (![Role.ADMIN, Role.GESTOR, Role.TECNICO].includes(user.role)) {
      throw new UnauthorizedException(
        'Você não tem permissão para gerar este relatório',
      );
    }

    // Verificar formato solicitado
    if (!this.strategies.has(formato)) {
      throw new BadRequestException(
        `Formato de relatório não suportado: ${formato}`,
      );
    }

    // Gerar chave de cache
    const cacheKey = `relatorio_beneficios_${dataInicio}_${dataFim}_${unidadeId || 'all'}_${tipoBeneficioId || 'all'}_${formato}`;

    // Verificar cache
    const cachedReport = await this.cacheManager.get<Buffer>(cacheKey);
    if (cachedReport) {
      this.logger.log(`Relatório recuperado do cache: ${cacheKey}`);
      return cachedReport;
    }

    try {
      // Converter datas
      const inicio = new Date(dataInicio);
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59, 999); // Ajusta para o final do dia

      if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
        throw new BadRequestException('Datas inválidas');
      }

      // Construir consulta otimizada
      const queryBuilder = this.solicitacaoRepository
        .createQueryBuilder('solicitacao')
        .select([
          'solicitacao.id',
          'solicitacao.protocolo',
          'solicitacao.data_abertura',
          'solicitacao.data_liberacao',
          'solicitacao.status',
          'beneficiario.id',
          'beneficiario.nome',
          'beneficiario.cpf',
          'tipo_beneficio.id',
          'tipo_beneficio.nome',
          'tipo_beneficio.valor',
          'unidade.id',
          'unidade.nome',
        ])
        .leftJoin('solicitacao.beneficiario', 'beneficiario')
        .leftJoin('solicitacao.tipo_beneficio', 'tipo_beneficio')
        .leftJoin('solicitacao.unidade', 'unidade')
        .where('solicitacao.status = :status', {
          status: StatusSolicitacao.APROVADA,
        })
        .andWhere('solicitacao.data_aprovacao BETWEEN :inicio AND :fim', {
          inicio,
          fim,
        });

      if (unidadeId) {
        queryBuilder.andWhere('solicitacao.unidade_id = :unidadeId', {
          unidadeId,
        });
      }

      if (tipoBeneficioId) {
        queryBuilder.andWhere(
          'solicitacao.tipo_beneficio_id = :tipoBeneficioId',
          { tipoBeneficioId },
        );
      }

      // Executar consulta
      const solicitacoes = await queryBuilder.getMany();
      this.logger.log(
        `Encontradas ${solicitacoes.length} solicitações com benefícios concedidos no período`,
      );

      // Obter estratégia de geração para o formato solicitado
      const strategy = this.strategies.get(formato);
      if (!strategy) {
        throw new BadRequestException(
          `Formato de relatório não suportado: ${formato}`,
        );
      }

      // Gerar relatório
      const opcoes = { dataInicio: inicio, dataFim: fim };
      const relatorio = (await strategy.gerar(
        'beneficios-concedidos',
        solicitacoes,
        opcoes,
      )) as Buffer;

      // Armazenar em cache
      await this.cacheManager.set(cacheKey, relatorio, 3600000); // 1 hora

      return relatorio;
    } catch (error) {
      this.logger.error(
        `Erro ao gerar relatório de benefícios concedidos: ${error.message}`,
      );
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Erro ao gerar relatório. Por favor, tente novamente.',
      );
    }
  }

  /**
   * Gera relatório de solicitações por status
   * @param options Opções para geração do relatório
   * @returns Buffer contendo o relatório no formato solicitado
   */
  async gerarRelatorioSolicitacoesPorStatus(options: {
    dataInicio: string;
    dataFim: string;
    unidadeId?: string;
    formato: 'pdf' | 'excel' | 'csv';
    user: any;
  }): Promise<Buffer> {
    const { dataInicio, dataFim, unidadeId, formato, user } = options;

    // Verificar permissões do usuário
    if (
      ![Role.ADMIN, Role.GESTOR, Role.TECNICO, Role.COORDENADOR].includes(
        user.role,
      )
    ) {
      throw new UnauthorizedException(
        'Você não tem permissão para gerar este relatório',
      );
    }

    // Verificar permissão por unidade
    if (
      user.role === Role.COORDENADOR &&
      (!unidadeId || unidadeId !== user.unidade_id)
    ) {
      throw new UnauthorizedException(
        'Coordenadores só podem acessar dados de sua unidade',
      );
    }

    // Verificar formato solicitado
    if (!this.strategies.has(formato)) {
      throw new BadRequestException(
        `Formato de relatório não suportado: ${formato}`,
      );
    }

    // Gerar chave de cache
    const cacheKey = `relatorio_solicitacoes_${dataInicio}_${dataFim}_${unidadeId || 'all'}_${formato}`;

    // Verificar cache
    const cachedReport = await this.cacheManager.get<Buffer>(cacheKey);
    if (cachedReport) {
      this.logger.log(`Relatório recuperado do cache: ${cacheKey}`);
      return cachedReport;
    }

    try {
      // Converter datas
      const inicio = new Date(dataInicio);
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59, 999); // Ajusta para o final do dia

      if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
        throw new BadRequestException('Datas inválidas');
      }

      // Construir consulta otimizada
      const queryBuilder = this.solicitacaoRepository
        .createQueryBuilder('solicitacao')
        .select([
          'solicitacao.id',
          'solicitacao.protocolo',
          'solicitacao.data_abertura',
          'solicitacao.status',
          'beneficiario.id',
          'beneficiario.nome',
          'tipo_beneficio.id',
          'tipo_beneficio.nome',
          'unidade.id',
          'unidade.nome',
        ])
        .leftJoin('solicitacao.beneficiario', 'beneficiario')
        .leftJoin('solicitacao.tipo_beneficio', 'tipo_beneficio')
        .leftJoin('solicitacao.unidade', 'unidade')
        .where('solicitacao.data_abertura BETWEEN :inicio AND :fim', {
          inicio,
          fim,
        });

      if (unidadeId) {
        queryBuilder.andWhere('solicitacao.unidade_id = :unidadeId', {
          unidadeId,
        });
      }

      // Executar consulta
      const solicitacoes = await queryBuilder.getMany();
      this.logger.log(
        `Encontradas ${solicitacoes.length} solicitações no período`,
      );

      // Agrupar por status
      const agrupadas = solicitacoes.reduce((acc, solicitacao) => {
        const status = solicitacao.status;
        if (!acc[status]) {
          acc[status] = [];
        }
        acc[status].push(solicitacao);
        return acc;
      }, {});

      // Obter estratégia de geração para o formato solicitado
      const strategy = this.strategies.get(formato);
      if (!strategy) {
        throw new BadRequestException(
          `Formato de relatório não suportado: ${formato}`,
        );
      }

      // Gerar relatório
      const opcoes = { dataInicio: inicio, dataFim: fim };
      const relatorio = (await strategy.gerar(
        'solicitacoes-por-status',
        agrupadas,
        opcoes,
      )) as Buffer;

      // Armazenar em cache
      await this.cacheManager.set(cacheKey, relatorio, 3600000); // 1 hora

      return relatorio;
    } catch (error) {
      this.logger.error(
        `Erro ao gerar relatório de solicitações por status: ${error.message}`,
      );
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Erro ao gerar relatório. Por favor, tente novamente.',
      );
    }
  }

  /**
   * Gera relatório de atendimentos por unidade
   * @param options Opções para geração do relatório
   * @returns Buffer contendo o relatório no formato solicitado
   */
  async gerarRelatorioAtendimentosPorUnidade(options: {
    dataInicio: string;
    dataFim: string;
    formato: 'pdf' | 'excel' | 'csv';
    user: any;
  }): Promise<Buffer> {
    const { dataInicio, dataFim, formato, user } = options;

    // Verificar permissões do usuário
    if (![Role.ADMIN, Role.GESTOR].includes(user.role)) {
      throw new UnauthorizedException(
        'Você não tem permissão para gerar este relatório',
      );
    }

    // Verificar formato solicitado
    if (!this.strategies.has(formato)) {
      throw new BadRequestException(
        `Formato de relatório não suportado: ${formato}`,
      );
    }

    // Gerar chave de cache
    const cacheKey = `relatorio_atendimentos_${dataInicio}_${dataFim}_${formato}`;

    // Verificar cache
    const cachedReport = await this.cacheManager.get<Buffer>(cacheKey);
    if (cachedReport) {
      this.logger.log(`Relatório recuperado do cache: ${cacheKey}`);
      return cachedReport;
    }

    try {
      // Converter datas
      const inicio = new Date(dataInicio);
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59, 999); // Ajusta para o final do dia

      if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
        throw new BadRequestException('Datas inválidas');
      }

      // Buscar unidades ativas
      const unidades = await this.unidadeRepository.find({
        where: { status: StatusUnidade.ATIVO },
      });

      // Definir a interface para o resultado
      interface RelatorioUnidade {
        unidade: Unidade;
        totalSolicitacoes: number;
        solicitacoesLiberadas: number;
        solicitacoesPendentes: number;
      }

      // Resultados por unidade
      const resultado: RelatorioUnidade[] = [];

      // Processar cada unidade
      for (const unidade of unidades) {
        // Contar total de solicitações
        const totalSolicitacoes = await this.solicitacaoRepository.count({
          where: {
            unidade_id: unidade.id,
            data_abertura: Between(inicio, fim),
          },
        });

        // Contar solicitações aprovadas
        const solicitacoesLiberadas = await this.solicitacaoRepository.count({
          where: {
            unidade_id: unidade.id,
            status: StatusSolicitacao.APROVADA,
            data_abertura: Between(inicio, fim),
          },
        });

        // Contar solicitações pendentes (não aprovadas)
        const solicitacoesPendentes = totalSolicitacoes - solicitacoesLiberadas;

        // Adicionar ao resultado
        resultado.push({
          unidade,
          totalSolicitacoes,
          solicitacoesLiberadas,
          solicitacoesPendentes,
        });
      }

      // Ordenar por total de solicitações (decrescente)
      resultado.sort((a, b) => b.totalSolicitacoes - a.totalSolicitacoes);

      // Obter estratégia de geração para o formato solicitado
      const strategy = this.strategies.get(formato);
      if (!strategy) {
        throw new BadRequestException(
          `Formato de relatório não suportado: ${formato}`,
        );
      }

      // Gerar relatório
      const opcoes = { dataInicio: inicio, dataFim: fim };
      const relatorio = (await strategy.gerar(
        'atendimentos-por-unidade',
        resultado,
        opcoes,
      )) as Buffer;

      // Armazenar em cache
      await this.cacheManager.set(cacheKey, relatorio, 3600000); // 1 hora

      return relatorio;
    } catch (error) {
      this.logger.error(
        `Erro ao gerar relatório de atendimentos por unidade: ${error.message}`,
      );
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Erro ao gerar relatório. Por favor, tente novamente.',
      );
    }
  }

  /**
   * Gera PDF baseado em lista de IDs de pagamentos
   * Valida se todos os pagamentos são do mesmo tipo de benefício
   * @param options Opções contendo IDs de pagamentos e usuário
   * @returns Buffer contendo PDF único
   */
  async gerarPdfsPagamentos(options: {
    pagamentoIds: string[];
    observacoes?: string;
    user: any;
  }): Promise<Buffer> {
    const { pagamentoIds, observacoes, user } = options;

    this.logger.log(
      `Gerando PDF para ${pagamentoIds.length} pagamentos pelo usuário ${user.id}`,
    );

    try {
      // Buscar pagamentos com relacionamentos necessários
      const pagamentos = await this.pagamentoRepository
        .createQueryBuilder('pagamento')
        .select([
          'pagamento.id',
          'pagamento.valor',
          'pagamento.data_pagamento',
          'pagamento.numero_parcela',
          'pagamento.total_parcelas',
          'pagamento.status',
          'concessao.id',
          'concessao.data_inicio',
          'solicitacao.id',
          'solicitacao.protocolo',
          'solicitacao.data_abertura',
          'beneficiario.id',
          'beneficiario.nome',
          'beneficiario.cpf',
          'beneficiario.rg',
          'beneficiario.data_nascimento',
          'tipo_beneficio.id',
          'tipo_beneficio.nome',
          'tipo_beneficio.codigo',          
          'unidade.id',
          'unidade.nome',
        ])
        .leftJoin('pagamento.concessao', 'concessao')
        .leftJoin('concessao.solicitacao', 'solicitacao')
        .leftJoin('solicitacao.beneficiario', 'beneficiario')
        .leftJoin('solicitacao.tipo_beneficio', 'tipo_beneficio')
        .leftJoin('solicitacao.unidade', 'unidade')
        .where('pagamento.id IN (:...ids)', { ids: pagamentoIds })
        .getMany();

      if (pagamentos.length === 0) {
        this.logger.warn('Nenhum pagamento encontrado para os IDs fornecidos');
        // Retornar PDF vazio conforme requisito usando o novo módulo PDF
        return await this.pdfAdapterService.gerarPdfVazio();
      }

      // Validar se todos os pagamentos são do mesmo tipo de benefício
      const tiposBeneficio = new Set<string>();
      
      for (const pagamento of pagamentos) {
        // Corrigir caminho para acessar tipo_beneficio através da solicitacao diretamente
        const tipoBeneficio = pagamento.solicitacao?.tipo_beneficio;
        if (tipoBeneficio) {
          tiposBeneficio.add(tipoBeneficio.codigo);
        } else {
          this.logger.warn(`Pagamento ${pagamento.id} não possui tipo de benefício associado`);
        }
      }

      // Verificar se há mais de um tipo de benefício
      if (tiposBeneficio.size > 1) {
        const tipos = Array.from(tiposBeneficio).join(', ');
        this.logger.error(
          `Erro: Pagamentos contêm tipos de benefício diferentes: ${tipos}`,
        );
        throw new BadRequestException(
          `Todos os pagamentos devem ser do mesmo tipo de benefício. ` +
          `Tipos encontrados: ${tipos}`,
        );
      }

      // Agrupar pagamentos por tipo de benefício (será apenas um tipo)
      const pagamentosPorTipo = new Map<string, any[]>();
      
      for (const pagamento of pagamentos) {
        const tipoBeneficio = pagamento.concessao?.solicitacao?.tipo_beneficio;
        if (tipoBeneficio) {
          const key = tipoBeneficio.codigo;
          if (!pagamentosPorTipo.has(key)) {
            pagamentosPorTipo.set(key, []);
          }
          pagamentosPorTipo.get(key)!.push(pagamento);
        }
      }

      // Gerar PDF único
      return await this.gerarPdfPorTipoBeneficio(pagamentosPorTipo, observacoes);

    } catch (error) {
      this.logger.error(
        `Erro ao gerar PDF de pagamentos: ${error.message}`,
        error.stack,
      );
      
      // Re-lançar BadRequestException sem modificar
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException(
        'Erro ao gerar PDF. Por favor, tente novamente.',
      );
    }
  }

  /**
   * Gera PDF baseado em filtros avançados de pagamentos
   * Utiliza a mesma lógica de filtragem do endpoint de listagem de pagamentos
   * @param options Opções contendo filtros avançados e usuário
   * @returns Buffer contendo PDF único
   */
  async gerarPdfsPagamentosComFiltros(options: {
    filtros: any; // RelatorioPagamentosFiltrosDto
    observacoes?: string;
    user: any;
  }): Promise<Buffer> {
    const { filtros, observacoes, user } = options;

    this.logger.log(
      `Gerando PDF com filtros avançados pelo usuário ${user.id}`,
    );

    try {
      // Construir query base com relacionamentos necessários
      const queryBuilder = this.pagamentoRepository
        .createQueryBuilder('pagamento')
        .select([
          'pagamento.id',
          'pagamento.valor',
          'pagamento.data_pagamento',
          'pagamento.data_liberacao',
          'pagamento.numero_parcela',
          'pagamento.total_parcelas',
          'pagamento.status',
          'pagamento.metodo_pagamento',
          'pagamento.observacoes',
          'pagamento.comprovante_id',
          'concessao.id',
          'concessao.data_inicio',
          'solicitacao.id',
          'solicitacao.protocolo',
          'solicitacao.data_abertura',
          'solicitacao.unidade_id',
          'solicitacao.tipo_beneficio',
          'beneficiario.id',
          'beneficiario.nome',
          'beneficiario.cpf',
          'beneficiario.rg',
          'beneficiario.data_nascimento',
          'tipo_beneficio.id',
          'tipo_beneficio.nome',
          'tipo_beneficio.codigo',
          'unidade.id',
          'unidade.nome',
        ])
        .leftJoin('pagamento.solicitacao', 'solicitacao')
        .leftJoin('pagamento.concessao', 'concessao')
        .leftJoin('solicitacao.beneficiario', 'beneficiario')
        .leftJoin('solicitacao.tipo_beneficio', 'tipo_beneficio')
        .leftJoin('solicitacao.unidade', 'unidade');

      // Aplicar filtros condicionalmente
      if (filtros.unidades?.length > 0) {
        queryBuilder.andWhere('solicitacao.unidade_id IN (:...unidades)', {
          unidades: filtros.unidades,
        });
      }

      if (filtros.beneficios?.length > 0) {
        queryBuilder.andWhere('solicitacao.tipo_beneficio IN (:...beneficios)', {
          beneficios: filtros.beneficios,
        });
      }

      if (filtros.status?.length > 0) {
        queryBuilder.andWhere('pagamento.status IN (:...status)', {
          status: filtros.status,
        });
      }

      if (filtros.metodos_pagamento?.length > 0) {
        queryBuilder.andWhere('pagamento.metodo_pagamento IN (:...metodos)', {
          metodos: filtros.metodos_pagamento,
        });
      }

      if (filtros.solicitacoes?.length > 0) {
        queryBuilder.andWhere('pagamento.solicitacao_id IN (:...solicitacoes)', {
          solicitacoes: filtros.solicitacoes,
        });
      }

      if (filtros.concessoes?.length > 0) {
        queryBuilder.andWhere('pagamento.concessao_id IN (:...concessoes)', {
          concessoes: filtros.concessoes,
        });
      }

      // Aplicar filtros de período usando a mesma lógica do PagamentoService
      this.aplicarFiltrosPeriodo(queryBuilder, filtros);

      // Filtros de data específicos (sobrescrevem período se fornecidos)
      if (filtros.data_inicio) {
        queryBuilder.andWhere('pagamento.data_liberacao >= :dataInicio', {
          dataInicio: filtros.data_inicio,
        });
      }

      if (filtros.data_fim) {
        queryBuilder.andWhere('pagamento.data_liberacao <= :dataFim', {
          dataFim: filtros.data_fim,
        });
      }

      if (filtros.data_pagamento_inicio) {
        queryBuilder.andWhere('pagamento.data_pagamento >= :dataPagamentoInicio', {
          dataPagamentoInicio: filtros.data_pagamento_inicio,
        });
      }

      if (filtros.data_pagamento_fim) {
        queryBuilder.andWhere('pagamento.data_pagamento <= :dataPagamentoFim', {
          dataPagamentoFim: filtros.data_pagamento_fim,
        });
      }

      // Filtros de valor - EXATAMENTE como no PagamentoService
      if (filtros.valor_min !== undefined) {
        queryBuilder.andWhere('pagamento.valor >= :valorMin', {
          valorMin: filtros.valor_min,
        });
      }

      if (filtros.valor_max !== undefined) {
        queryBuilder.andWhere('pagamento.valor <= :valorMax', {
          valorMax: filtros.valor_max,
        });
      }

      // Filtros de parcela - EXATAMENTE como no PagamentoService
      if (filtros.parcela_min !== undefined) {
        queryBuilder.andWhere('pagamento.numero_parcela >= :parcelaMin', {
          parcelaMin: filtros.parcela_min,
        });
      }

      if (filtros.parcela_max !== undefined) {
        queryBuilder.andWhere('pagamento.numero_parcela <= :parcelaMax', {
          parcelaMax: filtros.parcela_max,
        });
      }

      // Filtro de comprovante - EXATAMENTE como no PagamentoService
      if (filtros.com_comprovante !== undefined) {
        if (filtros.com_comprovante) {
          queryBuilder.andWhere('pagamento.comprovante_id IS NOT NULL');
        } else {
          queryBuilder.andWhere('pagamento.comprovante_id IS NULL');
        }
      }

      // Filtro de busca textual - EXATAMENTE como no PagamentoService
       if (filtros.search) {
         queryBuilder.andWhere(
           '(beneficiario.nome ILIKE :search OR beneficiario.cpf ILIKE :search OR pagamento.observacoes ILIKE :search)',
           { search: `%${filtros.search}%` },
         );
       }

      // Incluir relacionamentos opcionais - EXATAMENTE como no PagamentoService
      if (filtros.include_relations?.includes('comprovante')) {
        queryBuilder.leftJoinAndSelect('pagamento.comprovante', 'comprovante');
      }

      if (filtros.include_relations?.includes('monitoramento')) {
        queryBuilder.leftJoinAndSelect('pagamento.agendamentos', 'agendamentos');
        queryBuilder.leftJoinAndSelect('agendamentos.visitas', 'visitas');
      }

      // Aplicar ordenação - EXATAMENTE como no PagamentoService
      const sortField = filtros.sort_by || 'data_liberacao';
      const sortOrder = filtros.sort_order || 'DESC';
      queryBuilder.orderBy(`pagamento.${sortField}`, sortOrder);

      // Executar query
      const pagamentos = await queryBuilder.getMany();

      if (pagamentos.length === 0) {
        this.logger.warn('Nenhum pagamento encontrado com os filtros especificados');
        throw new BadRequestException(
          'Nenhum pagamento encontrado com os filtros especificados',
        );
      }

      this.logger.log(`Encontrados ${pagamentos.length} pagamentos para geração do PDF`);

      // Validar se todos os pagamentos são do mesmo tipo de benefício
      const tiposBeneficio = new Set<string>();
      
      for (const pagamento of pagamentos) {
        const tipoBeneficio = pagamento.concessao?.solicitacao?.tipo_beneficio;
        if (tipoBeneficio) {
          tiposBeneficio.add(tipoBeneficio.codigo);
        }
      }

      // Verificar se há mais de um tipo de benefício
      if (tiposBeneficio.size > 1) {
        const tipos = Array.from(tiposBeneficio).join(', ');
        this.logger.error(
          `Erro: Pagamentos contêm tipos de benefício diferentes: ${tipos}`,
        );
        throw new BadRequestException(
          `Todos os pagamentos devem ser do mesmo tipo de benefício. ` +
          `Tipos encontrados: ${tipos}. Cada benefício possui templates de relatório distintos.`,
        );
      }

      // Agrupar pagamentos por tipo de benefício (será apenas um tipo)
      const pagamentosPorTipo = new Map<string, any[]>();
      
      for (const pagamento of pagamentos) {
        // Corrigir caminho para acessar tipo_beneficio através da solicitacao diretamente
        const tipoBeneficio = pagamento.solicitacao?.tipo_beneficio;
        if (!tipoBeneficio) {
          this.logger.warn(`Pagamento ${pagamento.id} sem tipo de benefício associado`);
          continue;
        }

        const key = tipoBeneficio.codigo;
        if (!pagamentosPorTipo.has(key)) {
          pagamentosPorTipo.set(key, []);
        }
        pagamentosPorTipo.get(key)!.push(pagamento);
      }

      // Verificar se há pagamentos válidos após o agrupamento
      if (pagamentosPorTipo.size === 0) {
        this.logger.warn('Nenhum pagamento válido encontrado após agrupamento por tipo de benefício');
        throw new BadRequestException(
          'Nenhum pagamento válido encontrado. Todos os pagamentos devem ter um tipo de benefício associado.'
        );
      }

      // Gerar PDF único
      return await this.gerarPdfPorTipoBeneficio(pagamentosPorTipo, observacoes);

    } catch (error) {
      this.logger.error(
        `Erro ao gerar PDF com filtros avançados: ${error.message}`,
        error.stack,
      );
      
      // Re-lançar BadRequestException sem modificar
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException(
        'Erro ao gerar PDF. Por favor, tente novamente.',
      );
    }
  }

  /**
    * Aplica filtros de período aos pagamentos - EXATAMENTE como no PagamentoService
    * @param queryBuilder Query builder para aplicar os filtros
    * @param filtros Filtros contendo informações de período
    */
   private aplicarFiltrosPeriodo(queryBuilder: any, filtros: any): void {
     // Se não tem período definido, não aplicar filtro
     if (!filtros.periodo) {
       return;
     }

     const agora = new Date();
     let dataInicio: Date;
     let dataFim: Date;
 
     switch (filtros.periodo) {
       case 'hoje':
         dataInicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
         dataFim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59);
         break;
 
       case 'ontem':
         const ontem = new Date(agora);
         ontem.setDate(ontem.getDate() - 1);
         dataInicio = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate());
         dataFim = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate(), 23, 59, 59);
         break;
 
       case 'esta_semana':
         const inicioSemana = new Date(agora);
         const diaSemana = agora.getDay();
         const diasParaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
         inicioSemana.setDate(agora.getDate() + diasParaSegunda);
         dataInicio = new Date(inicioSemana.getFullYear(), inicioSemana.getMonth(), inicioSemana.getDate());
         dataFim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59);
         break;
 
       case 'semana_passada':
         const inicioSemanaPassada = new Date(agora);
         const diaSemanaPassada = agora.getDay();
         const diasParaSegundaPassada = diaSemanaPassada === 0 ? -13 : -6 - diaSemanaPassada;
         inicioSemanaPassada.setDate(agora.getDate() + diasParaSegundaPassada);
         const fimSemanaPassada = new Date(inicioSemanaPassada);
         fimSemanaPassada.setDate(inicioSemanaPassada.getDate() + 6);
         dataInicio = new Date(inicioSemanaPassada.getFullYear(), inicioSemanaPassada.getMonth(), inicioSemanaPassada.getDate());
         dataFim = new Date(fimSemanaPassada.getFullYear(), fimSemanaPassada.getMonth(), fimSemanaPassada.getDate(), 23, 59, 59);
         break;
 
       case 'este_mes':
         dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
         dataFim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);
         break;
 
       case 'mes_passado':
         dataInicio = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
         dataFim = new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59);
         break;
 
       case 'este_ano':
         dataInicio = new Date(agora.getFullYear(), 0, 1);
         dataFim = new Date(agora.getFullYear(), 11, 31, 23, 59, 59);
         break;
 
       case 'ano_passado':
         dataInicio = new Date(agora.getFullYear() - 1, 0, 1);
         dataFim = new Date(agora.getFullYear() - 1, 11, 31, 23, 59, 59);
         break;
 
       case 'ultimos_7_dias':
         dataInicio = new Date(agora);
         dataInicio.setDate(agora.getDate() - 6);
         dataInicio = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate());
         dataFim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59);
         break;
 
       case 'ultimos_30_dias':
         dataInicio = new Date(agora);
         dataInicio.setDate(agora.getDate() - 29);
         dataInicio = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate());
         dataFim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59);
         break;
 
       case 'ultimos_90_dias':
         dataInicio = new Date(agora);
         dataInicio.setDate(agora.getDate() - 89);
         dataInicio = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate());
         dataFim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59);
         break;
 
       default:
         // Se não há período específico reconhecido, não aplicar filtro de data
         return;
     }
 
     // Aplicar filtros de data na query
     queryBuilder.andWhere('pagamento.data_liberacao >= :dataInicio', { dataInicio });
     queryBuilder.andWhere('pagamento.data_liberacao <= :dataFim', { dataFim });
   }



  /**
   * Gera PDF vazio quando não há dados
   * @returns Buffer contendo PDF vazio
   */
  private async gerarPdfVazio(): Promise<Buffer> {
    const PdfPrinter = require('pdfmake');
    
    // Configurar fontes padrão do sistema para evitar erro de fonte Roboto
    const fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };
    
    const printer = new PdfPrinter(fonts);

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      content: [
        {
          text: 'RELATÓRIO DE PAGAMENTOS',
          style: 'header',
          alignment: 'center',
          margin: [0, 20, 0, 20],
        },
        {
          text: 'Nenhum pagamento encontrado para os critérios informados.',
          style: 'normal',
          alignment: 'center',
          margin: [0, 50, 0, 0],
        },
      ],
      styles: {
        header: {
          fontSize: 16,
          bold: true,
        },
        normal: {
          fontSize: 12,
        },
      },
      defaultStyle: {
        fontSize: 12,
        font: 'Helvetica'
      },
    };

    return new Promise((resolve, reject) => {
      try {
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];
        
        pdfDoc.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        
        pdfDoc.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        
        pdfDoc.on('error', (error: Error) => {
          reject(error);
        });
        
        pdfDoc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Gera PDF baseado nos tipos de benefício usando templates específicos
   * @param pagamentosPorTipo Map com pagamentos agrupados por tipo
   * @param observacoes Observações opcionais para incluir no documento
   * @returns Buffer contendo PDF gerado
   */
  private async gerarPdfPorTipoBeneficio(
    pagamentosPorTipo: Map<string, any[]>,
    observacoes?: string,
  ): Promise<Buffer> {
    try {
      // Validar se o Map não está vazio
      if (!pagamentosPorTipo || pagamentosPorTipo.size === 0) {
        this.logger.error('Map de pagamentos por tipo está vazio ou undefined');
        throw new BadRequestException(
          'Nenhum pagamento válido encontrado para geração do PDF.'
        );
      }

      // Obter o primeiro tipo de benefício (já validado que há apenas um)
      const entries = Array.from(pagamentosPorTipo);
      if (entries.length === 0) {
        this.logger.error('Nenhuma entrada encontrada no Map de pagamentos');
        throw new BadRequestException(
          'Nenhum pagamento válido encontrado para geração do PDF.'
        );
      }

      const [tipoBeneficio, pagamentos] = entries[0];
      
      // Validar se há pagamentos no array
      if (!pagamentos || pagamentos.length === 0) {
        this.logger.error(`Nenhum pagamento encontrado para o tipo de benefício: ${tipoBeneficio}`);
        throw new BadRequestException(
          'Nenhum pagamento válido encontrado para geração do PDF.'
        );
      }
      
      // Obter o código do tipo de benefício do primeiro pagamento
      // Corrigir acesso à estrutura de dados retornada pela query
      const primeiroPagamento = pagamentos[0];
      const tipoBeneficioObj = primeiroPagamento?.solicitacao?.tipo_beneficio;
      const codigoTipoBeneficio = tipoBeneficioObj?.codigo;
      
      // Preparar dados dos pagamentos para o template
      const dadosPagamentos = pagamentos.map(pagamento => {
        const solicitacao = pagamento.solicitacao;
        const beneficiario = solicitacao?.beneficiario;
        const unidade = solicitacao?.unidade;

        return {
          id: pagamento.id,
          valor: Number(pagamento.valor || 0),
          data_pagamento: pagamento.data_pagamento,
          data_liberacao: pagamento.data_liberacao,
          numero_parcela: pagamento.numero_parcela || 1,
          total_parcelas: pagamento.total_parcelas || 1,
          solicitacao: {
            id: solicitacao?.id,
            protocolo: solicitacao?.protocolo,
            data_abertura: solicitacao?.data_abertura,
            beneficiario: {
              id: beneficiario?.id,
              nome: beneficiario?.nome || 'N/A',
              cpf: beneficiario?.cpf || 'N/A',
              rg: beneficiario?.rg || 'N/A',
              data_nascimento: beneficiario?.data_nascimento || null,
            },
            tipo_beneficio: {
              id: tipoBeneficioObj?.id,
              nome: tipoBeneficioObj?.nome || tipoBeneficio,
              codigo: codigoTipoBeneficio,
            },
            unidade: {
              id: unidade?.id,
              nome: unidade?.nome || 'SEMTAS'
            }
          },
          concessao: {
            id: pagamento.concessao?.id,
            data_inicio: pagamento.concessao?.data_inicio
          }
        };
      });

      // Calcular total dos pagamentos
      const valorTotal = dadosPagamentos.reduce((total, pagamento) => {
        return total + pagamento.valor;
      }, 0);

      // Obter mês e ano atuais para o subtítulo
      const dataAtual = new Date();
      const ano = dataAtual.getFullYear();
      const meses = [
        'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
        'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
      ];
      const mesAtualNome = meses[dataAtual.getMonth()];

      // Preparar dados para o template
      const dadosRelatorio = {
        titulo: `RELAÇÃO NOMINAL DA CONCESSÃO DE ${tipoBeneficioObj?.nome.toUpperCase() || tipoBeneficio.toUpperCase()} PAGO EM ${mesAtualNome} - ${ano}`,
        dataEmissao: new Date().toLocaleDateString('pt-BR'),
        tipoBeneficio,
        pagamentos: dadosPagamentos,
        totalPagamentos: dadosPagamentos.length,
        valorTotal,
        dataGeracao: new Date(),
        observacoes: observacoes || ''
      };

      // Usar o PdfAdapterService para gerar o PDF com o novo módulo PDF comum
      return await this.pdfAdapterService.gerarRelatorioPagamentos(
        dadosRelatorio,
        codigoTipoBeneficio,
        observacoes
      );
    } catch (error) {
      this.logger.error('Erro ao gerar PDF por tipo de benefício:', error);
      throw new InternalServerErrorException(
        'Erro ao gerar PDF. Por favor, tente novamente.'
      );
    }
  }
}
