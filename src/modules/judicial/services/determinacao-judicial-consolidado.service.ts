import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, FindManyOptions, Like, LessThanOrEqual, MoreThanOrEqual, LessThan, DataSource } from 'typeorm';
import { DeterminacaoJudicial, TipoDeterminacaoJudicial } from '../entities/determinacao-judicial.entity';
import { ProcessoJudicialService } from './processo-judicial.service';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { CreateDeterminacaoJudicialDto, UpdateDeterminacaoJudicialDto } from '../dtos/determinacao-judicial.dto';
import { SolicitacaoCreateDeterminacaoJudicialDto } from '../../solicitacao/dto/create-determinacao-judicial.dto';
import { SolicitacaoUpdateDeterminacaoJudicialDto } from '../../solicitacao/dto/update-determinacao-judicial.dto';
import { Solicitacao } from '../../solicitacao/entities/solicitacao.entity';

/**
 * Serviço consolidado para gerenciamento de determinações judiciais
 * 
 * Este serviço unifica as funcionalidades dos módulos judicial e solicitação,
 * mantendo a separação de responsabilidades através de métodos específicos.
 * 
 * Funcionalidades:
 * - Gestão completa de determinações judiciais (CRUD)
 * - Integração com processos judiciais
 * - Integração com solicitações de benefício
 * - Controle de prazos e vencimentos
 * - Transações atômicas para operações complexas
 * - Soft delete e hard delete conforme contexto
 */
@Injectable()
export class DeterminacaoJudicialConsolidadoService {
  private readonly logger = new Logger(DeterminacaoJudicialConsolidadoService.name);

  constructor(
    @InjectRepository(DeterminacaoJudicial)
    private readonly determinacaoRepository: Repository<DeterminacaoJudicial>,
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
    private readonly processoJudicialService: ProcessoJudicialService,
    private readonly dataSource: DataSource,
  ) {}

  // ========================================
  // MÉTODOS PRINCIPAIS (CONTEXTO JUDICIAL)
  // ========================================

