import { Injectable, Logger } from '@nestjs/common';
import {
  throwUnidadeNotFound,
  throwSetorNotFound,
  throwSetorAlreadyExists,
  throwSetorOperationFailed,
} from '../../../shared/exceptions/error-catalog/domains/unidade.errors';
import { DataSource, Not } from 'typeorm';
import { SetorRepository } from '../repositories/setor.repository';
import { UnidadeRepository } from '../repositories/unidade.repository';
import { CreateSetorDto } from '../dto/create-setor.dto';
import { UpdateSetorDto } from '../dto/update-setor.dto';
import { Setor } from '../../../entities/setor.entity';

/**
 * Serviço de setores
 *
 * Responsável pela lógica de negócio relacionada a setores
 */
@Injectable()
export class SetorService {
  private readonly logger = new Logger(SetorService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly setorRepository: SetorRepository,
    private readonly unidadeRepository: UnidadeRepository,
  ) {}

  /**
   * Cria um novo setor
   * @param createSetorDto Dados do setor
   * @returns Setor criado
   */
  async create(createSetorDto: CreateSetorDto) {
    this.logger.log(
      `Iniciando criação de setor: ${JSON.stringify(createSetorDto)}`,
    );

    // Validações iniciais
    if (!createSetorDto.unidade_id) {
      this.logger.error('ID da unidade não fornecido');
      throwSetorOperationFailed({ setorId: undefined });
    }

    try {
      // Usar transação para garantir consistência
      return await this.dataSource.transaction(async (manager) => {
        const unidadeRepo = manager.getRepository('unidade');
        const setorRepo = manager.getRepository('setor');

        // Verificar se a unidade existe
        this.logger.log(
          `Buscando unidade com ID: ${createSetorDto.unidade_id}`,
        );
        const unidade = await unidadeRepo.findOne({
          where: { id: createSetorDto.unidade_id },
        });
        if (!unidade) {
          this.logger.error(
            `Unidade não encontrada: ${createSetorDto.unidade_id}`,
          );
          throwUnidadeNotFound(createSetorDto.unidade_id);
        }

        // Verificar se já existe um setor com o mesmo nome na mesma unidade
        if (createSetorDto.nome) {
          const setorExistente = await setorRepo.findOne({
            where: {
              nome: createSetorDto.nome,
              unidade_id: createSetorDto.unidade_id,
            },
          });

          if (setorExistente) {
            this.logger.error(
              `Já existe um setor com o nome '${createSetorDto.nome}' nesta unidade`,
            );
            throwSetorAlreadyExists({ setorId: undefined });
          }
        }

        // Verificar se já existe um setor com a mesma sigla na mesma unidade (se fornecida)
        if (createSetorDto.sigla) {
          const setorExistente = await setorRepo.findOne({
            where: {
              sigla: createSetorDto.sigla,
              unidade_id: createSetorDto.unidade_id,
            },
          });

          if (setorExistente) {
            this.logger.error(
              `Já existe um setor com a sigla '${createSetorDto.sigla}' nesta unidade`,
            );
            throwSetorAlreadyExists({ setorId: undefined });
          }
        }

        // Mapear DTO para a entidade
        const { unidade_id, ...setorData } = createSetorDto;

        // Criar o objeto do setor com os dados básicos
        const setor = new Setor();
        Object.assign(setor, setorData);
        setor.unidade_id = unidade_id;

        this.logger.log(`Dados do setor mapeados: ${JSON.stringify(setor)}`);

        // Criar setor
        const setorCriado = await setorRepo.save(setor);
        this.logger.log(`Setor criado com sucesso: ${setorCriado.id}`);

        return setorCriado;
      });
    } catch (error) {
      this.logger.error(`Erro ao criar setor: ${error.message}`, error.stack);

      // Re-throw erros do catálogo
      if (error.name === 'AppError') {
        throw error;
      }

      // Se for um erro de validação do banco de dados
      if (error.code === '23505') {
        // Código de violação de chave única
        throwSetorAlreadyExists({ setorId: undefined });
      }

      // Se for um erro de chave estrangeira
      if (error.code === '23503') {
        throwSetorOperationFailed({ setorId: undefined });
      }

      throwSetorOperationFailed({ setorId: undefined });
    }
  }

