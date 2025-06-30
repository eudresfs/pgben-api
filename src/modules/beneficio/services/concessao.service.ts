import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { FiltroConcessaoDto } from '../dto/filtro-concessao.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Concessao } from '../../../entities/concessao.entity';
import { Solicitacao } from '../../../entities/solicitacao.entity';
import { StatusConcessao } from '../../../enums/status-concessao.enum';
import { PagamentoService } from '../../pagamento/services/pagamento.service';
import { HistoricoConcessao } from '../../../entities/historico-concessao.entity';
import { ValidacaoBeneficioService } from './validacao-beneficio.service';
import { LoggingService } from '../../../shared/logging/logging.service';
import { StatusPagamentoEnum } from '@/enums';

@Injectable()
export class ConcessaoService {
  constructor(
    @InjectRepository(Concessao)
    private readonly concessaoRepo: Repository<Concessao>,
    private readonly pagamentoService: PagamentoService,
    @InjectRepository(HistoricoConcessao)
    private readonly historicoRepo: Repository<HistoricoConcessao>,
    private readonly validacaoBeneficioService: ValidacaoBeneficioService,
    private readonly logger: LoggingService,
  ) {}

  async findAll(filtro?: FiltroConcessaoDto): Promise<{ data: any[], total: number, limit: number, offset: number }> {
    const qb = this.concessaoRepo
      .createQueryBuilder('concessao')
      .leftJoin('concessao.solicitacao', 'solicitacao')
      .leftJoin('solicitacao.beneficiario', 'cidadao')
      .leftJoin('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .leftJoin('solicitacao.unidade', 'unidade')
      .select([
        'concessao.id',
        'concessao.dataInicio as data_inicio',
        'concessao.status as status',
        'concessao.ordem_prioridade as prioridade',
        'solicitacao.protocolo as protocolo',
        'solicitacao.determinacao_judicial_flag as determinacao_judicial',
        'cidadao.nome as nome_beneficiario',
        'cidadao.cpf as cpf_beneficiario',
        'tipo_beneficio.nome as nome_beneficio',
        'unidade.nome as nome_unidade',
      ]);

    // Valor padrão para filtro
    if (!filtro) {
      filtro = new FiltroConcessaoDto();
    }

    // Aplicar filtros de busca
    if (filtro.dataInicioDe) {
      qb.andWhere('concessao.dataInicio >= :dataInicioDe', { dataInicioDe: filtro.dataInicioDe });
    }
    if (filtro.dataInicioAte) {
      qb.andWhere('concessao.dataInicio <= :dataInicioAte', { dataInicioAte: filtro.dataInicioAte });
    }
    if (filtro.status) {
      qb.andWhere('concessao.status = :status', { status: filtro.status });
    }
    if (filtro.unidadeId) {
      qb.andWhere('unidade.id = :unidadeId', { unidadeId: filtro.unidadeId });
    }
    if (filtro.tipoBeneficioId) {
      qb.andWhere('tipo_beneficio.id = :tipoBeneficioId', { tipoBeneficioId: filtro.tipoBeneficioId });
    }
    if (filtro.determinacaoJudicial !== undefined) {
      qb.andWhere('solicitacao.determinacao_judicial_flag = :dj', { dj: filtro.determinacaoJudicial });
    }
    if (filtro.prioridade) {
      qb.andWhere('concessao.ordem_prioridade = :prioridade', { prioridade: filtro.prioridade });
    }
    if (filtro.search) {
      const term = `%${filtro.search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(cidadao.nome) LIKE :term OR cidadao.cpf LIKE :cpfTerm OR solicitacao.protocolo ILIKE :termProto)',
        { term, cpfTerm: `%${filtro.search.replace(/\D/g, '')}%`, termProto: term },
      );
    }

    // Obter contagem total antes de aplicar paginação
    const total = await qb.getCount();

    // Calcular limit e offset considerando page
    const limit = filtro.limit ?? 100;
    let offset = filtro.offset ?? 0;
    if (filtro.page !== undefined) {
      offset = (filtro.page - 1) * limit;
    }

    // Aplicar paginação
    qb.limit(limit);
    qb.offset(offset);

    // Buscar dados paginados
    const data = await qb.getRawMany();

    // Retornar estrutura de dados paginados
    return {
      data,
      total,
      limit,
      offset,
    };
  }
  

  async findById(id: string): Promise<Concessao | null> {
    return this.concessaoRepo.findOne({ 
      where: { id },
      relations: ['solicitacao', 'solicitacao.beneficiario', 'solicitacao.tipo_beneficio'],
    });
  }

  async atualizarStatus(id: string, status: StatusConcessao, usuarioId?: string, motivo?: string): Promise<Concessao | null> {
    const concessao = await this.concessaoRepo.findOne({ where: { id } });
    if (!concessao) return null;
    const statusAnterior = concessao.status;
    if (statusAnterior === status) return concessao;

    concessao.status = status;
    await this.concessaoRepo.save(concessao);

    // registra histórico
    const historico = this.historicoRepo.create({
      concessaoId: concessao.id,
      statusAnterior,
      statusNovo: status,
      motivo: motivo ?? null,
      alteradoPor: usuarioId ?? null,
    });
    await this.historicoRepo.save(historico);

    return concessao;
  }

  /**
   * Cria uma prorrogação de concessão (nova concessão vinculada)
   * Prorrogação é sempre por igual período da concessão anterior
   * @param concessaoId ID da concessão a ser prorrogada
   * @param usuarioId ID do usuário que está solicitando a prorrogação
   * @param documentoJudicialId ID opcional do documento judicial para prorrogações judiciais
   * @returns Nova concessão criada
   */
  async prorrogarConcessao(
    concessaoId: string,
    usuarioId: string,
    documentoJudicialId?: string,
  ): Promise<Concessao> {
    // Buscar a concessão original
    const concessaoOriginal = await this.concessaoRepo.findOne({
      where: { id: concessaoId },
      relations: ['solicitacao', 'solicitacao.tipo_beneficio'],
    });

    if (!concessaoOriginal) {
      throw new BadRequestException('Concessão não encontrada');
    }

    if (concessaoOriginal.status !== StatusConcessao.CESSADO) {
      throw new BadRequestException('Apenas concessões com status CESSADO podem ser prorrogadas');
    }

    const solicitacaoOriginal = concessaoOriginal.solicitacao;

    // Para solicitações com determinação judicial, verifica se documento está sendo fornecido
    if (solicitacaoOriginal.determinacao_judicial_flag && !documentoJudicialId && !solicitacaoOriginal.determinacao_judicial_id) {
      throw new BadRequestException(
        'Documento judicial é obrigatório para prorrogações de concessões com determinação judicial'
      );
    }
    
    // Validar limite de prorrogações (máximo 1), exceto por determinação judicial
    if (!solicitacaoOriginal.determinacao_judicial_flag) {
      const concessoesRelacionadas = await this.concessaoRepo.find({
        where: { solicitacaoId: solicitacaoOriginal.id },
      });

      if (concessoesRelacionadas.length > 1) {
        throw new BadRequestException('Esta concessão já foi prorrogada uma vez. Limite máximo atingido.');
      }
    }

    // Obter quantidade de parcelas da concessão original
    const pagamentosOriginais = await this.pagamentoService.findAll({
      concessaoId: concessaoOriginal.id
    }); // Buscar todos os pagamentos da concessão
    
    const quantidadeParcelasOriginal = pagamentosOriginais.pagination.totalItems;
    
    if (quantidadeParcelasOriginal === 0) {
      throw new BadRequestException('Concessão original não possui pagamentos gerados');
    }

    // Validar se o tipo de benefício permite prorrogação
    const tipoBeneficio = solicitacaoOriginal.tipo_beneficio;
    if (!tipoBeneficio) {
      throw new BadRequestException('Tipo de benefício não encontrado');
    }

    if (!solicitacaoOriginal.determinacao_judicial_flag) {
      if (tipoBeneficio.periodicidade === 'unico') {
        throw new BadRequestException('Benefícios de periodicidade única não podem ser prorrogados');
      }
    }

    // Criar nova concessão vinculada à mesma solicitação
    const novaConcessao = this.concessaoRepo.create({
      solicitacaoId: solicitacaoOriginal.id,
      status: StatusConcessao.APTO,
      ordemPrioridade: solicitacaoOriginal.prioridade ?? 3,
      determinacaoJudicialFlag: solicitacaoOriginal.determinacao_judicial_flag,
      dataInicio: new Date(),
    });

    const concessaoSalva = await this.concessaoRepo.save(novaConcessao);

    // Registrar no histórico
    const historico = this.historicoRepo.create({
      concessaoId: concessaoSalva.id,
      statusAnterior: StatusConcessao.APTO,
      statusNovo: StatusConcessao.APTO,
      motivo: solicitacaoOriginal.determinacao_judicial_flag
        ? 'Prorrogação por determinação judicial'
        : 'Prorrogação de concessão anterior',
      alteradoPor: usuarioId,
    });
    await this.historicoRepo.save(historico);

    // Gerar pagamentos para a nova concessão com a mesma quantidade da original
    await this.pagamentoService.gerarPagamentosParaConcessao(
      concessaoSalva,
      solicitacaoOriginal,
      usuarioId
    );

    this.logger.info(
      `Concessão ${concessaoId} prorrogada. Nova concessão ${concessaoSalva.id} criada com ${quantidadeParcelasOriginal} parcelas (mesmo período da concessão anterior)`
    );

    return concessaoSalva;
  }

  async criarSeNaoExistir(solicitacao: Solicitacao): Promise<Concessao> {
    // Ignoramos a validação aqui se a solicitação já passou pelo workflow de aprovação
    // As validações completas são feitas antes no ValidacaoBeneficioService
    // Verifica se já existe concessão para esta solicitação e status ativo
    const existente = await this.concessaoRepo.findOne({
      where: { solicitacaoId: solicitacao.id },
    });
    if (existente) return existente;

    // Calcular data de encerramento baseada na duração do benefício
    const dataInicio = new Date();
    let dataEncerramento: Date | null = null;

    // Para benefícios com duração definida, calcular data de encerramento
    if (solicitacao.tipo_beneficio?.especificacoes?.duracao_maxima_meses) {
      const dataEncerramento = new Date(dataInicio);
      dataEncerramento.setMonth(dataEncerramento.getMonth() + solicitacao.tipo_beneficio.especificacoes.duracao_maxima_meses);
    }

    const concessao = this.concessaoRepo.create({
      solicitacaoId: solicitacao.id,
      status: StatusConcessao.ATIVO,
      ordemPrioridade: solicitacao.prioridade ?? 3,
      determinacaoJudicialFlag: solicitacao.determinacao_judicial_flag,
      dataInicio,
      dataEncerramento,
    });

    const saved = await this.concessaoRepo.save(concessao);
    // Gera pagamentos com status PENDENTE para a concessão criada
    // Nota: usuarioId não está disponível neste contexto, usando 'system'
    await this.pagamentoService.gerarPagamentosParaConcessao(saved, solicitacao, 'system');
    return saved;
  }

  /**
   * Suspende uma concessão ativa
   * @param concessaoId ID da concessão a ser suspensa
   * @param usuarioId ID do usuário que está realizando a suspensão
   * @param motivo Motivo da suspensão
   * @param dataRevisao Data prevista para revisão da suspensão
   * @returns Concessão suspensa
   */
  async suspenderConcessao(
    concessaoId: string,
    usuarioId: string,
    motivo: string,
    dataRevisao?: string,
  ): Promise<Concessao> {
    const concessao = await this.concessaoRepo.findOne({
      where: { id: concessaoId },
      relations: ['solicitacao'],
    });

    if (!concessao) {
      throw new NotFoundException('Concessão não encontrada');
    }

    const statusAnterior = concessao.status;
    concessao.status = StatusConcessao.SUSPENSO;
    concessao.motivoSuspensao = motivo;
    if (dataRevisao) {
      concessao.dataRevisaoSuspensao = new Date(dataRevisao);
    }

    const concessaoSalva = await this.concessaoRepo.save(concessao);

    // Registra no histórico
    await this.historicoRepo.save({
      concessaoId: concessao.id,
      statusAnterior,
      statusNovo: StatusConcessao.SUSPENSO,
      usuarioId,
      motivo,
      dataAlteracao: new Date(),
    });

    this.logger.warn(
      `Concessão ${concessaoId} suspensa por ${usuarioId}. Motivo: ${motivo}`,
      ConcessaoService.name,
    );
    return concessaoSalva;
  }

  /**
   * Bloqueia uma concessão
   * @param concessaoId ID da concessão a ser bloqueada
   * @param usuarioId ID do usuário que está realizando o bloqueio
   * @param motivo Motivo do bloqueio
   * @returns Concessão bloqueada
   */
  async bloquearConcessao(
    concessaoId: string,
    usuarioId: string,
    motivo: string,
  ): Promise<Concessao> {
    const concessao = await this.concessaoRepo.findOne({
      where: { id: concessaoId },
      relations: ['solicitacao'],
    });

    if (!concessao) {
      throw new NotFoundException('Concessão não encontrada');
    }

    const statusAnterior = concessao.status;
    concessao.status = StatusConcessao.BLOQUEADO;
    concessao.motivoBloqueio = motivo;
    concessao.dataBloqueio = new Date();

    const concessaoSalva = await this.concessaoRepo.save(concessao);

    // Registra no histórico
    await this.historicoRepo.save({
      concessaoId: concessao.id,
      statusAnterior,
      statusNovo: StatusConcessao.BLOQUEADO,
      usuarioId,
      motivo,
      dataAlteracao: new Date(),
    });

    this.logger.warn(
      `Concessão ${concessaoId} bloqueada por ${usuarioId}. Motivo: ${motivo}`,
      ConcessaoService.name,
    );
    return concessaoSalva;
  }

    /**
   * Bloqueia uma concessão
   * @param concessaoId ID da concessão a ser bloqueada
   * @param usuarioId ID do usuário que está realizando o bloqueio
   * @param motivo Motivo do bloqueio
   * @returns Concessão bloqueada
   */
  async reativarConcessao(
    concessaoId: string,
    usuarioId: string,
    motivo: string,
  ): Promise<Concessao> {
    const concessao = await this.concessaoRepo.findOne({
      where: { id: concessaoId },
      relations: ['solicitacao'],
    });

    if (!concessao) {
      throw new NotFoundException('Concessão não encontrada');
    }

    const statusAnterior = concessao.status;
    concessao.status = StatusConcessao.ATIVO;
    concessao.motivoBloqueio = motivo;
    concessao.dataBloqueio = new Date();

    const concessaoSalva = await this.concessaoRepo.save(concessao);

    // Registra no histórico
    await this.historicoRepo.save({
      concessaoId: concessao.id,
      statusAnterior,
      statusNovo: StatusConcessao.BLOQUEADO,
      usuarioId,
      motivo,
      dataAlteracao: new Date(),
    });

    this.logger.warn(
      `Concessão ${concessaoId} bloqueada por ${usuarioId}. Motivo: ${motivo}`,
      ConcessaoService.name,
    );
    return concessaoSalva;
  }

  /**
   * Desbloqueia uma concessão bloqueada
   * @param concessaoId ID da concessão a ser desbloqueada
   * @param usuarioId ID do usuário que está realizando o desbloqueio
   * @param motivo Motivo do desbloqueio
   * @returns Concessão desbloqueada
   */
  async desbloquearConcessao(
    concessaoId: string,
    usuarioId: string,
    motivo: string,
  ): Promise<Concessao> {
    const concessao = await this.concessaoRepo.findOne({
      where: { id: concessaoId },
      relations: ['solicitacao'],
    });

    if (!concessao) {
      throw new NotFoundException('Concessão não encontrada');
    }

    if (concessao.status !== StatusConcessao.BLOQUEADO) {
      throw new BadRequestException('Apenas concessões com status BLOQUEADO podem ser desbloqueadas');
    }

    const statusAnterior = concessao.status;
    // Retorna ao status anterior ao bloqueio (geralmente ATIVO)
    concessao.status = StatusConcessao.ATIVO;
    concessao.motivoDesbloqueio = motivo;
    concessao.dataDesbloqueio = new Date();

    const concessaoSalva = await this.concessaoRepo.save(concessao);

    // Registra no histórico
    await this.historicoRepo.save({
      concessaoId: concessao.id,
      statusAnterior,
      statusNovo: StatusConcessao.ATIVO,
      usuarioId,
      motivo,
      dataAlteracao: new Date(),
    });

    this.logger.info(
      `Concessão ${concessaoId} desbloqueada por ${usuarioId}. Motivo: ${motivo}`,
      ConcessaoService.name,
    );
    return concessaoSalva;
  }

  /**
   * Cancela uma concessão ativa
   * 
   * @param concessaoId ID da concessão
   * @param motivo Motivo do cancelamento
   * @param usuarioId ID do usuário que está cancelando
   * @returns Concessão cancelada
   */
  async cancelarConcessao(
    concessaoId: string,
    motivo: string,
    usuarioId: string
  ): Promise<Concessao> {
    const concessao = await this.concessaoRepo.findOne({
      where: { id: concessaoId },
      relations: ['solicitacao', 'solicitacao.cidadao']
    });

    if (!concessao) {
      throw new NotFoundException('Concessão não encontrada');
    }

    if (concessao.status !== StatusConcessao.ATIVO) {
      throw new BadRequestException('Apenas concessões ativas podem ser canceladas');
    }

    // Atualizar status da concessão
     const statusAnterior = concessao.status;
     concessao.status = StatusConcessao.CANCELADO;
     concessao.dataEncerramento = new Date();
     concessao.motivoEncerramento = motivo;

    const concessaoSalva = await this.concessaoRepo.save(concessao);

    // Registrar no histórico
    const historico = this.historicoRepo.create({
      concessaoId: concessaoSalva.id,
      statusAnterior,
      statusNovo: StatusConcessao.CANCELADO,
      motivo,
      alteradoPor: usuarioId,
    });
    await this.historicoRepo.save(historico);

    this.logger.warn(
      `Concessão ${concessaoId} cancelada por usuário ${usuarioId}`,
      ConcessaoService.name,
    );

    return concessaoSalva;
  }

  /**
   * Verifica se todos os pagamentos de uma concessão estão liberados
   * e encerra automaticamente a concessão se necessário
   * 
   * @param concessaoId ID da concessão
   * @returns Concessão atualizada ou null se não precisou ser alterada
   */
  async verificarEncerramentoAutomatico(concessaoId: string): Promise<Concessao | null> {
    const concessao = await this.concessaoRepo.findOne({
      where: { id: concessaoId },
      relations: ['pagamentos']
    });

    if (!concessao) {
      throw new NotFoundException('Concessão não encontrada');
    }

    // Só verifica concessões ativas
    if (concessao.status !== StatusConcessao.ATIVO) {
      return null;
    }

    // Verifica se há pagamentos
    if (!concessao.pagamentos || concessao.pagamentos.length === 0) {
      return null;
    }

    // Verifica se todos os pagamentos estão liberados
    const todosLiberados = concessao.pagamentos.every(
      pagamento => pagamento.status === StatusPagamentoEnum.LIBERADO
    );

    if (todosLiberados) {
      const statusAnterior = concessao.status;
      concessao.status = StatusConcessao.CESSADO;
      concessao.dataEncerramento = new Date();
      concessao.motivoEncerramento = 'Encerramento automático - todos os pagamentos liberados';

      const concessaoSalva = await this.concessaoRepo.save(concessao);

      // Registra no histórico
      await this.historicoRepo.save({
        concessaoId: concessao.id,
        statusAnterior,
        statusNovo: StatusConcessao.CESSADO,
        motivo: 'Encerramento automático - todos os pagamentos liberados',
        alteradoPor: 'SISTEMA',
        dataAlteracao: new Date(),
      });

      this.logger.info(
        `Concessão ${concessaoId} encerrada automaticamente - todos os pagamentos liberados`,
        ConcessaoService.name,
      );
      return concessaoSalva;
    }

    return null;
  }
}