  /**
   * Cria uma nova determinação judicial no contexto judicial
   * 
   * @param data Dados da determinação judicial a ser criada
   * @param usuarioId ID do usuário que está criando a determinação
   * @returns A determinação judicial criada
   */
  async create(data: CreateDeterminacaoJudicialDto, usuarioId: string): Promise<DeterminacaoJudicial> {
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
   * @param includeRelations Relações a incluir na busca
   * @returns A determinação judicial encontrada
   * @throws NotFoundException se a determinação não for encontrada
   */
  async findById(id: string, includeRelations: string[] = ['processo_judicial']): Promise<DeterminacaoJudicial> {
    const determinacao = await this.determinacaoRepository.findOne({
      where: { id },
      relations: includeRelations
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
   * Atualiza uma determinação judicial
   * 
   * @param id ID da determinação judicial
   * @param data Dados atualizados da determinação
   * @param usuarioId ID do usuário que está atualizando a determinação
   * @returns A determinação judicial atualizada
   * @throws NotFoundException se a determinação não for encontrada
   */
  async update(id: string, data: UpdateDeterminacaoJudicialDto, usuarioId: string): Promise<DeterminacaoJudicial> {
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

  // ========================================
  // MÉTODOS ESPECÍFICOS PARA SOLICITAÇÕES
  // ========================================

  /**
   * Cria uma nova determinação judicial no contexto de solicitação
   * 
   * @param createDeterminacaoDto Dados da determinação judicial
   * @param usuarioId ID do usuário que está criando a determinação
   * @returns Determinação judicial criada
   */
  async createForSolicitacao(
    createDeterminacaoDto: SolicitacaoCreateDeterminacaoJudicialDto,
    usuarioId: string,
  ): Promise<DeterminacaoJudicial> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verificar se a solicitação existe
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: createDeterminacaoDto.solicitacao_id },
      });

      if (!solicitacao) {
        throw new NotFoundException('Solicitação de benefício não encontrada');
      }

      // Verificar se já existe determinação com o mesmo número de processo para a solicitação
      const determinacaoExistente = await this.determinacaoRepository.findOne({
        where: {
          solicitacao_id: createDeterminacaoDto.solicitacao_id,
          numero_processo: createDeterminacaoDto.numero_processo,
        },
      });

      if (determinacaoExistente) {
        throw new ConflictException(
          'Já existe uma determinação judicial com este número de processo para esta solicitação',
        );
      }

      // Criar a determinação judicial
      const novaDeterminacao = this.determinacaoRepository.create({
        ...createDeterminacaoDto,
        usuario_id: usuarioId,
      });

      const determinacaoSalva = await queryRunner.manager.save(novaDeterminacao);

      // Atualizar a solicitação para indicar que possui determinação judicial
      await queryRunner.manager.update(
        Solicitacao,
        { id: createDeterminacaoDto.solicitacao_id },
        {
          determinacao_judicial_flag: true,
          determinacao_judicial_id: determinacaoSalva.id,
        },
      );

      await queryRunner.commitTransaction();

      return determinacaoSalva;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }

      this.logger.error(
        `Erro ao criar determinação judicial: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao criar determinação judicial',
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Busca todas as determinações judiciais de uma solicitação
   * @param solicitacaoId ID da solicitação
   * @returns Lista de determinações judiciais
   */
  async findBySolicitacaoId(solicitacaoId: string): Promise<DeterminacaoJudicial[]> {
    try {
      // Verificar se a solicitação existe
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
      });

      if (!solicitacao) {
        throw new NotFoundException('Solicitação de benefício não encontrada');
      }

      return this.determinacaoRepository.find({
        where: { solicitacao_id: solicitacaoId },
        order: { data_determinacao: 'DESC' },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Erro ao buscar determinações judiciais: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao buscar determinações judiciais',
      );
    }
  }

  /**
   * Atualiza uma determinação judicial no contexto de solicitação
   * @param id ID da determinação judicial
   * @param updateDeterminacaoDto Dados para atualização
   * @returns Determinação judicial atualizada
   */
  async updateForSolicitacao(
    id: string,
    updateDeterminacaoDto: SolicitacaoUpdateDeterminacaoJudicialDto,
  ): Promise<DeterminacaoJudicial> {
    try {
      // Verificar se a determinação existe
      const determinacao = await this.determinacaoRepository.findOne({
        where: { id },
      });

      if (!determinacao) {
        throw new NotFoundException('Determinação judicial não encontrada');
      }

      // Atualizar a determinação
      await this.determinacaoRepository.update(id, updateDeterminacaoDto);

      // Retornar a determinação atualizada
      return this.findById(id, ['solicitacao']);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Erro ao atualizar determinação judicial: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao atualizar determinação judicial',
      );
    }
  }

  /**
   * Registra o cumprimento de uma determinação judicial (alias para marcarComoCumprida)
   * @param id ID da determinação judicial
   * @param observacoes Observações sobre o cumprimento
   * @returns Determinação judicial atualizada
   */
  async registrarCumprimento(
    id: string,
    observacoes?: string,
  ): Promise<DeterminacaoJudicial> {
    try {
      // Verificar se a determinação existe
      const determinacao = await this.determinacaoRepository.findOne({
        where: { id },
      });

      if (!determinacao) {
        throw new NotFoundException('Determinação judicial não encontrada');
      }

      // Atualizar a determinação com a data de cumprimento
      const updateData: Partial<DeterminacaoJudicial> = {
        data_cumprimento: new Date(),
      };

      if (observacoes) {
        updateData.observacao_cumprimento = observacoes;
      }

      await this.determinacaoRepository.update(id, updateData);

      // Retornar a determinação atualizada
      return this.findById(id, ['solicitacao']);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Erro ao registrar cumprimento de determinação judicial: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao registrar cumprimento de determinação judicial',
      );
    }
  }

  /**
   * Remove uma determinação judicial do contexto de solicitação
   * @param id ID da determinação judicial
   * @returns Void
   */
  async removeFromSolicitacao(id: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verificar se a determinação existe
      const determinacao = await this.determinacaoRepository.findOne({
        where: { id },
        relations: ['solicitacao'],
      });

      if (!determinacao) {
        throw new NotFoundException('Determinação judicial não encontrada');
      }

      // Verificar se é a determinação principal da solicitação
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { determinacao_judicial_id: id },
      });

      if (solicitacao) {
        // Se for a determinação principal, verificar se há outras determinações
        const outrasDeterminacoes = await this.determinacaoRepository.find({
          where: { solicitacao_id: determinacao.solicitacao_id },
        });

        if (outrasDeterminacoes.length > 1) {
          // Se houver outras determinações, definir a mais recente como principal
          const outrasDeterminacoesOrdenadas = outrasDeterminacoes
            .filter(det => det.id !== id)
            .sort((a, b) => b.data_determinacao.getTime() - a.data_determinacao.getTime());

          // Atualizar a solicitação com a nova determinação principal
          await queryRunner.manager.update(
            Solicitacao,
            { id: determinacao.solicitacao_id },
            { determinacao_judicial_id: outrasDeterminacoesOrdenadas[0].id },
          );
        } else {
          // Se não houver outras determinações, remover a referência na solicitação
          await queryRunner.manager.update(
            Solicitacao,
            { id: determinacao.solicitacao_id },
            {
              determinacao_judicial_flag: false,
              determinacao_judicial_id: null as unknown as string,
            },
          );
        }
      }

      // Remover a determinação
      await queryRunner.manager.remove(determinacao);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Erro ao remover determinação judicial: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao remover determinação judicial',
      );
    } finally {
      await queryRunner.release();
    }
  }

  // ========================================
  // MÉTODOS DE BUSCA ESPECIALIZADOS
  // ========================================

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

  // ========================================
  // MÉTODOS DE GESTÃO DE PRAZOS
  // ========================================

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

  /**
   * Busca determinações judiciais pendentes de cumprimento
   * 
   * @returns Lista de determinações judiciais pendentes
   */
  async findPendentes(): Promise<DeterminacaoJudicial[]> {
    return this.determinacaoRepository.find({
      where: {
        ativo: true,
        cumprida: false
      },
      order: { data_determinacao: 'DESC' },
      relations: ['processo_judicial']
    });
  }

  /**
   * Alterna o status ativo/inativo de uma determinação judicial
   * 
   * @param id ID da determinação judicial
   * @param usuarioId ID do usuário que está alterando o status
   * @returns A determinação judicial atualizada
   * @throws NotFoundException se a determinação não for encontrada
   */
  async toggleAtivo(id: string, usuarioId: string): Promise<DeterminacaoJudicial> {
    const determinacao = await this.findById(id);
    
    this.logger.log(`Alternando status ativo da determinação judicial ${id}`);
    
    // Alternar o status ativo
    determinacao.ativo = !determinacao.ativo;
    determinacao.updated_by = usuarioId;
    
    return this.determinacaoRepository.save(determinacao);
  }

  /**
   * Remove permanentemente uma determinação judicial
   * 
   * @param id ID da determinação judicial
   * @returns Void
   * @throws NotFoundException se a determinação não for encontrada
   */
  async remove(id: string): Promise<void> {
    const determinacao = await this.findById(id);
    
    this.logger.log(`Removendo determinação judicial ${id}`);
    
    await this.determinacaoRepository.remove(determinacao);
  }
}