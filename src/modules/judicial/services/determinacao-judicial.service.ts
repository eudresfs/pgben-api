import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, FindManyOptions, Like, LessThanOrEqual, MoreThanOrEqual, LessThan } from 'typeorm';
import { DeterminacaoJudicial, TipoDeterminacaoJudicial } from '../entities/determinacao-judicial.entity';
import { ProcessoJudicialService } from './processo-judicial.service';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';

/**
 * Serviço para gerenciamento de determinações judiciais
 * 
 * Este serviço implementa operações CRUD e consultas específicas
 * para determinações judiciais, incluindo busca por processo, solicitação e cidadão.
 */
@Injectable()
export class DeterminacaoJudicialService {
  private readonly logger = new Logger(DeterminacaoJudicialService.name);

  constructor(
    @InjectRepository(DeterminacaoJudicial)
    private readonly determinacaoRepository: Repository<DeterminacaoJudicial>,
    private readonly processoJudicialService: ProcessoJudicialService
  ) {}

  /**
   * Cria uma nova determinação judicial
   * 
   * @param data Dados da determinação judicial a ser criada
   * @param usuarioId ID do usuário que está criando a determinação
   * @returns A determinação judicial criada
   */
  async create(data: Partial<DeterminacaoJudicial>, usuarioId: string): Promise<DeterminacaoJudicial> {
    this.logger.log(`Criando determinação judicial: ${JSON.stringify(data)}`);
    
    // Verificar se o processo judicial existe e se o ID foi fornecido
    if (!data.processo_judicial_id) {
      throw new BadRequestException('ID do processo judicial é obrigatório');
    }
    
    await this.processoJudicialService.findById(data.processo_judicial_id);
    
    // Criar a nova determinação
    const novaDeterminacao = this.determinacaoRepository.create({
      ...data,
      usuario_id: usuarioId,
      created_by: usuarioId,
      updated_by: usuarioId
    });

    return this.determinacaoRepository.save(novaDeterminacao);
  }

  /**
   * Busca uma determinação judicial pelo ID
   * 
   * @param id ID da determinação judicial
   * @returns A determinação judicial encontrada
   * @throws NotFoundException se a determinação não for encontrada
   */
  async findById(id: string): Promise<DeterminacaoJudicial> {
    const determinacao = await this.determinacaoRepository.findOne({
      where: { id },
      relations: ['processo_judicial']
    });

    if (!determinacao) {
      throw new NotFoundException(`Determinação judicial com ID ${id} não encontrada`);
    }

    return determinacao;
  }

  /**
   * Lista determinações judiciais com paginação e filtros
   * 
   * @param options Opções de busca e paginação
   * @returns Lista paginada de determinações judiciais
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    processoJudicialId?: string;
    solicitacaoId?: string;
    cidadaoId?: string;
    tipo?: TipoDeterminacaoJudicial;
    cumprida?: boolean;
    termo?: string;
  }): Promise<PaginatedResult<DeterminacaoJudicial>> {
    const {
      page = 1,
      limit = 10,
      processoJudicialId,
      solicitacaoId,
      cidadaoId,
      tipo,
      cumprida,
      termo
    } = options;

    const where: FindOptionsWhere<DeterminacaoJudicial> = { ativo: true };
    
    // Aplicar filtros
    if (processoJudicialId) {
      where.processo_judicial_id = processoJudicialId;
    }
    
    if (solicitacaoId) {
      where.solicitacao_id = solicitacaoId;
    }
    
    if (cidadaoId) {
      where.cidadao_id = cidadaoId;
    }
    
    if (tipo) {
      where.tipo = tipo;
    }
    
    if (cumprida !== undefined) {
      where.cumprida = cumprida;
    }
    
    const findOptions: FindManyOptions<DeterminacaoJudicial> = {
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: {
        data_determinacao: 'DESC'
      },
      relations: ['processo_judicial']
    };
    
    // Aplicar busca por texto, se fornecido
    if (termo) {
      findOptions.where = [
        { ...where, numero_processo: Like(`%${termo}%`) },
        { ...where, numero_determinacao: Like(`%${termo}%`) },
        { ...where, descricao: Like(`%${termo}%`) }
      ];
    }

    const [determinacoes, total] = await this.determinacaoRepository.findAndCount(findOptions);

    return {
      data: determinacoes,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Busca determinações judiciais por processo judicial
   * 
   * @param processoJudicialId ID do processo judicial
   * @returns Lista de determinações judiciais
   */
  async findByProcessoJudicial(processoJudicialId: string): Promise<DeterminacaoJudicial[]> {
    return this.determinacaoRepository.find({
      where: { processo_judicial_id: processoJudicialId, ativo: true },
      order: { data_determinacao: 'DESC' }
    });
  }

