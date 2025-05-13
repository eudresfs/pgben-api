import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { UnidadeRepository } from '../repositories/unidade.repository';
import { SetorRepository } from '../repositories/setor.repository';
import { CreateUnidadeDto } from '../dto/create-unidade.dto';
import { UpdateUnidadeDto } from '../dto/update-unidade.dto';
import { UpdateStatusUnidadeDto } from '../dto/update-status-unidade.dto';

/**
 * Serviço de unidades
 * 
 * Responsável pela lógica de negócio relacionada a unidades
 */
@Injectable()
export class UnidadeService {
  constructor(
    private readonly unidadeRepository: UnidadeRepository,
    private readonly setorRepository: SetorRepository
  ) {}

  /**
   * Busca todas as unidades com filtros e paginação
   * @param options Opções de filtro e paginação
   * @returns Lista de unidades paginada
   */
  async findAll(options?: {
    page?: number;
    limit?: number;
    search?: string;
    tipo?: string;
    status?: string;
  }) {
    const { page = 1, limit = 10, search, tipo, status } = options || {};
    
    // Construir filtros
    const where: any = {};
    
    if (search) {
      where.nome = { $iLike: `%${search}%` };
    }
    
    if (tipo) {
      where.tipo = tipo;
    }
    
    if (status) {
      where.status = status;
    }
    
    // Calcular skip para paginação
    const skip = (page - 1) * limit;
    
    // Buscar unidades
    const [unidades, total] = await this.unidadeRepository.findAll({
      skip,
      take: limit,
      where,
    });
    
    return {
      items: unidades,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca uma unidade pelo ID
   * @param id ID da unidade
   * @returns Unidade encontrada
   */
  async findById(id: string) {
    const unidade = await this.unidadeRepository.findById(id);
    
    if (!unidade) {
      throw new NotFoundException('Unidade não encontrada');
    }
    
    return unidade;
  }

  /**
   * Cria uma nova unidade
   * @param createUnidadeDto Dados da unidade
   * @returns Unidade criada
   */
  async create(createUnidadeDto: CreateUnidadeDto) {
    // Verificar se código já existe
    const codigoExistente = await this.unidadeRepository.findByCodigo(createUnidadeDto.codigo);
    if (codigoExistente) {
      throw new ConflictException('Código já está em uso');
    }
    
    // Criar unidade
    const unidade = await this.unidadeRepository.create(createUnidadeDto);
    
    return unidade;
  }

  /**
   * Atualiza uma unidade existente
   * @param id ID da unidade
   * @param updateUnidadeDto Dados a serem atualizados
   * @returns Unidade atualizada
   */
  async update(id: string, updateUnidadeDto: UpdateUnidadeDto) {
    // Verificar se unidade existe
    const unidade = await this.unidadeRepository.findById(id);
    if (!unidade) {
      throw new NotFoundException('Unidade não encontrada');
    }
    
    // Verificar se código já existe (se fornecido)
    if (updateUnidadeDto.codigo && updateUnidadeDto.codigo !== unidade.codigo) {
      const codigoExistente = await this.unidadeRepository.findByCodigo(updateUnidadeDto.codigo);
      if (codigoExistente) {
        throw new ConflictException('Código já está em uso');
      }
    }
    
    // Atualizar unidade
    const unidadeAtualizada = await this.unidadeRepository.update(id, updateUnidadeDto);
    
    return unidadeAtualizada;
  }

  /**
   * Atualiza o status de uma unidade
   * @param id ID da unidade
   * @param updateStatusUnidadeDto Novo status
   * @returns Unidade atualizada
   */
  async updateStatus(id: string, updateStatusUnidadeDto: UpdateStatusUnidadeDto) {
    // Verificar se unidade existe
    const unidade = await this.unidadeRepository.findById(id);
    if (!unidade) {
      throw new NotFoundException('Unidade não encontrada');
    }
    
    // Atualizar status
    const unidadeAtualizada = await this.unidadeRepository.updateStatus(id, updateStatusUnidadeDto.status);
    
    return unidadeAtualizada;
  }

  /**
   * Busca os setores de uma unidade
   * @param unidadeId ID da unidade
   * @returns Lista de setores da unidade
   */
  async findSetoresByUnidadeId(unidadeId: string) {
    // Verificar se unidade existe
    const unidade = await this.unidadeRepository.findById(unidadeId);
    if (!unidade) {
      throw new NotFoundException('Unidade não encontrada');
    }
    
    // Buscar setores
    const setores = await this.setorRepository.findByUnidadeId(unidadeId);
    
    return {
      items: setores,
      meta: {
        total: setores.length,
      },
    };
  }
}
