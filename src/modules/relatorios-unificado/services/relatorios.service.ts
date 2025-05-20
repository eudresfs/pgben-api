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
} from '../../solicitacao/entities/solicitacao.entity';
import { StatusUnidade, Unidade } from '../../unidade/entities/unidade.entity';
import { TipoBeneficio } from '../../beneficio/entities/tipo-beneficio.entity';
import { Role } from '../../../shared/enums/role.enum';
import { RelatorioStrategy } from '../interfaces/relatorio-strategy.interface';
import { PdfStrategy } from '../strategies/pdf.strategy';
import { ExcelStrategy } from '../strategies/excel.strategy';
import { CsvStrategy } from '../strategies/csv.strategy';
import { TempFilesService } from './temp-files.service';
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

    private readonly tempFilesService: TempFilesService,

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
    if (
      ![Role.ADMIN, Role.GESTOR, Role.TECNICO].includes(user.role)
    ) {
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
          status: StatusSolicitacao.LIBERADA,
        })
        .andWhere('solicitacao.data_liberacao BETWEEN :inicio AND :fim', {
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
      ![
        Role.ADMIN,
        Role.GESTOR,
        Role.TECNICO,
        Role.COORDENADOR,
      ].includes(user.role)
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

        // Contar solicitações liberadas
        const solicitacoesLiberadas = await this.solicitacaoRepository.count({
          where: {
            unidade_id: unidade.id,
            status: StatusSolicitacao.LIBERADA,
            data_abertura: Between(inicio, fim),
          },
        });

        // Contar solicitações pendentes (não liberadas)
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
}