  /**
   * Atualiza um setor existente
   * @param id ID do setor
   * @param updateSetorDto Dados a serem atualizados
   * @returns Setor atualizado
   */
  async update(id: string, updateSetorDto: UpdateSetorDto) {
    this.logger.log(
      `Atualizando setor ${id} com dados: ${JSON.stringify(updateSetorDto)}`,
    );

    try {
      // Usar transação para garantir consistência
      return await this.dataSource.transaction(async (manager) => {
        const setorRepo = manager.getRepository('setor');
        const unidadeRepo = manager.getRepository('unidade');

        // Verificar se setor existe
        const setorExistente = await setorRepo.findOne({ where: { id } });
        if (!setorExistente) {
          this.logger.error(`Setor não encontrado: ${id}`);
          throwSetorNotFound(id);
        }

        // Verificar se a unidade existe (se fornecida)
        let novaUnidadeId = setorExistente.unidade_id;
        if (
          updateSetorDto.unidade_id &&
          updateSetorDto.unidade_id !== setorExistente.unidade_id
        ) {
          this.logger.log(
            `Validando unidade com ID: ${updateSetorDto.unidade_id}`,
          );
          const unidade = await unidadeRepo.findOne({
            where: { id: updateSetorDto.unidade_id },
          });
          if (!unidade) {
            this.logger.error(
              `Unidade não encontrada: ${updateSetorDto.unidade_id}`,
            );
            throwUnidadeNotFound(updateSetorDto.unidade_id);
          }
          novaUnidadeId = updateSetorDto.unidade_id;
        }

        // Verificar se já existe um setor com o mesmo nome na mesma unidade (se o nome for alterado)
        if (
          updateSetorDto.nome &&
          updateSetorDto.nome !== setorExistente.nome
        ) {
          const setorExistenteComMesmoNome = await setorRepo.findOne({
            where: {
              nome: updateSetorDto.nome,
              unidade_id: novaUnidadeId,
              id: Not(id), // Excluir o próprio setor da busca
            },
          });

          if (setorExistenteComMesmoNome) {
            this.logger.error(
              `Já existe um setor com o nome '${updateSetorDto.nome}' nesta unidade`,
            );
            throwSetorAlreadyExists({ setorId: id });
          }
        }

        // Verificar se já existe um setor com a mesma sigla na mesma unidade (se a sigla for alterada)
        if (
          updateSetorDto.sigla &&
          updateSetorDto.sigla !== setorExistente.sigla
        ) {
          const setorExistenteComMesmaSigla = await setorRepo.findOne({
            where: {
              sigla: updateSetorDto.sigla,
              unidade_id: novaUnidadeId,
              id: Not(id), // Excluir o próprio setor da busca
            },
          });

          if (setorExistenteComMesmaSigla) {
            this.logger.error(
              `Já existe um setor com a sigla '${updateSetorDto.sigla}' nesta unidade`,
            );
            throwSetorAlreadyExists({ setorId: id });
          }
        }

        // Atualizar setor
        await setorRepo.update(id, {
          ...updateSetorDto,
          unidade_id: novaUnidadeId,
        });

        // Buscar setor atualizado
        const setorAtualizado = await setorRepo.findOne({ where: { id } });
        if (!setorAtualizado) {
          throwSetorNotFound(id);
        }

        this.logger.log(`Setor ${id} atualizado com sucesso`);

        return setorAtualizado;
      });
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar setor ${id}: ${error.message}`,
        error.stack,
      );

      // Re-throw erros do catálogo
      if (error.name === 'AppError') {
        throw error;
      }

      // Se for um erro de validação do banco de dados
      if (error.code === '23505') {
        // Código de violação de chave única
        throwSetorAlreadyExists({ setorId: undefined });
      }

      throwSetorOperationFailed({ setorId: id });
    }
  }

  /**
   * Busca um setor pelo ID
   * @param id ID do setor
   * @returns Setor encontrado
   */
  async findById(id: string) {
    this.logger.log(`Buscando setor com ID: ${id}`);

    try {
      const setor = await this.setorRepository.findById(id);

      if (!setor) {
        this.logger.warn(`Setor não encontrado: ${id}`);
        throwSetorNotFound(id);
      }

      return setor;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar setor ${id}: ${error.message}`,
        error.stack,
      );
      // Re-throw erros do catálogo
      if (error.name === 'AppError') {
        throw error;
      }
      throwSetorOperationFailed({ setorId: id });
    }
  }

  /**
   * Busca setores por unidade
   * @param unidadeId ID da unidade
   * @returns Lista de setores da unidade
   */
  async findByUnidadeId(unidadeId: string) {
    this.logger.log(`Buscando setores da unidade com ID: ${unidadeId}`);

    try {
      // Verificar se a unidade existe
      const unidade = await this.unidadeRepository.findById(unidadeId);
      if (!unidade) {
        this.logger.warn(`Unidade não encontrada: ${unidadeId}`);
        throwUnidadeNotFound(unidadeId);
      }

      // Buscar setores
      const setores = await this.setorRepository.findByUnidadeId(unidadeId);
      this.logger.log(
        `Encontrados ${setores.length} setores para a unidade ${unidadeId}`,
      );

      return {
        items: setores,
        meta: {
          total: setores.length,
          unidadeId,
        },
      };
    } catch (error) {
      this.logger.error(
        `Erro ao buscar setores da unidade ${unidadeId}: ${error.message}`,
        error.stack,
      );
      // Re-throw erros do catálogo
      if (error.name === 'AppError') {
        throw error;
      }
      throwSetorOperationFailed({ unidadeId });
    }
  }
}
