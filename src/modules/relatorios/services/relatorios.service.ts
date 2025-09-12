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
        // Retornar PDF vazio conforme requisito
        return await this.gerarPdfVazio();
      }

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
      // Obter o primeiro tipo de benefício (já validado que há apenas um)
      const [tipoBeneficio, pagamentos] = Array.from(pagamentosPorTipo)[0];
      
      // Obter o código do tipo de benefício do primeiro pagamento
      // Corrigir acesso à estrutura de dados retornada pela query
      const primeiroPagamento = pagamentos[0];
      const tipoBeneficioObj = primeiroPagamento?.concessao?.solicitacao?.tipo_beneficio;
      const codigoTipoBeneficio = tipoBeneficioObj?.codigo;
      
      // Preparar dados dos pagamentos para o template
      const dadosPagamentos = pagamentos.map(pagamento => {
        const solicitacao = pagamento.concessao?.solicitacao;
        const beneficiario = solicitacao?.beneficiario;
        
        return {
          id: pagamento.id,
          valor: Number(pagamento.valor || 0),
          data_pagamento: pagamento.data_pagamento,
          data_liberacao: pagamento.data_liberacao,
          numero_parcela: pagamento.numero_parcela || 1,
          total_parcelas: pagamento.total_parcelas || 1,
          status: 'PAGO', // Status fixo para pagamentos já realizados
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
              id: solicitacao?.unidade?.id,
              nome: solicitacao?.unidade?.nome || 'N/A'
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

      // Preparar dados para o template
      const dadosRelatorio = {
        titulo: `Relatório de Pagamentos - ${tipoBeneficio}`,
        subtitulo: `Período: ${new Date().toLocaleDateString('pt-BR')}`,
        tipoBeneficio,
        pagamentos: dadosPagamentos,
        totalPagamentos: dadosPagamentos.length,
        valorTotal,
        dataGeracao: new Date(),
        observacoes: observacoes || ''
      };

      // Usar o PdfTemplatesService para gerar o PDF com template específico baseado no código do tipo de benefício
      return await this.pdfTemplatesService.gerarRelatorioPagamentos(
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
