import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { Cidadao } from '../entities/cidadao.entity';
import { EntityNotFoundException } from '../../../shared/exceptions';

/**
 * Repositório de cidadãos
 *
 * Responsável por operações de acesso a dados relacionadas a cidadãos
 */
@Injectable()
export class CidadaoRepository {
  private repository: Repository<Cidadao>;

  constructor(private dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(Cidadao);
  }

  /**
   * Busca todos os cidadãos com filtros e paginação
   * @param options Opções de filtro e paginação
   * @returns Lista de cidadãos paginada
   */
  async findAll(options?: {
    skip?: number;
    take?: number;
    where?: any;
    order?: any;
  }): Promise<[Cidadao[], number]> {
    const {
      skip = 0,
      take = 10,
      where = {},
      order = { created_at: 'DESC' },
    } = options || {};

    return this.repository.findAndCount({
      skip,
      take,
      where,
      order,
    });
  }

  /**
   * Busca um cidadão pelo ID com relacionamentos
   * @param id ID do cidadão
   * @param includeRelations Se deve incluir relacionamentos (papéis, composição familiar)
   * @returns Cidadão encontrado ou null
   */
  async findById(id: string, includeRelations = true): Promise<Cidadao | null> {
    const options: any = { where: { id } };
    
    if (includeRelations) {
      options.relations = ['papeis', 'composicao_familiar'];
    }
    
    return this.repository.findOne(options);
  }

  /**
   * Busca um cidadão pelo CPF
   * @param cpf CPF do cidadão
   * @param includeRelations Se deve incluir relacionamentos (papéis, composição familiar)
   * @returns Cidadão encontrado ou null
   */
  async findByCpf(cpf: string, includeRelations = false): Promise<Cidadao | null> {
    // Normaliza o CPF removendo caracteres não numéricos
    const cpfNormalizado = cpf.replace(/\D/g, '');

    const options: any = {
      where: { cpf: cpfNormalizado },
    };
    
    if (includeRelations) {
      options.relations = ['papeis', 'composicao_familiar'];
    }

    return this.repository.findOne(options);
  }

  /**
   * Busca um cidadão pelo NIS
   * @param nis NIS do cidadão
   * @param includeRelations Se deve incluir relacionamentos (papéis, composição familiar)
   * @returns Cidadão encontrado ou null
   */
  async findByNis(nis: string, includeRelations = false): Promise<Cidadao | null> {
    // Normaliza o NIS removendo caracteres não numéricos
    const nisNormalizado = nis.replace(/\D/g, '');

    const options: any = {
      where: { nis: nisNormalizado },
    };
    
    if (includeRelations) {
      options.relations = ['papeis', 'composicao_familiar'];
    }

    return this.repository.findOne(options);
  }

  /**
   * Cria um novo cidadão
   * @param data Dados do cidadão
   * @returns Cidadão criado
   */
  async create(data: Partial<Cidadao>): Promise<Cidadao> {
    // Normaliza o CPF removendo caracteres não numéricos
    if (data.cpf) {
      data.cpf = data.cpf.replace(/\D/g, '');
    }

    // Normaliza o NIS removendo caracteres não numéricos
    if (data.nis) {
      data.nis = data.nis.replace(/\D/g, '');
    }

    const cidadao = this.repository.create(data);
    return this.repository.save(cidadao);
  }

  /**
   * Atualiza um cidadão existente
   * @param id ID do cidadão
   * @param data Dados a serem atualizados
   * @returns Cidadão atualizado
   * @throws NotFoundException se o cidadão não for encontrado
   */
  async update(id: string, data: Partial<Cidadao>): Promise<Cidadao> {
    // Normaliza o CPF removendo caracteres não numéricos
    if (data.cpf) {
      data.cpf = data.cpf.replace(/\D/g, '');
    }
    
    // Normaliza o NIS removendo caracteres não numéricos
    if (data.nis) {
      data.nis = data.nis.replace(/\D/g, '');
    }

    const updateResult = await this.repository.update(id, data);
    
    if (updateResult.affected === 0) {
      throw new NotFoundException('Cidadão não encontrado');
    }
    
    const cidadao = await this.findById(id, true);
    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado após atualização');
    }
    return cidadao;
  }

  /**
   * Adiciona membro à composição familiar
   * @param id ID do cidadão
   * @param membro Dados do membro familiar
   * @returns Cidadão atualizado
   */
  async addComposicaoFamiliar(id: string, membro: any): Promise<Cidadao> {
    const cidadao = await this.findById(id);

    if (!cidadao) {
      throw new EntityNotFoundException('Cidadão', id);
    }

    // Inicializa a composição familiar se não existir
    if (!cidadao.composicao_familiar) {
      cidadao.composicao_familiar = [];
    }

    // Adiciona o novo membro
    cidadao.composicao_familiar.push(membro);

    // Atualiza o cidadão
    await this.repository.update(id, {
      composicao_familiar: cidadao.composicao_familiar,
    });

    const cidadaoAtualizado = await this.findById(id);
    if (!cidadaoAtualizado) {
      throw new EntityNotFoundException('Cidadão', id);
    }
    return cidadaoAtualizado;
  }

  /**
   * Remove um cidadão (soft delete)
   * @param id ID do cidadão
   * @returns Resultado da operação
   */
  async remove(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
