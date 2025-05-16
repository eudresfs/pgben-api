import { Injectable, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { Repository, DataSource, QueryFailedError } from 'typeorm';
import { Setor } from '../entities/setor.entity';
import { Unidade } from '../entities/unidade.entity';

/**
 * Repositório de setores
 * 
 * Responsável por operações de acesso a dados relacionadas a setores
 */
@Injectable()
export class SetorRepository {
  private repository: Repository<Setor>;
  private readonly logger = new Logger(SetorRepository.name);

  constructor(private dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(Setor);
  }

  /**
   * Busca todos os setores com filtros e paginação
   * @param options Opções de filtro e paginação
   * @returns Lista de setores paginada
   */
  async findAll(options?: {
    skip?: number;
    take?: number;
    where?: any;
    order?: any;
  }): Promise<[Setor[], number]> {
    try {
      this.logger.log('Buscando todos os setores com opções:', JSON.stringify(options));
      
      const { skip = 0, take = 10, where = {}, order = { created_at: 'DESC' } } = options || {};
      
      const result = await this.repository.findAndCount({
        skip,
        take,
        where,
        order,
      });
      
      this.logger.log(`Encontrados ${result[1]} setores`);
      return result;
    } catch (error) {
      this.logger.error(`Erro ao buscar setores: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao buscar setores');
    }
  }

  /**
   * Busca um setor pelo ID
   * @param id ID do setor
   * @returns Setor encontrado ou null
   */
  async findById(id: string): Promise<Setor | null> {
    try {
      this.logger.log(`Buscando setor por ID: ${id}`);
      const setor = await this.repository.findOne({ where: { id } });
      
      if (!setor) {
        this.logger.warn(`Setor não encontrado: ${id}`);
      } else {
        this.logger.debug(`Setor encontrado: ${JSON.stringify(setor)}`);
      }
      
      return setor;
    } catch (error) {
      this.logger.error(`Erro ao buscar setor por ID ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao buscar setor');
    }
  }

  /**
   * Busca setores por unidade
   * @param unidadeId ID da unidade
   * @returns Lista de setores da unidade
   */
  async findByUnidadeId(unidadeId: string): Promise<Setor[]> {
    try {
      this.logger.log(`Buscando setores da unidade: ${unidadeId}`);
      
      const setores = await this.repository.find({ 
        where: { unidade_id: unidadeId },
        order: { nome: 'ASC' }
      });
      
      this.logger.log(`Encontrados ${setores.length} setores para a unidade ${unidadeId}`);
      return setores;
    } catch (error) {
      this.logger.error(`Erro ao buscar setores da unidade ${unidadeId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao buscar setores da unidade');
    }
  }

  /**
   * Cria um novo setor
   * @param data Dados do setor
   * @returns Setor criado
   */
  async create(data: Partial<Setor>): Promise<Setor> {
    try {
      this.logger.log('Criando novo setor com dados:', JSON.stringify(data));
      
      // Extrai o relacionamento com a unidade, se existir
      const { unidade, ...setorData } = data;
      
      // Cria o setor com os dados básicos
      const setor = this.repository.create(setorData);
      
      // Se houver relacionamento com a unidade, carrega a unidade completa
      if (data.unidade_id) {
        const unidade = await this.dataSource.getRepository(Unidade).findOne({ 
          where: { id: data.unidade_id } 
        });
        
        if (unidade) {
          setor.unidade = unidade;
        }
      }
      
      const setorSalvo = await this.repository.save(setor);
      
      this.logger.log(`Setor criado com sucesso: ${setorSalvo.id}`);
      return setorSalvo;
    } catch (error) {
      this.logger.error('Erro ao criar setor:', error);
      
      if (error instanceof QueryFailedError) {
        // Tratamento para erros de restrição do banco de dados
        if (error.message.includes('null value in column')) {
          const column = error.message.match(/column \"([^\"]+)\"/)?.[1] || 'não especificado';
          throw new InternalServerErrorException(`Campo obrigatório não informado: ${column}`);
        }
        
        if (error.message.includes('duplicate key')) {
          throw new InternalServerErrorException('Já existe um setor com estes dados');
        }
      }
      
      throw new InternalServerErrorException('Falha ao criar setor no banco de dados');
    }
  }

  /**
   * Atualiza um setor existente
   * @param id ID do setor
   * @param data Dados a serem atualizados
   * @returns Setor atualizado
   */
  async update(id: string, data: Partial<Setor>): Promise<Setor> {
    try {
      this.logger.log(`Atualizando setor ${id} com dados:`, JSON.stringify(data));
      
      // Encontra o setor existente
      const setorExistente = await this.findById(id);
      if (!setorExistente) {
        this.logger.warn(`Tentativa de atualizar setor não encontrado: ${id}`);
        throw new NotFoundException(`Setor com ID ${id} não encontrado`);
      }
      
      // Atualiza os campos básicos
      Object.assign(setorExistente, data);
      
      // Se houver atualização de unidade, carrega a unidade completa
      if (data.unidade_id && data.unidade_id !== setorExistente.unidade_id) {
        const unidade = await this.dataSource.getRepository(Unidade).findOne({ 
          where: { id: data.unidade_id } 
        });
        
        if (!unidade) {
          throw new NotFoundException(`Unidade com ID ${data.unidade_id} não encontrada`);
        }
        
        setorExistente.unidade = unidade;
        setorExistente.unidade_id = unidade.id;
      }
      
      // Salva as alterações
      const setorAtualizado = await this.repository.save(setorExistente);
      
      this.logger.log(`Setor ${id} atualizado com sucesso`);
      return setorAtualizado;
    } catch (error) {
      this.logger.error(`Erro ao atualizar setor ${id}: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      if (error instanceof QueryFailedError) {
        // Tratamento para erros de restrição do banco de dados
        if (error.message.includes('violates foreign key constraint')) {
          throw new NotFoundException('Unidade associada não encontrada');
        }
      }
      
      throw new InternalServerErrorException('Falha ao atualizar setor');
    }
  }

  /**
   * Remove um setor (soft delete)
   * @param id ID do setor
   * @returns Resultado da operação
   */
  async remove(id: string): Promise<void> {
    try {
      this.logger.log(`Removendo setor: ${id}`);
      
      const deleteResult = await this.repository.softDelete(id);
      
      if (deleteResult.affected === 0) {
        this.logger.warn(`Tentativa de remover setor não encontrado: ${id}`);
        throw new NotFoundException(`Setor com ID ${id} não encontrado`);
      }
      
      this.logger.log(`Setor ${id} removido com sucesso`);
    } catch (error) {
      this.logger.error(`Erro ao remover setor ${id}: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      if (error instanceof QueryFailedError) {
        if (error.message.includes('violates foreign key constraint')) {
          throw new InternalServerErrorException('Não é possível remover o setor pois existem registros vinculados');
        }
      }
      
      throw new InternalServerErrorException('Falha ao remover setor');
    }
  }
}
