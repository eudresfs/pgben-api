import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DeterminacaoJudicial } from '../../../entities/determinacao-judicial.entity';
import { Solicitacao } from '../../../entities/solicitacao.entity';
import { SolicitacaoCreateDeterminacaoJudicialDto } from '../dto/create-determinacao-judicial.dto';
import { SolicitacaoUpdateDeterminacaoJudicialDto } from '../dto/update-determinacao-judicial.dto';

/**
 * Serviço de Determinação Judicial
 *
 * Responsável por gerenciar as determinações judiciais relacionadas às solicitações
 * de benefício, permitindo o controle e rastreamento de processos judiciais.
 */
@Injectable()
export class DeterminacaoJudicialService {
  private readonly logger = new Logger(DeterminacaoJudicialService.name);

  constructor(
    @InjectRepository(DeterminacaoJudicial)
    private readonly determinacaoRepository: Repository<DeterminacaoJudicial>,
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Cria uma nova determinação judicial
   * @param createDeterminacaoDto Dados da determinação judicial
   * @param usuarioId ID do usuário que está criando a determinação
   * @returns Determinação judicial criada
   */
  async create(
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
   * Busca uma determinação judicial pelo ID
   * @param id ID da determinação judicial
   * @returns Determinação judicial
   */
  async findById(id: string): Promise<DeterminacaoJudicial> {
    try {
      const determinacao = await this.determinacaoRepository.findOne({
        where: { id },
        relations: ['solicitacao'],
      });

      if (!determinacao) {
        throw new NotFoundException('Determinação judicial não encontrada');
      }

      return determinacao;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Erro ao buscar determinação judicial: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao buscar determinação judicial',
      );
    }
  }

  /**
   * Atualiza uma determinação judicial
   * @param id ID da determinação judicial
   * @param updateDeterminacaoDto Dados para atualização
   * @returns Determinação judicial atualizada
   */
  async update(
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
      return this.findById(id);
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
   * Registra o cumprimento de uma determinação judicial
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
      return this.findById(id);
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
   * Remove uma determinação judicial
   * @param id ID da determinação judicial
   * @returns Void
   */
  async remove(id: string): Promise<void> {
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
}