  /**
   * Busca determinações judiciais por solicitação
   * 
   * @param solicitacaoId ID da solicitação
   * @returns Lista de determinações judiciais
   */
  async findBySolicitacao(solicitacaoId: string): Promise<DeterminacaoJudicial[]> {
    return this.determinacaoRepository.find({
      where: { solicitacao_id: solicitacaoId, ativo: true },
      order: { data_determinacao: 'DESC' },
      relations: ['processo_judicial']
    });
  }

  /**
   * Busca determinações judiciais por cidadão
   * 
   * @param cidadaoId ID do cidadão
   * @returns Lista de determinações judiciais
   */
  async findByCidadao(cidadaoId: string): Promise<DeterminacaoJudicial[]> {
    return this.determinacaoRepository.find({
      where: { cidadao_id: cidadaoId, ativo: true },
      order: { data_determinacao: 'DESC' },
      relations: ['processo_judicial']
    });
  }

  /**
   * Atualiza uma determinação judicial
   * 
   * @param id ID da determinação judicial
   * @param data Dados atualizados da determinação
   * @param usuarioId ID do usuário que está atualizando a determinação
   * @returns A determinação judicial atualizada
   * @throws NotFoundException se a determinação não for encontrada
   */
  async update(id: string, data: Partial<DeterminacaoJudicial>, usuarioId: string): Promise<DeterminacaoJudicial> {
    const determinacao = await this.findById(id);
    
    this.logger.log(`Atualizando determinação judicial ${id}: ${JSON.stringify(data)}`);
    
    // Atualizar os dados da determinação
    this.determinacaoRepository.merge(determinacao, {
      ...data,
      updated_by: usuarioId
    });

    return this.determinacaoRepository.save(determinacao);
  }

  /**
   * Marca uma determinação judicial como cumprida
   * 
   * @param id ID da determinação judicial
   * @param observacao Observação sobre o cumprimento
   * @param usuarioId ID do usuário que está marcando a determinação como cumprida
   * @returns A determinação judicial atualizada
   * @throws NotFoundException se a determinação não for encontrada
   */
  async marcarComoCumprida(id: string, observacao: string, usuarioId: string): Promise<DeterminacaoJudicial> {
    const determinacao = await this.findById(id);
    
    if (determinacao.cumprida) {
      throw new BadRequestException('Esta determinação judicial já está marcada como cumprida');
    }
    
    this.logger.log(`Marcando determinação judicial ${id} como cumprida`);
    
    // Atualizar o status da determinação
    determinacao.cumprida = true;
    determinacao.data_cumprimento = new Date();
    determinacao.observacao_cumprimento = observacao;
    determinacao.updated_by = usuarioId;
    
    return this.determinacaoRepository.save(determinacao);
  }

  /**
   * Desativa (soft delete) uma determinação judicial
   * 
   * @param id ID da determinação judicial
   * @param usuarioId ID do usuário que está desativando a determinação
   * @returns Verdadeiro se a operação foi bem-sucedida
   * @throws NotFoundException se a determinação não for encontrada
   */
  async desativar(id: string, usuarioId: string): Promise<boolean> {
    const determinacao = await this.findById(id);
    
    this.logger.log(`Desativando determinação judicial ${id}`);
    
    // Desativar a determinação
    determinacao.ativo = false;
    determinacao.updated_by = usuarioId;
    
    await this.determinacaoRepository.save(determinacao);
    return true;
  }

  /**
   * Retorna determinações judiciais com prazo próximo de expirar ou expirado
   * 
   * @param diasAviso Número de dias para considerar como prazo próximo
   * @returns Lista de determinações judiciais
   */
  async findDeterminacoesComPrazoProximo(diasAviso: number = 7): Promise<DeterminacaoJudicial[]> {
    const hoje = new Date();
    const limiteDias = new Date();
    limiteDias.setDate(hoje.getDate() + diasAviso);
    
    return this.determinacaoRepository.find({
      where: {
        ativo: true,
        cumprida: false,
        data_prazo: MoreThanOrEqual(hoje) && LessThanOrEqual(limiteDias)
      },
      order: { data_prazo: 'ASC' },
      relations: ['processo_judicial']
    });
  }

  /**
   * Retorna determinações judiciais com prazo expirado
   * 
   * @returns Lista de determinações judiciais
   */
  async findDeterminacoesComPrazoExpirado(): Promise<DeterminacaoJudicial[]> {
    const hoje = new Date();
    
    return this.determinacaoRepository.find({
      where: {
        ativo: true,
        cumprida: false,
        data_prazo: LessThan(hoje)
      },
      order: { data_prazo: 'ASC' },
      relations: ['processo_judicial']
    });
  }
}

// Nenhuma função auxiliar é necessária, pois estamos usando os operadores integrados do TypeORM
